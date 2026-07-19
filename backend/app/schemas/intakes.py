"""Intake request and response schemas."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import ConfigDict, StringConstraints, model_validator

from app.models.enums import IntakeType
from app.schemas.shared import ApiModel

RequiredText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100_000)
]
OptionalText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100_000)
]
ExternalReference = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]


class TextIntakeCreate(ApiModel):
    text: RequiredText


class VoiceReferenceCreate(ApiModel):
    conversation_id: ExternalReference | None = None
    transcript: OptionalText | None = None

    @model_validator(mode="after")
    def require_reference_or_transcript(self) -> "VoiceReferenceCreate":
        if self.conversation_id is None and self.transcript is None:
            raise ValueError("conversation_id or transcript is required")
        return self


class IntakeResponse(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    intake_type: IntakeType
    raw_text: str | None
    original_filename: str | None
    content_type: str | None
    file_path: str | None
    external_reference: str | None
    created_at: datetime
