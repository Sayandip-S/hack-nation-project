"""Complete job evidence and workflow-progress response."""

from uuid import UUID

from pydantic import Field

from app.models.enums import JobStatus
from app.schemas.intakes import IntakeResponse
from app.schemas.jobs import JobResponse
from app.schemas.negotiations import NegotiationResponse
from app.schemas.provider_calls import ProviderCallWithProviderResponse, TranscriptTurn
from app.schemas.providers import ProviderResponse
from app.schemas.quotes import QuoteWithProviderResponse
from app.schemas.recommendations import (
    ProviderRankingResponse,
    RecommendationResponse,
)
from app.schemas.shared import ApiModel
from app.schemas.specifications import JobSpecificationResponse


class TranscriptReference(ApiModel):
    provider_call_id: UUID
    transcript_text: str | None
    transcript: list[TranscriptTurn] = Field(default_factory=list)


class RecordingReference(ApiModel):
    provider_call_id: UUID
    recording_url: str


class WorkflowSummary(ApiModel):
    current_status: JobStatus
    intake_received: bool
    specification_confirmed: bool
    provider_call_count: int
    completed_call_count: int
    quote_count: int
    all_three_quotes_received: bool
    negotiation_count: int
    has_genuine_negotiation: bool
    ranking_ready: bool
    recommendation_ready: bool
    missing_steps: list[str]


class JobDetailsResponse(ApiModel):
    job: JobResponse
    intakes: list[IntakeResponse]
    specification: JobSpecificationResponse | None
    provider_calls: list[ProviderCallWithProviderResponse]
    providers: list[ProviderResponse]
    transcripts: list[TranscriptReference]
    recording_references: list[RecordingReference]
    quotes: list[QuoteWithProviderResponse]
    negotiations: list[NegotiationResponse]
    rankings: list[ProviderRankingResponse]
    recommendation: RecommendationResponse | None
    workflow_summary: WorkflowSummary
