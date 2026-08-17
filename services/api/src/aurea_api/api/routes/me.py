from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from aurea_api.api.auth import AuthenticatedUser, get_authenticated_user
from aurea_api.dependencies import get_profile_repository
from aurea_api.domain.users.models import ProfileResponse, ProfileUpdate
from aurea_api.errors import ApiProblem
from aurea_api.infrastructure.db import ProfileRepository

router = APIRouter(prefix="/v1", tags=["profile"])


@router.get("/me", response_model=ProfileResponse)
async def get_me(
    user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    repository: Annotated[ProfileRepository, Depends(get_profile_repository)],
) -> ProfileResponse:
    profile = await repository.get(user.subject)
    if profile is None:
        raise ApiProblem(
            status_code=404,
            code="profile_not_found",
            message="Profile not found.",
        )
    return profile


@router.put("/me/profile", response_model=ProfileResponse)
async def put_profile(
    profile: ProfileUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    repository: Annotated[ProfileRepository, Depends(get_profile_repository)],
) -> ProfileResponse:
    return await repository.upsert(user.subject, profile)
