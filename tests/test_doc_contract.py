from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from tools.check_docs import (
    check_active_guidance,
    check_current_state_metadata,
    check_markdown_links,
    classify_document,
    validate_repository,
)


REPO_ROOT = Path(__file__).resolve().parents[1]


class DocumentationDriftGuardTests(unittest.TestCase):
    def test_current_repository_satisfies_documentation_contract(self) -> None:
        violations = validate_repository(REPO_ROOT, now=datetime(2026, 8, 24, tzinfo=timezone.utc))
        self.assertEqual([violation.render() for violation in violations], [])

    def test_broken_internal_link_reports_file_and_rule(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "docs" / "guide.md"
            source.parent.mkdir(parents=True)
            source.write_text("See [missing](missing.md).\n", encoding="utf-8")

            violations = check_markdown_links(root, [source])

        self.assertEqual(len(violations), 1)
        rendered = violations[0].render()
        self.assertIn("docs/guide.md", rendered)
        self.assertIn("[link.missing]", rendered)
        self.assertIn("missing.md", rendered)

    def test_active_railway_hosting_contradiction_is_rejected(self) -> None:
        violations = check_active_guidance(
            Path("docs/guide.md"),
            "Railway hosts the Web V1 API in production.\n",
        )

        self.assertEqual(len(violations), 1)
        self.assertIn("[runtime.railway_active]", violations[0].render())

    def test_direct_development_in_deployment_mirror_is_rejected(self) -> None:
        violations = check_active_guidance(
            Path("README.md"),
            "Develop features directly in fernandodamaso/AureaSolaris-deploy.\n",
        )

        self.assertEqual(len(violations), 1)
        self.assertIn("[repo.mirror_development]", violations[0].render())

    def test_historical_evidence_and_planning_paths_are_not_active_guidance(self) -> None:
        self.assertEqual(classify_document(Path("docs/archive/desktop-history.md")), "historical")
        self.assertEqual(
            classify_document(Path("docs/operations/deployments/2026-08-10.md")),
            "historical",
        )
        self.assertEqual(
            classify_document(Path("docs/operations/WEB_V1_COMPLETION_REPORT.md")),
            "historical",
        )
        self.assertEqual(classify_document(Path("docs/ROADMAP.md")), "planning")
        self.assertEqual(classify_document(Path("docs/google-calendar-integration.md")), "planning")
        self.assertEqual(classify_document(Path("docs/EPHEMERIDES_AND_CALENDAR_PLAN.md")), "planning")

    def test_explicit_retired_runtime_and_deployment_only_statements_are_allowed(self) -> None:
        text = (
            "Tauri is retired and is not a supported runtime.\n"
            "Railway is not part of Web V1.\n"
            "The former SQLite product store is historical only.\n"
            "Do not develop in fernandodamaso/AureaSolaris-deploy; it is deployment-only.\n"
            "fernandodamaso/AureaSolaris-deploy is an exact-SHA deployment mirror, not an alternate schema-development repository.\n"
        )

        self.assertEqual(check_active_guidance(Path("docs/guide.md"), text), [])

    def test_current_state_rejects_malformed_sha(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "CURRENT_STATE.md"
            path.write_text(
                "# State\n\n"
                "Snapshot: **2026-08-24T17:25Z**  \n"
                "Upstream `main` at snapshot: **`not-a-sha`**\n",
                encoding="utf-8",
            )

            violations = check_current_state_metadata(
                path,
                now=datetime(2026, 8, 24, tzinfo=timezone.utc),
            )

        self.assertTrue(any("[snapshot.sha]" in item.render() for item in violations))

    def test_current_state_rejects_clearly_stale_snapshot_without_head_equality_noise(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "CURRENT_STATE.md"
            path.write_text(
                "# State\n\n"
                "Snapshot: **2026-01-01T00:00Z**  \n"
                "Upstream `main` at snapshot: **`0123456789abcdef0123456789abcdef01234567`**\n",
                encoding="utf-8",
            )

            violations = check_current_state_metadata(
                path,
                now=datetime(2026, 8, 24, tzinfo=timezone.utc),
                max_age_days=180,
            )

        self.assertTrue(any("[snapshot.stale]" in item.render() for item in violations))


if __name__ == "__main__":
    unittest.main()
