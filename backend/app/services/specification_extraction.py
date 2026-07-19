"""Orchestrate intake selection, AI extraction, and draft persistence."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Intake, JobSpecification, SpecificationStatus
from app.schemas.specifications import SpecificationExtractionResponse
from app.services import ai_providers
from app.services.jobs import get_job_or_404
from app.services.specifications import upsert_specification


def extract_specification(
    db: Session, job_id: UUID, settings: Settings
) -> SpecificationExtractionResponse:
    get_job_or_404(db, job_id)
    current = db.scalar(
        select(JobSpecification).where(JobSpecification.job_id == job_id)
    )
    if current is not None and current.status == SpecificationStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmed specifications are immutable",
        )

    intake = db.scalar(
        select(Intake)
        .where(
            Intake.job_id == job_id,
            Intake.raw_text.is_not(None),
            func.length(func.trim(Intake.raw_text)) > 0,
        )
        .order_by(Intake.sequence.desc())
        .limit(1)
    )
    if intake is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No suitable text intake is available for specification extraction",
        )

    try:
        provider = ai_providers.create_ai_provider(settings)
        result = provider.extract(intake.raw_text)
    except ai_providers.AIConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ai_providers.AIProviderResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an invalid structured response",
        ) from exc

    try:
        payload = result.extraction.to_specification_upsert()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Extraction is missing required fields: {exc}",
        ) from exc

    specification, _ = upsert_specification(db, job_id, payload)
    return SpecificationExtractionResponse(
        specification=specification,
        extraction=result.extraction,
        provider=result.provider,
        model=result.model,
        extraction_confidence=result.extraction.confidence,
        missing_fields=result.extraction.missing_fields,
        source_intake_id=intake.id,
    )
