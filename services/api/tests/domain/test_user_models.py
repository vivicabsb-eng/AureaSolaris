from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo, reset_tzpath

import pytest
from pydantic import ValidationError

from aurea_api.domain.users.models import (
    BirthProfileResponse,
    BirthProfileUpdate,
    ProfileResponse,
    ProfileUpdate,
)


def test_profile_update_normalizes_display_name_timezone_and_locale() -> None:
    model = ProfileUpdate(
        display_name="  Fernando Dâmaso  ",
        timezone="  America/Sao_Paulo  ",
        locale="pt-br",
    )

    assert model.display_name == "Fernando Dâmaso"
    assert model.timezone == "America/Sao_Paulo"
    assert model.locale == "pt-BR"


def test_profile_update_validates_real_timezone_without_system_tzpath() -> None:
    ZoneInfo.clear_cache()
    reset_tzpath(())
    try:
        model = ProfileUpdate(
            display_name="Fernando",
            timezone="America/Sao_Paulo",
            locale="pt-BR",
        )
    finally:
        reset_tzpath()
        ZoneInfo.clear_cache()

    assert model.timezone == "America/Sao_Paulo"


@pytest.mark.parametrize("timezone", ["localtime", "posixrules"])
def test_profile_update_rejects_host_only_timezone_keys(timezone: str) -> None:
    with pytest.raises(ValidationError):
        ProfileUpdate(
            display_name="Fernando",
            timezone=timezone,
            locale="pt-BR",
        )


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("display_name", "   \t\n"),
        ("timezone", "Mars/Olympus"),
        ("locale", "pt_BR"),
        ("locale", "not-a-locale"),
    ],
)
def test_profile_update_rejects_invalid_fields(field: str, value: str) -> None:
    payload = {
        "display_name": "Fernando",
        "timezone": "America/Sao_Paulo",
        "locale": "pt-BR",
    }
    payload[field] = value

    with pytest.raises(ValidationError):
        ProfileUpdate.model_validate(payload)


def test_profile_update_rejects_nul_in_required_text() -> None:
    with pytest.raises(ValidationError):
        ProfileUpdate(
            display_name="Fernando\x00Dâmaso",
            timezone="America/Sao_Paulo",
            locale="pt-BR",
        )


def test_profile_update_rejects_client_supplied_owner_identity() -> None:
    with pytest.raises(ValidationError):
        ProfileUpdate.model_validate(
            {
                "display_name": "Fernando",
                "timezone": "America/Sao_Paulo",
                "locale": "pt-BR",
                "user_id": str(uuid4()),
            }
        )


def test_birth_profile_update_normalizes_strings_time_and_coordinates() -> None:
    yesterday = date.today() - timedelta(days=1)

    model = BirthProfileUpdate(
        label="  Meu mapa  ",
        birth_date=yesterday,
        birth_time=time(14, 30, 15, 987654),
        timezone="  America/Sao_Paulo  ",
        latitude=Decimal("0"),
        longitude=Decimal("-47.8828"),
        place="  Brasília, DF  ",
    )

    assert model.label == "Meu mapa"
    assert model.birth_time == time(14, 30, 15)
    assert model.timezone == "America/Sao_Paulo"
    assert model.latitude == Decimal("0.000000")
    assert model.longitude == Decimal("-47.882800")
    assert model.place == "Brasília, DF"
    assert model.house_system == "P"


@pytest.mark.parametrize("birth_date", [date.today(), date.today() + timedelta(days=1)])
def test_birth_profile_update_rejects_non_past_dates(birth_date: date) -> None:
    with pytest.raises(ValidationError):
        _birth_update(birth_date=birth_date)


def test_birth_profile_update_rejects_timezone_aware_local_time() -> None:
    with pytest.raises(ValidationError):
        _birth_update(birth_time=time(14, 30, tzinfo=UTC))


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("label", "  "),
        ("place", "\t"),
        ("timezone", "Invalid/Zone"),
        ("house_system", "W"),
    ],
)
def test_birth_profile_update_rejects_invalid_text_and_house_system(
    field: str, value: str
) -> None:
    with pytest.raises(ValidationError):
        _birth_update(**{field: value})


