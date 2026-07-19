"""Job request and response schemas."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import ConfigDict, EmailStr, StringConstraints

from app.models.enums import JobStatus
from app.schemas.shared import ApiModel

Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)
]
OptionalName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
OptionalPhone = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)
]


class JobCreate(ApiModel):
    title: Title
    service_type: Literal["residential_moving"] = "residential_moving"
    customer_name: OptionalName | None = None
    customer_phone: OptionalPhone | None = None
    customer_email: EmailStr | None = None


class JobResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    service_type: str
    status: JobStatus
    customer_name: str | None
    customer_phone: str | None
    customer_email: EmailStr | None
    created_at: datetime
    updated_at: datetime
