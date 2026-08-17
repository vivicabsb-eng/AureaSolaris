from __future__ import annotations

import asyncio
import os
from dataclasses import replace
from datetime import UTC, date, datetime, time
from decimal import Decimal
from uuid import UUID, uuid4

import asyncpg
import pytest
from pydantic import SecretStr

from aurea_api.domain.users.models import BirthProfileUpdate, ProfileUpdate
from aurea_api.infrastructure.db import (
    BirthProfileRepository,
    CalculationReceiptWrite,
    ProfileRepository,
    ReceiptConflictError,
    ReceiptRepository,
    RepositoryConstraintError,
    create_database_pool,
)

_TEST_DATABASE_ENV = "AUREA_TEST_DATABASE_URL"


@pytest.fixture
def test_database_url() -> SecretStr:
    value = os.environ.get(_TEST_DATABASE_ENV)
    if value is None:
        pytest.skip(f"{_TEST_DATABASE_ENV} is required for disposable Postgres contract tests")
    return SecretStr(value)


async def _seed_users(pool: asyncpg.Pool, *user_ids: UUID) -> None:
    async with pool.acquire() as connection:
        await connection.executemany(
            "INSERT INTO auth.users (id) VALUES ($1)",
            [(user_id,) for user_id in user_ids],
        )


async def _delete_users(pool: asyncpg.Pool, *user_ids: UUID) -> None:
    async with pool.acquire() as connection:
        await connection.execute(
            "DELETE FROM auth.users WHERE id = $1 OR id = $2",
            user_ids[0],
            user_ids[1],
        )


def _profile(display_name: str) -> ProfileUpdate:
    return ProfileUpdate(
        display_name=display_name,
        timezone="America/Sao_Paulo",
        locale="pt-BR",
    )


def _birth(label: str, *, day: int = 1) -> BirthProfileUpdate:
    return BirthProfileUpdate(
        label=label,
        birth_date=date(1990, 1, day),
        birth_time=time(12, 34, 56),
        timezone="America/Sao_Paulo",
        latitude=Decimal("-15.793889"),
        longitude=Decimal("-47.882778"),
        place="Brasilia",
        house_system="P",
    )


def _receipt(birth_profile_id: UUID, *, input_hash: str, result: str) -> CalculationReceiptWrite:
    return CalculationReceiptWrite(
        birth_profile_id=birth_profile_id,
        kind="natal",
        input_hash=input_hash,
        input_payload={"fixture": "same-input"},
        result_payload={"result": result},
        engine_name="aurea-test-engine",
        engine_version="1.0.0",
        ephemeris_version="test-ephemeris",
        resolved_at=datetime(2026, 8, 17, 12, 0, tzinfo=UTC),
        resolved_timezone="America/Sao_Paulo",
    )


def test_database_pool_is_bounded(test_database_url: SecretStr) -> None:
    async def contract() -> None:
        pool = await create_database_pool(test_database_url)
        try:
            assert pool.get_min_size() == 1
            assert pool.get_max_size() == 5
        finally:
            await pool.close()

    asyncio.run(contract())


def test_profile_repository_is_owner_scoped_and_idempotent(
    test_database_url: SecretStr,
) -> None:
    async def contract() -> None:
        pool = await create_database_pool(test_database_url)
        user_a, user_b = uuid4(), uuid4()
        try:
            await _seed_users(pool, user_a, user_b)
            repository = ProfileRepository(pool)

            first = await repository.upsert(user_a, _profile("Owner A"))
            second = await repository.upsert(user_a, _profile("Owner A Updated"))
            other = await repository.upsert(user_b, _profile("Owner B"))

            assert second.id == first.id
            assert second.display_name == "Owner A Updated"
            assert other.id != first.id
            assert await repository.get(user_a) == second
            assert await repository.get(user_b) == other

            async with pool.acquire() as connection:
                count = await connection.fetchval(
                    "SELECT count(*) FROM public.profiles WHERE user_id = $1",
                    user_a,
                )
            assert count == 1
        finally:
            await _delete_users(pool, user_a, user_b)
            await pool.close()

    asyncio.run(contract())


