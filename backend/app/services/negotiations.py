"""Negotiation evidence validation, calculations, and persistence."""

from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models import JobStatus, Negotiation, NegotiationLeverageType, Quote
from app.schemas.negotiations import NegotiationCreate
from app.schemas.quotes import MONEY_TOLERANCE, quantize_money
from app.services.jobs import get_job_or_404
from app.services.provider_calls import get_call_or_404


def _negotiation_query():
    return select(Negotiation).options(
        selectinload(Negotiation.provider),
        selectinload(Negotiation.quote),
        selectinload(Negotiation.competing_quote),
    )


def _validate_competing_quote(
    db: Session, target_quote: Quote, competing_quote_id: UUID | None
) -> Quote | None:
    if competing_quote_id is None:
        return None
    competing = db.get(Quote, competing_quote_id)
    if competing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competing quote not found",
        )
    if competing.job_id != target_quote.job_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Competing quote must belong to the same job",
        )
    if competing.provider_id == target_quote.provider_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Competing quote must belong to a different provider",
        )
    return competing


def create_negotiation(
    db: Session, call_id: UUID, payload: NegotiationCreate
) -> Negotiation:
    call = get_call_or_404(db, call_id)
    quote = db.scalar(select(Quote).where(Quote.provider_call_id == call_id))
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="A stored quote is required for negotiation",
        )
    if abs(payload.before_total - quote.total_amount) > MONEY_TOLERANCE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="before_total must match the stored quote total",
        )
    competing = _validate_competing_quote(db, quote, payload.competing_quote_id)
    if (
        payload.leverage_type == NegotiationLeverageType.COMPETING_QUOTE
        and competing is None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A genuine competing quote is required",
        )

    savings = quantize_money(payload.before_total - payload.after_total)
    percentage = ((savings / payload.before_total) * Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    negotiation = Negotiation(
        job=quote.job,
        provider=quote.provider,
        provider_call=call,
        quote=quote,
        competing_quote=competing,
        leverage_type=payload.leverage_type,
        leverage_description=payload.leverage_description,
        before_total=payload.before_total,
        requested_total=payload.requested_total,
        after_total=payload.after_total,
        savings_amount=savings,
        savings_percentage=percentage,
        before_terms=payload.before_terms,
        after_terms=payload.after_terms,
        outcome=payload.outcome,
    )
    quote.job.status = JobStatus.NEGOTIATION_COMPLETE
    db.add(negotiation)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save negotiation",
        ) from exc
    return db.scalar(_negotiation_query().where(Negotiation.id == negotiation.id))


def list_job_negotiations(db: Session, job_id: UUID) -> list[Negotiation]:
    get_job_or_404(db, job_id)
    statement = (
        _negotiation_query()
        .where(Negotiation.job_id == job_id)
        .order_by(Negotiation.created_at, Negotiation.id)
    )
    return list(db.scalars(statement))
