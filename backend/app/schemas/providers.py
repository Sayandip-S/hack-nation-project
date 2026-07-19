"""Provider request and response schemas."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import ConfigDict, EmailStr, HttpUrl, StringConstraints, model_validator

from app.schemas.shared import ApiModel

ProviderName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
ProviderPhone = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        pattern=r"^\+[1-9]\d{7,14}$",
        max_length=16,
    ),
]


class ProviderCreate(ApiModel):
    name: ProviderName
    phone: ProviderPhone | None = None
    email: EmailStr | None = None
    website: HttpUrl | None = None


class ProviderUpdate(ApiModel):
    model_config = ConfigDict(extra="forbid")

    name: ProviderName | None = None
    phone: ProviderPhone | None = None
    email: EmailStr | None = None
    website: HttpUrl | None = None

    @model_validator(mode="after")
    def prevent_null_name(self) -> "ProviderUpdate":
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("provider name cannot be null")
        return self


class ProviderResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str | None
    email: EmailStr | None
    website: HttpUrl | None
    created_at: datetime
    updated_at: datetime


class ProviderSummary(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str | None
    email: EmailStr | None
    website: HttpUrl | None
