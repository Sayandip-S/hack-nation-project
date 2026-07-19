"""Intake workflow and safe upload storage services."""

from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Intake, IntakeType, JobStatus
from app.schemas.intakes import TextIntakeCreate, VoiceReferenceCreate
from app.services.jobs import get_job_or_404

ALLOWED_UPLOAD_TYPES: dict[str, tuple[str, ...]] = {
    "application/pdf": (".pdf",),
    "text/plain": (".txt",),
    "application/json": (".json",),
    "image/jpeg": (".jpg", ".jpeg"),
    "image/png": (".png",),
}
UPLOAD_CHUNK_SIZE = 1024 * 1024


def _save_intake(db: Session, intake: Intake) -> Intake:
    job = intake.job
    job.status = JobStatus.INTAKE_RECEIVED
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


def create_text_intake(db: Session, job_id: UUID, payload: TextIntakeCreate) -> Intake:
    job = get_job_or_404(db, job_id)
    return _save_intake(
        db,
        Intake(
            job=job,
            intake_type=IntakeType.TEXT,
            raw_text=payload.text,
        ),
    )


def create_voice_intake(
    db: Session, job_id: UUID, payload: VoiceReferenceCreate
) -> Intake:
    job = get_job_or_404(db, job_id)
    return _save_intake(
        db,
        Intake(
            job=job,
            intake_type=IntakeType.VOICE,
            raw_text=payload.transcript,
            external_reference=payload.conversation_id,
        ),
    )


def list_intakes(db: Session, job_id: UUID) -> list[Intake]:
    get_job_or_404(db, job_id)
    statement = (
        select(Intake)
        .where(Intake.job_id == job_id)
        .order_by(Intake.created_at, Intake.id)
    )
    return list(db.scalars(statement))


def _safe_original_name(filename: str | None) -> str | None:
    if not filename:
        return None
    return filename.replace("\\", "/").rsplit("/", maxsplit=1)[-1][:255]


def _safe_extension(original_name: str | None, content_type: str) -> str:
    allowed_extensions = ALLOWED_UPLOAD_TYPES[content_type]
    submitted_extension = Path(original_name or "").suffix.lower()
    if submitted_extension in allowed_extensions:
        return submitted_extension
    return allowed_extensions[0]


async def _write_upload(file: UploadFile, target: Path, maximum_bytes: int) -> None:
    total_bytes = 0
    try:
        with target.open("xb") as stored_file:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                total_bytes += len(chunk)
                if total_bytes > maximum_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="Uploaded file exceeds the configured size limit",
                    )
                stored_file.write(chunk)
    except HTTPException:
        target.unlink(missing_ok=True)
        raise
    except OSError as exc:
        target.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to store uploaded file",
        ) from exc
    finally:
        await file.close()

    if total_bytes == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must not be empty",
        )


async def create_document_intake(
    db: Session,
    job_id: UUID,
    file: UploadFile,
    settings: Settings,
) -> Intake:
    job = get_job_or_404(db, job_id)
    content_type = file.content_type or ""
    if content_type not in ALLOWED_UPLOAD_TYPES:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported upload content type",
        )

    original_name = _safe_original_name(file.filename)
    stored_name = f"{uuid4()}{_safe_extension(original_name, content_type)}"
    relative_path = Path(str(job_id)) / stored_name
    target_directory = settings.upload_dir / str(job_id)
    target_directory.mkdir(parents=True, exist_ok=True)
    target_path = target_directory / stored_name

    await _write_upload(
        file,
        target_path,
        maximum_bytes=settings.max_upload_size_mb * 1024 * 1024,
    )

    intake = Intake(
        job=job,
        intake_type=IntakeType.DOCUMENT,
        original_filename=original_name,
        content_type=content_type,
        file_path=relative_path.as_posix(),
    )
    try:
        return _save_intake(db, intake)
    except SQLAlchemyError as exc:
        db.rollback()
        target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save upload metadata",
        ) from exc
