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


class ProviderCallStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class TranscriptSpeaker(str, Enum):
    AGENT = "agent"
    PROVIDER = "provider"
    SYSTEM = "system"
    UNKNOWN = "unknown"


class QuoteExtractionSource(str, Enum):
    MANUAL = "manual"
    ELEVENLABS_ANALYSIS = "elevenlabs_analysis"
    TRANSCRIPT_PARSER = "transcript_parser"


class NegotiationLeverageType(str, Enum):
    COMPETING_QUOTE = "competing_quote"
    FLEXIBLE_DATE = "flexible_date"
    REDUCED_SCOPE = "reduced_scope"
    BUNDLED_SERVICES = "bundled_services"
    OTHER = "other"


class NegotiationOutcome(str, Enum):
    PRICE_REDUCED = "price_reduced"
    TERMS_IMPROVED = "terms_improved"
    PRICE_AND_TERMS_IMPROVED = "price_and_terms_improved"
    NO_CHANGE = "no_change"
    REJECTED = "rejected"
    OTHER = "other"
