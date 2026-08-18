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
_PATH_KEYS = {"db_path", "library_path"}
_REPOSITORY_PATH_ANCHOR = "knowledge/engenharia_astrologica/"


def _normalize_documented_path(value: str) -> str:
    """Normalize only documented governance paths that contain the checkout root."""

    normalized = value.replace("\\", "/")
    anchor_index = normalized.lower().find(_REPOSITORY_PATH_ANCHOR)
    is_absolute = normalized.startswith("/") or (
        len(normalized) >= 3 and normalized[1] == ":" and normalized[2] == "/"
    )
    if is_absolute and anchor_index >= 0:
        return f"<repo>/{normalized[anchor_index:]}"
    return normalized


def _normalize_documented_paths(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: (
                _normalize_documented_path(item)
                if key in _PATH_KEYS and isinstance(item, str)
                else _normalize_documented_paths(item)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_normalize_documented_paths(item) for item in value]
    return value


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
    stable = _normalize_documented_paths(normalized)
    assert isinstance(stable, dict)
    return stable


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


def _transit_birth(timezone: str) -> BirthData:
    return BirthData(
        birth_date=date(2000, 1, 1),
        birth_time=time(12, 0),
        timezone=timezone,
        latitude=40.7128 if timezone == "America/New_York" else 0.0,
        longitude=-74.0060 if timezone == "America/New_York" else 0.0,
        house_system="P",
    )


def test_frozen_output_baseline_is_bound_to_fdm712_base_engine() -> None:
    assert _BASELINE["base_commit"] == "6ddda7627e9634e91fa303e296dec79fd93b9340"
    assert _BASELINE["engine_blob"] == "44ba2ee6906ca58a56ab876fb23a417c47f8142e"


def test_digest_normalizes_only_documented_checkout_path_fields() -> None:
    checkout_a = "/tmp/a/knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite"
    checkout_b = "D:\\work\\b\\knowledge\\engenharia_astrologica\\knowledge\\build\\editorial_current.sqlite"
    rule_a = "/tmp/a/knowledge/engenharia_astrologica/library/rule.md"
    rule_b = "D:\\work\\b\\knowledge\\engenharia_astrologica\\library\\rule.md"
    left = {
        "meta": {
            "governance": {
                "receipt": {"db_path": checkout_a},
                "rules_applied": [{"library_path": rule_a}],
            }
        }
    }
    right = {
        "meta": {
            "governance": {
                "receipt": {"db_path": checkout_b},
                "rules_applied": [{"library_path": rule_b}],
            }
        }
    }

    assert _digest(left) == _digest(right)
    assert _stable(left)["meta"]["governance"]["receipt"]["db_path"].startswith("<repo>/")
    assert _digest({"detail": checkout_a}) != _digest({"detail": checkout_b})


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

    result = adapter.transits(_transit_birth("America/New_York"), as_of)
    receipt = result["meta"]["receipt"]
    assert receipt["input"]["utc_offset_minutes"] == expected_offset
    assert receipt["resolved_time"]["utc"] == expected_utc


def test_transit_rounding_rolls_235931_into_next_date() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    result = adapter.transits(
        _transit_birth("UTC"),
        datetime(2024, 1, 1, 23, 59, 31, tzinfo=UTC),
    )

    receipt = result["meta"]["receipt"]
    assert receipt["input"]["year"] == 2024
    assert receipt["input"]["month"] == 1
    assert receipt["input"]["day"] == 2
    assert receipt["input"]["hour"] == 0.0
    assert receipt["resolved_time"]["utc"] == "2024-01-02T00:00:00Z"


def test_transit_rounding_crosses_spring_forward_as_real_instant() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    zone = ZoneInfo("America/New_York")
    result = adapter.transits(
        _transit_birth("America/New_York"),
        datetime(2024, 3, 10, 1, 59, 31, tzinfo=zone),
    )

    receipt = result["meta"]["receipt"]
    assert receipt["input"]["hour"] == 3.0
    assert receipt["input"]["utc_offset_minutes"] is None
    assert receipt["resolved_time"]["local"] == "2024-03-10T03:00:00-04:00"
    assert receipt["resolved_time"]["utc"] == "2024-03-10T07:00:00Z"


def test_transit_rounding_crosses_fall_back_fold_zero_as_real_instant() -> None:
    adapter = SwissEphemerisAstrologyEngine()
    zone = ZoneInfo("America/New_York")
    result = adapter.transits(
        _transit_birth("America/New_York"),
        datetime(2024, 11, 3, 1, 59, 31, tzinfo=zone, fold=0),
    )

    receipt = result["meta"]["receipt"]
    assert receipt["input"]["hour"] == 1.0
    assert receipt["input"]["utc_offset_minutes"] == -300
    assert receipt["resolved_time"]["local"] == "2024-11-03T01:00:00-05:00"
    assert receipt["resolved_time"]["utc"] == "2024-11-03T06:00:00Z"
