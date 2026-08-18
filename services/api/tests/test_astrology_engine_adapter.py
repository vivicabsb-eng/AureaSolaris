from __future__ import annotations

import asyncio
import copy
from datetime import UTC, date, datetime, time
from pathlib import Path
from typing import Any

from aurea_api.domain.astrology import engine as certified_engine
from aurea_api.domain.astrology.models import BirthData
from aurea_api.infrastructure.ephemeris.adapter import (
    SwissEphemerisAstrologyEngine,
    default_ephemeris_path,
)

_REPO_ROOT = Path(__file__).resolve().parents[3]


def _stable(value: dict[str, Any]) -> dict[str, Any]:
    normalized = copy.deepcopy(value)
    meta = normalized.get("meta", {})
    receipt = meta.get("receipt")
    if isinstance(receipt, dict):
        receipt.pop("calculated_at_utc", None)
    governance = meta.get("governance")
    if isinstance(governance, dict):
        governance_receipt = governance.get("receipt")
        if isinstance(governance_receipt, dict):
            governance_receipt.pop("timestamp_utc", None)
    return normalized


def _birth() -> BirthData:
    return BirthData(
        birth_date=date(2000, 1, 1),
        birth_time=time(23, 30),
        timezone="America/Sao_Paulo",
        latitude=-23.5505,
        longitude=-46.6333,
        house_system="P",
    )


def test_natal_adapter_matches_certified_engine_result() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    birth = _birth()
    expected = certified_engine.calculate_astrology(
        year=2000,
        month=1,
        day=1,
        hour=23.5,
        lat=-23.5505,
        lon=-46.6333,
        timezone_name="America/Sao_Paulo",
        house_system="Placidus",
    )
    assert _stable(adapter.natal(birth)) == _stable(expected)


def test_transit_adapter_matches_certified_engine_result() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    birth = _birth()
    as_of = datetime(2000, 1, 2, 1, 30, tzinfo=UTC)
    expected = certified_engine.calculate_transit_positions(
        year=2000,
        month=1,
        day=1,
        hour=23.5,
        lat=-23.5505,
        lon=-46.6333,
        timezone_name="America/Sao_Paulo",
        include_asteroids=False,
    )
    assert _stable(adapter.transits(birth, as_of)) == _stable(expected)


def test_adapter_exposes_certified_version_and_real_ephemeris_readiness() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    assert adapter.version.name == "aurea-solaris-astro-engine"
    assert adapter.version.receipt_schema_version == "calculation-receipt.v1"
    assert default_ephemeris_path() == (_REPO_ROOT / "services" / "api" / "ephe").resolve()
    assert asyncio.run(adapter.readiness()) is True
