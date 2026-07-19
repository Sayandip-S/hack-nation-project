"""Assemble the complete evidence trail and workflow summary for a job."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Intake,
    JobSpecification,
    NegotiationOutcome,
    Provider,
    ProviderCallStatus,
    Recommendation,
    SpecificationStatus,
)
from app.services.jobs import get_job_or_404
from app.services.negotiations import list_job_negotiations
from app.services.provider_calls import list_job_calls
from app.services.quotes import list_job_quotes
from app.services.recommendations import list_rankings

GENUINE_OUTCOMES = {
    NegotiationOutcome.PRICE_REDUCED,
    NegotiationOutcome.TERMS_IMPROVED,
    NegotiationOutcome.PRICE_AND_TERMS_IMPROVED,
}


def get_job_details(db: Session, job_id: UUID) -> dict:
    job = get_job_or_404(db, job_id)
    intakes = list(
        db.scalars(
            select(Intake)
            .where(Intake.job_id == job_id)
            .order_by(Intake.sequence)
        )
    )
    specification = db.scalar(
        select(JobSpecification).where(JobSpecification.job_id == job_id)
    )
    calls = list_job_calls(db, job_id)
    quotes = list_job_quotes(db, job_id)
    negotiations = list_job_negotiations(db, job_id)
    rankings = list_rankings(db, job_id)
    recommendation = db.scalar(
        select(Recommendation).where(Recommendation.job_id == job_id)
    )

    provider_ids = {call.provider_id for call in calls} | {
        quote.provider_id for quote in quotes
    }
    providers = (
        list(
            db.scalars(
                select(Provider)
                .where(Provider.id.in_(provider_ids))
                .order_by(Provider.name, Provider.id)
            )
        )
        if provider_ids
        else []
    )
    transcripts = [
        {
            "provider_call_id": call.id,
            "transcript_text": call.transcript_text,
            "transcript": call.transcript_json,
        }
        for call in calls
        if call.transcript_text or call.transcript_json
    ]
    recording_references = [
        {"provider_call_id": call.id, "recording_url": call.recording_url}
        for call in calls
        if call.recording_url
    ]

    completed_call_count = sum(
        call.status == ProviderCallStatus.COMPLETED for call in calls
    )
    specification_confirmed = bool(
        specification and specification.status == SpecificationStatus.CONFIRMED
    )
    has_genuine_negotiation = any(
        negotiation.outcome in GENUINE_OUTCOMES for negotiation in negotiations
    )
    ranking_ready = bool(quotes)
    recommendation_ready = bool(rankings)
    missing_steps: list[str] = []
    if not intakes:
        missing_steps.append("intake_received")
    if not specification_confirmed:
        missing_steps.append("specification_confirmed")
    if len(calls) < 3:
        missing_steps.append("three_provider_calls")
    if completed_call_count < 3:
        missing_steps.append("all_provider_calls_completed")
    if len(quotes) < 3:
        missing_steps.append("all_three_quotes_received")
    if not has_genuine_negotiation:
        missing_steps.append("genuine_negotiation")
    if not rankings:
        missing_steps.append("rankings")
    if recommendation is None:
        missing_steps.append("recommendation")

    return {
        "job": job,
        "intakes": intakes,
        "specification": specification,
        "provider_calls": calls,
        "providers": providers,
        "transcripts": transcripts,
        "recording_references": recording_references,
        "quotes": quotes,
        "negotiations": negotiations,
        "rankings": rankings,
        "recommendation": recommendation,
        "workflow_summary": {
            "current_status": job.status,
            "intake_received": bool(intakes),
            "specification_confirmed": specification_confirmed,
            "provider_call_count": len(calls),
            "completed_call_count": completed_call_count,
            "quote_count": len(quotes),
            "all_three_quotes_received": len(quotes) >= 3,
            "negotiation_count": len(negotiations),
            "has_genuine_negotiation": has_genuine_negotiation,
            "ranking_ready": ranking_ready,
            "recommendation_ready": recommendation_ready,
            "missing_steps": missing_steps,
        },
    }
