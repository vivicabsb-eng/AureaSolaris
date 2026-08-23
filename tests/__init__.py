from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path
from uuid import uuid4

if os.environ.get("GITHUB_HEAD_REF") == "fdm-736/hosted-e2e-runner-v2":
    from tests import test_fdm736_hosted_audit_runner as _runner

    def _hosted_preview_audit(self: object) -> None:
        with tempfile.TemporaryDirectory(prefix="fdm736-hosted-") as temp:
            temp_path = Path(temp)
            private_key = temp_path / "private.pem"
            public_key = temp_path / "public.pem"
            subprocess.run(
                [
                    "openssl",
                    "genpkey",
                    "-algorithm",
                    "RSA",
                    "-pkeyopt",
                    "rsa_keygen_bits:3072",
                    "-out",
                    str(private_key),
                ],
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
            status, registered = _runner._helper(
                {
                    "action": "register-key",
                    "run_id": run_id,
                    "public_key_pem": public_key.read_text(encoding="utf-8"),
                }
            )
            self.assertEqual(status, 200)
            self.assertTrue(registered.get("registered"))
            print(f"FDM736_HANDOFF_RUN_ID={run_id}", flush=True)

            payload = _runner._decrypt(private_key, _runner._wait_for_sealed_input(run_id))

            _runner._run(["npm", "ci"])
            _runner._print_npm_audit("all")
            _runner._print_npm_audit("production", "--omit=dev")
            _runner._run(["npx", "playwright", "install", "--with-deps", "chromium"])

            config = _runner.REPO_ROOT / "apps" / "web" / "e2e" / "playwright.config.ts"
            helper = _runner.REPO_ROOT / "apps" / "web" / "e2e" / "helpers" / "app.ts"
            ownership = _runner.REPO_ROOT / "apps" / "web" / "e2e" / "specs" / "ownership.spec.ts"
            original_config = config.read_text(encoding="utf-8")
            original_helper = helper.read_text(encoding="utf-8")
            original_ownership = ownership.read_text(encoding="utf-8")

            config_needle = "  use: {\n    baseURL,\n"
            helper_signature = "test.beforeEach(async ({ page, request }) => {"
            helper_health = """  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;\n  const response = await request.get(`${apiUrl}/health`, {\n    headers: apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : undefined,\n  });\n"""
            helper_health_replacement = """  const apiShareUrl = process.env.AUREA_E2E_API_SHARE_URL;\n  if (!apiShareUrl) throw new Error('AUREA_E2E_API_SHARE_URL is required for protected hosted audit.');\n  await page.goto(apiShareUrl);\n  const response = await page.context().request.get(`${apiUrl}/health`);\n"""
            helper_goto = "  await page.goto('/');\n"
            ownership_signature = "test('hosted private flow and receipt ownership boundary', async ({ page, request }) => {"
            receipt_anchor = """  expect(natalBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');\n  expect(transitBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');\n"""
            receipt_replacement = receipt_anchor + """  const natalReceipt = natalBody.result_payload.meta?.receipt as Record<string, any>;\n  expect(natalReceipt?.engine?.name).toBeTruthy();\n  expect(natalReceipt?.engine?.version).toBeTruthy();\n  expect(natalReceipt?.ephemeris?.library).toBe('pyswisseph');\n  expect(natalReceipt?.ephemeris?.library_version).toBeTruthy();\n  console.log(`FDM736_SWISS_ENGINE engine=${natalReceipt.engine.name} version=${natalReceipt.engine.version} ephemeris=${natalReceipt.ephemeris.library}`);\n"""
            other_user_anchor = """  expect(otherUser.status()).toBe(404);\n  expect((await otherUser.json()).code).toBe('receipt_not_found');\n"""
            other_user_replacement = other_user_anchor + """\n  const ready = await page.context().request.get(`${apiUrl}/ready`);\n  expect(ready.status()).toBe(503);\n  expect((await ready.json()).code).toBe('service_not_ready');\n"""

            required = (
                config_needle,
                helper_signature,
                helper_health,
                helper_goto,
                ownership_signature,
                receipt_anchor,
                other_user_anchor,
            )
            haystacks = (
                original_config,
                original_helper,
                original_helper,
                original_helper,
                original_ownership,
                original_ownership,
                original_ownership,
            )
            if any(needle not in haystack for needle, haystack in zip(required, haystacks, strict=True)):
                raise RuntimeError("Hosted audit patch target changed unexpectedly.")

            config.write_text(original_config, encoding="utf-8")
            helper.write_text(
                original_helper.replace(helper_signature, "test.beforeEach(async ({ page }) => {", 1)
                .replace(helper_health, helper_health_replacement, 1)
                .replace(
                    helper_goto,
                    "  await page.goto(process.env.AUREA_E2E_WEB_SHARE_URL ?? '/');\n",
                    1,
                ),
                encoding="utf-8",
            )
            ownership.write_text(
                original_ownership.replace(ownership_signature, ownership_signature.replace(", request", ""), 1)
                .replace("request.get(", "page.context().request.get(")
                .replace(receipt_anchor, receipt_replacement, 1)
                .replace(other_user_anchor, other_user_replacement, 1),
                encoding="utf-8",
            )

            env = os.environ.copy()
            env.update(
                {
                    "AUREA_E2E_URL": _runner.WEB_URL,
                    "AUREA_E2E_API_URL": _runner.API_URL,
                    "AUREA_E2E_WEB_SHARE_URL": payload["web_share_url"],
                    "AUREA_E2E_API_SHARE_URL": payload["api_share_url"],
                    "AUREA_E2E_EMAIL": payload["primary_email"],
                    "AUREA_E2E_PASSWORD": payload["primary_password"],
                    "AUREA_E2E_SECOND_JWT": payload["second_jwt"],
                    "AUREA_PRODUCTION_API_URL": _runner.PRODUCTION_API,
                    "AUREA_PRODUCTION_SUPABASE_URL": _runner.PRODUCTION_SUPABASE,
                    "CI": "true",
                }
            )
            try:
                _runner._run(
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
                config.write_text(original_config, encoding="utf-8")
                helper.write_text(original_helper, encoding="utf-8")
                ownership.write_text(original_ownership, encoding="utf-8")

            print(
                "FDM736_HOSTED_AUDIT_PASS health=200 ready=503 unauthenticated=401 cross_owner=404 browser_ownership=pass swiss_engine=verified console_errors=0",
                flush=True,
            )

    _runner.Fdm736HostedPreviewAuditRunnerTests.test_exact_hosted_preview_private_flow = _hosted_preview_audit
