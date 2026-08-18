from __future__ import annotations

import sys
from pathlib import Path

_REPOSITORY_ROOT = Path(__file__).resolve().parent
_SERVICE_SRC = _REPOSITORY_ROOT / "services" / "api" / "src"
if str(_SERVICE_SRC) not in sys.path:
    sys.path.insert(0, str(_SERVICE_SRC))

from aurea_api.domain.astrology import engine as _engine  # noqa: E402


def _certified_ephemeris_path() -> Path:
    bundle_root = getattr(sys, "_MEIPASS", None)
    if bool(getattr(sys, "frozen", False)) and isinstance(bundle_root, str):
        return Path(bundle_root) / "aurea_api" / "domain" / "astrology" / "ephe"
    return _REPOSITORY_ROOT / "services" / "api" / "ephe"


_engine.swe.set_ephe_path(str(_certified_ephemeris_path()))

from aurea_api.domain.astrology.engine import *  # noqa: E402,F401,F403
