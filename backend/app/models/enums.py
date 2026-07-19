"""Explicit workflow enums shared by models and schemas."""

from enum import Enum


class JobStatus(str, Enum):
    DRAFT = "draft"
    INTAKE_RECEIVED = "intake_received"
    SPECIFICATION_READY = "specification_ready"
    SPECIFICATION_CONFIRMED = "specification_confirmed"
    CALLS_IN_PROGRESS = "calls_in_progress"
    QUOTES_RECEIVED = "quotes_received"
    NEGOTIATION_COMPLETE = "negotiation_complete"
    RECOMMENDATION_READY = "recommendation_ready"
    COMPLETED = "completed"
    FAILED = "failed"


class IntakeType(str, Enum):
    TEXT = "text"
    DOCUMENT = "document"
    VOICE = "voice"


class SpecificationStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
