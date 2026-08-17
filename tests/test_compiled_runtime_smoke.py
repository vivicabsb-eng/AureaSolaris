"""Compiled Chrome runtime smoke test.

Starts main_api.py as a real subprocess against the compiled apps/web/dist/ frontend and
exercises the browser bridge with anonymous data only.
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DIST_INDEX = REPO_ROOT / "apps" / "web" / "dist" / "index.html"
MAIN_API = REPO_ROOT / "main_api.py"
HEALTH_POLL_INTERVAL = 0.5
HEALTH_POLL_TIMEOUT = 60.0


def _http_request(
    method: str,
    url: str,
    *,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 30.0,
) -> tuple[int, str, Any | None]:
    payload = None
    request_headers = dict(headers or {})
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")
    request = urllib.request.Request(url, data=payload, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            parsed = None
            if raw:
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = None
            return response.status, raw, parsed
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")
        parsed = None
        if raw:
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = None
        return error.code, raw, parsed


def _allocate_loopback_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def _assert_port_rebinds(port: int) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        # Linux can retain accepted connections in TIME_WAIT after the API process
        # has exited. Match normal server rebinding semantics so that state does not
        # look like a leaked listener; an actually live listener still owns the port.
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind(("127.0.0.1", port))
        listener.listen(1)


def _require_compiled_frontend() -> None:
    if DIST_INDEX.is_file():
        return
    raise RuntimeError(
        "apps/web/dist/index.html is missing. Run `npm run build` from the repository root before "
        "running tests.test_compiled_runtime_smoke."
    )


class TestCompiledRuntimeSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        _require_compiled_frontend()

    def test_compiled_runtime_serves_frontend_and_browser_bridge(self) -> None:
        token = uuid.uuid4().hex[:12]
        owner_id = f"temp-owner-{token}"
        board_id = f"board-{token}"
        anonymous_node = {"text": f"conteudo anonimo {token}"}
        api_port = _allocate_loopback_port()
        base_url = f"http://127.0.0.1:{api_port}"
        process: subprocess.Popen[str] | None = None

        with tempfile.TemporaryDirectory(prefix="aurea-compiled-smoke-") as temp_dir:
            data_dir = Path(temp_dir) / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            env = os.environ.copy()
            env["ASTRO_API_PORT"] = str(api_port)
            env["AUREA_DATA_DIR"] = str(data_dir)

            try:
                process = subprocess.Popen(
                    [sys.executable, str(MAIN_API)],
                    cwd=REPO_ROOT,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )

                deadline = time.monotonic() + HEALTH_POLL_TIMEOUT
                ready = False
                while time.monotonic() < deadline:
                    if process.poll() is not None:
                        stdout = process.stdout.read() if process.stdout else ""
                        stderr = process.stderr.read() if process.stderr else ""
                        self.fail(
                            "main_api.py exited before /health became ready:\n"
                            f"stdout:\n{stdout}\nstderr:\n{stderr}"
                        )
                    try:
                        status, _, payload = _http_request("GET", f"{base_url}/health", timeout=2.0)
                    except urllib.error.URLError:
                        time.sleep(HEALTH_POLL_INTERVAL)
                        continue
                    if status == 200 and isinstance(payload, dict) and payload.get("status") == "ok":
                        ready = True
                        break
                    time.sleep(HEALTH_POLL_INTERVAL)
                self.assertTrue(ready, f"/health did not become ready on {base_url}")

                root_status, root_body, _ = _http_request("GET", f"{base_url}/")
                self.assertEqual(root_status, 200, root_body)
                self.assertIn("Aurea Solaris", root_body)

                register_status, _, register_payload = _http_request(
                    "POST",
                    f"{base_url}/browser/command",
                    body={
                        "command": "private_account_register",
                        "args": {
                            "ownerId": owner_id,
                            "displayName": f"Pessoa {token}",
                            "loginName": f"login-{token}",
                            "password": f"senha temporaria {token} suficientemente forte",
                        },
                    },
                )
                self.assertEqual(register_status, 200, register_payload)
                self.assertIsInstance(register_payload, dict)
                session_token = register_payload.get("browser_session_token")
                self.assertIsInstance(session_token, str)
                self.assertTrue(session_token)

                session_headers = {"X-Aurea-Browser-Session": session_token}
                save_status, _, save_payload = _http_request(
                    "POST",
                    f"{base_url}/browser/command",
                    headers=session_headers,
                    body={
                        "command": "save_board",
                        "args": {
                            "boardId": board_id,
                            "name": "Caderno anonimo",
                            "nodes": [anonymous_node],
                            "edges": [],
                        },
                    },
                )
                self.assertEqual(save_status, 200, save_payload)

                load_status, _, load_payload = _http_request(
                    "POST",
                    f"{base_url}/browser/command",
                    headers=session_headers,
                    body={"command": "load_board", "args": {"boardId": board_id}},
                )
                self.assertEqual(load_status, 200, load_payload)
                self.assertIsInstance(load_payload, dict)
                loaded = load_payload.get("result")
                self.assertIsInstance(loaded, dict)
                self.assertEqual(loaded.get("owner_id"), owner_id)
                self.assertEqual(loaded.get("nodes"), [anonymous_node])

                close_status, _, close_payload = _http_request(
                    "POST",
                    f"{base_url}/browser/command",
                    headers=session_headers,
                    body={"command": "private_session_close", "args": {}},
                )
                self.assertEqual(close_status, 200, close_payload)

                denied_status, _, denied_payload = _http_request(
                    "POST",
                    f"{base_url}/browser/command",
                    headers=session_headers,
                    body={"command": "list_boards", "args": {}},
                )
                self.assertEqual(denied_status, 401, denied_payload)
            finally:
                if process is not None:
                    if process.poll() is None:
                        process.terminate()
                        try:
                            process.wait(timeout=15)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait(timeout=15)
                    if process.stdout:
                        process.stdout.close()
                    if process.stderr:
                        process.stderr.close()

        _assert_port_rebinds(api_port)


if __name__ == "__main__":
    unittest.main()
