"""REST endpoints for jobs, intake, and moving specifications."""

from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.intakes import IntakeResponse, TextIntakeCreate, VoiceReferenceCreate
from app.schemas.jobs import JobCreate, JobResponse
from app.schemas.details import JobDetailsResponse
from app.schemas.recommendations import (
    ProviderRankingResponse,
    RecommendationResponse,
)
from app.schemas.specifications import (
    JobSpecificationResponse,
    SpecificationExtractionResponse,
    SpecificationUpsert,
)
from app.services import details as details_service
from app.services import intakes as intake_service
from app.services import jobs as job_service
from app.services import recommendations as recommendation_service
from app.services import specifications as specification_service
from app.services import specification_extraction as extraction_service

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreate, db: DatabaseSession):
    return job_service.create_job(db, payload)


@router.get("", response_model=list[JobResponse])
def list_jobs(
    db: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return job_service.list_jobs(db, limit)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: DatabaseSession):
    return job_service.get_job_or_404(db, job_id)


@router.post(
    "/{job_id}/intakes/text",
    response_model=IntakeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_text_intake(job_id: UUID, payload: TextIntakeCreate, db: DatabaseSession):
    return intake_service.create_text_intake(db, job_id, payload)


@router.post(
    "/{job_id}/intakes/upload",
    response_model=IntakeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    job_id: UUID,
    request: Request,
    db: DatabaseSession,
    file: Annotated[UploadFile, File()],
):
    return await intake_service.create_document_intake(
        db, job_id, file, request.app.state.settings
    )


@router.post(
    "/{job_id}/intakes/voice-reference",
    response_model=IntakeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_voice_intake(
    job_id: UUID, payload: VoiceReferenceCreate, db: DatabaseSession
):
    return intake_service.create_voice_intake(db, job_id, payload)


@router.get("/{job_id}/intakes", response_model=list[IntakeResponse])
def list_intakes(job_id: UUID, db: DatabaseSession):
    return intake_service.list_intakes(db, job_id)


@router.post(
    "/{job_id}/extract-specification",
    response_model=SpecificationExtractionResponse,
)
def extract_specification(job_id: UUID, request: Request, db: DatabaseSession):
    return extraction_service.extract_specification(
        db, job_id, request.app.state.settings
    )


@router.put("/{job_id}/specification", response_model=JobSpecificationResponse)
def upsert_specification(
    job_id: UUID,
    payload: SpecificationUpsert,
    response: Response,
    db: DatabaseSession,
):
    specification, created = specification_service.upsert_specification(
        db, job_id, payload
    )
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return specification


@router.get("/{job_id}/specification", response_model=JobSpecificationResponse)
def get_specification(job_id: UUID, db: DatabaseSession):
    return specification_service.get_specification_or_404(db, job_id)


@router.post(
    "/{job_id}/specification/confirm",
    response_model=JobSpecificationResponse,
)
def confirm_specification(job_id: UUID, db: DatabaseSession):
    return specification_service.confirm_specification(db, job_id)


@router.post("/{job_id}/rank", response_model=list[ProviderRankingResponse])
def rank_providers(job_id: UUID, db: DatabaseSession):
    return recommendation_service.rank_providers(db, job_id)


@router.get("/{job_id}/rankings", response_model=list[ProviderRankingResponse])
def list_rankings(job_id: UUID, db: DatabaseSession):
    return recommendation_service.list_rankings(db, job_id)


@router.post("/{job_id}/recommendation", response_model=RecommendationResponse)
def create_recommendation(job_id: UUID, db: DatabaseSession):
    return recommendation_service.create_recommendation(db, job_id)


@router.get("/{job_id}/recommendation", response_model=RecommendationResponse)
def get_recommendation(job_id: UUID, db: DatabaseSession):
    return recommendation_service.get_recommendation_or_404(db, job_id)


@router.get("/{job_id}/details", response_model=JobDetailsResponse)
def get_job_details(job_id: UUID, db: DatabaseSession):
    return details_service.get_job_details(db, job_id)
