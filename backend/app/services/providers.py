"""Provider persistence services."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Provider
from app.schemas.providers import ProviderCreate, ProviderUpdate


def get_provider_or_404(db: Session, provider_id: UUID) -> Provider:
    provider = db.get(Provider, provider_id)
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found",
        )
    return provider


def _provider_values(payload: ProviderCreate | ProviderUpdate) -> dict:
    values = payload.model_dump(exclude_unset=True, mode="python")
    if website := values.get("website"):
        values["website"] = str(website)
    if email := values.get("email"):
        values["email"] = str(email)
    return values


def create_provider(db: Session, payload: ProviderCreate) -> Provider:
    provider = Provider(**_provider_values(payload))
    db.add(provider)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save provider",
        ) from exc
    db.refresh(provider)
    return provider


def list_providers(db: Session, limit: int) -> list[Provider]:
    statement = (
        select(Provider).order_by(func.lower(Provider.name), Provider.id).limit(limit)
    )
    return list(db.scalars(statement))


def update_provider(
    db: Session, provider_id: UUID, payload: ProviderUpdate
) -> Provider:
    provider = get_provider_or_404(db, provider_id)
    for field, value in _provider_values(payload).items():
        setattr(provider, field, value)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update provider",
        ) from exc
    db.refresh(provider)
    return provider
