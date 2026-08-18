from __future__ import annotations

import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


class SidecarPackagingLayoutTests(unittest.TestCase):
    def test_pyinstaller_spec_uses_moved_engine_and_ephemeris_layout(self) -> None:
        spec = (REPO_ROOT / "build_sidecar.spec").read_text(encoding="utf-8").replace("\\", "/")

        self.assertIn("services/api/src", spec)
        self.assertIn("services/api/ephe", spec)
        self.assertIn("aurea_api/domain/astrology/ephe", spec)
        self.assertNotIn("('astro_engine.py', '.')", spec)

    def test_windows_build_preflights_moved_certified_assets(self) -> None:
        build = (REPO_ROOT / "build.bat").read_text(encoding="utf-8").lower()

        self.assertIn("services\\api\\src\\aurea_api\\domain\\astrology\\engine.py", build)
        self.assertIn("services\\api\\ephe\\sepl_18.se1", build)
        self.assertIn("services\\api\\ephe\\semo_18.se1", build)
        self.assertIn("services\\api\\ephe\\seas_18.se1", build)


if __name__ == "__main__":
    unittest.main()
