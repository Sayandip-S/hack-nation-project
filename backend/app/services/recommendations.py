"""Deterministic quote scoring, ranking, and final recommendations."""

from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models import (
    JobStatus,
    ProviderRanking,
    Quote,
    QuoteExtractionSource,
    Recommendation,
    RecommendationStatus,
)
from app.services.jobs import get_job_or_404

SCORE_QUANTUM = Decimal("0.01")
HUNDRED = Decimal("100.00")
PRICE_WEIGHT = Decimal("0.45")
COMPLETENESS_WEIGHT = Decimal("0.20")
AVAILABILITY_WEIGHT = Decimal("0.15")
NEGOTIATION_WEIGHT = Decimal("0.10")
CONFIDENCE_WEIGHT = Decimal("0.10")
GENERIC_CATEGORIES = {"general", "misc", "miscellaneous", "other", "uncategorized"}


def _round_score(value: Decimal) -> Decimal:
    return value.quantize(SCORE_QUANTUM, rounding=ROUND_HALF_UP)


def _quote_query():
    return select(Quote).options(
        selectinload(Quote.items),
        selectinload(Quote.provider),
        selectinload(Quote.negotiations),
    )


def _ranking_query():
    return select(ProviderRanking).options(
        selectinload(ProviderRanking.provider),
        selectinload(ProviderRanking.quote),
    )


def _latest_negotiation(quote: Quote):
    if not quote.negotiations:
        return None
    return max(
        quote.negotiations,
        key=lambda negotiation: (negotiation.created_at, str(negotiation.id)),
    )


def _completeness(quote: Quote) -> tuple[Decimal, list[str], list[str]]:
    reasons: list[str] = []
    warnings: list[str] = []
    score = Decimal("0")
    item_count = len(quote.items)

    if item_count:
        score += Decimal("20")
        reasons.append("Includes itemised pricing")
    else:
        warnings.append("No quote items")
    if item_count >= 2:
        score += Decimal("10")
        reasons.append("Includes multiple quote items")
    else:
        warnings.append("Only one quote item")
    for present, points, reason, warning in (
        (bool(quote.inclusions), 15, "Inclusions documented", "Inclusions missing"),
        (bool(quote.exclusions), 15, "Exclusions documented", "Exclusions missing"),
        (bool(quote.terms), 10, "Terms documented", "Terms missing"),
        (
            quote.estimated_duration_hours is not None,
            10,
            "Estimated duration provided",
            "Estimated duration missing",
        ),
        (quote.valid_until is not None, 10, "Validity date provided", "Validity date missing"),
    ):
        if present:
            score += Decimal(points)
            reasons.append(reason)
        else:
            warnings.append(warning)

    useful_categories = {
        item.category.strip().casefold()
        for item in quote.items
        if item.category.strip()
        and item.category.strip().casefold() not in GENERIC_CATEGORIES
    }
    if useful_categories:
        score += Decimal("10")
        reasons.append("Useful item categories provided")
    else:
        warnings.append("Useful item categories missing")
    return _round_score(score), reasons, warnings


def _confidence_score(quote: Quote) -> Decimal:
    if quote.extraction_source == QuoteExtractionSource.MANUAL:
        return HUNDRED
    if quote.extraction_confidence is None:
        return Decimal("0.00")
    return _round_score(quote.extraction_confidence * HUNDRED)


