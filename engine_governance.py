from __future__ import annotations

import sys
from pathlib import Path

_REPOSITORY_ROOT = Path(__file__).resolve().parent
_SERVICE_SRC = _REPOSITORY_ROOT / "services" / "api" / "src"
if str(_SERVICE_SRC) not in sys.path:
    sys.path.insert(0, str(_SERVICE_SRC))

from aurea_api.domain.astrology import governance as _governance  # noqa: E402


def _repository_default_db_path() -> Path:
    candidates = [
        _REPOSITORY_ROOT
        / "knowledge"
        / "engenharia_astrologica"
        / "knowledge"
        / "build"
        / "editorial_current.sqlite",
        _REPOSITORY_ROOT
        / "knowledge"
        / "engenharia_astrologica"
        / "knowledge"
        / "engenharia_astrologica.sqlite",
        _REPOSITORY_ROOT
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
