from __future__ import annotations

import asyncpg
from pydantic import SecretStr

_POOL_MIN_SIZE = 1
_POOL_MAX_SIZE = 5
_COMMAND_TIMEOUT_SECONDS = 30.0


async def create_database_pool(database_url: SecretStr) -> asyncpg.Pool:
    """Create the API's bounded async PostgreSQL connection pool."""

    return await asyncpg.create_pool(
        dsn=database_url.get_secret_value(),
        min_size=_POOL_MIN_SIZE,
        max_size=_POOL_MAX_SIZE,
        command_timeout=_COMMAND_TIMEOUT_SECONDS,
    )
