"""Provider CRUD endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.providers import ProviderCreate, ProviderResponse, ProviderUpdate
from app.services import providers as provider_service

router = APIRouter(prefix="/api/v1/providers", tags=["providers"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
def create_provider(payload: ProviderCreate, db: DatabaseSession):
    return provider_service.create_provider(db, payload)


@router.get("", response_model=list[ProviderResponse])
def list_providers(
    db: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return provider_service.list_providers(db, limit)


@router.get("/{provider_id}", response_model=ProviderResponse)
def get_provider(provider_id: UUID, db: DatabaseSession):
    return provider_service.get_provider_or_404(db, provider_id)


@router.patch("/{provider_id}", response_model=ProviderResponse)
def update_provider(provider_id: UUID, payload: ProviderUpdate, db: DatabaseSession):
    return provider_service.update_provider(db, provider_id, payload)