def rank_providers(db: Session, job_id: UUID) -> list[ProviderRanking]:
    job = get_job_or_404(db, job_id)
    quotes = list(
        db.scalars(
            _quote_query()
            .where(Quote.job_id == job_id)
            .order_by(Quote.created_at, Quote.id)
        ).unique()
    )
    if not quotes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="At least one quote is required for ranking",
        )

    scored: list[dict] = []
    final_prices: dict[UUID, Decimal] = {}
    negotiations = {}
    for quote in quotes:
        negotiation = _latest_negotiation(quote)
        negotiations[quote.id] = negotiation
        final_prices[quote.id] = (
            negotiation.after_total if negotiation is not None else quote.total_amount
        )
    lowest = min(final_prices.values())
    highest = max(final_prices.values())

    for quote in quotes:
        final_price = final_prices[quote.id]
        if lowest == highest:
            price_score = HUNDRED
        else:
            price_score = _round_score(
                ((highest - final_price) / (highest - lowest)) * HUNDRED
            )
        completeness_score, reasons, warnings = _completeness(quote)
        availability_score = (
            HUNDRED if quote.availability_confirmed else Decimal("0.00")
        )
        negotiation = negotiations[quote.id]
        negotiation_score = (
            min(_round_score(negotiation.savings_percentage * Decimal("10")), HUNDRED)
            if negotiation is not None
            else Decimal("0.00")
        )
        confidence_score = _confidence_score(quote)
        total_score = _round_score(
            price_score * PRICE_WEIGHT
            + completeness_score * COMPLETENESS_WEIGHT
            + availability_score * AVAILABILITY_WEIGHT
            + negotiation_score * NEGOTIATION_WEIGHT
            + confidence_score * CONFIDENCE_WEIGHT
        )
        reasons.insert(0, f"Price score {price_score:.2f}")
        if quote.availability_confirmed:
            reasons.append("Availability confirmed")
        else:
            warnings.append("Availability not confirmed")
        if negotiation is not None:
            reasons.append(
                f"Latest negotiation saved {negotiation.savings_percentage:.2f}%"
            )
        else:
            warnings.append("No negotiation recorded")
        if confidence_score < HUNDRED:
            warnings.append(f"Quote confidence is {confidence_score:.2f}")
        scored.append(
            {
                "quote": quote,
                "final_price": final_price,
                "price_score": price_score,
                "completeness_score": completeness_score,
                "availability_score": availability_score,
                "negotiation_score": negotiation_score,
                "confidence_score": confidence_score,
                "total_score": total_score,
                "reasons": reasons,
                "warnings": warnings,
            }
        )

    scored.sort(
        key=lambda entry: (
            -entry["total_score"],
            entry["final_price"],
            -entry["availability_score"],
            -entry["completeness_score"],
            entry["quote"].provider.name.casefold(),
            str(entry["quote"].provider_id),
        )
    )

    try:
        db.execute(delete(ProviderRanking).where(ProviderRanking.job_id == job_id))
        db.flush()
        for rank, entry in enumerate(scored, start=1):
            quote = entry.pop("quote")
            db.add(
                ProviderRanking(
                    job=job,
                    provider=quote.provider,
                    quote=quote,
                    rank=rank,
                    **entry,
                )
            )
        if job.status != JobStatus.COMPLETED:
            job.status = JobStatus.RECOMMENDATION_READY
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save provider rankings",
        ) from exc
    return list_rankings(db, job_id)


def list_rankings(db: Session, job_id: UUID) -> list[ProviderRanking]:
    get_job_or_404(db, job_id)
    statement = (
        _ranking_query()
        .where(ProviderRanking.job_id == job_id)
        .order_by(ProviderRanking.rank)
    )
    return list(db.scalars(statement))


def create_recommendation(db: Session, job_id: UUID) -> Recommendation:
    job = get_job_or_404(db, job_id)
    ranking = db.scalar(
        _ranking_query().where(
            ProviderRanking.job_id == job_id, ProviderRanking.rank == 1
        )
    )
    if ranking is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provider rankings are required for a recommendation",
        )

    original_price = ranking.quote.total_amount
    total_savings = (original_price - ranking.final_price).quantize(SCORE_QUANTUM)
    summary = (
        f"Recommend {ranking.provider.name} at {ranking.quote.currency} "
        f"{ranking.final_price:.2f}."
    )
    rationale = (
        f"Ranked first with a total score of {ranking.total_score:.2f}. "
        + "; ".join(ranking.reasons)
        + "."
    )
    recommendation = db.scalar(
        select(Recommendation).where(Recommendation.job_id == job_id)
    )
    if recommendation is None:
        recommendation = Recommendation(job=job)
        db.add(recommendation)
    recommendation.recommended_provider = ranking.provider
    recommendation.recommended_quote = ranking.quote
    recommendation.status = RecommendationStatus.FINAL
    recommendation.summary = summary
    recommendation.rationale = rationale
    recommendation.original_price = original_price
    recommendation.final_price = ranking.final_price
    recommendation.total_savings = total_savings
    job.status = JobStatus.COMPLETED
    try:
        db.commit()
        db.refresh(recommendation)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save recommendation",
        ) from exc
    return recommendation


def get_recommendation_or_404(db: Session, job_id: UUID) -> Recommendation:
    get_job_or_404(db, job_id)
    recommendation = db.scalar(
        select(Recommendation).where(Recommendation.job_id == job_id)
    )
    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found",
        )
    return recommendation
