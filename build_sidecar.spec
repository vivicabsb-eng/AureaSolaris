# build_sidecar.spec — PyInstaller spec para o sidecar
# Antes de executar este arquivo, rode `npm run build` para gerar `apps/web/dist/index.html`.
# Depois: pyinstaller build_sidecar.spec
#
# Gera um executável standalone do FastAPI sidecar para distribuição junto com o app Tauri.

import os
from PyInstaller.utils.hooks import collect_all

PROJECT_ROOT = os.path.abspath('.')
SERVICE_API_SRC = os.path.join(PROJECT_ROOT, 'services/api/src')
EPHEMERIS_SRC = os.path.join(PROJECT_ROOT, 'services/api/ephe')
EPHEMERIS_DEST = 'aurea_api/domain/astrology/ephe'
REQUIRED_EPHEMERIS_FILES = ('seas_18.se1', 'semo_18.se1', 'sepl_18.se1')

if not os.path.isdir(SERVICE_API_SRC):
    raise FileNotFoundError(f'Missing Web API source tree: {SERVICE_API_SRC}')
if not os.path.isdir(EPHEMERIS_SRC):
    raise FileNotFoundError(f'Missing Swiss Ephemeris directory: {EPHEMERIS_SRC}')
for filename in REQUIRED_EPHEMERIS_FILES:
    candidate = os.path.join(EPHEMERIS_SRC, filename)
    if not os.path.isfile(candidate):
        raise FileNotFoundError(f'Missing certified Swiss Ephemeris asset: {candidate}')

# `pkg_resources` (loaded by one of the HTTP dependencies) imports the
# namespace package `backports` at runtime. A hidden import alone does not
# include namespace-package data in a one-file executable, which made the
# packaged motor exit before opening its HTTP port on Windows.
backports_datas, backports_binaries, backports_hiddenimports = collect_all('backports')

ephe_datas = [(EPHEMERIS_SRC, EPHEMERIS_DEST)]
frontend_datas = [('apps/web/dist', 'apps/web/dist')]

a = Analysis(
    ['main_api.py'],
    pathex=[PROJECT_ROOT, SERVICE_API_SRC],
    binaries=backports_binaries,
    datas=[
        ('local_storage.py', '.'),
        ('browser_workspace.py', '.'),
        ('src-tauri/migrations/private/*.sql', 'migrations/private'),
        ('src-tauri/migrations/knowledge/*.sql', 'migrations/knowledge'),
        # Snapshot editorial canônico para a primeira instalação local de
        # knowledge.sqlite; o importador preserva hash e proveniência.
        ('knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite',
         'knowledge/engenharia_astrologica/knowledge/build'),
    ] + ephe_datas + frontend_datas + backports_datas,
    hiddenimports=[
        'astro_engine',
        'engine_governance',
        'aurea_api.domain.astrology.engine',
        'aurea_api.domain.astrology.governance',
        'aurea_api.domain.astrology.models',
        'local_storage',
        'swisseph',                     # Swiss Ephemeris Python bindings
        'kerykeion',                    # Certified fallback engine
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.on_impl',
        'uvicorn.lifespan.off',
        'fastapi',
        'pydantic',
        'starlette',
        'starlette.routing',
        'starlette.middleware',
        'starlette.middleware.cors',
        'anyio',
        'h11',
        *backports_hiddenimports,
        'tzdata',
        'tzdata.zoneinfo',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='astro-engine-x86_64-pc-windows-msvc',   # Nome que o Tauri espera
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,                   # IMPORTANTE: sidecar precisa de console para logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
