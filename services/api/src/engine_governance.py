from __future__ import annotations

from pathlib import Path

from aurea_api.domain.astrology import governance as _governance


def _repository_default_db_path() -> Path:
    repository_root = Path(__file__).resolve().parents[3]
    candidates = [
        repository_root
        / "knowledge"
        / "engenharia_astrologica"
        / "knowledge"
        / "build"
        / "editorial_current.sqlite",
        repository_root
        / "knowledge"
        / "engenharia_astrologica"
        / "knowledge"
        / "engenharia_astrologica.sqlite",
        repository_root
        / "knowledge"
        / "engenharia_astrologica"
        / "knowledge"
        / "build"
        / "engenharia_astrologica.sqlite",
    ]
    return next((candidate for candidate in candidates if candidate.exists()), candidates[0])


_governance._resolve_default_db_path = _repository_default_db_path

EngineGovernance = _governance.EngineGovernance
EngineRule = _governance.EngineRule
ENTRYPOINT_RULES = _governance.ENTRYPOINT_RULES
GovernanceResult = _governance.GovernanceResult
ReviewTarget = _governance.ReviewTarget

__all__ = [
    "ENTRYPOINT_RULES",
    "EngineGovernance",
    "EngineRule",
    "GovernanceResult",
    "ReviewTarget",
]
