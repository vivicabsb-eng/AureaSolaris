from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from aurea_api.api.auth import AuthenticatedUser, get_authenticated_user
from aurea_api.dependencies import get_birth_profile_repository
from aurea_api.domain.users.models import BirthProfileResponse, BirthProfileUpdate
from aurea_api.errors import ApiProblem
from aurea_api.infrastructure.db import BirthProfileRepository

router = APIRouter(prefix="/v1", tags=["birth-profile"])


@router.get("/birth-profile", response_model=BirthProfileResponse)
async def get_birth_profile(
    user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    repository: Annotated[BirthProfileRepository, Depends(get_birth_profile_repository)],
) -> BirthProfileResponse:
    birth_profile = await repository.get_active(user.subject)
    if birth_profile is None:
        raise ApiProblem(
            status_code=404,
            code="birth_profile_not_found",
            message="Birth profile not found.",
        )
    return birth_profile


@router.put("/birth-profile", response_model=BirthProfileResponse)
async def put_birth_profile(
    birth_profile: BirthProfileUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    repository: Annotated[BirthProfileRepository, Depends(get_birth_profile_repository)],
) -> BirthProfileResponse:
    return await repository.upsert(user.subject, birth_profile)
