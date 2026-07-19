"""Negotiation evidence schemas and outcome validation."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from pydantic import ConfigDict, StringConstraints, field_validator, model_validator

from app.models.enums import NegotiationLeverageType, NegotiationOutcome
from app.schemas.providers import ProviderSummary
from app.schemas.quotes import PositiveDecimal, QuoteSummary, quantize_money
from app.schemas.shared import ApiModel


class NegotiationCreate(ApiModel):
    model_config = ConfigDict(extra="forbid")

    leverage_type: NegotiationLeverageType
    leverage_description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20_000)
    ]
    competing_quote_id: UUID | None = None
    before_total: PositiveDecimal
    requested_total: PositiveDecimal | None = None
    after_total: PositiveDecimal
    before_terms: dict[str, Any] | None = None
    after_terms: dict[str, Any] | None = None
    outcome: NegotiationOutcome

    @field_validator("before_total", "requested_total", "after_total")
    @classmethod
    def normalize_money(cls, value: Decimal | None) -> Decimal | None:
        return quantize_money(value) if value is not None else None

    @model_validator(mode="after")
    def validate_evidence(self) -> "NegotiationCreate":
        if (
            self.leverage_type == NegotiationLeverageType.COMPETING_QUOTE
            and self.competing_quote_id is None
        ):
            raise ValueError(
                "competing_quote_id is required for competing-quote leverage"
            )
        if self.after_total > self.before_total:
            raise ValueError("after_total cannot exceed before_total")
        if (
            self.outcome
            in {
                NegotiationOutcome.PRICE_REDUCED,
                NegotiationOutcome.PRICE_AND_TERMS_IMPROVED,
            }
            and self.after_total >= self.before_total
        ):
            raise ValueError("a price-improvement outcome requires a lower after_total")
        return self


class NegotiationResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    provider_id: UUID
    provider_call_id: UUID
    quote_id: UUID
    leverage_type: NegotiationLeverageType
    leverage_description: str
    competing_quote_id: UUID | None
    before_total: Decimal
    requested_total: Decimal | None
    after_total: Decimal
    savings_amount: Decimal
    savings_percentage: Decimal
    before_terms: dict[str, Any] | None
    after_terms: dict[str, Any] | None
    outcome: NegotiationOutcome
    provider: ProviderSummary
    quote: QuoteSummary
    competing_quote: QuoteSummary | None
    created_at: datetime
    updated_at: datetime
