"""SQLAlchemy 2 models for jobs, intake, and moving specifications."""

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base
from app.models.enums import (
    IntakeType,
    JobStatus,
    NegotiationLeverageType,
    NegotiationOutcome,
    ProviderCallStatus,
    QuoteExtractionSource,
    RecommendationStatus,
    SpecificationStatus,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator[datetime]):
    """Store UTC datetimes and restore timezone information on SQLite."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(
        self, value: datetime | None, dialect: Any
    ) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("UTCDateTime requires a timezone-aware datetime")
        return value.astimezone(UTC)

    def process_result_value(
        self, value: datetime | None, dialect: Any
    ) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    service_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="residential_moving"
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, length=40),
        nullable=False,
        default=JobStatus.DRAFT,
    )
    customer_name: Mapped[str | None] = mapped_column(String(200))
    customer_phone: Mapped[str | None] = mapped_column(String(50))
    customer_email: Mapped[str | None] = mapped_column(String(320))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    intakes: Mapped[list["Intake"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    specification: Mapped["JobSpecification | None"] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    provider_calls: Mapped[list["ProviderCall"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )
    quotes: Mapped[list["Quote"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    negotiations: Mapped[list["Negotiation"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    rankings: Mapped[list["ProviderRanking"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    recommendation: Mapped["Recommendation | None"] = relationship(
        back_populates="job", cascade="all, delete-orphan", uselist=False
    )


class Intake(Base):
    __tablename__ = "intakes"
    __table_args__ = (
        CheckConstraint("sequence > 0", name="ck_intake_sequence_positive"),
        UniqueConstraint("job_id", "sequence", name="uq_intake_job_sequence"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    intake_type: Mapped[IntakeType] = mapped_column(
        Enum(IntakeType, native_enum=False, length=20), nullable=False
    )
    raw_text: Mapped[str | None] = mapped_column(Text)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(100))
    file_path: Mapped[str | None] = mapped_column(String(500))
    external_reference: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)

    job: Mapped[Job] = relationship(back_populates="intakes")


class JobSpecification(Base):
    __tablename__ = "job_specifications"
    __table_args__ = (
        CheckConstraint("version > 0", name="ck_specification_version_positive"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[SpecificationStatus] = mapped_column(
        Enum(SpecificationStatus, native_enum=False, length=20),
        nullable=False,
        default=SpecificationStatus.DRAFT,
    )
    origin_address: Mapped[str] = mapped_column(String(500), nullable=False)
    destination_address: Mapped[str] = mapped_column(String(500), nullable=False)
    move_date: Mapped[date | None] = mapped_column(Date)
    property_type: Mapped[str | None] = mapped_column(String(100))
    origin_floor: Mapped[int | None] = mapped_column(Integer)
    destination_floor: Mapped[int | None] = mapped_column(Integer)
    origin_has_elevator: Mapped[bool | None] = mapped_column(Boolean)
    destination_has_elevator: Mapped[bool | None] = mapped_column(Boolean)
    bedrooms: Mapped[int | None] = mapped_column(Integer)
    estimated_volume_m3: Mapped[float | None] = mapped_column(Float)
    distance_km: Mapped[float | None] = mapped_column(Float)
    packing_required: Mapped[bool] = mapped_column(Boolean, default=False)
    disassembly_required: Mapped[bool] = mapped_column(Boolean, default=False)
    reassembly_required: Mapped[bool] = mapped_column(Boolean, default=False)
    storage_required: Mapped[bool] = mapped_column(Boolean, default=False)
    inventory: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    special_items: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    access_notes: Mapped[str | None] = mapped_column(Text)
    additional_notes: Mapped[str | None] = mapped_column(Text)
    confirmed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    job: Mapped[Job] = relationship(back_populates="specification")


class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(320))
    website: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    provider_calls: Mapped[list["ProviderCall"]] = relationship(
        back_populates="provider"
    )
    quotes: Mapped[list["Quote"]] = relationship(back_populates="provider")
    negotiations: Mapped[list["Negotiation"]] = relationship(back_populates="provider")
    rankings: Mapped[list["ProviderRanking"]] = relationship(back_populates="provider")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="recommended_provider"
    )


class ProviderCall(Base):
    __tablename__ = "provider_calls"
    __table_args__ = (
        CheckConstraint(
            "duration_seconds IS NULL OR duration_seconds >= 0",
            name="ck_provider_call_duration_non_negative",
        ),
        UniqueConstraint("job_id", "provider_id", name="uq_provider_call_job_provider"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[UUID] = mapped_column(
        ForeignKey("providers.id"), nullable=False, index=True
    )
    status: Mapped[ProviderCallStatus] = mapped_column(
        Enum(ProviderCallStatus, native_enum=False, length=20),
        nullable=False,
        default=ProviderCallStatus.PENDING,
    )
    external_call_id: Mapped[str | None] = mapped_column(String(500))
    elevenlabs_conversation_id: Mapped[str | None] = mapped_column(String(500))
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    transcript_text: Mapped[str | None] = mapped_column(Text)
    transcript_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    recording_url: Mapped[str | None] = mapped_column(String(2_000))
    summary: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    job: Mapped[Job] = relationship(back_populates="provider_calls")
    provider: Mapped[Provider] = relationship(back_populates="provider_calls")
    quote: Mapped["Quote | None"] = relationship(
        back_populates="provider_call",
        cascade="all, delete-orphan",
        uselist=False,
    )
    negotiations: Mapped[list["Negotiation"]] = relationship(
        back_populates="provider_call", cascade="all, delete-orphan"
    )
class Quote(Base):
    __tablename__ = "quotes"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_quote_subtotal_non_negative"),
        CheckConstraint("tax_amount >= 0", name="ck_quote_tax_non_negative"),
        CheckConstraint("total_amount > 0", name="ck_quote_total_positive"),
        CheckConstraint(
            "estimated_duration_hours IS NULL OR estimated_duration_hours > 0",
            name="ck_quote_duration_positive",
        ),
        CheckConstraint(
            "extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)",
            name="ck_quote_confidence_range",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[UUID] = mapped_column(
        ForeignKey("providers.id"), nullable=False, index=True
    )
    provider_call_id: Mapped[UUID] = mapped_column(
        ForeignKey("provider_calls.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00")
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    valid_until: Mapped[date | None] = mapped_column(Date)
    availability_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    estimated_duration_hours: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    inclusions: Mapped[list[str]] = mapped_column(JSON, default=list)
    exclusions: Mapped[list[str]] = mapped_column(JSON, default=list)
    terms: Mapped[str | None] = mapped_column(Text)
    extraction_source: Mapped[QuoteExtractionSource] = mapped_column(
        Enum(QuoteExtractionSource, native_enum=False, length=30),
        nullable=False,
        default=QuoteExtractionSource.MANUAL,
    )
    extraction_confidence: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    job: Mapped[Job] = relationship(back_populates="quotes")
    provider: Mapped[Provider] = relationship(back_populates="quotes")
    provider_call: Mapped[ProviderCall] = relationship(back_populates="quote")
    items: Mapped[list["QuoteItem"]] = relationship(
        back_populates="quote",
        cascade="all, delete-orphan",
        order_by="QuoteItem.sequence",
    )
    negotiations: Mapped[list["Negotiation"]] = relationship(
        back_populates="quote",
        cascade="all, delete-orphan",
        foreign_keys="Negotiation.quote_id",
    )
    ranking: Mapped["ProviderRanking | None"] = relationship(
        back_populates="quote", cascade="all, delete-orphan", uselist=False
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="recommended_quote"
    )


class QuoteItem(Base):
    __tablename__ = "quote_items"
    __table_args__ = (
        CheckConstraint("sequence > 0", name="ck_quote_item_sequence_positive"),
        CheckConstraint("quantity > 0", name="ck_quote_item_quantity_positive"),
        CheckConstraint(
            "unit_price >= 0", name="ck_quote_item_unit_price_non_negative"
        ),
        CheckConstraint("total_price >= 0", name="ck_quote_item_total_non_negative"),
        UniqueConstraint("quote_id", "sequence", name="uq_quote_item_quote_sequence"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    quote_id: Mapped[UUID] = mapped_column(
        ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(50))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)

    quote: Mapped[Quote] = relationship(back_populates="items")


class Negotiation(Base):
    __tablename__ = "negotiations"
    __table_args__ = (
        CheckConstraint("before_total > 0", name="ck_negotiation_before_positive"),
        CheckConstraint("after_total > 0", name="ck_negotiation_after_positive"),
        CheckConstraint(
            "savings_amount >= 0", name="ck_negotiation_savings_non_negative"
        ),
        CheckConstraint(
            "savings_percentage >= 0", name="ck_negotiation_percentage_non_negative"
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[UUID] = mapped_column(
        ForeignKey("providers.id"), nullable=False
    )
    provider_call_id: Mapped[UUID] = mapped_column(
        ForeignKey("provider_calls.id", ondelete="CASCADE"), nullable=False
    )
    quote_id: Mapped[UUID] = mapped_column(
        ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    leverage_type: Mapped[NegotiationLeverageType] = mapped_column(
        Enum(NegotiationLeverageType, native_enum=False, length=30), nullable=False
    )
    leverage_description: Mapped[str] = mapped_column(Text, nullable=False)
    competing_quote_id: Mapped[UUID | None] = mapped_column(ForeignKey("quotes.id"))
    before_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    requested_total: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    after_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    savings_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    savings_percentage: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    before_terms: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    after_terms: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    outcome: Mapped[NegotiationOutcome] = mapped_column(
        Enum(NegotiationOutcome, native_enum=False, length=40), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    job: Mapped[Job] = relationship(back_populates="negotiations")
    provider: Mapped[Provider] = relationship(back_populates="negotiations")
    provider_call: Mapped[ProviderCall] = relationship(back_populates="negotiations")
    quote: Mapped[Quote] = relationship(
        back_populates="negotiations", foreign_keys=[quote_id]
    )
    competing_quote: Mapped[Quote | None] = relationship(
        foreign_keys=[competing_quote_id]
    )


class ProviderRanking(Base):
    __tablename__ = "provider_rankings"
    __table_args__ = (
        CheckConstraint("rank > 0", name="ck_provider_ranking_rank_positive"),
        UniqueConstraint("job_id", "provider_id", name="uq_ranking_job_provider"),
        UniqueConstraint("job_id", "quote_id", name="uq_ranking_job_quote"),
        UniqueConstraint("job_id", "rank", name="uq_ranking_job_rank"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[UUID] = mapped_column(
        ForeignKey("providers.id"), nullable=False, index=True
    )
    quote_id: Mapped[UUID] = mapped_column(
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    total_score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    price_score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    completeness_score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )
    availability_score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )
    negotiation_score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    final_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    warnings: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    job: Mapped[Job] = relationship(back_populates="rankings")
    provider: Mapped[Provider] = relationship(back_populates="rankings")
    quote: Mapped[Quote] = relationship(back_populates="ranking")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    recommended_provider_id: Mapped[UUID] = mapped_column(
        ForeignKey("providers.id"), nullable=False
    )
    recommended_quote_id: Mapped[UUID] = mapped_column(
        ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus, native_enum=False, length=20),
        nullable=False,
        default=RecommendationStatus.DRAFT,
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    original_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    final_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    total_savings: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, onupdate=utc_now
    )

    job: Mapped[Job] = relationship(back_populates="recommendation")
    recommended_provider: Mapped[Provider] = relationship(
        back_populates="recommendations"
    )
    recommended_quote: Mapped[Quote] = relationship(back_populates="recommendations")
