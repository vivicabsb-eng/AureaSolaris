import os
import re
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing, contextmanager
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import main_api
from browser_workspace import list_owner_workspace_ids, save_board
from local_storage import LocalStorage


MIGRATIONS = Path(__file__).resolve().parents[1] / "src-tauri" / "migrations"


def _reset_browser_sessions() -> None:
    with main_api._BROWSER_SESSIONS_LOCK:
        main_api._BROWSER_SESSIONS.clear()
        main_api._LOCAL_BROWSER_SESSION = None


def _snapshot_owner_state(storage: LocalStorage) -> tuple[list[str], set[str]]:
    return (
        [row["account_id"] for row in storage.list_private_accounts_for_bootstrap()],
        set(list_owner_workspace_ids()),
    )


@contextmanager
def _isolated_browser_client(auth_mode: str = "local-owner"):
    _reset_browser_sessions()
    with tempfile.TemporaryDirectory() as directory:
        data_dir = Path(directory) / "browser-data"
        storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
        storage.initialize()
        with patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False):
            with patch.object(main_api, "get_storage", return_value=storage):
                with patch.object(main_api, "AUTH_MODE", auth_mode):
                    with TestClient(main_api.app, base_url="http://127.0.0.1") as client:
                        try:
                            yield client, storage, data_dir
                        finally:
                            _reset_browser_sessions()


def _disable_account(storage: LocalStorage, account_id: str) -> None:
    with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
        connection.execute(
            "UPDATE account SET disabled_at = CURRENT_TIMESTAMP WHERE id = ?",
            (account_id,),
        )
        connection.commit()


def _post_initial_access(client: TestClient):
    return client.post(
        "/browser/command",
        json={"command": "private_initial_access", "args": {}},
    )


