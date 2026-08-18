from __future__ import annotations

import sys
from pathlib import Path

_SERVICE_SRC = Path(__file__).resolve().parent / "services" / "api" / "src"
if str(_SERVICE_SRC) not in sys.path:
    sys.path.insert(0, str(_SERVICE_SRC))

from aurea_api.domain.astrology.engine import *  # noqa: E402,F401,F403
