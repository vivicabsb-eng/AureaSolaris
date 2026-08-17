from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Literal, cast
from uuid import UUID

import asyncpg
from asyncpg.exceptions import IntegrityConstraintViolationError

from .errors import ReceiptConflictError, RepositoryConstraintError

ReceiptKind = Literal["natal", "transit"]
_RECEIPT_SCHEMA_VERSION = "calculation-receipt.v1"

_GET_RECEIPT_SQL = """
SELECT
    id, birth_profile_id, kind, input_hash, schema_version, input_payload, result_payload,
    engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone, created_at
FROM public.calculation_receipts
WHERE user_id = $1 AND id = $2
"""

_FIND_EXACT_RECEIPT_SQL = """
SELECT
    id, birth_profile_id, kind, input_hash, schema_version, input_payload, result_payload,
    engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone, created_at
FROM public.calculation_receipts
WHERE user_id = $1 AND kind = $2 AND input_hash = $3
ORDER BY created_at DESC, id DESC
LIMIT 1
"""

_STORE_RECEIPT_SQL = """
INSERT INTO public.calculation_receipts (
    user_id, birth_profile_id, kind, input_hash, schema_version,
    input_payload, result_payload, engine_name, engine_version,
    ephemeris_version, resolved_at, resolved_timezone
) VALUES (
    $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12
)
ON CONFLICT (user_id, kind, input_hash) DO NOTHING
RETURNING
    id, birth_profile_id, kind, input_hash, schema_version, input_payload, result_payload,
    engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone, created_at
"""

_FIND_CONFLICTING_RECEIPT_SQL = """
SELECT
    id, birth_profile_id, kind, input_hash, schema_version, input_payload, result_payload,
    engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone, created_at
FROM public.calculation_receipts
WHERE user_id = $1 AND kind = $2 AND input_hash = $3
"""


@dataclass(frozen=True, slots=True)
class CalculationReceiptWrite:
    birth_profile_id: UUID
    kind: ReceiptKind
    input_hash: str
    input_payload: dict[str, object]
    result_payload: dict[str, object]
    engine_name: str
    engine_version: str
    ephemeris_version: str
    resolved_at: datetime
    resolved_timezone: str
    schema_version: str = _RECEIPT_SCHEMA_VERSION


@dataclass(frozen=True, slots=True)
class CalculationReceiptRecord:
    id: UUID
    birth_profile_id: UUID
    kind: ReceiptKind
    input_hash: str
    schema_version: str
    input_payload: dict[str, object]
    result_payload: dict[str, object]
    engine_name: str
    engine_version: str
    ephemeris_version: str
    resolved_at: datetime
    resolved_timezone: str
    created_at: datetime


def _encode_json_object(value: dict[str, object]) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _decode_json_object(value: object) -> dict[str, object]:
    decoded: object = json.loads(value) if isinstance(value, str) else value
    if not isinstance(decoded, dict) or not all(isinstance(key, str) for key in decoded):
        raise RuntimeError("Database returned an invalid receipt JSON object.")
    return cast(dict[str, object], decoded)


def _json_objects_equal(left: dict[str, object], right: dict[str, object]) -> bool:
    return _encode_json_object(left) == _encode_json_object(right)


def _row_to_receipt(row: asyncpg.Record) -> CalculationReceiptRecord:
    return CalculationReceiptRecord(
        id=row["id"],
        birth_profile_id=row["birth_profile_id"],
        kind=row["kind"],
        input_hash=row["input_hash"],
        schema_version=row["schema_version"],
        input_payload=_decode_json_object(row["input_payload"]),
        result_payload=_decode_json_object(row["result_payload"]),
        engine_name=row["engine_name"],
        engine_version=row["engine_version"],
        ephemeris_version=row["ephemeris_version"],
        resolved_at=row["resolved_at"],
        resolved_timezone=row["resolved_timezone"],
        created_at=row["created_at"],
    )


def _matches_write(record: CalculationReceiptRecord, value: CalculationReceiptWrite) -> bool:
    return (
        record.birth_profile_id == value.birth_profile_id
        and record.kind == value.kind
        and record.input_hash == value.input_hash
        and record.schema_version == value.schema_version
        and _json_objects_equal(record.input_payload, value.input_payload)
        and _json_objects_equal(record.result_payload, value.result_payload)
        and record.engine_name == value.engine_name
        and record.engine_version == value.engine_version
        and record.ephemeris_version == value.ephemeris_version
        and record.resolved_at == value.resolved_at
        and record.resolved_timezone == value.resolved_timezone
    )


class ReceiptRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get(self, user_id: UUID, receipt_id: UUID) -> CalculationReceiptRecord | None:
        row = await self._pool.fetchrow(_GET_RECEIPT_SQL, user_id, receipt_id)
        return None if row is None else _row_to_receipt(row)

    async def find_exact(
        self,
        user_id: UUID,
        kind: ReceiptKind,
        input_hash: str,
    ) -> CalculationReceiptRecord | None:
        row = await self._pool.fetchrow(_FIND_EXACT_RECEIPT_SQL, user_id, kind, input_hash)
        return None if row is None else _row_to_receipt(row)

    async def store(
        self,
        user_id: UUID,
        receipt: CalculationReceiptWrite,
    ) -> CalculationReceiptRecord:
        async with self._pool.acquire() as connection:
            async with connection.transaction():
                try:
                    row = await connection.fetchrow(
                        _STORE_RECEIPT_SQL,
                        user_id,
                        receipt.birth_profile_id,
                        receipt.kind,
                        receipt.input_hash,
                        receipt.schema_version,
                        _encode_json_object(receipt.input_payload),
                        _encode_json_object(receipt.result_payload),
                        receipt.engine_name,
                        receipt.engine_version,
                        receipt.ephemeris_version,
                        receipt.resolved_at,
                        receipt.resolved_timezone,
                    )
                except IntegrityConstraintViolationError:
                    raise RepositoryConstraintError("receipt") from None

                if row is None:
                    existing = await connection.fetchrow(
                        _FIND_CONFLICTING_RECEIPT_SQL,
                        user_id,
                        receipt.kind,
                        receipt.input_hash,
                    )
                    if existing is None:
                        raise RuntimeError("Receipt conflict did not resolve to an existing row.")
                    stored = _row_to_receipt(existing)
                    if not _matches_write(stored, receipt):
                        raise ReceiptConflictError()
                    return stored

        if row is None:
            raise RuntimeError("Receipt store did not return a row.")
        return _row_to_receipt(row)