class TestBrowserRuntime(unittest.TestCase):
    @contextmanager
    def _isolated_browser_client(self):
        _reset_browser_sessions()
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "browser-data"
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False):
                with patch.object(main_api, "get_storage", return_value=storage):
                    with TestClient(main_api.app, base_url="http://127.0.0.1") as client:
                        try:
                            yield client
                        finally:
                            _reset_browser_sessions()

    def _register_temp_owner(self, client, suffix: str | None = None) -> tuple[str, str]:
        token = suffix or uuid.uuid4().hex[:12]
        owner_id = f"temp-owner-{token}"
        response = client.post(
            "/browser/command",
            json={
                "command": "private_account_register",
                "args": {
                    "ownerId": owner_id,
                    "displayName": f"Pessoa {token}",
                    "loginName": f"login-{token}",
                    "password": f"senha temporaria {token} suficientemente forte",
                },
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return owner_id, response.json()["browser_session_token"]

    def _session_headers(self, session_token: str) -> dict[str, str]:
        return {"X-Aurea-Browser-Session": session_token}

    def _browser_command(
        self,
        client,
        session_token: str,
        command: str,
        args: dict | None = None,
    ):
        return client.post(
            "/browser/command",
            headers=self._session_headers(session_token),
            json={"command": command, "args": args or {}},
        )

    def test_browser_smoke_skips_port_bound_to_all_interfaces(self):
        powershell = shutil.which("powershell")
        if powershell is None:
            self.skipTest("PowerShell is required for the Windows browser smoke helper")

        smoke_script = Path(__file__).with_name("browser_runtime_smoke.ps1")
        runtime_path = smoke_script.parents[1] / "src-tauri" / "binaries" / "astro-engine-x86_64-pc-windows-msvc.exe"
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(("0.0.0.0", 9877))
            listener.listen(1)
            result = subprocess.run(
                [
                    powershell,
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(smoke_script),
                    "-RuntimePath",
                    str(runtime_path),
                    "-PortSelectionOnly",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

        output = f"{result.stdout}\n{result.stderr}"
        self.assertEqual(result.returncode, 0, output)
        selected = re.search(r"PORT_SELECTION api_port=(\d+)", result.stdout)
        self.assertIsNotNone(selected, output)
        self.assertNotEqual(int(selected.group(1)), 9877, output)
        self.assertIn(int(selected.group(1)), range(9878, 9900), output)

    def test_packaged_frontend_is_declared_and_mounted_after_health(self):
        repository_root = Path(__file__).resolve().parents[1]
        spec_source = (repository_root / "build_sidecar.spec").read_text(encoding="utf-8")
        api_source = (repository_root / "main_api.py").read_text(encoding="utf-8")

        self.assertRegex(spec_source, r"(?m)^frontend_datas = \[\('apps/web/dist', 'apps/web/dist'\)\]\s*$")
        health_route = api_source.index('@app.get("/health")')
        frontend_mount = api_source.index('app.mount("/", StaticFiles')
        self.assertLess(health_route, frontend_mount)

    def test_login_logo_uses_vite_asset_import_and_smoke_checks_real_landmarks(self):
        repository_root = Path(__file__).resolve().parents[1]
        login_source = (repository_root / "apps" / "web" / "src" / "components" / "LoginView.tsx").read_text(encoding="utf-8")
        smoke_source = (repository_root / "tests" / "browser_runtime_smoke.ps1").read_text(encoding="utf-8")

        self.assertIn("import aureaSymbol from '../assets/brand/logo/aurea-symbol.svg';", login_source)
        self.assertIn("<img src={aureaSymbol}", login_source)
        self.assertNotIn('src="/src/assets/brand/logo/aurea-symbol.svg"', login_source)
        self.assertNotRegex(smoke_source, r"(?i)allowlist")
        self.assertIn("getComputedStyle", smoke_source)
        self.assertIn("getBoundingClientRect", smoke_source)
        self.assertIn("window.innerWidth", smoke_source)
        self.assertIn("opacity > 0", smoke_source)
        self.assertIn("'error', 'assert'", smoke_source)
        self.assertIn("Network.responseReceived", smoke_source)
        self.assertIn("logo_404=", smoke_source)

    def test_packaged_smoke_uses_exact_root_tree_cleanup(self):
        repository_root = Path(__file__).resolve().parents[1]
        build_source = (repository_root / "build.bat").read_text(encoding="utf-8")
        packaged_source = (repository_root / "tests" / "browser_runtime_packaged_smoke.ps1").read_text(encoding="utf-8")
        helper_source = (repository_root / "tests" / "browser_runtime_process_tree.ps1").read_text(encoding="utf-8")

        self.assertIn("browser_runtime_packaged_smoke.ps1", build_source)
        self.assertNotIn("ExecutablePath", build_source)
        self.assertNotIn("Stop-Process -Id", build_source)
        self.assertIn("Stop-Tree $runtime", packaged_source)
        self.assertIn("StartTimeTicks", helper_source)
        self.assertIn("immediately before", helper_source)
        self.assertIn("limite de 50", helper_source)

    def test_browser_smoke_cleanup_tracks_process_identity_and_new_children(self):
        powershell = shutil.which("powershell")
        if powershell is None:
            self.skipTest("PowerShell is required for the Windows browser smoke helper")

        helper_path = Path(__file__).with_name("browser_runtime_process_tree.ps1")
        with tempfile.TemporaryDirectory() as directory:
            harness = Path(directory) / "process-tree-behavior.ps1"
            helper_literal = str(helper_path).replace("'", "''")
            harness.write_text(
                f"""
. '{helper_literal}'
function Fake-Identity([int]$ProcessId, [int]$ParentProcessId, [long]$Ticks) {{
    [pscustomobject]@{{ Pid = $ProcessId; ParentPid = $ParentProcessId; StartTimeTicks = $Ticks; Key = \"$ProcessId/$Ticks\" }}
}}

$root = Fake-Identity 101 1 1001
$child = Fake-Identity 202 101 2001
$active = @{{ $root.Key = $root; $child.Key = $child }}
$snapshot = {{ return @($active.Values) }}
$stopped = [Collections.Generic.List[string]]::new()
$stop = {{ param($Identity) [void]$stopped.Add($Identity.Key); [void]$active.Remove($Identity.Key) }}
Stop-Tree ([pscustomobject]@{{ Id = 101; StartTimeTicks = 1001 }}) $snapshot $stop
if (-not ($stopped -contains '202/2001') -or -not ($stopped -contains '101/1001')) {{ throw \"new child was not cleaned: $($stopped -join ',')\" }}

$oldRoot = Fake-Identity 301 1 3001
$oldChild = Fake-Identity 302 301 4001
$reusedChild = Fake-Identity 302 301 5001
$reuseState = @{{ calls = 0 }}
$reuseSnapshot = {{
    $reuseState.calls++
    if ($reuseState.calls -eq 1) {{ return @($oldRoot, $oldChild) }}
    if ($reuseState.calls -eq 2) {{ return @($oldRoot, $reusedChild) }}
    return @()
}}
$reuseStopped = [Collections.Generic.List[string]]::new()
$reuseStop = {{ param($Identity) [void]$reuseStopped.Add($Identity.Key) }}
$reuseFailure = $null
try {{ Stop-Tree ([pscustomobject]@{{ Id = 301; StartTimeTicks = 3001 }}) $reuseSnapshot $reuseStop }} catch {{ $reuseFailure = $_.Exception.Message }}
if ($null -eq $reuseFailure -or $reuseFailure -notmatch 'PID reutilizado') {{ throw 'PID reuse was not reported as cleanup failure' }}
if ($reuseStopped -contains '302/5001') {{ throw 'reused PID was stopped' }}

$replacementRoot = Fake-Identity 321 1 3201
$replacementState = @{{ calls = 0 }}
$replacementSnapshot = {{ $replacementState.calls++; return @(Fake-Identity 321 1 3301) }}
$replacementStopped = [Collections.Generic.List[string]]::new()
$replacementFailure = $null
try {{ Stop-Tree ([pscustomobject]@{{ Id = 321; StartTimeTicks = 3201 }}) $replacementSnapshot {{ param($Identity) [void]$replacementStopped.Add($Identity.Key) }} }} catch {{ $replacementFailure = $_.Exception.Message }}
if ($null -eq $replacementFailure -or $replacementFailure -notmatch 'PID reutilizado') {{ throw 'root PID replacement was not reported' }}
if ($replacementStopped.Count) {{ throw 'replacement root was stopped' }}

$raceRoot = Fake-Identity 351 1 3501
$raceChild = Fake-Identity 352 351 3601
$raceReplacement = Fake-Identity 352 351 3701
$raceState = @{{ calls = 0 }}
$raceSnapshot = {{
    $raceState.calls++
    if ($raceState.calls -eq 1) {{ return @($raceRoot, $raceChild) }}
    return @($raceRoot, $raceReplacement)
}}
$raceStopped = [Collections.Generic.List[string]]::new()
$raceFailure = $null
try {{ Stop-Tree ([pscustomobject]@{{ Id = 351; StartTimeTicks = 3501 }}) $raceSnapshot {{ param($Identity) [void]$raceStopped.Add($Identity.Key) }} }} catch {{ $raceFailure = $_.Exception.Message }}
if ($null -eq $raceFailure -or $raceFailure -notmatch 'PID reutilizado') {{ throw 'identity-to-stop race was not reported' }}
if ($raceStopped -contains '352/3701') {{ throw 'replacement child was stopped' }}

$limitRoot = Fake-Identity 371 1 3701
$limitChild = Fake-Identity 372 371 3801
$limitSnapshot = {{ return @($limitRoot, $limitChild) }}
$limitFailure = $null
try {{ Stop-Tree ([pscustomobject]@{{ Id = 371; StartTimeTicks = 3701 }}) $limitSnapshot {{ param($Identity) }} }} catch {{ $limitFailure = $_.Exception.Message }}
if ($null -eq $limitFailure -or $limitFailure -notmatch 'limite de 50') {{ throw 'graph limit exhaustion was not reported' }}

$lateRoot = Fake-Identity 401 1 6001
$departedParent = Fake-Identity 402 401 7001
$lateChild = Fake-Identity 403 402 8001
$lateState = @{{ calls = 0 }}
$lateSnapshot = {{
    $lateState.calls++
    if ($lateState.calls -eq 1) {{ return @($lateRoot, $departedParent) }}
    if ($lateState.calls -le 3) {{ return @($lateRoot, $lateChild) }}
    return @()
}}
$lateStopped = [Collections.Generic.List[string]]::new()
$lateFailure = $null
try {{ Stop-Tree ([pscustomobject]@{{ Id = 401; StartTimeTicks = 6001 }}) $lateSnapshot {{ param($Identity) [void]$lateStopped.Add($Identity.Key) }} }} catch {{ $lateFailure = $_.Exception.Message }}
if ($null -eq $lateFailure) {{ throw 'departed parent ownership failure was not reported' }}
if ($lateStopped -contains '403/8001') {{ throw 'child with unproven departed parent was stopped' }}
Write-Output \"PROCESS_TREE_PASS stopped=$($stopped -join ',') reuse_failure=$reuseFailure late_failure=$lateFailure\"
""",
                encoding="utf-8",
            )
            result = subprocess.run(
                [powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(harness)],
                capture_output=True,
                text=True,
                check=False,
            )

        output = f"{result.stdout}\n{result.stderr}"
        self.assertEqual(result.returncode, 0, output)
        self.assertIn("PROCESS_TREE_PASS", output)

    def test_browser_session_gates_private_workspace_and_keeps_owner_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "browser-data"
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False):
                with patch.object(main_api, "get_storage", return_value=storage):
                    with TestClient(main_api.app, base_url="http://127.0.0.1") as client:
                        unauthenticated = client.post(
                            "/browser/command",
                            json={"command": "list_boards", "args": {}},
                        )
                        self.assertEqual(unauthenticated.status_code, 401)

                        registered = client.post(
                            "/browser/command",
                            json={
                                "command": "private_account_register",
                                "args": {
                                    "ownerId": "browser-owner",
                                    "displayName": "Pessoa local",
                                    "loginName": "pessoa-local",
                                    "password": "uma senha local suficientemente forte",
                                },
                            },
                        )
                        self.assertEqual(registered.status_code, 200)
                        session = registered.json()["browser_session_token"]
                        headers = {"X-Aurea-Browser-Session": session}

                        saved = client.post(
                            "/browser/command",
                            headers=headers,
                            json={
                                "command": "save_board",
                                "args": {"boardId": "board-1", "name": "Estudo", "nodes": [{"id": 1}], "edges": []},
                            },
                        )
                        self.assertEqual(saved.status_code, 200)
                        loaded = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "load_board", "args": {"boardId": "board-1"}},
                        )
                        self.assertEqual(loaded.status_code, 200)
                        self.assertEqual(loaded.json()["result"]["owner_id"], "browser-owner")
                        self.assertEqual(loaded.json()["result"]["nodes"], [{"id": 1}])

                        diary = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "diary_create_entry", "args": {"title": "Nota privada"}},
                        )
                        self.assertEqual(diary.status_code, 200)
                        self.assertEqual(diary.json()["result"]["owner_id"], "browser-owner")

                        closed = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "private_session_close", "args": {}},
                        )
                        self.assertEqual(closed.status_code, 200)
                        after_close = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "list_boards", "args": {}},
                        )
                        self.assertEqual(after_close.status_code, 401)

    def test_owner_workspace_listing_does_not_create_or_read_owner_data(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "browser-data"
            with patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False):
                owners = Path(os.environ["AUREA_DATA_DIR"]) / "memory" / "owners"
                (owners / "owner-a").mkdir(parents=True)
                (owners / ".temporary").mkdir()
                self.assertEqual(list_owner_workspace_ids(), {"owner-a"})

    def test_browser_pdf_endpoint_requires_session_for_uploaded_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.object(main_api, "get_storage", return_value=storage):
                with TestClient(main_api.app, base_url="http://127.0.0.1") as client:
                    denied = client.post(
                        "/extract_pdf",
                        content=b"%PDF-invalid",
                        headers={"Content-Type": "application/pdf"},
                    )
                    self.assertEqual(denied.status_code, 401)

    def test_browser_owner_cannot_read_update_or_delete_foreign_workspace_records(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "browser-data"
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False):
                with patch.object(main_api, "get_storage", return_value=storage):
                    with TestClient(main_api.app, base_url="http://127.0.0.1") as client:
                        owner_a = client.post(
                            "/browser/command",
                            json={
                                "command": "private_account_register",
                                "args": {
                                    "ownerId": "browser-owner-a",
                                    "displayName": "Pessoa A",
                                    "loginName": "pessoa-a",
                                    "password": "senha local A suficientemente forte",
                                },
                            },
                        ).json()["browser_session_token"]
                        owner_b = client.post(
                            "/browser/command",
                            json={
                                "command": "private_account_register",
                                "args": {
                                    "ownerId": "browser-owner-b",
                                    "displayName": "Pessoa B",
                                    "loginName": "pessoa-b",
                                    "password": "senha local B suficientemente forte",
                                },
                            },
                        ).json()["browser_session_token"]

                        board = client.post(
                            "/browser/command",
                            headers={"X-Aurea-Browser-Session": owner_b},
                            json={
                                "command": "save_board",
                                "args": {
                                    "boardId": "foreign-board",
                                    "name": "Caderno de B",
                                    "nodes": [{"text": "conteudo privado de B"}],
                                    "edges": [],
                                },
                            },
                        )
                        self.assertEqual(board.status_code, 200)
                        entry = client.post(
                            "/browser/command",
                            headers={"X-Aurea-Browser-Session": owner_b},
                            json={
                                "command": "diary_create_entry",
                                "args": {"title": "Nota privada de B"},
                            },
                        ).json()["result"]

                        headers_a = {"X-Aurea-Browser-Session": owner_a}
                        foreign_board = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "load_board",
                                "args": {"boardId": "foreign-board"},
                            },
                        )
                        self.assertEqual(foreign_board.status_code, 200)
                        self.assertEqual(foreign_board.json()["result"]["nodes"], [])

                        foreign_entry = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "diary_get_entry",
                                "args": {"id": entry["id"]},
                            },
                        )
                        self.assertEqual(foreign_entry.status_code, 200)
                        self.assertIsNone(foreign_entry.json()["result"])

                        updated = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "diary_update_entry",
                                "args": {"id": entry["id"], "title": "Tentativa de A"},
                            },
                        )
                        self.assertEqual(updated.status_code, 404)

                        deleted_board = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "delete_board",
                                "args": {"boardId": "foreign-board"},
                            },
                        )
                        self.assertEqual(deleted_board.status_code, 200)
                        deleted_entry = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "diary_delete_entry",
                                "args": {"id": entry["id"]},
                            },
                        )
                        self.assertEqual(deleted_entry.status_code, 200)

                        headers_b = {"X-Aurea-Browser-Session": owner_b}
                        board_after_attempt = client.post(
                            "/browser/command",
                            headers=headers_b,
                            json={
                                "command": "load_board",
                                "args": {"boardId": "foreign-board"},
                            },
                        )
                        self.assertEqual(
                            board_after_attempt.json()["result"]["nodes"],
                            [{"text": "conteudo privado de B"}],
                        )
                        entry_after_attempt = client.post(
                            "/browser/command",
                            headers=headers_b,
                            json={
                                "command": "diary_get_entry",
                                "args": {"id": entry["id"]},
                            },
                        )
                        self.assertEqual(entry_after_attempt.status_code, 200)
                        self.assertEqual(entry_after_attempt.json()["result"]["title"], "Nota privada de B")

    def test_same_board_id_isolation_across_owners(self):
        with self._isolated_browser_client() as client:
            _, session_a = self._register_temp_owner(client, "board-a")
            _, session_b = self._register_temp_owner(client, "board-b")
            board_id = "board-shared-id"

            saved_a = self._browser_command(
                client,
                session_a,
                "save_board",
                {
                    "boardId": board_id,
                    "name": "Caderno A",
                    "nodes": [{"text": "conteudo anonimo de A"}],
                    "edges": [],
                },
            )
            self.assertEqual(saved_a.status_code, 200)
            saved_b = self._browser_command(
                client,
                session_b,
                "save_board",
                {
                    "boardId": board_id,
                    "name": "Caderno B",
                    "nodes": [{"text": "conteudo anonimo de B"}],
                    "edges": [],
                },
            )
            self.assertEqual(saved_b.status_code, 200)

            loaded_a = self._browser_command(client, session_a, "load_board", {"boardId": board_id})
            loaded_b = self._browser_command(client, session_b, "load_board", {"boardId": board_id})
            self.assertEqual(loaded_a.json()["result"]["nodes"], [{"text": "conteudo anonimo de A"}])
            self.assertEqual(loaded_b.json()["result"]["nodes"], [{"text": "conteudo anonimo de B"}])

            deleted_b = self._browser_command(client, session_b, "delete_board", {"boardId": board_id})
            self.assertEqual(deleted_b.status_code, 200)

            still_a = self._browser_command(client, session_a, "load_board", {"boardId": board_id})
            self.assertEqual(still_a.json()["result"]["nodes"], [{"text": "conteudo anonimo de A"}])

    def test_foreign_board_load_hides_other_owner_content_when_not_present(self):
        with self._isolated_browser_client() as client:
            _, session_a = self._register_temp_owner(client, "foreign-a")
            _, session_b = self._register_temp_owner(client, "foreign-b")
            board_id = "board-only-a"

            saved_a = self._browser_command(
                client,
                session_a,
                "save_board",
                {
                    "boardId": board_id,
                    "name": "Caderno exclusivo de A",
                    "nodes": [{"text": "segredo de A"}],
                    "edges": [],
                },
            )
            self.assertEqual(saved_a.status_code, 200)

            foreign_load = self._browser_command(client, session_b, "load_board", {"boardId": board_id})
            self.assertEqual(foreign_load.status_code, 200)
            self.assertEqual(foreign_load.json()["result"]["nodes"], [])

    def test_same_health_profile_id_isolation_across_owners(self):
        with self._isolated_browser_client() as client:
            _, session_a = self._register_temp_owner(client, "health-a")
            _, session_b = self._register_temp_owner(client, "health-b")
            profile_id = "profile-shared-id"

            saved_a = self._browser_command(
                client,
                session_a,
                "save_health_memory",
                {"profileId": profile_id, "memory": [{"note": "valor anonimo de A"}]},
            )
            saved_b = self._browser_command(
                client,
                session_b,
                "save_health_memory",
                {"profileId": profile_id, "memory": [{"note": "valor anonimo de B"}]},
            )
            self.assertEqual(saved_a.status_code, 200)
            self.assertEqual(saved_b.status_code, 200)

            loaded_a = self._browser_command(
                client,
                session_a,
                "load_health_memory",
                {"profileId": profile_id},
            )
            loaded_b = self._browser_command(
                client,
                session_b,
                "load_health_memory",
                {"profileId": profile_id},
            )
            self.assertEqual(loaded_a.json()["result"], [{"note": "valor anonimo de A"}])
            self.assertEqual(loaded_b.json()["result"], [{"note": "valor anonimo de B"}])

    def test_owner_id_injection_via_sidecar_returns_403(self):
        with self._isolated_browser_client() as client:
            _, session_a = self._register_temp_owner(client, "inject-a")
            self._register_temp_owner(client, "inject-b")

            post_injection = self._browser_command(
                client,
                session_a,
                "private_sidecar_request",
                {
                    "method": "POST",
                    "path": "/hermes/threads/open",
                    "body": {
                        "owner_id": "foreign-owner-b",
                        "topic_key": "isolamento",
                        "title": "Tentativa de injeção",
                    },
                },
            )
            self.assertEqual(post_injection.status_code, 403)

            get_injection = self._browser_command(
                client,
                session_a,
                "private_sidecar_request",
                {
                    "method": "GET",
                    "path": "/hermes/threads",
                    "query": {"owner_id": "foreign-owner-b"},
                },
            )
            self.assertEqual(get_injection.status_code, 403)

    def test_closed_browser_session_returns_401_for_private_operations(self):
        with self._isolated_browser_client() as client:
            _, session = self._register_temp_owner(client, "closed-session")
            headers = self._session_headers(session)

            saved = client.post(
                "/browser/command",
                headers=headers,
                json={
                    "command": "save_board",
                    "args": {"boardId": "board-closed", "name": "Caderno", "nodes": [], "edges": []},
                },
            )
            self.assertEqual(saved.status_code, 200)

            closed = client.post(
                "/browser/command",
                headers=headers,
                json={"command": "private_session_close", "args": {}},
            )
            self.assertEqual(closed.status_code, 200)

            for command, args in (
                ("list_boards", {}),
                ("load_board", {"boardId": "board-closed"}),
                ("diary_list_entries", {}),
                ("load_health_memory", {"profileId": "profile-closed"}),
                ("private_sidecar_request", {"method": "GET", "path": "/hermes/threads", "query": {}}),
            ):
                response = client.post(
                    "/browser/command",
                    headers=headers,
                    json={"command": command, "args": args},
                )
                self.assertEqual(response.status_code, 401, f"{command} should reject closed session")


