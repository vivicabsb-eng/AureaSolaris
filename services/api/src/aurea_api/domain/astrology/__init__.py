from __future__ import annotations

import sys
from pathlib import Path

from . import governance as _governance
from .models import AstrologyEngine, BirthData, CertifiedCalculation, EngineVersion


def _repository_default_db_path() -> Path:
    """Resolve the tracked editorial database after relocating governance."""

    bundle_root = getattr(sys, "_MEIPASS", None)
    if bool(getattr(sys, "frozen", False)) and isinstance(bundle_root, str):
        repository_root = Path(bundle_root)
    else:
        repository_root = Path(__file__).resolve().parents[6]
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


# The certified module was moved byte-for-byte, so its __file__-relative legacy
# resolver now points inside the package. Patch only that relocation seam.
_governance._resolve_default_db_path = _repository_default_db_path

__all__ = ["AstrologyEngine", "BirthData", "CertifiedCalculation", "EngineVersion"]
