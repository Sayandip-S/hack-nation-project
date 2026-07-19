"""Structured quote and negotiation evidence endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.negotiations import NegotiationCreate, NegotiationResponse
from app.schemas.quotes import QuoteCreate, QuoteUpdate, QuoteWithProviderResponse
from app.services import negotiations as negotiation_service
from app.services import quotes as quote_service

router = APIRouter(prefix="/api/v1", tags=["quotes and negotiations"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/provider-calls/{call_id}/quote",
    response_model=QuoteWithProviderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_quote(call_id: UUID, payload: QuoteCreate, db: DatabaseSession):
    return quote_service.create_quote(db, call_id, payload)


@router.get(
    "/provider-calls/{call_id}/quote",
    response_model=QuoteWithProviderResponse,
)
def get_call_quote(call_id: UUID, db: DatabaseSession):
    return quote_service.get_call_quote_or_404(db, call_id)


@router.put("/quotes/{quote_id}", response_model=QuoteWithProviderResponse)
def update_quote(quote_id: UUID, payload: QuoteUpdate, db: DatabaseSession):
    return quote_service.update_quote(db, quote_id, payload)


@router.get("/jobs/{job_id}/quotes", response_model=list[QuoteWithProviderResponse])
def list_job_quotes(job_id: UUID, db: DatabaseSession):
    return quote_service.list_job_quotes(db, job_id)


@router.post(
    "/provider-calls/{call_id}/negotiations",
    response_model=NegotiationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_negotiation(call_id: UUID, payload: NegotiationCreate, db: DatabaseSession):
    return negotiation_service.create_negotiation(db, call_id, payload)


@router.get("/jobs/{job_id}/negotiations", response_model=list[NegotiationResponse])
def list_job_negotiations(job_id: UUID, db: DatabaseSession):
    return negotiation_service.list_job_negotiations(db, job_id)
