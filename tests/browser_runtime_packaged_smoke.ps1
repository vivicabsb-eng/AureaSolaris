param(
    [Parameter(Mandatory)] [string]$RuntimePath,
    [int]$ApiPort = 0
)

$ErrorActionPreference = 'Stop'
$repoRoot = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
. (Join-Path $PSScriptRoot 'browser_runtime_process_tree.ps1')
$RuntimePath = if ([IO.Path]::IsPathRooted($RuntimePath)) { $RuntimePath } else { Join-Path $repoRoot $RuntimePath }
$RuntimePath = (Resolve-Path -LiteralPath $RuntimePath).Path
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('aurea-packaged-smoke-' + [guid]::NewGuid().ToString('N'))
$dataDir = Join-Path $tempRoot 'data'
$stdout = Join-Path $tempRoot 'stdout.log'
$stderr = Join-Path $tempRoot 'stderr.log'
$runtime = $null
$oldPort = $env:ASTRO_API_PORT
$oldData = $env:AUREA_DATA_DIR
$oldLogin = $env:AUREA_REQUIRE_LOGIN
$cleanupFailures = [Collections.Generic.List[string]]::new()

function Invoke-CleanupStep([string]$Name, [scriptblock]$Action) {
    try { & $Action; Write-Output "CLEANUP $Name=ok" }
    catch {
        $detail = "CLEANUP $Name=failed error=$($_.Exception.Message)"
        Write-Output $detail
        [void]$cleanupFailures.Add($detail)
    }
}

