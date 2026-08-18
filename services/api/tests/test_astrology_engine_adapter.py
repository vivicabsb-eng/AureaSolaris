from __future__ import annotations

import asyncio
import copy
import hashlib
import json
from datetime import UTC, date, datetime, time
from importlib.metadata import version as package_version
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest

from aurea_api.domain.astrology.models import BirthData
from aurea_api.infrastructure.ephemeris import adapter as adapter_module
from aurea_api.infrastructure.ephemeris.adapter import (
    SwissEphemerisAstrologyEngine,
    default_ephemeris_path,
)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BASELINE_PATH = Path(__file__).resolve().parent / "fixtures" / "astrology_base_output_hashes.json"
_BASELINE = json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
_REQUIRED_EPHEMERIS_FILES = ("seas_18.se1", "semo_18.se1", "sepl_18.se1")


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


def _digest(value: dict[str, Any]) -> str:
    payload = json.dumps(
        _stable(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _birth() -> BirthData:
    return BirthData(
        birth_date=date(2000, 1, 1),
        birth_time=time(23, 30),
        timezone="America/Sao_Paulo",
        latitude=-23.5505,
        longitude=-46.6333,
        house_system="P",
    )


def test_frozen_output_baseline_is_bound_to_fdm712_base_engine() -> None:
    assert _BASELINE["base_commit"] == "6ddda7627e9634e91fa303e296dec79fd93b9340"
    assert _BASELINE["engine_blob"] == "44ba2ee6906ca58a56ab876fb23a417c47f8142e"


def test_natal_adapter_matches_frozen_base_output() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    assert _digest(adapter.natal(_birth())) == _BASELINE["natal_sha256"]


def test_transit_adapter_matches_frozen_base_output() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    as_of = datetime(2000, 1, 2, 1, 30, tzinfo=UTC)
    result = adapter.transits(_birth(), as_of)
    assert result["meta"]["receipt"]["input"]["utc_offset_minutes"] is None
    assert _digest(result) == _BASELINE["transit_sha256"]


def test_natal_rejects_unsupported_house_system_before_certified_engine_call() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    birth = BirthData(
        birth_date=date(2000, 1, 1),
        birth_time=time(23, 30),
        timezone="America/Sao_Paulo",
        latitude=-23.5505,
        longitude=-46.6333,
        house_system="R",  # type: ignore[arg-type]
    )

    with pytest.raises(ValueError, match="house_system"):
        adapter.natal(birth)


def test_adapter_exposes_certified_version_and_real_ephemeris_readiness() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    assert adapter.version.name == "aurea-solaris-astro-engine"
    assert adapter.version.receipt_schema_version == "calculation-receipt.v1"
    assert default_ephemeris_path() == (_REPO_ROOT / "services" / "api" / "ephe").resolve()
    assert asyncio.run(adapter.readiness()) is True


def test_certified_kerykeion_runtime_pin_is_installed() -> None:
    assert package_version("kerykeion") == "5.8.1"


def test_readiness_rejects_non_swiss_fallback_flags(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for name in _REQUIRED_EPHEMERIS_FILES:
        (tmp_path / name).write_bytes(b"placeholder")

    monkeypatch.setattr(
        adapter_module.swe,
        "calc",
        lambda *_args: ((1.0, 0.0, 0.0, 0.0, 0.0, 0.0), adapter_module.swe.FLG_MOSEPH),
    )

    adapter = SwissEphemerisAstrologyEngine(tmp_path)
    assert asyncio.run(adapter.readiness()) is False


@pytest.mark.parametrize(
    ("utc_offset_minutes", "expected_utc"),
    [
        (-240, "2024-11-03T05:30:00Z"),
        (-300, "2024-11-03T06:30:00Z"),
    ],
)
def test_natal_resolves_both_dst_folds_with_explicit_birth_offset(
    utc_offset_minutes: int,
    expected_utc: str,
) -> None:
    adapter = SwissEphemerisAstrologyEngine()
    birth = BirthData(
        birth_date=date(2024, 11, 3),
        birth_time=time(1, 30),
        timezone="America/New_York",
        latitude=40.7128,
        longitude=-74.0060,
        house_system="P",
        utc_offset_minutes=utc_offset_minutes,
    )

    result = adapter.natal(birth)
    receipt = result["meta"]["receipt"]
    assert receipt["input"]["utc_offset_minutes"] == utc_offset_minutes
    assert receipt["resolved_time"]["utc"] == expected_utc


@pytest.mark.parametrize(
    ("fold", "expected_offset", "expected_utc"),
    [
        (0, -240, "2024-11-03T05:30:00Z"),
        (1, -300, "2024-11-03T06:30:00Z"),
    ],
)
def test_transit_preserves_aware_dst_fold_offset(
    fold: int,
    expected_offset: int,
    expected_utc: str,
) -> None:
    adapter = SwissEphemerisAstrologyEngine()
    zone = ZoneInfo("America/New_York")
    as_of = datetime(2024, 11, 3, 1, 30, tzinfo=zone, fold=fold)
    birth = BirthData(
        birth_date=date(2000, 1, 1),
        birth_time=time(12, 0),
        timezone="America/New_York",
        latitude=40.7128,
        longitude=-74.0060,
        house_system="P",
    )

    result = adapter.transits(birth, as_of)
    receipt = result["meta"]["receipt"]
    assert receipt["input"]["utc_offset_minutes"] == expected_offset
    assert receipt["resolved_time"]["utc"] == expected_utc
