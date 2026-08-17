from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import cast

import asyncpg
from fastapi import FastAPI

from .api.auth import TokenVerifier
from .api.routes.birth_profile import router as birth_profile_router
from .api.routes.me import router as me_router
from .config import Settings, get_settings
from .dependencies import unavailable_readiness_probe
from .errors import register_error_handlers
from .health import router as health_router
from .middleware import configure_request_logging, install_http_middleware


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    try:
        yield
    finally:
        pool = cast(asyncpg.Pool | None, app.state.database_pool)
        if pool is not None:
            await pool.close()
            app.state.database_pool = None
            app.state.profile_repository = None
            app.state.birth_profile_repository = None


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the Web V1 API without opening external connections at import time."""

    resolved_settings = settings if settings is not None else get_settings()
    configure_request_logging()

    app = FastAPI(title="Aurea Solaris API", version="0.1.0", lifespan=_lifespan)
    app.state.settings = resolved_settings
    app.state.database_readiness = unavailable_readiness_probe
    app.state.engine_readiness = unavailable_readiness_probe
    app.state.token_verifier = TokenVerifier(resolved_settings)
    app.state.database_pool = None
    app.state.database_pool_lock = asyncio.Lock()
    app.state.profile_repository = None
    app.state.birth_profile_repository = None

    register_error_handlers(app)
    app.include_router(health_router)
    app.include_router(me_router)
    app.include_router(birth_profile_router)
    install_http_middleware(app, resolved_settings)
    return app
