"""SQLAlchemy 2 models for jobs, intake, and moving specifications."""

from datetime import UTC, date, datetime
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
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base
from app.models.enums import IntakeType, JobStatus, SpecificationStatus


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


class Intake(Base):
    __tablename__ = "intakes"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
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
