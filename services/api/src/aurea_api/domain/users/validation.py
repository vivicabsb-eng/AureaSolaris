from __future__ import annotations

import re
from datetime import date, time
from decimal import Decimal
from importlib.resources import files

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


def normalize_coordinate(value: Decimal) -> Decimal:
    """Normalize valid coordinates to the database's fixed six-decimal scale."""

    if not value.is_finite():
        raise ValueError("coordinate must be finite")
    normalized = value.quantize(_COORDINATE_QUANTUM)
    return normalized.copy_abs() if normalized.is_zero() else normalized
