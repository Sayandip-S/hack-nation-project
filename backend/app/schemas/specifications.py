"""Residential-moving specification schemas."""

from datetime import date, datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import ConfigDict, Field, StringConstraints, model_validator

from app.models.enums import SpecificationStatus
from app.schemas.shared import ApiModel

RequiredName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
OptionalShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
OptionalLongText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000)
]


class InventoryItem(ApiModel):
    name: RequiredName
    quantity: int = Field(ge=1)
    category: OptionalShortText | None = None
    notes: OptionalLongText | None = None


class SpecialItem(ApiModel):
    name: RequiredName
    quantity: int = Field(ge=1)
    handling_notes: OptionalLongText | None = None


class SpecificationUpsert(ApiModel):
    origin_address: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
    ]
    destination_address: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
    ]
    move_date: date | None = None
    property_type: OptionalShortText | None = None
    origin_floor: int | None = Field(default=None, ge=-2, le=100)
    destination_floor: int | None = Field(default=None, ge=-2, le=100)
    origin_has_elevator: bool | None = None
    destination_has_elevator: bool | None = None
    bedrooms: int | None = Field(default=None, ge=0, le=20)
    estimated_volume_m3: float | None = Field(default=None, gt=0)
    distance_km: float | None = Field(default=None, ge=0)
    packing_required: bool = False
    disassembly_required: bool = False
    reassembly_required: bool = False
    storage_required: bool = False
    inventory: list[InventoryItem] = Field(default_factory=list)
    special_items: list[SpecialItem] = Field(default_factory=list)
    access_notes: OptionalLongText | None = None
    additional_notes: OptionalLongText | None = None

    @model_validator(mode="after")
    def require_distinct_addresses(self) -> "SpecificationUpsert":
        def normalize(value: str) -> str:
            return " ".join(value.casefold().split()).rstrip(".,")

        if normalize(self.origin_address) == normalize(self.destination_address):
            raise ValueError("origin and destination addresses must be different")
        return self


class JobSpecificationResponse(SpecificationUpsert):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    version: int
    status: SpecificationStatus
    inventory: list[InventoryItem]
    special_items: list[SpecialItem]
    confirmed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def read_orm_collections(cls, data: Any) -> Any:
        return data
