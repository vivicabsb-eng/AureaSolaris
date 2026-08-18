from __future__ import annotations

import sys
from datetime import UTC, datetime, time
from math import isfinite
from pathlib import Path
from zoneinfo import ZoneInfo

import swisseph as swe

from aurea_api.domain.astrology import engine as certified_engine
from aurea_api.domain.astrology.models import BirthData, CertifiedCalculation, EngineVersion

_REQUIRED_EPHEMERIS_FILES = ("seas_18.se1", "semo_18.se1", "sepl_18.se1")
_HOUSE_SYSTEMS = {"P": "Placidus"}


def default_ephemeris_path() -> Path:
    """Return the API-owned Swiss Ephemeris asset directory."""

    bundle_root = getattr(sys, "_MEIPASS", None)
    if bool(getattr(sys, "frozen", False)) and isinstance(bundle_root, str):
        return Path(bundle_root) / "aurea_api" / "domain" / "astrology" / "ephe"
    return Path(__file__).resolve().parents[4] / "ephe"


def _decimal_hour(value: time) -> float:
    return (
        value.hour
        + value.minute / 60.0
        + value.second / 3600.0
        + value.microsecond / 3_600_000_000.0
    )


def _ambiguous_offset_minutes(local: datetime, zone: ZoneInfo) -> int | None:
    """Return the selected offset only when the local civil time is ambiguous."""

    local_naive = local.replace(tzinfo=None)
    valid_offsets: set[int] = set()
    for fold in (0, 1):
        candidate = local_naive.replace(tzinfo=zone, fold=fold)
        candidate_offset = candidate.utcoffset()
        if candidate_offset is None:
            continue
        round_trip = candidate.astimezone(UTC).astimezone(zone)
        if round_trip.replace(tzinfo=None) == local_naive:
            valid_offsets.add(int(candidate_offset.total_seconds() // 60))

    if len(valid_offsets) <= 1:
        return None

    selected_offset = local.utcoffset()
    if selected_offset is None:
        raise ValueError("as_of must resolve to a UTC offset")
    return int(selected_offset.total_seconds() // 60)


class SwissEphemerisAstrologyEngine:
    """Pure typed adapter over the certified, unchanged calculation engine."""

    def __init__(self, ephemeris_path: Path | None = None) -> None:
        self.ephemeris_path = (ephemeris_path or default_ephemeris_path()).resolve()
        swe.set_ephe_path(str(self.ephemeris_path))

    @property
    def version(self) -> EngineVersion:
        return EngineVersion(
            name=certified_engine.ENGINE_NAME,
            version=certified_engine.ENGINE_VERSION,
            receipt_schema_version=certified_engine.RECEIPT_SCHEMA_VERSION,
        )

    async def readiness(self) -> bool:
        """Verify packaged assets and perform one real Swiss Ephemeris calculation."""

        if any(not (self.ephemeris_path / name).is_file() for name in _REQUIRED_EPHEMERIS_FILES):
            return False
        try:
            swe.set_ephe_path(str(self.ephemeris_path))
            position, returned_flags = swe.calc(
                swe.julday(2000, 1, 1, 12.0),
                swe.SUN,
                swe.FLG_SWIEPH,
            )
        except Exception:
            return False
        return (
            bool(position)
            and isfinite(float(position[0]))
            and bool(returned_flags & swe.FLG_SWIEPH)
        )

    def natal(self, birth: BirthData) -> CertifiedCalculation:
        if birth.house_system != "P":
            raise ValueError("house_system must be 'P' for Web V1")
        swe.set_ephe_path(str(self.ephemeris_path))
        return certified_engine.calculate_astrology(
            year=birth.birth_date.year,
            month=birth.birth_date.month,
            day=birth.birth_date.day,
            hour=_decimal_hour(birth.birth_time),
            lat=birth.latitude,
            lon=birth.longitude,
            timezone_name=birth.timezone,
            house_system=_HOUSE_SYSTEMS[birth.house_system],
            utc_offset_minutes=birth.utc_offset_minutes,
        )

    def transits(self, birth: BirthData, as_of: datetime) -> CertifiedCalculation:
        if as_of.tzinfo is None or as_of.utcoffset() is None:
            raise ValueError("as_of must be timezone-aware")
        zone = ZoneInfo(birth.timezone)
        local = as_of.astimezone(zone)
        utc_offset_minutes = _ambiguous_offset_minutes(local, zone)
        hour = (
            local.hour
            + local.minute / 60.0
            + local.second / 3600.0
            + local.microsecond / 3_600_000_000.0
        )
        swe.set_ephe_path(str(self.ephemeris_path))
        return certified_engine.calculate_transit_positions(
            year=local.year,
            month=local.month,
            day=local.day,
            hour=hour,
            lat=birth.latitude,
            lon=birth.longitude,
            timezone_name=birth.timezone,
            utc_offset_minutes=utc_offset_minutes,
            include_asteroids=False,
        )
