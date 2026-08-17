@echo off
setlocal
set "PROJECT_ROOT=%~dp0"

pushd "%PROJECT_ROOT%"

if not exist ".aurea-build-venv\Scripts\python.exe" (
    echo ERRO: ambiente de build do motor nao encontrado.
    echo Crie .aurea-build-venv e instale requirements-api.txt antes do release.
    popd
    exit /b 1
)

echo [1/4] Gerando a interface web compilada...
call npm.cmd run build
if errorlevel 1 (
    echo ERRO: falha ao gerar a interface web compilada.
    popd
    exit /b 1
)
if not exist "apps\web\dist\index.html" (
    echo ERRO: apps\web\dist\index.html nao foi gerado; o empacotamento foi interrompido.
    popd
    exit /b 1
)

echo [2/4] Gerando o sidecar empacotado...
".aurea-build-venv\Scripts\python.exe" -m PyInstaller --clean --noconfirm build_sidecar.spec
if errorlevel 1 (
    echo ERRO: falha ao gerar o motor astrologico.
    popd
    exit /b 1
)
if not exist "dist\astro-engine-x86_64-pc-windows-msvc.exe" (
    echo ERRO: o executavel do sidecar nao foi gerado.
    popd
    exit /b 1
)

copy /Y "dist\astro-engine-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe" >nul
if errorlevel 1 (
    echo ERRO: falha ao preparar o motor para o instalador.
    popd
    exit /b 1
)
if not exist "src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe" (
    echo ERRO: o executavel do sidecar nao foi copiado.
    popd
    exit /b 1
)

echo [3/4] Validando o executavel empacotado em ambiente isolado...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%tests\browser_runtime_packaged_smoke.ps1" -RuntimePath "%PROJECT_ROOT%src-tauri\binaries\astro-engine-x86_64-pc-windows-msvc.exe"
if errorlevel 1 (
    echo ERRO: o smoke test do executavel empacotado falhou.
    popd
    exit /b 1
)

rem NSIS is the supported Windows installer. MSI/WiX is optional and must not
rem invalidate a successful application build when the external WiX tool fails.
echo [4/4] Gerando o aplicativo e o instalador NSIS...
call npm.cmd run tauri -- build --bundles nsis
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %BUILD_EXIT_CODE%