try {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    if ($ApiPort -eq 0) {
        $ApiPort = 9877
        while ($ApiPort -le 9899 -and (Get-NetTCPConnection -LocalPort $ApiPort -State Listen -ErrorAction SilentlyContinue)) { $ApiPort++ }
    }
    if ($ApiPort -gt 9899) { throw 'Nenhuma porta livre no intervalo 9877-9899.' }
    $env:ASTRO_API_PORT = [string]$ApiPort
    $env:AUREA_DATA_DIR = $dataDir
    if (Test-Path Env:AUREA_REQUIRE_LOGIN) { Remove-Item Env:AUREA_REQUIRE_LOGIN }
    # PyInstaller one-file executables use a short-lived extraction parent.
    # Keep an exact, owned PowerShell root alive around that child so the
    # process-tree identity remains available through cleanup.
    $escapedRuntime = $RuntimePath.Replace("'", "''")
    $escapedRoot = $repoRoot.Replace("'", "''")
    $launchCommand = "& { Start-Process -FilePath '$escapedRuntime' -WorkingDirectory '$escapedRoot' -WindowStyle Hidden | Out-Null; Start-Sleep -Seconds 120 }"
    $runtime = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $launchCommand) -WorkingDirectory $repoRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden
    $base = "http://127.0.0.1:$ApiPort"
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try {
            $health = Invoke-WebRequest "$base/health" -UseBasicParsing -TimeoutSec 1
            $root = Invoke-WebRequest "$base/" -UseBasicParsing -TimeoutSec 1
            $openapi = Invoke-WebRequest "$base/openapi.json" -UseBasicParsing -TimeoutSec 1
            if ($health.StatusCode -eq 200 -and $root.StatusCode -eq 200 -and $openapi.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "Sidecar não ficou pronto em $base." }
    $healthJson = $health.Content | ConvertFrom-Json
    if ($healthJson.engine -ne 'swisseph') { throw "Motor inesperado: $($healthJson.engine)" }
    if ([string]$healthJson.auth_mode -ne 'local-owner') {
        throw "auth_mode=$($healthJson.auth_mode), esperado local-owner"
    }
    if ([int]$healthJson.browser_contract_version -ne 2) {
        throw "browser_contract_version=$($healthJson.browser_contract_version), esperado 2"
    }
    if ($root.Content -notmatch 'Aurea Solaris') { throw 'A raiz não serviu a interface compilada.' }
    if ($openapi.Content -notmatch '/browser/command') { throw 'OpenAPI não contém /browser/command.' }
    Write-Output "HEALTH auth_mode=$($healthJson.auth_mode) browser_contract_version=$($healthJson.browser_contract_version) engine=$($healthJson.engine)"

    function Invoke-BrowserCommand {
        param(
            [string]$Command,
            [string]$Token = '',
            [string]$RawBody = ''
        )
        $body = if (-not [string]::IsNullOrWhiteSpace($RawBody)) {
            $RawBody
        } else {
            (@{ command = $Command; args = @{} } | ConvertTo-Json -Compress -Depth 8)
        }
        $params = @{
            Uri = "$base/browser/command"
            Method = 'POST'
            ContentType = 'application/json'
            Body = $body
            UseBasicParsing = $true
            TimeoutSec = 10
        }
        if (-not [string]::IsNullOrWhiteSpace($Token)) {
            $params.Headers = @{ 'X-Aurea-Browser-Session' = $Token }
        }
        try {
            $resp = Invoke-WebRequest @params
            return [pscustomobject]@{ StatusCode = [int]$resp.StatusCode; Json = ($resp.Content | ConvertFrom-Json) }
        } catch {
            $response = $_.Exception.Response
            $status = if ($null -ne $response) { [int]$response.StatusCode } else { 0 }
            throw "Falha HTTP em ${Command}: status=$status"
        }
    }

    # Derive a deterministic source-of-truth result from the tracked Swiss
    # files, then require the packaged executable to reproduce it. Chiron
    # deliberately exercises seas_18.se1 in addition to the planetary file.
    $canonicalProbe = @'
import json
from pathlib import Path
import swisseph as swe

ephemeris_path = Path.cwd() / "services" / "api" / "ephe"
swe.set_ephe_path(str(ephemeris_path))
jd = swe.julday(2000, 1, 2, 1.5)
flags = swe.FLG_SWIEPH | swe.FLG_SPEED
sun, sun_flags = swe.calc(jd, swe.SUN, flags)
chiron, chiron_flags = swe.calc(jd, swe.CHIRON, flags)
if not (sun_flags & swe.FLG_SWIEPH) or not (chiron_flags & swe.FLG_SWIEPH):
    raise SystemExit("Swiss Ephemeris FLG_SWIEPH was not returned by the canonical probe")
print(json.dumps({"Sun": round(sun[0] % 360, 2), "Chiron": round(chiron[0] % 360, 2)}))
'@
    $canonicalRaw = & python -c $canonicalProbe
    if ($LASTEXITCODE -ne 0) { throw 'Falha no probe canônico do Swiss Ephemeris.' }
    $canonical = ($canonicalRaw -join "`n") | ConvertFrom-Json

    $astroPayload = @{
        year = 2000
        month = 1
        day = 1
        hour = 23.5
        lat = -23.5505
        lon = -46.6333
        timezone = 'America/Sao_Paulo'
        include_asteroids = $true
    } | ConvertTo-Json -Compress
    $astroBody = @{
        command = 'get_transit_positions'
        args = @{ payload = $astroPayload }
    } | ConvertTo-Json -Compress -Depth 8
    $astro = Invoke-BrowserCommand -Command 'get_transit_positions' -RawBody $astroBody
    if ($astro.StatusCode -ne 200) { throw "get_transit_positions status=$($astro.StatusCode)" }
    $astroResultJson = [string]$astro.Json.result
    $astroResult = $astroResultJson | ConvertFrom-Json
    if ($null -ne $astroResult.error) { throw "Cálculo astrológico empacotado falhou: $($astroResult.error)" }
    if ([string]$astroResult.meta.receipt.ephemeris.mode -ne 'swiss') {
        throw "Cálculo empacotado não usou Swiss Ephemeris: $($astroResult.meta.receipt.ephemeris.mode)"
    }
    if ([string]$astroResult.meta.receipt.resolved_time.utc -ne '2000-01-02T01:30:00Z') {
        throw "Instante astrológico inesperado: $($astroResult.meta.receipt.resolved_time.utc)"
    }
    if ([double]$astroResult.planets.Sun.degree -ne [double]$canonical.Sun) {
        throw "Sol empacotado=$($astroResult.planets.Sun.degree), canônico=$($canonical.Sun)"
    }
    if ($null -eq $astroResult.planets.Chiron -or [double]$astroResult.planets.Chiron.degree -ne [double]$canonical.Chiron) {
        throw "Chiron empacotado=$($astroResult.planets.Chiron.degree), canônico=$($canonical.Chiron)"
    }
    Write-Output "ASTRO_CALC status=ok engine=swisseph sun=$($canonical.Sun) chiron=$($canonical.Chiron)"

    $first = Invoke-BrowserCommand -Command 'private_initial_access'
    $second = Invoke-BrowserCommand -Command 'private_initial_access'
    if ($first.StatusCode -ne 200 -or $second.StatusCode -ne 200) {
        throw "private_initial_access status=$($first.StatusCode)/$($second.StatusCode)"
    }
    $kind = [string]$first.Json.result.kind
    $ownerId = [string]$first.Json.result.ownerId
    $token = [string]$first.Json.browser_session_token
    $tokenAgain = [string]$second.Json.browser_session_token
    if ($kind -ne 'local-owner' -or [string]::IsNullOrWhiteSpace($ownerId) -or [string]::IsNullOrWhiteSpace($token)) {
        throw 'private_initial_access não devolveu dono local autenticado'
    }
    $tokensEqual = $token -eq $tokenAgain -and $token.Length -gt 0
    if (-not $tokensEqual) { throw 'O token de processo não foi reutilizado na segunda chamada.' }
    Write-Output "TOKEN_EQUALITY equal=true"

    $saveBody = '{"command":"save_board","args":{"boardId":"smoke-board","name":"Smoke","nodes":[{"id":"n1"}],"edges":[]}}'
    $saved = Invoke-BrowserCommand -Command 'save_board' -Token $token -RawBody $saveBody
    if ($saved.StatusCode -ne 200) { throw "save_board status=$($saved.StatusCode)" }
    $loaded = Invoke-BrowserCommand -Command 'load_board' -Token $token -RawBody '{"command":"load_board","args":{"boardId":"smoke-board"}}'
    if ($loaded.StatusCode -ne 200) { throw "load_board status=$($loaded.StatusCode)" }
    if ([string]$loaded.Json.result.owner_id -ne $ownerId) { throw 'load_board não devolveu o mesmo proprietário' }
    $loadedNodes = @($loaded.Json.result.nodes)
    if ($loadedNodes.Count -ne 1 -or [string]$loadedNodes[0].id -ne 'n1') {
        throw 'load_board não devolveu o caderno gravado'
    }
    Write-Output "BOARD_ROUNDTRIP status=ok owner_kind=$kind"
    Write-Output "SMOKE PASS port=$ApiPort health=200 engine=swisseph auth_mode=local-owner browser_contract_version=2 root=200 openapi=200 astro_calc=ok token_equality=true board_roundtrip=ok"
} finally {
    Invoke-CleanupStep 'runtime-tree' { if ($null -ne $runtime) { Stop-Tree $runtime } }
    Invoke-CleanupStep 'ASTRO_API_PORT-restore' {
        if ($null -eq $oldPort) { Remove-Item Env:ASTRO_API_PORT -ErrorAction SilentlyContinue }
        else { $env:ASTRO_API_PORT = $oldPort }
    }
    Invoke-CleanupStep 'AUREA_DATA_DIR-restore' {
        if ($null -eq $oldData) { Remove-Item Env:AUREA_DATA_DIR -ErrorAction SilentlyContinue }
        else { $env:AUREA_DATA_DIR = $oldData }
    }
    Invoke-CleanupStep 'AUREA_REQUIRE_LOGIN-restore' {
        if ($null -eq $oldLogin) { Remove-Item Env:AUREA_REQUIRE_LOGIN -ErrorAction SilentlyContinue }
        else { $env:AUREA_REQUIRE_LOGIN = $oldLogin }
    }
    Invoke-CleanupStep 'owned-port-free' {
        $remaining = @(Get-NetTCPConnection -LocalPort $ApiPort -State Listen -ErrorAction SilentlyContinue)
        if ($remaining.Count) { throw "Porta ainda em uso: $ApiPort" }
    }
    Invoke-CleanupStep 'temp-root-remove' {
        if ([IO.Directory]::Exists($tempRoot)) { [IO.Directory]::Delete($tempRoot, $true) }
    }
    Invoke-CleanupStep 'temp-root-residue' { if ([IO.Directory]::Exists($tempRoot)) { throw "Pasta temporária ainda existe: $tempRoot" } }
    if ($cleanupFailures.Count) { throw "Falhas de limpeza:`n$($cleanupFailures -join "`n")" }
}
