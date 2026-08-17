from __future__ import annotations

import asyncio
from typing import Protocol, cast

import asyncpg
from fastapi import Request

from aurea_api.infrastructure.db import (
    BirthProfileRepository,
    ProfileRepository,
    create_database_pool,
)


class ReadinessProbe(Protocol):
    """Async readiness check supplied by an infrastructure adapter."""

    async def __call__(self) -> bool: ...


async def unavailable_readiness_probe() -> bool:
    """Fail closed until a concrete infrastructure probe is injected."""

    return False


def get_database_readiness(request: Request) -> ReadinessProbe:
    return cast(ReadinessProbe, request.app.state.database_readiness)


def get_engine_readiness(request: Request) -> ReadinessProbe:
    return cast(ReadinessProbe, request.app.state.engine_readiness)


async def _get_database_pool(request: Request) -> asyncpg.Pool:
    pool = cast(asyncpg.Pool | None, request.app.state.database_pool)
    if pool is not None:
        return pool

    lock = cast(asyncio.Lock, request.app.state.database_pool_lock)
    async with lock:
        pool = cast(asyncpg.Pool | None, request.app.state.database_pool)
        if pool is None:
            pool = await create_database_pool(request.app.state.settings.database_url)
            request.app.state.database_pool = pool
        return pool


async def get_profile_repository(request: Request) -> ProfileRepository:
    repository = cast(ProfileRepository | None, request.app.state.profile_repository)
    if repository is None:
        repository = ProfileRepository(await _get_database_pool(request))
        request.app.state.profile_repository = repository
    return repository


async def get_birth_profile_repository(request: Request) -> BirthProfileRepository:
    repository = cast(BirthProfileRepository | None, request.app.state.birth_profile_repository)
    if repository is None:
        repository = BirthProfileRepository(await _get_database_pool(request))
        request.app.state.birth_profile_repository = repository
    return repository
