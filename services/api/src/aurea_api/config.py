from __future__ import annotations

import os
from collections.abc import Mapping
from functools import lru_cache
from pathlib import Path
from typing import Self

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    PostgresDsn,
    SecretStr,
    TypeAdapter,
    ValidationError,
    field_validator,
)

_ENVIRONMENT_FIELDS = (
    ("environment", "AUREA_ENVIRONMENT"),
    ("supabase_url", "AUREA_SUPABASE_URL"),
    ("jwt_audience", "AUREA_JWT_AUDIENCE"),
    ("database_url", "AUREA_DATABASE_URL"),
    ("allowed_origins", "AUREA_ALLOWED_ORIGINS"),
    ("ephemeris_path", "AUREA_EPHEMERIS_PATH"),
)
_HTTP_URL = TypeAdapter(AnyHttpUrl)
_POSTGRES_DSN = TypeAdapter(PostgresDsn)


class Settings(BaseModel):
    """Validated server-side configuration for the web API."""

    model_config = ConfigDict(frozen=True, hide_input_in_errors=True)

    environment: str = Field(min_length=1)
    supabase_url: AnyHttpUrl
    jwt_audience: str = Field(min_length=1)
    database_url: SecretStr = Field(min_length=1)
    allowed_origins: tuple[str, ...] = Field(min_length=1)
    ephemeris_path: Path

    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, value: SecretStr) -> SecretStr:
        try:
            _POSTGRES_DSN.validate_python(value.get_secret_value())
        except ValidationError:
            raise ValueError("database URL must be a valid PostgreSQL DSN") from None
        return value

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _parse_allowed_origins(cls, value: object) -> object:
        if not isinstance(value, str):
            return value

        origins = tuple(origin.strip() for origin in value.split(",") if origin.strip())
        for origin in origins:
            _HTTP_URL.validate_python(origin)
        return origins

    @classmethod
    def from_env(cls, environment: Mapping[str, str] | None = None) -> Self:
        source = os.environ if environment is None else environment
        values: dict[str, object] = {}

        for field_name, variable_name in _ENVIRONMENT_FIELDS:
            raw_value = source.get(variable_name)
            if not raw_value or not raw_value.strip():
                values[field_name] = None
            elif field_name == "database_url":
                values[field_name] = SecretStr(raw_value)
            else:
                values[field_name] = raw_value

        return cls.model_validate(values)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and cache validated process configuration."""

    return Settings.from_env()
