"""Deterministic provider-ranking and recommendation responses."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import ConfigDict

from app.models.enums import RecommendationStatus
from app.schemas.shared import ApiModel


class ProviderRankingResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    provider_id: UUID
    quote_id: UUID
    rank: int
    total_score: Decimal
    price_score: Decimal
    completeness_score: Decimal
    availability_score: Decimal
    negotiation_score: Decimal
    confidence_score: Decimal
    final_price: Decimal
    reasons: list[str]
    warnings: list[str]
    created_at: datetime
    updated_at: datetime


class RecommendationResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    recommended_provider_id: UUID
    recommended_quote_id: UUID
    status: RecommendationStatus
    summary: str
    rationale: str
    original_price: Decimal
    final_price: Decimal
    total_savings: Decimal
    created_at: datetime
    updated_at: datetime