def test_birth_profile_update_rejects_nul_in_required_text() -> None:
    with pytest.raises(ValidationError):
        _birth_update(place="Brasília\x00DF")


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (Decimal("-90"), Decimal("-180")),
        (Decimal("0"), Decimal("0")),
        (Decimal("90"), Decimal("180")),
    ],
)
def test_birth_profile_update_accepts_coordinate_bounds_including_zero(
    latitude: Decimal, longitude: Decimal
) -> None:
    model = _birth_update(latitude=latitude, longitude=longitude)

    assert model.latitude == latitude.quantize(Decimal("0.000001"))
    assert model.longitude == longitude.quantize(Decimal("0.000001"))


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (Decimal("-90.000001"), Decimal("0")),
        (Decimal("90.000001"), Decimal("0")),
        (Decimal("0"), Decimal("-180.000001")),
        (Decimal("0"), Decimal("180.000001")),
        (Decimal("12.1234567"), Decimal("0")),
        (Decimal("0"), Decimal("47.1234567")),
    ],
)
def test_birth_profile_update_rejects_out_of_range_or_overprecise_coordinates(
    latitude: Decimal, longitude: Decimal
) -> None:
    with pytest.raises(ValidationError):
        _birth_update(latitude=latitude, longitude=longitude)


def test_birth_profile_update_serializes_decimal_and_time_deterministically() -> None:
    model = _birth_update(
        birth_time=time(1, 2, 3, 456789),
        latitude=Decimal("0"),
        longitude=Decimal("47.88"),
    )

    payload = model.model_dump(mode="json")

    assert payload["birth_time"] == "01:02:03"
    assert payload["latitude"] == "0.000000"
    assert payload["longitude"] == "47.880000"


def test_birth_profile_update_serializes_negative_zero_coordinates_canonically() -> None:
    model = _birth_update(latitude=Decimal("-0"), longitude=Decimal("-0.000000"))

    payload = model.model_dump(mode="json")

    assert payload["latitude"] == "0.000000"
    assert payload["longitude"] == "0.000000"
    assert not model.latitude.is_signed()
    assert not model.longitude.is_signed()


def test_update_contract_field_names_are_stable() -> None:
    assert tuple(ProfileUpdate.model_fields) == ("display_name", "timezone", "locale")
    assert tuple(BirthProfileUpdate.model_fields) == (
        "label",
        "birth_date",
        "birth_time",
        "timezone",
        "latitude",
        "longitude",
        "place",
        "house_system",
    )


def test_response_contracts_expose_private_data_without_owner_identity() -> None:
    now = datetime.now(UTC)
    profile = ProfileResponse(
        id=uuid4(),
        display_name="Fernando",
        timezone="America/Sao_Paulo",
        locale="pt-BR",
        created_at=now,
        updated_at=now,
    )
    birth = BirthProfileResponse(
        id=uuid4(),
        label="Meu mapa",
        birth_date=date.today() - timedelta(days=1),
        birth_time=time(14, 30),
        timezone="America/Sao_Paulo",
        latitude=Decimal("-15.793889"),
        longitude=Decimal("-47.882778"),
        place="Brasília, DF",
        house_system="P",
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    assert tuple(ProfileResponse.model_fields) == (
        "id",
        "display_name",
        "timezone",
        "locale",
        "created_at",
        "updated_at",
    )
    assert tuple(BirthProfileResponse.model_fields) == (
        "id",
        "label",
        "birth_date",
        "birth_time",
        "timezone",
        "latitude",
        "longitude",
        "place",
        "house_system",
        "is_active",
        "created_at",
        "updated_at",
    )
    assert "user_id" not in profile.model_dump()
    assert "user_id" not in birth.model_dump()


def _birth_update(**overrides: object) -> BirthProfileUpdate:
    payload: dict[str, object] = {
        "label": "Meu mapa",
        "birth_date": date.today() - timedelta(days=1),
        "birth_time": time(14, 30),
        "timezone": "America/Sao_Paulo",
        "latitude": Decimal("-15.793889"),
        "longitude": Decimal("-47.882778"),
        "place": "Brasília, DF",
        "house_system": "P",
    }
    payload.update(overrides)
    return BirthProfileUpdate.model_validate(payload)
