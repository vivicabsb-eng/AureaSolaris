from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_EXPECTED_DB = (
    _REPO_ROOT
    / "knowledge"
    / "engenharia_astrologica"
    / "knowledge"
    / "build"
    / "editorial_current.sqlite"
).resolve()


def test_direct_governance_import_uses_tracked_editorial_database() -> None:
    script = """
import json
from aurea_api.domain.astrology.governance import EngineGovernance

governance = EngineGovernance()
print(json.dumps({"db_path": str(governance.db_path.resolve()), "exists": governance.db_path.exists()}))
"""
    completed = subprocess.run(
        [sys.executable, "-c", script],
        cwd=_REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    assert completed.returncode == 0, completed.stderr
    payload = json.loads(completed.stdout)
    assert Path(payload["db_path"]) == _EXPECTED_DB
    assert payload["exists"] is True
