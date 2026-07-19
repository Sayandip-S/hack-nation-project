"""Provider-call batch, transcript, update, and response schemas."""

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import (
    ConfigDict,
    Field,
    HttpUrl,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.models.enums import ProviderCallStatus, TranscriptSpeaker
from app.schemas.providers import ProviderSummary
from app.schemas.shared import ApiModel

ExternalId = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]
TranscriptText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200_000)
]
LongText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20_000)
]


class TranscriptTurn(ApiModel):
    speaker: TranscriptSpeaker
    text: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20_000)
    ]
    timestamp_seconds: float | None = Field(default=None, ge=0)
    sequence: int | None = Field(default=None, ge=0)


class ProviderCallBatchCreate(ApiModel):
    provider_ids: list[UUID] = Field(min_length=3, max_length=3)

    @model_validator(mode="after")
    def require_distinct_providers(self) -> "ProviderCallBatchCreate":
        if len(set(self.provider_ids)) != 3:
            raise ValueError("provider_ids must contain exactly three distinct IDs")
        return self


class ProviderCallUpdate(ApiModel):
    model_config = ConfigDict(extra="forbid")

    status: ProviderCallStatus | None = None
    external_call_id: ExternalId | None = None
    elevenlabs_conversation_id: ExternalId | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    transcript_text: TranscriptText | None = None
    transcript: list[TranscriptTurn] | None = None
    recording_url: HttpUrl | None = None
    summary: LongText | None = None
    error_message: LongText | None = None

    @model_validator(mode="after")
    def prevent_null_status(self) -> "ProviderCallUpdate":
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("status cannot be null")
        return self

    @field_validator("started_at", "completed_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("timestamps must include a timezone")
        return value


class ProviderCallResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    job_id: UUID
    provider_id: UUID
    status: ProviderCallStatus
    external_call_id: str | None
    elevenlabs_conversation_id: str | None
    started_at: datetime | None
    completed_at: datetime | None
    duration_seconds: int | None
    transcript_text: str | None
    transcript: list[TranscriptTurn] = Field(
        default_factory=list, validation_alias="transcript_json"
    )
    recording_url: HttpUrl | None
    summary: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def read_orm_transcript(cls, data: Any) -> Any:
        return data


class ProviderCallWithProviderResponse(ProviderCallResponse):
    provider: ProviderSummary
