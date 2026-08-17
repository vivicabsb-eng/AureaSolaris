from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from .validation import (
    normalize_coordinate,
    normalize_iana_timezone,
    normalize_local_time,
    normalize_locale,
    normalize_required_text,
    validate_past_date,
)

RequiredText = Annotated[str, AfterValidator(normalize_required_text)]
IanaTimezone = Annotated[str, AfterValidator(normalize_iana_timezone)]
LocaleTag = Annotated[str, AfterValidator(normalize_locale)]
PastDate = Annotated[date, AfterValidator(validate_past_date)]
LocalTime = Annotated[time, AfterValidator(normalize_local_time)]
Latitude = Annotated[
    Decimal,
    Field(ge=Decimal("-90"), le=Decimal("90"), max_digits=9, decimal_places=6),
    AfterValidator(normalize_coordinate),
]
Longitude = Annotated[
    Decimal,
    Field(ge=Decimal("-180"), le=Decimal("180"), max_digits=9, decimal_places=6),
    AfterValidator(normalize_coordinate),
]
HouseSystem = Literal["P"]


class _ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProfileUpdate(_ContractModel):
    display_name: RequiredText
    timezone: IanaTimezone
    locale: LocaleTag


class ProfileResponse(_ContractModel):
    id: UUID
    display_name: RequiredText
    timezone: IanaTimezone
    locale: LocaleTag
    created_at: datetime
    updated_at: datetime


class BirthProfileUpdate(_ContractModel):
    label: RequiredText
    birth_date: PastDate
    birth_time: LocalTime
    timezone: IanaTimezone
    latitude: Latitude
    longitude: Longitude
    place: RequiredText
    house_system: HouseSystem = "P"


class BirthProfileResponse(_ContractModel):
    id: UUID
    label: RequiredText
    birth_date: PastDate
    birth_time: LocalTime
    timezone: IanaTimezone
    latitude: Latitude
    longitude: Longitude
    place: RequiredText
    house_system: HouseSystem
    is_active: bool
    created_at: datetime
    updated_at: datetime
