"""Isolated E2E harness: temp test-user data + local API + Playwright."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

_seed_path = REPO_ROOT / "tools" / "seed_test_user.py"
_seed_spec = importlib.util.spec_from_file_location("seed_test_user", _seed_path)
_seed = importlib.util.module_from_spec(_seed_spec)
assert _seed_spec.loader is not None
_seed_spec.loader.exec_module(_seed)
is_forbidden_personal_data_dir = _seed.is_forbidden_personal_data_dir
seed_test_user = _seed.seed_test_user

# Re-export for tests
__all__ = [
    "is_forbidden_personal_data_dir",
    "http_get_json",
    "wait_for_test_user_health",
    "pick_free_port",
    "resolve_node_command",
    "has_unhandled_api_exception",
    "ensure_frontend_ready",
    "main",
]


def http_get_json(url: str, timeout_s: float = 2.0) -> dict:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout_s) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_test_user_health(base_url: str, timeout_s: float = 30.0) -> dict:
    deadline = time.time() + timeout_s
    last_error = "no response"
    while time.time() < deadline:
        try:
            payload = http_get_json(f"{base_url.rstrip('/')}/health")
            if payload.get("test_user") is not True:
                raise RuntimeError(
                    f"Health at {base_url} is not test_user=true: {payload!r}"
                )
            if int(payload.get("browser_contract_version", -1)) != 2:
                raise RuntimeError(f"Unexpected browser_contract_version: {payload!r}")
            return payload
        except RuntimeError:
            raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            last_error = str(exc)
            time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for test-user health at {base_url}: {last_error}")


def pick_free_port(host: str = "127.0.0.1") -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def resolve_node_command(command: str, platform_name: str | None = None) -> str:
    """Resolve npm/npx through their Windows .cmd shims when required."""
    platform_name = platform_name or os.name
    candidate = f"{command}.cmd" if platform_name == "nt" else command
    resolved = shutil.which(candidate)
    if resolved is None:
        raise RuntimeError(f"Required command not found on PATH: {candidate}")
    return resolved


def has_unhandled_api_exception(output: str) -> bool:
    """Treat Uvicorn's uncaught ASGI exception banner as an E2E failure."""
    return "ERROR:    Exception in ASGI application" in output


def ensure_frontend_built() -> None:
    # Always rebuild so local/CI harness never serves a stale dist against newer src.
    subprocess.run([resolve_node_command("npm"), "run", "build"], cwd=REPO_ROOT, check=True)


def ensure_frontend_ready(*, skip_build: bool) -> None:
    """Build the frontend normally, or verify a CI-owned build is present."""
    if not skip_build:
        ensure_frontend_built()
        return

    dist_index = REPO_ROOT / "apps" / "web" / "dist" / "index.html"
    if not dist_index.is_file():
        raise RuntimeError(
            "--skip-build requires an existing apps/web/dist/index.html. "
            "Run `npm run build` first or omit --skip-build."
        )


def run_playwright(base_url: str) -> int:
    env = os.environ.copy()
    env["AUREA_E2E_URL"] = base_url
    completed = subprocess.run(
        [resolve_node_command("npx"), "playwright", "test", "--config=apps/web/e2e/playwright.config.ts"],
        cwd=REPO_ROOT,
        env=env,
    )
    return int(completed.returncode)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Aurea E2E against an isolated test-user API.")
    parser.add_argument("--check-forbidden", type=Path)
    parser.add_argument("--keep-temp", action="store_true", help="Do not delete temp data dir (debug).")
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Reuse an existing apps/web/dist/ build instead of rebuilding the frontend.",
    )
    args = parser.parse_args(argv)

    if args.check_forbidden is not None:
        if is_forbidden_personal_data_dir(args.check_forbidden):
            print(f"REFUSED personal data dir: {args.check_forbidden.resolve()}", file=sys.stderr)
            return 2
        print("ok")
        return 0

    ensure_frontend_ready(skip_build=args.skip_build)
    temp_root = Path(tempfile.mkdtemp(prefix="aurea-e2e-"))
    data_dir = temp_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    if is_forbidden_personal_data_dir(data_dir):
        print(f"REFUSED personal data dir: {data_dir}", file=sys.stderr)
        return 2

    api_process: subprocess.Popen | None = None
    api_log_file = None
    playwright_code: int | None = None
    api_unhandled = False
    try:
        seed_test_user(data_dir)
        port = pick_free_port()
        base_url = f"http://127.0.0.1:{port}"
        env = os.environ.copy()
        env["AUREA_DATA_DIR"] = str(data_dir)
        env["AUREA_TEST_USER"] = "1"
        env["ASTRO_API_PORT"] = str(port)
        # Force local-owner for E2E even if the parent shell has require-login.
        env.pop("AUREA_REQUIRE_LOGIN", None)

        api_log_file = (temp_root / "api.log").open("w+", encoding="utf-8")
        python = sys.executable
        api_process = subprocess.Popen(
            [python, str(REPO_ROOT / "main_api.py")],
            cwd=REPO_ROOT,
            env=env,
            stdout=api_log_file,
            stderr=subprocess.STDOUT,
        )
        wait_for_test_user_health(base_url, timeout_s=45)
        playwright_code = run_playwright(base_url)
    finally:
        if api_process is not None:
            api_process.terminate()
            try:
                api_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                api_process.kill()
                api_process.wait(timeout=5)
        if api_log_file is not None:
            api_log_file.flush()
            api_log_file.seek(0)
            api_output = api_log_file.read()
            api_log_file.close()
            if api_output:
                print(api_output, end="" if api_output.endswith("\n") else "\n")
            api_unhandled = has_unhandled_api_exception(api_output)
        if not args.keep_temp:
            shutil.rmtree(temp_root, ignore_errors=True)

    if playwright_code is None:
        return 1
    if api_unhandled:
        print("E2E failed: API emitted an unhandled ASGI exception.", file=sys.stderr)
        return 1
    return playwright_code


if __name__ == "__main__":
    raise SystemExit(main())