def test_birth_profile_repository_selects_only_the_owner_active_record(
    test_database_url: SecretStr,
) -> None:
    async def contract() -> None:
        pool = await create_database_pool(test_database_url)
        user_a, user_b = uuid4(), uuid4()
        try:
            await _seed_users(pool, user_a, user_b)
            repository = BirthProfileRepository(pool)

            first = await repository.upsert(user_a, _birth("Owner A Birth"))
            updated = await repository.upsert(user_a, _birth("Owner A Birth Updated"))
            other = await repository.upsert(user_b, _birth("Owner B Birth", day=2))
            inactive_id = uuid4()

            async with pool.acquire() as connection:
                await connection.execute(
                    """
                    INSERT INTO public.birth_profiles (
                        id, user_id, label, birth_date, birth_time, timezone,
                        latitude, longitude, place, house_system, is_active,
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false,
                        '2099-01-01T00:00:00Z'::timestamptz,
                        '2099-01-01T00:00:00Z'::timestamptz
                    )
                    """,
                    inactive_id,
                    user_a,
                    "Newer Inactive Birth",
                    date(1989, 1, 1),
                    time(1, 2, 3),
                    "America/Sao_Paulo",
                    Decimal("-23.550520"),
                    Decimal("-46.633308"),
                    "Sao Paulo",
                    "P",
                )

            assert updated.id == first.id
            assert await repository.get_active(user_a) == updated
            assert await repository.get_active(user_b) == other

            async with pool.acquire() as connection:
                active_count = await connection.fetchval(
                    """
                    SELECT count(*)
                    FROM public.birth_profiles
                    WHERE user_id = $1 AND is_active
                    """,
                    user_a,
                )
            assert active_count == 1
        finally:
            await _delete_users(pool, user_a, user_b)
            await pool.close()

    asyncio.run(contract())


def test_receipt_repository_is_owner_scoped_unique_and_safe_on_constraints(
    test_database_url: SecretStr,
) -> None:
    async def contract() -> None:
        pool = await create_database_pool(test_database_url)
        user_a, user_b = uuid4(), uuid4()
        try:
            await _seed_users(pool, user_a, user_b)
            births = BirthProfileRepository(pool)
            receipts = ReceiptRepository(pool)
            birth_a = await births.upsert(user_a, _birth("Owner A Birth"))
            birth_b = await births.upsert(user_b, _birth("Owner B Birth", day=2))
            shared_hash = "a" * 64

            write_a = _receipt(birth_a.id, input_hash=shared_hash, result="same")
            write_b = _receipt(birth_b.id, input_hash=shared_hash, result="same")
            stored_a = await receipts.store(user_a, write_a)
            stored_b = await receipts.store(user_b, write_b)
            repeated_a = await receipts.store(user_a, write_a)

            assert stored_a.id == repeated_a.id
            assert stored_a.id != stored_b.id
            assert await receipts.get(user_a, stored_a.id) == stored_a
            assert await receipts.get(user_b, stored_a.id) is None
            assert await receipts.find_exact(user_a, "natal", shared_hash) == stored_a
            assert await receipts.find_exact(user_b, "natal", shared_hash) == stored_b

            with pytest.raises(ReceiptConflictError) as duplicate_error:
                await receipts.store(
                    user_a,
                    _receipt(birth_a.id, input_hash=shared_hash, result="different"),
                )
            assert "calculation_receipts_user_kind_input_key" not in str(duplicate_error.value)
            assert str(user_a) not in str(duplicate_error.value)

            bad_hash = "b" * 64
            with pytest.raises(RepositoryConstraintError) as owner_error:
                await receipts.store(
                    user_a,
                    _receipt(birth_b.id, input_hash=bad_hash, result="forbidden"),
                )
            assert "calculation_receipts_birth_profile_owner_fkey" not in str(owner_error.value)
            assert str(birth_b.id) not in str(owner_error.value)

            async with pool.acquire() as connection:
                exact_count = await connection.fetchval(
                    """
                    SELECT count(*)
                    FROM public.calculation_receipts
                    WHERE user_id = $1 AND kind = $2 AND input_hash = $3
                    """,
                    user_a,
                    "natal",
                    shared_hash,
                )
                rejected_count = await connection.fetchval(
                    """
                    SELECT count(*)
                    FROM public.calculation_receipts
                    WHERE user_id = $1 AND input_hash = $2
                    """,
                    user_a,
                    bad_hash,
                )
            assert exact_count == 1
            assert rejected_count == 0
        finally:
            await _delete_users(pool, user_a, user_b)
            await pool.close()

    asyncio.run(contract())


def test_receipt_repository_rejects_boolean_number_json_retry(
    test_database_url: SecretStr,
) -> None:
    async def contract() -> None:
        pool = await create_database_pool(test_database_url)
        user_a, user_b = uuid4(), uuid4()
        try:
            await _seed_users(pool, user_a, user_b)
            births = BirthProfileRepository(pool)
            receipts = ReceiptRepository(pool)
            birth = await births.upsert(user_a, _birth("Owner A Birth"))
            input_hash = "c" * 64
            boolean_write = replace(
                _receipt(birth.id, input_hash=input_hash, result="same"),
                input_payload={"value": True},
            )

            await receipts.store(user_a, boolean_write)

            with pytest.raises(ReceiptConflictError):
                await receipts.store(
                    user_a,
                    replace(boolean_write, input_payload={"value": 1}),
                )
        finally:
            await _delete_users(pool, user_a, user_b)
            await pool.close()

    asyncio.run(contract())
