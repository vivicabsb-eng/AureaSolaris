from __future__ import annotations

import re
from datetime import UTC, date, datetime, time
from decimal import Decimal
from importlib.resources import files
from zoneinfo import ZoneInfo

_COORDINATE_QUANTUM = Decimal("0.000001")
_IANA_TIMEZONES = frozenset(
    files("tzdata").joinpath("zones").read_text(encoding="utf-8").splitlines()
)
_LOCALE_PATTERN = re.compile(
    r"^(?P<language>[A-Za-z]{2,3})"
    r"(?:-(?P<script>[A-Za-z]{4}))?"
    r"(?:-(?P<region>[A-Za-z]{2}|[0-9]{3}))?$"
)


def normalize_required_text(value: str) -> str:
    """Strip surrounding whitespace and reject unsafe private-profile text."""

    normalized = value.strip()
    if not normalized:
        raise ValueError("value must not be blank")
    if "\x00" in normalized:
        raise ValueError("value must not contain NUL characters")
    return normalized


def normalize_iana_timezone(value: str) -> str:
    """Return a trimmed timezone name from the pinned IANA tzdata package."""

    normalized = normalize_required_text(value)
    if normalized not in _IANA_TIMEZONES:
        raise ValueError("timezone must be a valid IANA timezone")
    return normalized


def normalize_locale(value: str) -> str:
    """Validate and canonicalize the locale subset used by the Web V1 contract."""

    normalized = normalize_required_text(value)
    match = _LOCALE_PATTERN.fullmatch(normalized)
    if match is None:
        raise ValueError("locale must be a valid language tag")

    parts = [match.group("language").lower()]
    script = match.group("script")
    if script is not None:
        parts.append(script.title())
    region = match.group("region")
    if region is not None:
        parts.append(region.upper() if region.isalpha() else region)
    return "-".join(parts)


def validate_past_date(value: date) -> date:
    """Reject today and future calendar dates for a birth profile."""

    if value >= date.today():
        raise ValueError("birth_date must be in the past")
    return value


def normalize_local_time(value: time) -> time:
    """Require a timezone-naive local wall time and store second precision only."""

    if value.tzinfo is not None or value.utcoffset() is not None:
        raise ValueError("birth_time must be a local time without an offset")
    return value.replace(microsecond=0, fold=0)


def validate_reproducible_birth_instant(
    birth_date: date,
    birth_time: time,
    timezone_name: str,
) -> None:
    """Reject local birth wall times that do not identify exactly one instant."""

    zone = ZoneInfo(timezone_name)
    local_naive = datetime.combine(birth_date, birth_time)
    valid_offsets: set[int] = set()

    for fold in (0, 1):
        local_aware = local_naive.replace(tzinfo=zone, fold=fold)
        offset = local_aware.utcoffset()
        if offset is None:
            continue
        round_trip = local_aware.astimezone(UTC).astimezone(zone)
        if round_trip.replace(tzinfo=None) != local_naive:
            continue
        valid_offsets.add(int(offset.total_seconds() // 60))

    if not valid_offsets:
        raise ValueError("birth date/time does not exist in the supplied IANA timezone")
    if len(valid_offsets) > 1:
        raise ValueError(
            "birth date/time is ambiguous in the supplied IANA timezone; "
            "Web V1 cannot persist a DST fold"
        )


def normalize_coordinate(value: Decimal) -> Decimal:
    """Normalize valid coordinates to the database's fixed six-decimal scale."""

    if not value.is_finite():
        raise ValueError("coordinate must be finite")
    normalized = value.quantize(_COORDINATE_QUANTUM)
    return normalized.copy_abs() if normalized.is_zero() else normalized
