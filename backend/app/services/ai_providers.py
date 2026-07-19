"""AI provider abstraction for moving-specification extraction."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol

from openai import OpenAI
from pydantic import ValidationError

from app.config import Settings
from app.schemas.specifications import (
    ExtractionField,
    InventoryItem,
    MovingSpecificationExtraction,
    SpecialItem,
)

EXTRACTION_INSTRUCTIONS = """Extract only facts explicitly present in the moving intake.
Do not infer or invent values. Return null for every unknown scalar value and include
its field name in missing_fields. Use empty lists when no inventory or special items
are stated. Inventory and special-item quantities must be positive integers. Ask short,
useful clarification questions for important missing information. Do not include hidden
reasoning, commentary, or the source text outside the structured response."""

SCALAR_FIELDS: tuple[ExtractionField, ...] = (
    "origin_address",
    "destination_address",
    "move_date",
    "property_type",
    "origin_floor",
    "destination_floor",
    "origin_has_elevator",
    "destination_has_elevator",
    "bedrooms",
    "estimated_volume_m3",
    "packing_required",
    "disassembly_required",
    "reassembly_required",
    "storage_required",
    "access_notes",
    "additional_notes",
)


class AIConfigurationError(RuntimeError):
    """Raised when a selected live provider is not safely configured."""


class AIProviderResponseError(RuntimeError):
    """Raised when a provider does not return the required structured output."""


@dataclass(frozen=True)
class ExtractionResult:
    extraction: MovingSpecificationExtraction
    provider: str
    model: str


class SpecificationAIProvider(Protocol):
    provider_name: str
    model: str

    def extract(self, intake_text: str) -> ExtractionResult: ...


def _clean_address(value: str) -> str:
    return value.strip(" \t\r\n,.;")


class MockAIProvider:
    """Small deterministic parser used for tests, demos, and outage recovery."""

    provider_name = "mock"
    model = "deterministic-v1"

    def extract(self, intake_text: str) -> ExtractionResult:
        route = re.search(
            r"\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:on|by|with|in|for)\b|[.;\n]|$)",
            intake_text,
            flags=re.IGNORECASE,
        )
        origin = _clean_address(route.group(1)) if route else None
        destination = _clean_address(route.group(2)) if route else None

        date_match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", intake_text)
        move_date = None
        if date_match:
            try:
                move_date = date.fromisoformat(date_match.group(1))
            except ValueError:
                pass

        property_match = re.search(
            r"\b(apartment|house|studio|office|townhouse|flat)\b",
            intake_text,
            flags=re.IGNORECASE,
        )
        bedrooms_match = re.search(
            r"\b(\d+)\s*[- ]?bedrooms?\b", intake_text, flags=re.IGNORECASE
        )
        volume_match = re.search(
            r"\b(\d+(?:\.\d+)?)\s*(?:m3|m³|cubic meters?)\b",
            intake_text,
            flags=re.IGNORECASE,
        )

        def stated_requirement(name: str) -> bool | None:
            if re.search(rf"\b(?:no|without)\s+{name}\b", intake_text, re.IGNORECASE):
                return False
            if re.search(
                rf"\b{name}\s+(?:is\s+)?required\b", intake_text, re.IGNORECASE
            ):
                return True
            return None

        number_words = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
        inventory: list[InventoryItem] = []
        special_items: list[SpecialItem] = []
        item_pattern = re.compile(
            r"\b(\d+|one|two|three|four|five)\s+"
            r"(boxes?|sofas?|chairs?|tables?|beds?|wardrobes?|desks?|pianos?|safes?)\b",
            flags=re.IGNORECASE,
        )
        for match in item_pattern.finditer(intake_text):
            raw_quantity = match.group(1).casefold()
            quantity = (
                int(raw_quantity)
                if raw_quantity.isdigit()
                else number_words[raw_quantity]
            )
            raw_name = match.group(2).casefold()
            name = raw_name[:-2] if raw_name.endswith("es") else raw_name.rstrip("s")
            display_name = name.title()
            if name in {"piano", "safe"}:
                special_items.append(SpecialItem(name=display_name, quantity=quantity))
            else:
                inventory.append(InventoryItem(name=display_name, quantity=quantity))

        values: dict[str, Any] = {
            "origin_address": origin,
            "destination_address": destination,
            "move_date": move_date,
            "property_type": property_match.group(1).casefold()
            if property_match
            else None,
            "origin_floor": None,
            "destination_floor": None,
            "origin_has_elevator": None,
            "destination_has_elevator": None,
            "bedrooms": int(bedrooms_match.group(1)) if bedrooms_match else None,
            "estimated_volume_m3": float(volume_match.group(1))
            if volume_match
            else None,
            "packing_required": stated_requirement("packing"),
            "disassembly_required": stated_requirement("disassembly"),
            "reassembly_required": stated_requirement("reassembly"),
            "storage_required": stated_requirement("storage"),
            "access_notes": None,
            "additional_notes": None,
        }
        missing_fields = [field for field in SCALAR_FIELDS if values[field] is None]
        if not inventory:
            missing_fields.append("inventory")
        questions = [
            f"Please provide {field.replace('_', ' ')}." for field in missing_fields[:5]
        ]
        known_count = len(SCALAR_FIELDS) - sum(
            values[field] is None for field in SCALAR_FIELDS
        )
        confidence = round(0.35 + 0.6 * known_count / len(SCALAR_FIELDS), 3)
        extraction = MovingSpecificationExtraction(
            **values,
            inventory=inventory,
            special_items=special_items,
            confidence=confidence,
            missing_fields=missing_fields,
            clarification_questions=questions,
        )
        return ExtractionResult(extraction, self.provider_name, self.model)


class OpenAICompatibleProvider:
    """Shared OpenAI Responses implementation for OpenAI and xAI."""

    def __init__(
        self,
        *,
        provider_name: str,
        model: str,
        api_key: str,
        base_url: str | None = None,
        client: Any | None = None,
    ) -> None:
        self.provider_name = provider_name
        self.model = model
        self._client = client or OpenAI(api_key=api_key, base_url=base_url)

    def extract(self, intake_text: str) -> ExtractionResult:
        try:
            response = self._client.responses.parse(
                model=self.model,
                instructions=EXTRACTION_INSTRUCTIONS,
                input=intake_text,
                text_format=MovingSpecificationExtraction,
                store=False,
            )
            parsed = response.output_parsed
            if parsed is None:
                raise ValueError("missing parsed output")
            extraction = (
                parsed
                if isinstance(parsed, MovingSpecificationExtraction)
                else MovingSpecificationExtraction.model_validate(parsed)
            )
        except (ValidationError, TypeError, ValueError) as exc:
            raise AIProviderResponseError(
                "AI provider returned invalid structured output"
            ) from exc
        except Exception as exc:
            raise AIProviderResponseError("AI provider request failed") from exc
        return ExtractionResult(extraction, self.provider_name, self.model)


def create_ai_provider(
    settings: Settings, *, client: Any | None = None
) -> SpecificationAIProvider:
    if settings.ai_mock_mode or settings.ai_provider == "mock":
        return MockAIProvider()

    if settings.ai_provider == "openai":
        missing = []
        if (
            settings.openai_api_key is None
            or not settings.openai_api_key.get_secret_value()
        ):
            missing.append("OPENAI_API_KEY")
        if not settings.openai_model:
            missing.append("OPENAI_MODEL")
        if missing:
            raise AIConfigurationError(
                "Missing required settings: " + ", ".join(missing)
            )
        return OpenAICompatibleProvider(
            provider_name="openai",
            model=settings.openai_model,
            api_key=settings.openai_api_key.get_secret_value(),
            client=client,
        )

    missing = []
    if settings.xai_api_key is None or not settings.xai_api_key.get_secret_value():
        missing.append("XAI_API_KEY")
    if not settings.xai_model:
        missing.append("XAI_MODEL")
    if missing:
        raise AIConfigurationError("Missing required settings: " + ", ".join(missing))
    return OpenAICompatibleProvider(
        provider_name="xai",
        model=settings.xai_model,
        api_key=settings.xai_api_key.get_secret_value(),
        base_url=settings.xai_base_url,
        client=client,
    )
