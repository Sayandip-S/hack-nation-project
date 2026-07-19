"""Provider-call batch, retrieval, and update endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.provider_calls import (
    ProviderCallBatchCreate,
    ProviderCallUpdate,
    ProviderCallWithProviderResponse,
)
from app.services import provider_calls as call_service

router = APIRouter(prefix="/api/v1", tags=["provider calls"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/jobs/{job_id}/provider-calls/batch",
    response_model=list[ProviderCallWithProviderResponse],
)
def create_call_batch(
    job_id: UUID,
    payload: ProviderCallBatchCreate,
    response: Response,
    db: DatabaseSession,
):
    calls, created = call_service.create_call_batch(db, job_id, payload)
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return calls


@router.get(
    "/jobs/{job_id}/provider-calls",
    response_model=list[ProviderCallWithProviderResponse],
)
def list_job_calls(job_id: UUID, db: DatabaseSession):
    return call_service.list_job_calls(db, job_id)


@router.get(
    "/provider-calls/{call_id}",
    response_model=ProviderCallWithProviderResponse,
)
def get_call(call_id: UUID, db: DatabaseSession):
    return call_service.get_call_or_404(db, call_id)


@router.patch(
    "/provider-calls/{call_id}",
    response_model=ProviderCallWithProviderResponse,
)
def update_call(call_id: UUID, payload: ProviderCallUpdate, db: DatabaseSession):
    return call_service.update_call(db, call_id, payload)
