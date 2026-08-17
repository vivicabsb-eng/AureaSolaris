from __future__ import annotations

from uuid import UUID

import asyncpg
from asyncpg.exceptions import IntegrityConstraintViolationError

from aurea_api.domain.users.models import BirthProfileResponse, BirthProfileUpdate

from .errors import RepositoryConstraintError

_GET_ACTIVE_BIRTH_PROFILE_SQL = """
SELECT
    id, label, birth_date, birth_time, timezone, latitude, longitude, place,
    house_system, is_active, created_at, updated_at
FROM public.birth_profiles
WHERE user_id = $1 AND is_active
ORDER BY updated_at DESC, id DESC
LIMIT 1
"""

_UPSERT_BIRTH_PROFILE_SQL = """
INSERT INTO public.birth_profiles (
    user_id, label, birth_date, birth_time, timezone,
    latitude, longitude, place, house_system, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, true
)
ON CONFLICT (user_id) WHERE is_active DO UPDATE SET
    label = EXCLUDED.label,
    birth_date = EXCLUDED.birth_date,
    birth_time = EXCLUDED.birth_time,
    timezone = EXCLUDED.timezone,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    place = EXCLUDED.place,
    house_system = EXCLUDED.house_system,
    is_active = true
RETURNING
    id, label, birth_date, birth_time, timezone, latitude, longitude, place,
    house_system, is_active, created_at, updated_at
"""


class BirthProfileRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_active(self, user_id: UUID) -> BirthProfileResponse | None:
        row = await self._pool.fetchrow(_GET_ACTIVE_BIRTH_PROFILE_SQL, user_id)
        return None if row is None else BirthProfileResponse.model_validate(dict(row))

    async def upsert(
        self,
        user_id: UUID,
        birth_profile: BirthProfileUpdate,
    ) -> BirthProfileResponse:
        async with self._pool.acquire() as connection:
            async with connection.transaction():
                try:
                    row = await connection.fetchrow(
                        _UPSERT_BIRTH_PROFILE_SQL,
                        user_id,
                        birth_profile.label,
                        birth_profile.birth_date,
                        birth_profile.birth_time,
                        birth_profile.timezone,
                        birth_profile.latitude,
                        birth_profile.longitude,
                        birth_profile.place,
                        birth_profile.house_system,
                    )
                except IntegrityConstraintViolationError:
                    raise RepositoryConstraintError("birth_profile") from None

        if row is None:
            raise RuntimeError("Birth profile upsert did not return a row.")
        return BirthProfileResponse.model_validate(dict(row))