class TestLocalOwnerInitialAccess(unittest.TestCase):
    def test_initial_access_creates_local_owner_on_fresh_install(self):
        with _isolated_browser_client() as (client, storage, _data_dir):
            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(
                payload["result"],
                {"kind": "local-owner", "ownerId": "local-owner", "displayName": "Aurea"},
            )
            self.assertIsInstance(payload["browser_session_token"], str)
            self.assertTrue(payload["browser_session_token"])
            self.assertEqual(
                [row["account_id"] for row in storage.list_private_accounts_for_bootstrap()],
                ["local-owner"],
            )

    def test_initial_access_reuses_the_only_enabled_existing_owner(self):
        with _isolated_browser_client() as (client, storage, data_dir):
            storage.create_private_account(
                "owner-a",
                "Pessoa Existente",
                "pessoa-a",
                password="known-password",
            )
            save_board("owner-a", "board-1", "Estudo", [{"id": 1}], [])
            self.assertEqual(list_owner_workspace_ids(), {"owner-a"})

            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(
                payload["result"],
                {"kind": "local-owner", "ownerId": "owner-a", "displayName": "Pessoa Existente"},
            )
            token = payload["browser_session_token"]
            loaded = client.post(
                "/browser/command",
                headers={"X-Aurea-Browser-Session": token},
                json={"command": "load_board", "args": {"boardId": "board-1"}},
            )
            self.assertEqual(loaded.status_code, 200)
            self.assertEqual(loaded.json()["result"]["owner_id"], "owner-a")
            self.assertEqual(loaded.json()["result"]["nodes"], [{"id": 1}])
            self.assertEqual(
                [row["account_id"] for row in storage.list_private_accounts_for_bootstrap()],
                ["owner-a"],
            )

    def test_initial_access_reuses_the_same_process_token(self):
        with _isolated_browser_client() as (client, _storage, _data_dir):
            first = _post_initial_access(client)
            second = _post_initial_access(client)
            self.assertEqual(first.status_code, 200)
            self.assertEqual(second.status_code, 200)
            token = first.json()["browser_session_token"]
            self.assertEqual(second.json()["browser_session_token"], token)
            self.assertEqual(first.json()["result"]["ownerId"], "local-owner")
            self.assertEqual(main_api._BROWSER_SESSIONS, {token: "local-owner"})
            self.assertEqual(main_api._LOCAL_BROWSER_SESSION, (token, "local-owner"))

    def test_concurrent_initial_access_keeps_one_local_token(self):
        with _isolated_browser_client() as (client, _storage, _data_dir):
            def boot(_index: int):
                return _post_initial_access(client)

            with ThreadPoolExecutor(max_workers=12) as pool:
                responses = list(pool.map(boot, range(12)))

            self.assertTrue(all(item.status_code == 200 for item in responses))
            tokens = {item.json()["browser_session_token"] for item in responses}
            self.assertEqual(len(tokens), 1)
            token = tokens.pop()
            self.assertEqual(main_api._BROWSER_SESSIONS, {token: "local-owner"})
            self.assertEqual(main_api._LOCAL_BROWSER_SESSION, (token, "local-owner"))

    def test_initial_access_rejects_disabled_owner_without_writes(self):
        with _isolated_browser_client() as (client, storage, data_dir):
            storage.create_private_account(
                "owner-a",
                "Pessoa Desativada",
                "pessoa-a",
                password="known-password",
            )
            _disable_account(storage, "owner-a")
            (data_dir / "memory" / "owners" / "owner-a").mkdir(parents=True)
            before = _snapshot_owner_state(storage)

            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 409)
            detail = response.json()["detail"]
            self.assertEqual(detail["code"], "setup-required")
            self.assertEqual(detail["reason"], "disabled-owner")
            self.assertTrue(detail["message"])
            self.assertEqual(_snapshot_owner_state(storage), before)
            self.assertEqual(main_api._BROWSER_SESSIONS, {})

    def test_initial_access_rejects_multiple_accounts_without_writes(self):
        with _isolated_browser_client() as (client, storage, data_dir):
            storage.create_private_account(
                "owner-a",
                "Pessoa A",
                "pessoa-a",
                password="known-password-a",
            )
            storage.create_private_account(
                "owner-b",
                "Pessoa B",
                "pessoa-b",
                password="known-password-b",
            )
            _disable_account(storage, "owner-b")
            (data_dir / "memory" / "owners" / "owner-a").mkdir(parents=True)
            before = _snapshot_owner_state(storage)

            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 409)
            detail = response.json()["detail"]
            self.assertEqual(detail["code"], "setup-required")
            self.assertEqual(detail["reason"], "multiple-owners")
            self.assertTrue(detail["message"])
            self.assertEqual(_snapshot_owner_state(storage), before)
            self.assertEqual(main_api._BROWSER_SESSIONS, {})

    def test_initial_access_rejects_orphan_workspace_without_writes(self):
        with _isolated_browser_client() as (client, storage, data_dir):
            (data_dir / "memory" / "owners" / "orphan-owner").mkdir(parents=True)
            before = _snapshot_owner_state(storage)
            self.assertEqual(before, ([], {"orphan-owner"}))

            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 409)
            detail = response.json()["detail"]
            self.assertEqual(detail["code"], "setup-required")
            self.assertEqual(detail["reason"], "orphan-workspace")
            self.assertTrue(detail["message"])
            self.assertEqual(_snapshot_owner_state(storage), before)
            self.assertEqual(main_api._BROWSER_SESSIONS, {})

    def test_initial_access_rejects_mismatched_workspace_without_writes(self):
        with _isolated_browser_client() as (client, storage, data_dir):
            storage.create_private_account(
                "owner-a",
                "Pessoa A",
                "pessoa-a",
                password="known-password",
            )
            (data_dir / "memory" / "owners" / "other-owner").mkdir(parents=True)
            before = _snapshot_owner_state(storage)
            self.assertEqual(before, (["owner-a"], {"other-owner"}))

            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 409)
            detail = response.json()["detail"]
            self.assertEqual(detail["code"], "setup-required")
            self.assertEqual(detail["reason"], "owner-conflict")
            self.assertTrue(detail["message"])
            self.assertEqual(_snapshot_owner_state(storage), before)
            self.assertEqual(main_api._BROWSER_SESSIONS, {})

    def test_initial_access_rejects_owner_id_unsafe_for_workspace(self):
        with _isolated_browser_client() as (client, storage, _data_dir):
            storage.create_private_account(
                "owner:1",
                "Pessoa Colon",
                "pessoa-colon",
                password="known-password",
            )
            before = _snapshot_owner_state(storage)
            self.assertEqual(before, (["owner:1"], set()))

            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 409)
            detail = response.json()["detail"]
            self.assertEqual(detail["code"], "setup-required")
            self.assertEqual(detail["reason"], "owner-conflict")
            self.assertTrue(detail["message"])
            self.assertEqual(_snapshot_owner_state(storage), before)
            self.assertEqual(main_api._BROWSER_SESSIONS, {})

    def test_initial_access_returns_login_required_in_require_login_mode(self):
        with _isolated_browser_client(auth_mode="require-login") as (client, storage, _data_dir):
            before = _snapshot_owner_state(storage)
            response = _post_initial_access(client)
            self.assertEqual(response.status_code, 403)
            detail = response.json()["detail"]
            self.assertEqual(detail["code"], "login-required")
            self.assertEqual(detail["message"], "Login local obrigatório neste runtime.")
            self.assertEqual(_snapshot_owner_state(storage), before)
            self.assertEqual(main_api._BROWSER_SESSIONS, {})

    def test_local_owner_token_can_save_and_load_private_data(self):
        with _isolated_browser_client() as (client, _storage, _data_dir):
            boot = _post_initial_access(client)
            self.assertEqual(boot.status_code, 200)
            token = boot.json()["browser_session_token"]
            owner_id = boot.json()["result"]["ownerId"]
            headers = {"X-Aurea-Browser-Session": token}
            saved = client.post(
                "/browser/command",
                headers=headers,
                json={
                    "command": "save_board",
                    "args": {
                        "boardId": "board-local",
                        "name": "Caderno local",
                        "nodes": [{"id": "n1"}],
                        "edges": [],
                    },
                },
            )
            self.assertEqual(saved.status_code, 200)
            loaded = client.post(
                "/browser/command",
                headers=headers,
                json={"command": "load_board", "args": {"boardId": "board-local"}},
            )
            self.assertEqual(loaded.status_code, 200)
            self.assertEqual(loaded.json()["result"]["owner_id"], owner_id)
            self.assertEqual(loaded.json()["result"]["nodes"], [{"id": "n1"}])


