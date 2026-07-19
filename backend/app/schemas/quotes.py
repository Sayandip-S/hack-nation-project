"""Validated itemised quote schemas and monetary calculations."""

from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated
from uuid import UUID

from pydantic import (
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.models.enums import QuoteExtractionSource
from app.schemas.providers import ProviderSummary
from app.schemas.shared import ApiModel

MONEY_QUANTUM = Decimal("0.01")
MONEY_TOLERANCE = Decimal("0.01")


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


NonNegativeDecimal = Annotated[Decimal, Field(ge=Decimal("0"), allow_inf_nan=False)]
PositiveDecimal = Annotated[Decimal, Field(gt=Decimal("0"), allow_inf_nan=False)]
RequiredShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
OptionalShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
OptionalLongText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20_000)
]


class QuoteItemCreate(ApiModel):
    category: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
    ]
    description: RequiredShortText
    quantity: PositiveDecimal
    unit: OptionalShortText | None = None
    unit_price: NonNegativeDecimal
    total_price: NonNegativeDecimal | None = None

    @field_validator("unit_price", "total_price")
    @classmethod
    def normalize_money(cls, value: Decimal | None) -> Decimal | None:
        return quantize_money(value) if value is not None else None

    @model_validator(mode="after")
    def validate_total(self) -> "QuoteItemCreate":
        expected = quantize_money(self.quantity * self.unit_price)
        if (
            self.total_price is not None
            and abs(self.total_price - expected) > MONEY_TOLERANCE
        ):
            raise ValueError("item total_price does not match quantity × unit_price")
        return self

    def calculated_total(self) -> Decimal:
        return quantize_money(self.quantity * self.unit_price)


class QuoteCreate(ApiModel):
    model_config = ConfigDict(extra="forbid")

    currency: str = "EUR"
    items: list[QuoteItemCreate] = Field(min_length=1)
    tax_amount: NonNegativeDecimal = Decimal("0.00")
    total_amount: PositiveDecimal
    valid_until: date | None = None
    availability_confirmed: bool = False
    estimated_duration_hours: PositiveDecimal | None = None
    inclusions: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)
    terms: OptionalLongText | None = None
    extraction_source: QuoteExtractionSource = QuoteExtractionSource.MANUAL
    extraction_confidence: Annotated[
        Decimal | None,
        Field(default=None, ge=Decimal("0"), le=Decimal("1"), allow_inf_nan=False),
    ]

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip().upper()
            if len(value) != 3 or not value.isalpha():
                raise ValueError("currency must be exactly three alphabetic characters")
        return value

    @field_validator("tax_amount", "total_amount")
    @classmethod
    def normalize_totals(cls, value: Decimal) -> Decimal:
        return quantize_money(value)

    @field_validator("inclusions", "exclusions")
    @classmethod
    def remove_blank_list_entries(cls, values: list[str]) -> list[str]:
        return [value.strip() for value in values if value.strip()]

    @model_validator(mode="after")
    def validate_quote_total(self) -> "QuoteCreate":
        expected = self.calculated_total()
        if abs(self.total_amount - expected) > MONEY_TOLERANCE:
            raise ValueError(
                "total_amount does not match item subtotal plus tax_amount"
            )
        return self

    def calculated_subtotal(self) -> Decimal:
        return quantize_money(
            sum((item.calculated_total() for item in self.items), Decimal("0"))
        )

    def calculated_total(self) -> Decimal:
        return quantize_money(self.calculated_subtotal() + self.tax_amount)


class QuoteUpdate(QuoteCreate):
    """Full PUT replacement of mutable quote details and item lines."""


class QuoteItemResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sequence: int
    category: str
    description: str
    quantity: Decimal
    unit: str | None
    unit_price: Decimal
    total_price: Decimal
    created_at: datetime


class QuoteResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    provider_id: UUID
    provider_call_id: UUID
    currency: str
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    valid_until: date | None
    availability_confirmed: bool
    estimated_duration_hours: Decimal | None
    inclusions: list[str]
    exclusions: list[str]
    terms: str | None
    extraction_source: QuoteExtractionSource
    extraction_confidence: Decimal | None
    items: list[QuoteItemResponse]
    created_at: datetime
    updated_at: datetime


class QuoteWithProviderResponse(QuoteResponse):
    provider: ProviderSummary


class QuoteSummary(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_id: UUID
    currency: str
    total_amount: Decimal
