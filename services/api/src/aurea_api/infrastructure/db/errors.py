from __future__ import annotations

from typing import Literal

RepositoryEntity = Literal["profile", "birth_profile", "receipt"]

_SAFE_CONSTRAINT_MESSAGES: dict[RepositoryEntity, str] = {
    "profile": "Profile data could not be stored.",
    "birth_profile": "Birth profile data could not be stored.",
    "receipt": "Calculation receipt data could not be stored.",
}


class RepositoryConstraintError(Exception):
    """Safe domain-facing signal for a rejected persistence constraint."""

    def __init__(self, entity: RepositoryEntity) -> None:
        self.entity = entity
        super().__init__(_SAFE_CONSTRAINT_MESSAGES[entity])


class ReceiptConflictError(Exception):
    """An immutable exact receipt already exists with different stored data."""

    def __init__(self) -> None:
        super().__init__("An exact calculation receipt already exists with different data.")