class TestBrowserRequestBoundary(unittest.TestCase):
    def setUp(self):
        _reset_browser_sessions()
        self._temp = tempfile.TemporaryDirectory()
        directory = Path(self._temp.name)
        self._data_dir = directory / "browser-data"
        self._storage = LocalStorage(directory / "app-data" / "data", MIGRATIONS)
        self._storage.initialize()
        self._patches = [
            patch.dict(os.environ, {"AUREA_DATA_DIR": str(self._data_dir)}, clear=False),
            patch.object(main_api, "get_storage", return_value=self._storage),
            patch.object(main_api, "AUTH_MODE", "local-owner"),
        ]
        for item in self._patches:
            item.start()
        self.client = TestClient(main_api.app, base_url="http://127.0.0.1")

    def tearDown(self):
        self.client.close()
        for item in reversed(self._patches):
            item.stop()
        self._temp.cleanup()
        _reset_browser_sessions()

    def test_non_loopback_host_is_rejected(self):
        response = self.client.get("/health", headers={"Host": "evil.example"})
        self.assertEqual(response.status_code, 400)

    def test_cross_site_browser_command_is_rejected(self):
        response = self.client.post(
            "/browser/command",
            json={"command": "private_initial_access", "args": {}},
            headers={"Host": "127.0.0.1:9876", "Sec-Fetch-Site": "cross-site"},
        )
        self.assertEqual(response.status_code, 403)

    def test_unapproved_origin_is_rejected(self):
        response = self.client.post(
            "/browser/command",
            json={"command": "private_initial_access", "args": {}},
            headers={"Host": "127.0.0.1:9876", "Origin": "https://evil.example"},
        )
        self.assertEqual(response.status_code, 403)

    def test_served_loopback_origin_is_allowed(self):
        response = self.client.post(
            "/browser/command",
            json={"command": "private_initial_access", "args": {}},
            headers={
                "Host": f"127.0.0.1:{main_api.API_PORT}",
                "Origin": f"http://127.0.0.1:{main_api.API_PORT}",
            },
        )
        self.assertNotEqual(response.status_code, 403)

    def test_localhost_served_origin_is_allowed(self):
        response = self.client.post(
            "/browser/command",
            json={"command": "private_initial_access", "args": {}},
            headers={
                "Host": f"localhost:{main_api.API_PORT}",
                "Origin": f"http://localhost:{main_api.API_PORT}",
            },
        )
        self.assertNotEqual(response.status_code, 403)

    def test_vite_dev_origin_127_is_allowed(self):
        response = self.client.post(
            "/browser/command",
            json={"command": "private_initial_access", "args": {}},
            headers={
                "Host": f"127.0.0.1:{main_api.API_PORT}",
                "Origin": "http://127.0.0.1:1420",
            },
        )
        self.assertNotEqual(response.status_code, 403)

    def test_vite_dev_origin_localhost_is_allowed(self):
        response = self.client.post(
            "/browser/command",
            json={"command": "private_initial_access", "args": {}},
            headers={
                "Host": f"localhost:{main_api.API_PORT}",
                "Origin": "http://localhost:1420",
            },
        )
        self.assertNotEqual(response.status_code, 403)

    def test_automation_without_origin_or_fetch_site_is_allowed(self):
        response = self.client.post(
            "/browser/command",
            json={"command": "private_initial_access", "args": {}},
            headers={"Host": f"127.0.0.1:{main_api.API_PORT}"},
        )
        self.assertNotEqual(response.status_code, 403)


class TestBrowserHealthContract(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main_api.app, base_url="http://127.0.0.1")

    def tearDown(self):
        self.client.close()

    def test_health_exposes_auth_mode_and_browser_contract_version(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn(payload["auth_mode"], {"local-owner", "require-login"})
        self.assertEqual(payload["browser_contract_version"], 2)

    def test_health_auth_mode_reflects_module_state(self):
        with patch.object(main_api, "AUTH_MODE", "require-login"):
            response = self.client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["auth_mode"], "require-login")
            self.assertEqual(response.json()["browser_contract_version"], 2)

    def test_health_test_user_false_when_env_unset(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("AUREA_TEST_USER", None)
            response = self.client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertFalse(response.json()["test_user"])

    def test_health_test_user_true_when_env_set(self):
        with patch.dict(os.environ, {"AUREA_TEST_USER": "1"}, clear=False):
            response = self.client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["test_user"])


if __name__ == "__main__":
    unittest.main()
