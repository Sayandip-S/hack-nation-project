"""Atomic structured quote creation, replacement, and job-state updates."""

from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models import JobStatus, ProviderCallStatus, Quote, QuoteItem
from app.schemas.quotes import QuoteCreate, QuoteUpdate
from app.services.jobs import get_job_or_404
from app.services.provider_calls import get_call_or_404


def _quote_query():
    return select(Quote).options(
        selectinload(Quote.items),
        selectinload(Quote.provider),
    )


def get_quote_or_404(db: Session, quote_id: UUID) -> Quote:
    quote = db.scalar(_quote_query().where(Quote.id == quote_id))
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found"
        )
    return quote


def get_call_quote_or_404(db: Session, call_id: UUID) -> Quote:
    get_call_or_404(db, call_id)
    quote = db.scalar(_quote_query().where(Quote.provider_call_id == call_id))
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found for provider call",
        )
    return quote


def _replace_quote_data(
    quote: Quote,
    payload: QuoteCreate | QuoteUpdate,
    *,
    db: Session | None = None,
) -> None:
    values = payload.model_dump(exclude={"items", "total_amount"}, mode="python")
    for field, value in values.items():
        setattr(quote, field, value)
    quote.subtotal = payload.calculated_subtotal()
    quote.total_amount = payload.calculated_total()
    quote.items.clear()
    if db is not None:
        # Remove the old scoped sequences before inserting their replacements.
        # The surrounding transaction keeps the full replacement atomic.
        db.flush()
    for sequence, item in enumerate(payload.items, start=1):
        quote.items.append(
            QuoteItem(
                sequence=sequence,
                category=item.category,
                description=item.description,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                total_price=item.calculated_total(),
            )
        )


def create_quote(db: Session, call_id: UUID, payload: QuoteCreate) -> Quote:
    call = get_call_or_404(db, call_id)
    if call.status not in {
        ProviderCallStatus.IN_PROGRESS,
        ProviderCallStatus.COMPLETED,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quotes require an in-progress or completed provider call",
        )
    existing = db.scalar(select(Quote.id).where(Quote.provider_call_id == call_id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A quote already exists for this provider call",
        )

    quote = Quote(
        job=call.job,
        provider=call.provider,
        provider_call=call,
        subtotal=Decimal("0.00"),
        total_amount=Decimal("0.00"),
    )
    _replace_quote_data(quote, payload)
    db.add(quote)
    try:
        db.flush()
        quote_count = db.scalar(
            select(func.count(Quote.id)).where(Quote.job_id == call.job_id)
        )
        if quote_count == 3 and call.job.status != JobStatus.NEGOTIATION_COMPLETE:
            call.job.status = JobStatus.QUOTES_RECEIVED
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A quote already exists for this provider call",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save quote",
        ) from exc
    return get_quote_or_404(db, quote.id)


def update_quote(db: Session, quote_id: UUID, payload: QuoteUpdate) -> Quote:
    quote = get_quote_or_404(db, quote_id)
    try:
        _replace_quote_data(quote, payload, db=db)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update quote",
        ) from exc
    return get_quote_or_404(db, quote_id)


def list_job_quotes(db: Session, job_id: UUID) -> list[Quote]:
    get_job_or_404(db, job_id)
    statement = (
        _quote_query()
        .where(Quote.job_id == job_id)
        .order_by(Quote.created_at, Quote.id)
    )
    return list(db.scalars(statement).unique())
