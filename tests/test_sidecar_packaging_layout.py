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

    def test_source_runtime_uses_moved_ephemeris_without_git_symlink(self) -> None:
        legacy_link = REPO_ROOT / "services" / "api" / "src" / "aurea_api" / "domain" / "astrology" / "ephe"
        wrapper = (REPO_ROOT / "astro_engine.py").read_text(encoding="utf-8")

        self.assertFalse(legacy_link.exists(), "source runtime must not depend on Git symlinks")
        self.assertIn('"services" / "api" / "ephe"', wrapper)

        from astro_engine import calculate_transit_positions

        result = calculate_transit_positions(
            year=2000,
            month=1,
            day=1,
            hour=23.5,
            lat=-23.5505,
            lon=-46.6333,
            timezone_name="America/Sao_Paulo",
            include_asteroids=False,
        )
        self.assertNotIn("error", result, result.get("error"))
        self.assertEqual(result["meta"]["receipt"]["ephemeris"]["mode"], "swiss")


if __name__ == "__main__":
    unittest.main()
