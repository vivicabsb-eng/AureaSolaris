from __future__ import annotations

from uuid import UUID

import asyncpg
from asyncpg.exceptions import IntegrityConstraintViolationError

from aurea_api.domain.users.models import ProfileResponse, ProfileUpdate

from .errors import RepositoryConstraintError

_GET_PROFILE_SQL = """
SELECT id, display_name, timezone, locale, created_at, updated_at
FROM public.profiles
WHERE user_id = $1
"""

_UPSERT_PROFILE_SQL = """
INSERT INTO public.profiles (
    user_id, display_name, timezone, locale
) VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    timezone = EXCLUDED.timezone,
    locale = EXCLUDED.locale
RETURNING id, display_name, timezone, locale, created_at, updated_at
"""


class ProfileRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get(self, user_id: UUID) -> ProfileResponse | None:
        row = await self._pool.fetchrow(_GET_PROFILE_SQL, user_id)
        return None if row is None else ProfileResponse.model_validate(dict(row))

    async def upsert(self, user_id: UUID, profile: ProfileUpdate) -> ProfileResponse:
        async with self._pool.acquire() as connection:
            async with connection.transaction():
                try:
                    row = await connection.fetchrow(
                        _UPSERT_PROFILE_SQL,
                        user_id,
                        profile.display_name,
                        profile.timezone,
                        profile.locale,
                    )
                except IntegrityConstraintViolationError:
                    raise RepositoryConstraintError("profile") from None

        if row is None:
            raise RuntimeError("Profile upsert did not return a row.")
        return ProfileResponse.model_validate(dict(row))
