"""Shared Pydantic behavior for request normalization."""

from typing import Any

from pydantic import BaseModel, model_validator


class ApiModel(BaseModel):
    """Normalize surrounding whitespace and turn blank optional strings into null."""

    @model_validator(mode="before")
    @classmethod
    def normalize_strings(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        normalized = {}
        for key, value in data.items():
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    value = None
            normalized[key] = value
        return normalized
