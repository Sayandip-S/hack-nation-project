"""Residential-moving specification schemas."""

from datetime import date, datetime
from typing import Annotated, Any, Literal
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


ExtractionField = Literal[
    "origin_address",
    "destination_address",
    "move_date",
    "property_type",
    "origin_floor",
    "destination_floor",
    "origin_has_elevator",
    "destination_has_elevator",
    "bedrooms",
    "estimated_volume_m3",
    "packing_required",
    "disassembly_required",
    "reassembly_required",
    "storage_required",
    "inventory",
    "special_items",
    "access_notes",
    "additional_notes",
]


class MovingSpecificationExtraction(ApiModel):
    """Provider-validated extraction where unknown scalar values stay null."""

    origin_address: OptionalShortText | None
    destination_address: OptionalShortText | None
    move_date: date | None
    property_type: OptionalShortText | None
    origin_floor: int | None = Field(ge=-2, le=100)
    destination_floor: int | None = Field(ge=-2, le=100)
    origin_has_elevator: bool | None
    destination_has_elevator: bool | None
    bedrooms: int | None = Field(ge=0, le=20)
    estimated_volume_m3: float | None = Field(gt=0)
    packing_required: bool | None
    disassembly_required: bool | None
    reassembly_required: bool | None
    storage_required: bool | None
    inventory: list[InventoryItem]
    special_items: list[SpecialItem]
    access_notes: OptionalLongText | None
    additional_notes: OptionalLongText | None
    confidence: float = Field(ge=0, le=1)
    missing_fields: list[ExtractionField]
    clarification_questions: list[OptionalShortText]

    @model_validator(mode="after")
    def validate_unknowns_and_addresses(self) -> "MovingSpecificationExtraction":
        missing = set(self.missing_fields)
        scalar_fields = (
            "origin_address",
            "destination_address",
            "move_date",
            "property_type",
            "origin_floor",
            "destination_floor",
            "origin_has_elevator",
            "destination_has_elevator",
            "bedrooms",
            "estimated_volume_m3",
            "packing_required",
            "disassembly_required",
            "reassembly_required",
            "storage_required",
            "access_notes",
            "additional_notes",
        )
        unreported = [
            field
            for field in scalar_fields
            if getattr(self, field) is None and field not in missing
        ]
        if unreported:
            raise ValueError(
                "null values must be listed in missing_fields: " + ", ".join(unreported)
            )
        if len(missing) != len(self.missing_fields):
            raise ValueError("missing_fields must not contain duplicates")
        if self.origin_address and self.destination_address:

            def normalize(value: str) -> str:
                return " ".join(value.casefold().split()).rstrip(".,")

            if normalize(self.origin_address) == normalize(self.destination_address):
                raise ValueError("origin and destination addresses must be different")
        return self

    def to_specification_upsert(self) -> SpecificationUpsert:
        missing_required = [
            name
            for name in ("origin_address", "destination_address")
            if getattr(self, name) is None
        ]
        if missing_required:
            raise ValueError(", ".join(missing_required))
        return SpecificationUpsert(
            origin_address=self.origin_address,
            destination_address=self.destination_address,
            move_date=self.move_date,
            property_type=self.property_type,
            origin_floor=self.origin_floor,
            destination_floor=self.destination_floor,
            origin_has_elevator=self.origin_has_elevator,
            destination_has_elevator=self.destination_has_elevator,
            bedrooms=self.bedrooms,
            estimated_volume_m3=self.estimated_volume_m3,
            packing_required=self.packing_required is True,
            disassembly_required=self.disassembly_required is True,
            reassembly_required=self.reassembly_required is True,
            storage_required=self.storage_required is True,
            inventory=self.inventory,
            special_items=self.special_items,
            access_notes=self.access_notes,
            additional_notes=self.additional_notes,
        )


class SpecificationExtractionResponse(ApiModel):
    specification: JobSpecificationResponse
    extraction: MovingSpecificationExtraction
    provider: Literal["mock", "openai", "xai"]
    model: str
    extraction_confidence: float = Field(ge=0, le=1)
    missing_fields: list[ExtractionField]
    source_intake_id: UUID
