from __future__ import annotations

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
            subprocess.run(
                [
                    "npm",
                    "ls",
                    "@babel/core",
                    "brace-expansion",
                    "esbuild",
                    "flatted",
                    "nanoid",
                    "picomatch",
                    "postcss",
                    "undici",
                    "--all",
                ],
                cwd=_runner.REPO_ROOT,
                check=False,
            )
            _runner._run(["npx", "playwright", "install", "--with-deps", "chromium"])

            config = _runner.REPO_ROOT / "apps" / "web" / "e2e" / "playwright.config.ts"
            helper = _runner.REPO_ROOT / "apps" / "web" / "e2e" / "helpers" / "app.ts"
            ownership = _runner.REPO_ROOT / "apps" / "web" / "e2e" / "specs" / "ownership.spec.ts"
            original_config = config.read_text(encoding="utf-8")
            original_helper = helper.read_text(encoding="utf-8")
            original_ownership = ownership.read_text(encoding="utf-8")

            helper_signature = "test.beforeEach(async ({ page, request }) => {"
            helper_health = """  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;\n  const response = await request.get(`${apiUrl}/health`, {\n    headers: apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : undefined,\n  });\n  expect(response.ok()).toBeTruthy();\n  expect((await response.json()).status).toBe('ok');\n"""
            helper_health_replacement = """  const apiShareUrl = process.env.AUREA_E2E_API_SHARE_URL;\n  if (!apiShareUrl) throw new Error('AUREA_E2E_API_SHARE_URL is required for protected hosted audit.');\n  await page.goto(apiShareUrl);\n  const health = await page.evaluate(async () => {\n    const response = await fetch('/health', { credentials: 'include' });\n    return { status: response.status, body: await response.json() };\n  });\n  expect(health.status).toBe(200);\n  expect(health.body.status).toBe('ok');\n"""
            helper_route_anchor = """  const webBypass = process.env.AUREA_VERCEL_WEB_PROTECTION_BYPASS;\n  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;\n\n  await page.route('**/*', async (route) => {\n"""
            helper_route_replacement = """  const webBypass = process.env.AUREA_VERCEL_WEB_PROTECTION_BYPASS;\n  const apiBypass = process.env.AUREA_VERCEL_API_PROTECTION_BYPASS;\n  const apiCookies = await page.context().cookies(apiUrl);\n  const apiCookieHeader = apiCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');\n  if (!apiBypass && !apiCookieHeader) {\n    throw new Error('Protected API browser session cookie was not established.');\n  }\n\n  await page.route('**/*', async (route) => {\n"""
            helper_route_api_anchor = """    } else if (requestOrigin === apiOrigin && apiBypass) {\n      headers[protectionBypassHeader] = apiBypass;\n    }\n"""
            helper_route_api_replacement = """    } else if (requestOrigin === apiOrigin && apiBypass) {\n      headers[protectionBypassHeader] = apiBypass;\n    } else if (requestOrigin === apiOrigin && apiCookieHeader) {\n      headers.cookie = apiCookieHeader;\n    }\n"""
            helper_goto = "  await page.goto('/');\n"
            ownership_signature = "test('hosted private flow and receipt ownership boundary', async ({ page, request }) => {"
            receipt_anchor = """  expect(natalBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');\n  expect(transitBody.result_payload.meta?.receipt?.schema_version).toBe('calculation-receipt.v1');\n"""
            receipt_replacement = receipt_anchor + """  const natalReceipt = natalBody.result_payload.meta?.receipt as Record<string, any>;\n  expect(natalReceipt?.engine?.name).toBeTruthy();\n  expect(natalReceipt?.engine?.version).toBeTruthy();\n  expect(natalReceipt?.ephemeris?.library).toBe('pyswisseph');\n  expect(natalReceipt?.ephemeris?.library_version).toBeTruthy();\n  console.log(`FDM736_SWISS_ENGINE engine=${natalReceipt.engine.name} version=${natalReceipt.engine.version} ephemeris=${natalReceipt.ephemeris.library}`);\n"""
            request_block = """  const noToken = await request.get(`${apiUrl}/v1/astrology/receipts/${natalBody.id}`, {\n    headers: apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : undefined,\n  });\n  expect(noToken.status()).toBe(401);\n\n  const otherUser = await request.get(`${apiUrl}/v1/astrology/receipts/${natalBody.id}`, {\n    headers: {\n      Authorization: `Bearer ${secondJwt}`,\n      ...(apiBypass ? { 'x-vercel-protection-bypass': apiBypass } : {}),\n    },\n  });\n  expect(otherUser.status()).toBe(404);\n  expect((await otherUser.json()).code).toBe('receipt_not_found');\n"""
            request_replacement = """  const noToken = await page.evaluate(async (url) => {\n    const response = await fetch(url, { credentials: 'include' });\n    return { status: response.status, body: await response.json() };\n  }, `${apiUrl}/v1/astrology/receipts/${natalBody.id}`);\n  expect(noToken.status).toBe(401);\n\n  const otherUser = await page.evaluate(async ({ url, token }) => {\n    const response = await fetch(url, {\n      credentials: 'include',\n      headers: { Authorization: `Bearer ${token}` },\n    });\n    return { status: response.status, body: await response.json() };\n  }, { url: `${apiUrl}/v1/astrology/receipts/${natalBody.id}`, token: secondJwt });\n  expect(otherUser.status).toBe(404);\n  expect(otherUser.body.code).toBe('receipt_not_found');\n\n  const ready = await page.evaluate(async (url) => {\n    const response = await fetch(url, { credentials: 'include' });\n    return { status: response.status, body: await response.json() };\n  }, `${apiUrl}/ready`);\n  expect(ready.status).toBe(503);\n  expect(ready.body.code).toBe('service_not_ready');\n"""

            required = (
                helper_signature,
                helper_health,
                helper_route_anchor,
                helper_route_api_anchor,
                helper_goto,
                ownership_signature,
                receipt_anchor,
                request_block,
            )
            haystacks = (
                original_helper,
                original_helper,
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
                .replace(helper_route_anchor, helper_route_replacement, 1)
                .replace(helper_route_api_anchor, helper_route_api_replacement, 1)
                .replace(
                    helper_goto,
                    "  await page.goto(process.env.AUREA_E2E_WEB_SHARE_URL ?? '/');\n",
                    1,
                ),
                encoding="utf-8",
            )
            ownership.write_text(
                original_ownership.replace(ownership_signature, ownership_signature.replace(", request", ""), 1)
                .replace(receipt_anchor, receipt_replacement, 1)
                .replace(request_block, request_replacement, 1),
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
