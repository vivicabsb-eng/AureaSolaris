from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jwt import PyJWK
from jwt.algorithms import RSAAlgorithm

from aurea_api.api.auth import TokenVerifier
from aurea_api.config import Settings
from aurea_api.domain.users.models import (
    BirthProfileResponse,
    BirthProfileUpdate,
    ProfileResponse,
    ProfileUpdate,
)
from aurea_api.main import create_app

_KEY_ID = "route-test-signing-key"
_ISSUER = "https://example.supabase.co/auth/v1"
_NOW = datetime(2026, 8, 17, 23, 0, tzinfo=UTC)


class StaticJwkClient:
    def __init__(self, signing_key: PyJWK) -> None:
        self._signing_key = signing_key

    def get_signing_key(self, kid: str) -> PyJWK:
        assert kid == _KEY_ID
        return self._signing_key


class MemoryProfileRepository:
    def __init__(self) -> None:
        self.records: dict[UUID, ProfileResponse] = {}
        self.upsert_owner_ids: list[UUID] = []

    async def get(self, user_id: UUID) -> ProfileResponse | None:
        return self.records.get(user_id)

    async def upsert(self, user_id: UUID, profile: ProfileUpdate) -> ProfileResponse:
        self.upsert_owner_ids.append(user_id)
        previous = self.records.get(user_id)
        record = ProfileResponse(
            id=previous.id if previous is not None else uuid4(),
            display_name=profile.display_name,
            timezone=profile.timezone,
            locale=profile.locale,
            created_at=previous.created_at if previous is not None else _NOW,
            updated_at=_NOW,
        )
        self.records[user_id] = record
        return record


class MemoryBirthProfileRepository:
    def __init__(self) -> None:
        self.records: dict[UUID, BirthProfileResponse] = {}
        self.upsert_owner_ids: list[UUID] = []

    async def get_active(self, user_id: UUID) -> BirthProfileResponse | None:
        return self.records.get(user_id)

    async def upsert(
        self,
        user_id: UUID,
        birth_profile: BirthProfileUpdate,
    ) -> BirthProfileResponse:
        self.upsert_owner_ids.append(user_id)
        previous = self.records.get(user_id)
        record = BirthProfileResponse(
            id=previous.id if previous is not None else uuid4(),
            label=birth_profile.label,
            birth_date=birth_profile.birth_date,
            birth_time=birth_profile.birth_time,
            timezone=birth_profile.timezone,
            latitude=birth_profile.latitude,
            longitude=birth_profile.longitude,
            place=birth_profile.place,
            house_system=birth_profile.house_system,
            is_active=True,
            created_at=previous.created_at if previous is not None else _NOW,
            updated_at=_NOW,
        )
        self.records[user_id] = record
        return record


@dataclass(slots=True)
class RouteHarness:
    app: FastAPI
    user_a: UUID
    user_b: UUID
    headers_a: dict[str, str]
    headers_b: dict[str, str]
    profiles: MemoryProfileRepository
    birth_profiles: MemoryBirthProfileRepository


def _profile_payload(display_name: str = "Owner A") -> dict[str, object]:
    return {
        "display_name": display_name,
        "timezone": "America/Sao_Paulo",
        "locale": "pt-BR",
    }


def _birth_profile_payload(label: str = "Owner A Birth") -> dict[str, object]:
    return {
        "label": label,
        "birth_date": "1990-01-01",
        "birth_time": "12:34:56",
        "timezone": "America/Sao_Paulo",
        "latitude": "-15.793889",
        "longitude": "-47.882778",
        "place": "Brasilia",
        "house_system": "P",
    }


def _public_jwk(private_key: rsa.RSAPrivateKey) -> PyJWK:
    jwk_data = RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    assert isinstance(jwk_data, dict)
    jwk_data.update({"alg": "RS256", "kid": _KEY_ID, "use": "sig"})
    return PyJWK.from_dict(jwk_data)


def _token(private_key: rsa.RSAPrivateKey, subject: UUID) -> str:
    return jwt.encode(
        {
            "iss": _ISSUER,
            "aud": "authenticated",
            "exp": int(datetime.now(UTC).timestamp()) + 300,
            "sub": str(subject),
            "email": f"{subject}@example.test",
        },
        private_key,
        algorithm="RS256",
        headers={"alg": "RS256", "kid": _KEY_ID, "typ": "JWT"},
    )


@pytest.fixture
def route_harness(api_settings: Settings) -> RouteHarness:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(_public_jwk(private_key)))
    user_a, user_b = uuid4(), uuid4()
    profiles = MemoryProfileRepository()
    birth_profiles = MemoryBirthProfileRepository()
    app = create_app(api_settings)
    app.state.token_verifier = verifier
    app.state.profile_repository = profiles
    app.state.birth_profile_repository = birth_profiles
    return RouteHarness(
        app=app,
        user_a=user_a,
        user_b=user_b,
        headers_a={"Authorization": f"Bearer {_token(private_key, user_a)}"},
        headers_b={"Authorization": f"Bearer {_token(private_key, user_b)}"},
        profiles=profiles,
        birth_profiles=birth_profiles,
    )


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/v1/me", None),
        ("PUT", "/v1/me/profile", _profile_payload()),
        ("GET", "/v1/birth-profile", None),
        ("PUT", "/v1/birth-profile", _birth_profile_payload()),
    ],
)
def test_profile_routes_require_authentication(
    route_harness: RouteHarness,
    method: str,
    path: str,
    payload: dict[str, object] | None,
) -> None:
    request_kwargs = {} if payload is None else {"json": payload}
    with TestClient(route_harness.app) as client:
        response = client.request(method, path, **request_kwargs)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["code"] == "unauthorized"


