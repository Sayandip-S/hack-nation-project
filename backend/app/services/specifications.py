"""Residential-moving specification workflow services."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import JobSpecification, JobStatus, SpecificationStatus
from app.models.domain import utc_now
from app.schemas.specifications import SpecificationUpsert
from app.services.jobs import get_job_or_404


def get_specification_or_404(db: Session, job_id: UUID) -> JobSpecification:
    get_job_or_404(db, job_id)
    specification = db.scalar(
        select(JobSpecification).where(JobSpecification.job_id == job_id)
    )
    if specification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job specification not found",
        )
    return specification


def upsert_specification(
    db: Session, job_id: UUID, payload: SpecificationUpsert
) -> tuple[JobSpecification, bool]:
    job = get_job_or_404(db, job_id)
    specification = db.scalar(
        select(JobSpecification).where(JobSpecification.job_id == job_id)
    )
    created = specification is None
    if (
        specification is not None
        and specification.status == SpecificationStatus.CONFIRMED
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmed specifications are immutable",
        )

    values = payload.model_dump(mode="python")
    if specification is None:
        specification = JobSpecification(job=job, **values)
        db.add(specification)
    else:
        for field, value in values.items():
            setattr(specification, field, value)

    job.status = JobStatus.SPECIFICATION_READY
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A specification already exists for this job",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save job specification",
        ) from exc
    db.refresh(specification)
    return specification, created


def confirm_specification(db: Session, job_id: UUID) -> JobSpecification:
    specification = get_specification_or_404(db, job_id)
    if specification.status == SpecificationStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job specification is already confirmed",
        )

    specification.status = SpecificationStatus.CONFIRMED
    specification.confirmed_at = utc_now()
    specification.job.status = JobStatus.SPECIFICATION_CONFIRMED
    db.commit()
    db.refresh(specification)
    return specification
