from __future__ import annotations

import base64
import json
import os
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

REPO_ROOT = Path(__file__).resolve().parents[1]
RUNNER_BRANCH = "fdm-736/hosted-e2e-runner-v2"
HELPER_URL = "https://rosklqnnbmhowohoyboj.supabase.co/functions/v1/fdm-736-audit-helper"
WEB_URL = "https://aurea-solaris-f0whqpl0m-fernando-damasos-projects.vercel.app"
API_URL = "https://aurea-solaris-4lxgl66k1-fernando-damasos-projects.vercel.app"
PRODUCTION_API = "https://aurea-solaris-api.vercel.app"
PRODUCTION_SUPABASE = "https://tgpcpxqqusehssaihvcp.supabase.co"
AAD = b"FDM-736-hosted-audit"


def _run(command: list[str], *, env: dict[str, str] | None = None) -> None:
    subprocess.run(command, cwd=REPO_ROOT, env=env, check=True)


def _mask(value: str) -> None:
    print(f"::add-mask::{value}", flush=True)


def _helper(body: dict[str, str]) -> tuple[int, dict]:
    request = urllib.request.Request(
        HELPER_URL,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        return exc.code, json.loads(raw) if raw else {}


def _wait_for_sealed_input(run_id: str, timeout_s: float = 420.0) -> dict[str, str]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        status, payload = _helper({"action": "fetch-payload", "run_id": run_id})
        if status == 200 and payload.get("ready") is True:
            sealed = payload.get("sealed")
            if isinstance(sealed, dict):
                return sealed
        elif status != 202:
            raise RuntimeError(f"Unexpected audit helper fetch status: {status}")
        time.sleep(5)
    raise RuntimeError("Timed out waiting for encrypted FDM-736 hosted-audit input.")


def _decrypt(private_key_path: Path, sealed: dict[str, str]) -> dict[str, str]:
    private_key = serialization.load_pem_private_key(private_key_path.read_bytes(), password=None)
    aes_key = private_key.decrypt(
        base64.b64decode(sealed["wrapped_key"]),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    plaintext = AESGCM(aes_key).decrypt(
        base64.b64decode(sealed["nonce"]),
        base64.b64decode(sealed["ciphertext"]),
        AAD,
    )
    payload = json.loads(plaintext)
    required = (
        "primary_email",
        "primary_password",
        "primary_jwt",
        "second_jwt",
        "web_share_url",
        "api_share_url",
    )
    for name in required:
        value = payload.get(name)
        if not isinstance(value, str) or not value:
            raise RuntimeError(f"Missing encrypted field: {name}")
        _mask(value)
    return payload


def _curl_cookie_jar(share_url: str, output: Path) -> None:
    # The API deployment has no root route, so the share-link handshake may
    # legitimately end at HTTP 404 after setting the protected-session cookie.
    subprocess.run(
        [
            "curl",
            "--silent",
            "--show-error",
            "--location",
            "--max-time",
            "45",
            "--cookie-jar",
            str(output),
            share_url,
            "-o",
            os.devnull,
        ],
        check=True,
    )


def _load_cookies(*paths: Path) -> list[dict[str, object]]:
    cookies: list[dict[str, object]] = []
    for path in paths:
        for raw in path.read_text(encoding="utf-8").splitlines():
            http_only = raw.startswith("#HttpOnly_")
            if http_only:
                raw = raw[len("#HttpOnly_") :]
            elif raw.startswith("#") or not raw.strip():
                continue
            parts = raw.split("\t")
            if len(parts) != 7:
                continue
            domain, _include_subdomains, cookie_path, secure, expires, name, value = parts
            _mask(value)
            cookies.append(
                {
                    "name": name,
                    "value": value,
                    "domain": domain,
                    "path": cookie_path,
                    "expires": int(expires) if expires.isdigit() else -1,
                    "httpOnly": http_only,
                    "secure": secure.upper() == "TRUE",
                }
            )
    if len(cookies) < 2:
        raise RuntimeError("Expected protected-session cookies for both exact Vercel preview origins.")
    return cookies


def _cookie_header(path: Path) -> str:
    values: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if raw.startswith("#HttpOnly_"):
            raw = raw[len("#HttpOnly_") :]
        elif raw.startswith("#") or not raw.strip():
            continue
        parts = raw.split("\t")
        if len(parts) == 7:
            values.append(f"{parts[5]}={parts[6]}")
    return "; ".join(values)


def _api_json(
    path: str,
    *,
    cookie: str,
    jwt: str | None = None,
    method: str = "GET",
    body: bytes | None = None,
) -> tuple[int, dict]:
    headers = {"Accept": "application/json", "Cookie": cookie}
    if jwt:
        headers["Authorization"] = f"Bearer {jwt}"
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(f"{API_URL}{path}", headers=headers, method=method, data=body)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        return exc.code, json.loads(raw) if raw else {}


class Fdm736HostedPreviewAuditRunnerTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("GITHUB_HEAD_REF") == RUNNER_BRANCH, "disposable FDM-736 runner only")
    def test_exact_hosted_preview_private_flow(self) -> None:
        with tempfile.TemporaryDirectory(prefix="fdm736-hosted-") as temp:
            temp_path = Path(temp)
            private_key = temp_path / "private.pem"
            public_key = temp_path / "public.pem"
            subprocess.run(
                ["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:3072", "-out", str(private_key)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            subprocess.run(
                ["openssl", "pkey", "-in", str(private_key), "-pubout", "-out", str(public_key)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            run_id = str(uuid4())
            public_key_pem = public_key.read_text(encoding="utf-8")
            status, registered = _helper(
                {"action": "register-key", "run_id": run_id, "public_key_pem": public_key_pem}
            )
            self.assertEqual(status, 200)
            self.assertTrue(registered.get("registered"))
            print(f"FDM736_HANDOFF_RUN_ID={run_id}", flush=True)

            payload = _decrypt(private_key, _wait_for_sealed_input(run_id))
            web_jar = temp_path / "web.cookies"
            api_jar = temp_path / "api.cookies"
            _curl_cookie_jar(payload["web_share_url"], web_jar)
            _curl_cookie_jar(payload["api_share_url"], api_jar)
            storage_state = temp_path / "storage-state.json"
            storage_state.write_text(
                json.dumps({"cookies": _load_cookies(web_jar, api_jar), "origins": []}),
                encoding="utf-8",
            )

            api_cookie = _cookie_header(api_jar)
            status, health = _api_json("/health", cookie=api_cookie)
            self.assertEqual((status, health.get("status")), (200, "ok"))
            status, ready = _api_json("/ready", cookie=api_cookie)
            self.assertEqual(status, 503)
            self.assertEqual(ready.get("code"), "service_not_ready")
            status, _ = _api_json("/v1/me", cookie=api_cookie)
            self.assertEqual(status, 401)

            _run(["npm", "ci"])
            _run(["npx", "playwright", "install", "--with-deps", "chromium"])

            config = REPO_ROOT / "apps" / "web" / "e2e" / "playwright.config.ts"
            original = config.read_text(encoding="utf-8")
            needle = "  use: {\n    baseURL,\n"
            if needle not in original:
                raise RuntimeError("Playwright config shape changed unexpectedly.")
            config.write_text(
                original.replace(
                    needle,
                    f"  use: {{\n    baseURL,\n    storageState: {json.dumps(str(storage_state))},\n",
                    1,
                ),
                encoding="utf-8",
            )
            env = os.environ.copy()
            env.update(
                {
                    "AUREA_E2E_URL": WEB_URL,
                    "AUREA_E2E_API_URL": API_URL,
                    "AUREA_E2E_EMAIL": payload["primary_email"],
                    "AUREA_E2E_PASSWORD": payload["primary_password"],
                    "AUREA_E2E_SECOND_JWT": payload["second_jwt"],
                    "AUREA_PRODUCTION_API_URL": PRODUCTION_API,
                    "AUREA_PRODUCTION_SUPABASE_URL": PRODUCTION_SUPABASE,
                    "CI": "true",
                }
            )
            try:
                _run(
                    [
                        "npx",
                        "playwright",
                        "test",
                        "apps/web/e2e/specs/ownership.spec.ts",
                        "--config=apps/web/e2e/playwright.config.ts",
                        "--project=chromium",
                        "--workers=1",
                    ],
                    env=env,
                )
            finally:
                config.write_text(original, encoding="utf-8")

            status, natal = _api_json(
                "/v1/astrology/natal",
                cookie=api_cookie,
                jwt=payload["primary_jwt"],
                method="POST",
                body=b"{}",
            )
            self.assertEqual(status, 200)
            self.assertTrue(natal.get("engine_name"))
            self.assertTrue(natal.get("ephemeris_version"))
            print(
                f"FDM736_HOSTED_AUDIT_PASS health=200 ready=503 unauthenticated=401 browser_ownership=pass swiss_engine={natal.get('engine_name')} ephemeris_metadata=present",
                flush=True,
            )


if __name__ == "__main__":
    unittest.main()