@pytest.mark.parametrize(
    ("path", "missing_code"),
    [
        ("/v1/me", "profile_not_found"),
        ("/v1/birth-profile", "birth_profile_not_found"),
    ],
)
def test_missing_profile_state_uses_stable_problem_codes(
    route_harness: RouteHarness,
    path: str,
    missing_code: str,
) -> None:
    with TestClient(route_harness.app) as client:
        response = client.get(path, headers=route_harness.headers_a)

    assert response.status_code == 404
    assert response.json()["code"] == missing_code
    assert response.json()["request_id"] == response.headers["X-Request-ID"]


def test_profile_put_creates_and_updates_authenticated_owner(
    route_harness: RouteHarness,
) -> None:
    with TestClient(route_harness.app) as client:
        created = client.put(
            "/v1/me/profile", headers=route_harness.headers_a, json=_profile_payload()
        )
        fetched = client.get("/v1/me", headers=route_harness.headers_a)
        updated = client.put(
            "/v1/me/profile",
            headers=route_harness.headers_a,
            json=_profile_payload("Owner A Updated"),
        )

    assert created.status_code == 200
    assert fetched.status_code == 200
    assert updated.status_code == 200
    assert fetched.json()["id"] == created.json()["id"]
    assert updated.json()["id"] == created.json()["id"]
    assert updated.json()["display_name"] == "Owner A Updated"
    assert "user_id" not in updated.json()
    assert route_harness.profiles.upsert_owner_ids == [route_harness.user_a] * 2


def test_birth_profile_put_creates_and_updates_authenticated_owner(
    route_harness: RouteHarness,
) -> None:
    with TestClient(route_harness.app) as client:
        created = client.put(
            "/v1/birth-profile",
            headers=route_harness.headers_a,
            json=_birth_profile_payload(),
        )
        fetched = client.get("/v1/birth-profile", headers=route_harness.headers_a)
        updated = client.put(
            "/v1/birth-profile",
            headers=route_harness.headers_a,
            json=_birth_profile_payload("Owner A Birth Updated"),
        )

    assert created.status_code == 200
    assert fetched.status_code == 200
    assert updated.status_code == 200
    assert fetched.json()["id"] == created.json()["id"]
    assert updated.json()["id"] == created.json()["id"]
    assert updated.json()["label"] == "Owner A Birth Updated"
    assert updated.json()["is_active"] is True
    assert "user_id" not in updated.json()
    assert route_harness.birth_profiles.upsert_owner_ids == [route_harness.user_a] * 2


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/v1/me/profile", {**_profile_payload(), "timezone": "Not/A-Timezone"}),
        ("/v1/birth-profile", {**_birth_profile_payload(), "latitude": "91.000000"}),
    ],
)
def test_route_payloads_use_typed_field_validation(
    route_harness: RouteHarness,
    path: str,
    payload: dict[str, object],
) -> None:
    with TestClient(route_harness.app) as client:
        response = client.put(path, headers=route_harness.headers_a, json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        (
            "/v1/me/profile",
            {**_profile_payload(), "user_id": "00000000-0000-0000-0000-000000000001"},
        ),
        (
            "/v1/birth-profile",
            {
                **_birth_profile_payload(),
                "user_id": "00000000-0000-0000-0000-000000000001",
            },
        ),
    ],
)
def test_user_id_is_not_editable_from_request_data(
    route_harness: RouteHarness,
    path: str,
    payload: dict[str, object],
) -> None:
    with TestClient(route_harness.app) as client:
        response = client.put(path, headers=route_harness.headers_a, json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert route_harness.profiles.upsert_owner_ids == []
    assert route_harness.birth_profiles.upsert_owner_ids == []


def test_user_b_cannot_observe_user_a_records(route_harness: RouteHarness) -> None:
    with TestClient(route_harness.app) as client:
        profile_created = client.put(
            "/v1/me/profile", headers=route_harness.headers_a, json=_profile_payload()
        )
        birth_created = client.put(
            "/v1/birth-profile",
            headers=route_harness.headers_a,
            json=_birth_profile_payload(),
        )
        profile_for_b = client.get("/v1/me", headers=route_harness.headers_b)
        birth_for_b = client.get("/v1/birth-profile", headers=route_harness.headers_b)

    assert profile_created.status_code == 200
    assert birth_created.status_code == 200
    assert profile_for_b.status_code == 404
    assert profile_for_b.json()["code"] == "profile_not_found"
    assert birth_for_b.status_code == 404
    assert birth_for_b.json()["code"] == "birth_profile_not_found"
    assert set(route_harness.profiles.records) == {route_harness.user_a}
    assert set(route_harness.birth_profiles.records) == {route_harness.user_a}
