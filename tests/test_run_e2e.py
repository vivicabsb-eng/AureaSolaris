from __future__ import annotations

import importlib.util
import io
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location("run_e2e", REPO_ROOT / "tools" / "run_e2e.py")
run_e2e = importlib.util.module_from_spec(_SPEC)
assert _SPEC.loader is not None
_SPEC.loader.exec_module(run_e2e)


class TestRunE2EHelpers(unittest.TestCase):
    def test_refuse_personal_data_dir_on_windows_layout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            local = Path(tmp) / "Local"
            personal = local / "Aurea Solaris" / "data"
            personal.mkdir(parents=True)
            with patch.dict(os.environ, {"LOCALAPPDATA": str(local)}, clear=False):
                self.assertTrue(run_e2e.is_forbidden_personal_data_dir(personal))
                self.assertTrue(run_e2e.is_forbidden_personal_data_dir(personal / "nested"))
                self.assertFalse(run_e2e.is_forbidden_personal_data_dir(local / "Aurea Solaris" / "test-user" / "data"))

    def test_wait_for_test_user_health_rejects_non_test(self) -> None:
        class FakeResponse:
            status_code = 200

            def json(self):
                return {"status": "ok", "test_user": False, "auth_mode": "local-owner", "browser_contract_version": 2}

        with patch.object(run_e2e, "http_get_json", return_value=FakeResponse().json()):
            with self.assertRaises(RuntimeError) as ctx:
                run_e2e.wait_for_test_user_health("http://127.0.0.1:9876", timeout_s=0.1)
            self.assertIn("test_user", str(ctx.exception).lower())

    def test_resolve_node_command_uses_cmd_shim_on_windows(self) -> None:
        expected = r"C:\Program Files\nodejs\npm.cmd"
        with patch.object(run_e2e.shutil, "which", return_value=expected) as which:
            self.assertEqual(run_e2e.resolve_node_command("npm", platform_name="nt"), expected)
        which.assert_called_once_with("npm.cmd")

    def test_resolve_node_command_uses_plain_name_off_windows(self) -> None:
        expected = "/usr/bin/npx"
        with patch.object(run_e2e.shutil, "which", return_value=expected) as which:
            self.assertEqual(run_e2e.resolve_node_command("npx", platform_name="posix"), expected)
        which.assert_called_once_with("npx")

    def test_resolve_node_command_fails_when_missing(self) -> None:
        with patch.object(run_e2e.shutil, "which", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "npm.cmd"):
                run_e2e.resolve_node_command("npm", platform_name="nt")

    def test_detects_unhandled_asgi_exception(self) -> None:
        output = "INFO startup\nERROR:    Exception in ASGI application\nTraceback ...\n"
        self.assertTrue(run_e2e.has_unhandled_api_exception(output))

    def test_normal_api_log_is_not_an_unhandled_exception(self) -> None:
        output = "[AureaSolaris] FastAPI sidecar rodando\n[AureaSolaris] Sidecar encerrando.\n"
        self.assertFalse(run_e2e.has_unhandled_api_exception(output))

    def test_frontend_ready_builds_by_default(self) -> None:
        with patch.object(run_e2e, "ensure_frontend_built") as build:
            run_e2e.ensure_frontend_ready(skip_build=False)
        build.assert_called_once_with()

    def test_frontend_ready_skip_build_requires_dist_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(run_e2e, "REPO_ROOT", Path(tmp)):
                with self.assertRaisesRegex(RuntimeError, r"apps/web/dist/index\.html"):
                    run_e2e.ensure_frontend_ready(skip_build=True)

    def test_frontend_ready_skip_build_reuses_existing_dist(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "apps" / "web" / "dist").mkdir(parents=True)
            (root / "apps" / "web" / "dist" / "index.html").write_text("ok", encoding="utf-8")
            with patch.object(run_e2e, "REPO_ROOT", root):
                with patch.object(run_e2e, "ensure_frontend_built") as build:
                    run_e2e.ensure_frontend_ready(skip_build=True)
            build.assert_not_called()

    def test_main_routes_default_to_frontend_ready(self) -> None:
        caught: BaseException | None = None
        with patch.object(run_e2e, "ensure_frontend_ready", create=True, side_effect=RuntimeError("sentinel")) as ready:
            with patch.object(run_e2e, "ensure_frontend_built", side_effect=RuntimeError("legacy-build")):
                try:
                    run_e2e.main([])
                except BaseException as exc:  # noqa: BLE001 - the assertion checks the exact type below.
                    caught = exc
        self.assertIsInstance(caught, RuntimeError)
        self.assertEqual(str(caught), "sentinel")
        ready.assert_called_once_with(skip_build=False)

    def test_main_routes_skip_build_to_frontend_ready(self) -> None:
        caught: BaseException | None = None
        with patch.object(run_e2e, "ensure_frontend_ready", create=True, side_effect=RuntimeError("sentinel")) as ready:
            try:
                run_e2e.main(["--skip-build"])
            except BaseException as exc:  # noqa: BLE001 - argparse raises SystemExit before the flag exists.
                caught = exc
        self.assertIsInstance(caught, RuntimeError)
        self.assertEqual(str(caught), "sentinel")
        ready.assert_called_once_with(skip_build=True)

    def test_cli_help_lists_skip_build(self) -> None:
        output = io.StringIO()
        with redirect_stdout(output):
            with self.assertRaises(SystemExit) as ctx:
                run_e2e.main(["--help"])
        self.assertEqual(ctx.exception.code, 0)
        self.assertIn("--skip-build", output.getvalue())


if __name__ == "__main__":
    unittest.main()
