"""Atomic provider-call batching and call-state workflow services."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models import (
    JobSpecification,
    JobStatus,
    Provider,
    ProviderCall,
    ProviderCallStatus,
    SpecificationStatus,
)
from app.models.domain import utc_now
from app.schemas.provider_calls import ProviderCallBatchCreate, ProviderCallUpdate
from app.services.jobs import get_job_or_404

ALLOWED_TRANSITIONS: dict[ProviderCallStatus, set[ProviderCallStatus]] = {
    ProviderCallStatus.PENDING: {
        ProviderCallStatus.IN_PROGRESS,
        ProviderCallStatus.COMPLETED,
        ProviderCallStatus.FAILED,
    },
    ProviderCallStatus.IN_PROGRESS: {
        ProviderCallStatus.COMPLETED,
        ProviderCallStatus.FAILED,
    },
    ProviderCallStatus.COMPLETED: set(),
    ProviderCallStatus.FAILED: set(),
}


def _call_query():
    return select(ProviderCall).options(selectinload(ProviderCall.provider))


def list_job_calls(db: Session, job_id: UUID) -> list[ProviderCall]:
    get_job_or_404(db, job_id)
    statement = (
        _call_query()
        .where(ProviderCall.job_id == job_id)
        .order_by(ProviderCall.created_at, ProviderCall.id)
    )
    return list(db.scalars(statement))


def get_call_or_404(db: Session, call_id: UUID) -> ProviderCall:
    call = db.scalar(_call_query().where(ProviderCall.id == call_id))
    if call is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider call not found",
        )
    return call


def create_call_batch(
    db: Session, job_id: UUID, payload: ProviderCallBatchCreate
) -> tuple[list[ProviderCall], bool]:
    job = get_job_or_404(db, job_id)
    specification = db.scalar(
        select(JobSpecification).where(JobSpecification.job_id == job_id)
    )
    if specification is None or specification.status != SpecificationStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A confirmed job specification is required",
        )

    existing_calls = list_job_calls(db, job_id)
    requested_ids = set(payload.provider_ids)
    if existing_calls:
        existing_ids = {call.provider_id for call in existing_calls}
        if len(existing_calls) == 3 and existing_ids == requested_ids:
            return existing_calls, False
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A different provider-call batch already exists for this job",
        )

    providers = list(
        db.scalars(select(Provider).where(Provider.id.in_(payload.provider_ids)))
    )
    if len(providers) != 3:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more providers were not found",
        )
    providers_by_id = {provider.id: provider for provider in providers}

    for provider_id in payload.provider_ids:
        db.add(ProviderCall(job=job, provider=providers_by_id[provider_id]))
    job.status = JobStatus.CALLS_IN_PROGRESS
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provider-call records already exist for this job",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create provider-call batch",
        ) from exc
    return list_job_calls(db, job_id), True


def _readable_transcript(transcript: list) -> str:
    return "\n".join(
        f"{turn.speaker.value.title()}: {turn.text}" for turn in transcript
    )


def update_call(
    db: Session, call_id: UUID, payload: ProviderCallUpdate
) -> ProviderCall:
    call = get_call_or_404(db, call_id)
    transcript = (
        payload.transcript if "transcript" in payload.model_fields_set else None
    )
    values = payload.model_dump(exclude_unset=True, mode="python")
    requested_status = values.pop("status", call.status)
    if (
        requested_status != call.status
        and requested_status not in ALLOWED_TRANSITIONS[call.status]
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition call from {call.status.value} to {requested_status.value}",
        )

    values.pop("transcript", None)
    if transcript is not None:
        values["transcript_json"] = [
            turn.model_dump(mode="json") for turn in transcript
        ]
        if not values.get("transcript_text"):
            values["transcript_text"] = _readable_transcript(transcript)
    if recording_url := values.get("recording_url"):
        values["recording_url"] = str(recording_url)

    call.status = requested_status
    if requested_status == ProviderCallStatus.IN_PROGRESS and not (
        values.get("started_at") or call.started_at
    ):
        values["started_at"] = utc_now()
    if requested_status == ProviderCallStatus.COMPLETED and not (
        values.get("completed_at") or call.completed_at
    ):
        values["completed_at"] = utc_now()
    for field, value in values.items():
        setattr(call, field, value)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update provider call",
        ) from exc
    return get_call_or_404(db, call_id)
