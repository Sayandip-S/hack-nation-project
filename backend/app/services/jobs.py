"""Job persistence services."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Job
from app.schemas.jobs import JobCreate


def get_job_or_404(db: Session, job_id: UUID) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )
    return job


def create_job(db: Session, payload: JobCreate) -> Job:
    job = Job(**payload.model_dump(mode="json"))
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def list_jobs(db: Session, limit: int) -> list[Job]:
    statement = select(Job).order_by(desc(Job.created_at), desc(Job.id)).limit(limit)
    return list(db.scalars(statement))
