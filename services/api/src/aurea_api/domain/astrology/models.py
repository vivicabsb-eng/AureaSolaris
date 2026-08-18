from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any, Protocol, TypeAlias

CertifiedCalculation: TypeAlias = dict[str, Any]


@dataclass(frozen=True, slots=True)
class EngineVersion:
    name: str
    version: str
    receipt_schema_version: str


@dataclass(frozen=True, slots=True)
class BirthData:
    birth_date: date
    birth_time: time
    timezone: str
    latitude: float
    longitude: float
    house_system: str = "P"


class AstrologyEngine(Protocol):
    @property
    def version(self) -> EngineVersion: ...

    async def readiness(self) -> bool: ...

    def natal(self, birth: BirthData) -> CertifiedCalculation: ...

    def transits(self, birth: BirthData, as_of: datetime) -> CertifiedCalculation: ...
