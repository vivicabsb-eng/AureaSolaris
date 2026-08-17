from dotenv import load_dotenv
"""
load_dotenv()
Aurea Solaris — Astro API Server (FastAPI Sidecar)
Roda como processo persistente na porta 9876.
Exposto ao Tauri via 127.0.0.1.

Start: python main_api.py
Env: ASTRO_API_PORT=9876 (default)
"""
import os
import sys
import io
import json
import math
import secrets
from pathlib import Path
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional, List, Literal
from threading import RLock

import httpx
import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ─── UTF-8 on Windows ───
if sys.platform == "win32":
    for _stream in (sys.stdout, sys.stderr):
        if isinstance(_stream, io.TextIOWrapper):
            _stream.reconfigure(encoding="utf-8")

# ─── Importa o engine (cold start ÚNICO, uma vez) ───
from astro_engine import (
    calculate_astrology,
    calculate_transit_positions,
    HOUSE_SYSTEMS,
    SIGN_ORDER,
    SWE_AVAILABLE,
    KERYKEION_AVAILABLE,
)
from engine_governance import EngineGovernance

from local_storage import (
    StorageNotFoundError,
    StorageValidationError,
    get_storage,
)
from browser_workspace import (
    create_diary_entry,
    create_diary_folder,
    delete_board,
    delete_diary_entry,
    delete_diary_folder,
    get_diary_entry,
    list_boards,
    list_diary_entries,
    list_diary_folders,
    list_owner_workspace_ids,
    load_board,
    load_health_memory,
    is_workspace_safe_owner_id,
    save_board,
    save_health_memory,
    update_diary_entry,
)

# ─── Porta ───
API_PORT = int(os.environ.get("ASTRO_API_PORT", 9876))
API_HOST = "127.0.0.1"


def _resolve_auth_mode() -> str:
    value = os.environ.get("AUREA_REQUIRE_LOGIN", "").strip()
    return "require-login" if value == "1" else "local-owner"


AUTH_MODE = _resolve_auth_mode()
SIDECAR_TOKEN_ENV = "AUREA_SIDECAR_TOKEN"
SIDECAR_TOKEN: Optional[str] = os.environ.get(SIDECAR_TOKEN_ENV)
_BROWSER_SESSIONS: Dict[str, str] = {}
_BROWSER_SESSIONS_LOCK = RLock()
_LOCAL_ACCESS_LOCK = RLock()
_LOCAL_BROWSER_SESSION: Optional[tuple[str, str]] = None

_SETUP_REQUIRED_MESSAGES = {
    "disabled-owner": "A conta local está desativada. É necessária uma decisão humana para continuar.",
    "multiple-owners": "Há mais de uma conta local. É necessária uma decisão humana para continuar.",
    "orphan-workspace": "Há dados privados sem conta correspondente. É necessária uma decisão humana para continuar.",
    "owner-conflict": "A conta local não corresponde aos dados privados encontrados. É necessária uma decisão humana para continuar.",
}


class LocalOwnerSetupRequired(RuntimeError):
    def __init__(self, reason: str, message: str):
        super().__init__(message)
        self.reason = reason
        self.message = message


def _sidecar_token() -> str:
    """Resolve the local shell token lazily so tests and spawned shells can configure it."""
    global SIDECAR_TOKEN
    configured = os.environ.get(SIDECAR_TOKEN_ENV)
    if configured:
        SIDECAR_TOKEN = configured
    if not SIDECAR_TOKEN:
        SIDECAR_TOKEN = secrets.token_urlsafe(32)
    return SIDECAR_TOKEN


def require_sidecar_token(x_aurea_sidecar_token: Optional[str] = Header(default=None)) -> None:
    """Gate private storage routes with the token shared by the desktop shell."""
    expected = _sidecar_token()
    if not expected or not x_aurea_sidecar_token or not secrets.compare_digest(x_aurea_sidecar_token, expected):
        raise HTTPException(status_code=401, detail="Token do sidecar ausente ou inválido.")


# ─── Lifespan ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    storage_diagnostic = get_storage().diagnostic()
    print(f"[AureaSolaris] FastAPI sidecar rodando em http://{API_HOST}:{API_PORT}", flush=True)
    print(f"[AureaSolaris] SwissEphemeris: {'OK' if SWE_AVAILABLE else 'FALLBACK'}", flush=True)
    print(f"[AureaSolaris] Kerykeion: {'OK' if KERYKEION_AVAILABLE else 'N/A'}", flush=True)
    print(
        "[AureaSolaris] SQLite: "
        f"private={storage_diagnostic['private_database']['integrity']} "
        f"knowledge={storage_diagnostic['knowledge_database']['integrity']} "
        f"editorial_import={storage_diagnostic['editorial_import']['status']}",
        flush=True,
    )
    yield
    print("[AureaSolaris] Sidecar encerrando.", flush=True)


app = FastAPI(
    title="Aurea Solaris — Astro API",
    version="1.0.0",
    lifespan=lifespan,
)

# Trusted host: apenas loopback
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["127.0.0.1", "localhost"],
    www_redirect=False,
)

# CORS: apenas localhost (Tauri webview)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "tauri://localhost",
        "tauri://localhost:1420",
        "http://tauri.localhost",
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ─── Modelos Pydantic ───

class NatalRequest(BaseModel):
    """Complete parameters for a reproducible natal chart."""
    year: int = Field(ge=1900, le=2100)
    month: int = Field(ge=1, le=12)
    day: int = Field(ge=1, le=31)
    hour: float = Field(ge=0.0, lt=24.0)
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    timezone: str = Field(min_length=1, description="Confirmed IANA timezone, for example America/Sao_Paulo")
    utc_offset_minutes: Optional[int] = Field(default=None, ge=-840, le=840)
    house_system: str = Field(default="Regiomontanus")


class ChatMessage(BaseModel):
    """Mensagem individual no chat."""
    role: str = Field(description="Papel: 'system', 'user' ou 'assistant'")
    content: str = Field(description="Conteúdo da mensagem")


class ChatRequest(BaseModel):
    """Requisição de chat com Hermes."""
    messages: List[ChatMessage] = Field(description="Histórico de mensagens")
    context: Optional[str] = Field(default=None, description="Contexto adicional (página, dados astrológicos, etc.)")
    system_prompt_override: Optional[str] = Field(default=None, description="Substitui o prompt de sistema padrão (para agentes especializados)")
    allow_external: bool = Field(
        default=False,
        description="Consentimento explícito desta conversa para enviar o conteúdo a um provedor externo.",
    )
    provider: Optional[Literal["openai", "hermes_gateway"]] = Field(
        default=None,
        description="Provedor escolhido para esta conversa. Se ausente, usa HERMES_PROVIDER.",
    )


class BrowserCommandRequest(BaseModel):
    """Small browser-to-sidecar bridge for operations formerly exposed by Tauri IPC."""

    command: str = Field(min_length=1, max_length=120)
    args: Dict[str, Any] = Field(default_factory=dict)


class HermesThreadOpenRequest(BaseModel):
    """Abre uma conversa privada por pessoa e tema, sem chamar provedor de IA."""

    owner_id: str = Field(min_length=1, max_length=128)
    topic_key: str = Field(min_length=1, max_length=160)
    title: Optional[str] = Field(default=None, max_length=240)


class HermesAccountCreateRequest(BaseModel):
    """Registro explícito de uma identidade local; a senha é derivada no sidecar."""

    account_id: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=240)
    login_name: str = Field(min_length=1, max_length=240)
    password: str = Field(min_length=12, max_length=1024)


class HermesLoginRequest(BaseModel):
    login_name: str = Field(min_length=1, max_length=240)
    password: str = Field(min_length=1, max_length=1024)


class HermesMessageCreateRequest(BaseModel):
    """Mensagem local classificada: a proveniência é sempre explícita."""

    owner_id: str = Field(min_length=1, max_length=128)
    role: str = Field(min_length=1, max_length=20)
    content: str = Field(min_length=1, max_length=50_000)
    provenance_kind: str = Field(min_length=1, max_length=40)
    calculation_receipt_hash: Optional[str] = Field(default=None, max_length=64)
    source_refs: Optional[List[str]] = Field(default=None, max_length=50)


class HermesMemoryProposeRequest(BaseModel):
    """Memoria proposta pelo Hermes ou pela pessoa; nunca nasce aprovada."""

    owner_id: str = Field(min_length=1, max_length=128)
    content: str = Field(min_length=1, max_length=20_000)
    memory_type: str = Field(min_length=1, max_length=40)
    evidence_note: Optional[str] = Field(default=None, max_length=2_000)
    topic_key: Optional[str] = Field(default=None, max_length=160)
    subject_kind: Optional[str] = Field(default=None, max_length=80)
    subject_ref: Optional[str] = Field(default=None, max_length=240)
    source_thread_id: Optional[str] = Field(default=None, max_length=128)
    source_message_id: Optional[str] = Field(default=None, max_length=128)
    confidence: str = Field(default="inferred", min_length=1, max_length=40)


class HermesMemoryReviewRequest(BaseModel):
    """A pessoa decide o destino de uma memoria proposta ou aprovada."""

    owner_id: str = Field(min_length=1, max_length=128)
    decision: str = Field(min_length=1, max_length=20)


class TransitRequest(BaseModel):
    """Transit parameters with explicit provenance for civil times."""
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    day: Optional[int] = Field(default=None, ge=1, le=31)
    hour: Optional[float] = Field(default=None, ge=0.0, lt=24.0)
    lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    timezone: Optional[str] = Field(default=None, min_length=1)
    utc_offset_minutes: Optional[int] = Field(default=None, ge=-840, le=840)
    include_asteroids: bool = Field(default=False)

class PdfExtractRequest(BaseModel):
    """Requisição para extração de texto de PDF."""
    file_path: str = Field(description="Caminho absoluto do arquivo PDF no disco local")


# ─── Chat provider config ───
# Hermes usa um provedor escolhido explicitamente.
HERMES_GATEWAY_URL = os.environ.get(
    "HERMES_GATEWAY_URL",
    "http://localhost:20128/v1/chat/completions",
)
HERMES_MODEL = os.environ.get("HERMES_MODEL", "hermes-combo")
HERMES_PROVIDER = os.environ.get("HERMES_PROVIDER", "openai").strip().lower()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
OPENAI_CHAT_URL = os.environ.get(
    "OPENAI_CHAT_URL",
    "https://api.openai.com/v1/chat/completions",
)


SYSTEM_PROMPT = """Você é Hermes, assistente astrológico e de produtividade do Aurea Solaris.
Você é sábio, direto e empático. Fale em Português.
Use o contexto do usuário para dar conselhos personalizados.
Seja conciso mas completo. Use emojis com moderação para tornar a conversa agradável."""


async def _openai_chat(session: httpx.AsyncClient, messages: list[dict]) -> dict:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={"error": "OPENAI_API_KEY não configurada."},
        )
    payload = {"model": OPENAI_CHAT_MODEL, "messages": messages, "stream": False}
    resp = await session.post(
        OPENAI_CHAT_URL,
        json=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"},
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    choices = data.get("choices", [])
    if choices and choices[0].get("message", {}).get("content"):
        return {"reply": choices[0]["message"]["content"], "provider": "openai"}
    raise HTTPException(
        status_code=502,
        detail={"error": "OpenAI retornou resposta inválida."},
    )


async def _hermes_gateway_chat(session: httpx.AsyncClient, messages: list[dict]) -> dict:
    """Call the selected Hermes Gateway without probing unrelated local models."""
    response = await session.post(
        HERMES_GATEWAY_URL,
        json={"model": HERMES_MODEL, "messages": messages, "stream": False},
        headers={"Content-Type": "application/json"},
        timeout=60.0,
    )
    response.raise_for_status()
    content = response.json().get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise HTTPException(status_code=502, detail={"error": "Hermes Gateway retornou resposta inválida."})
    return {"reply": content, "provider": "hermes_gateway"}


def _requested_chat_provider(req: ChatRequest) -> Literal["openai", "hermes_gateway"]:
    provider = req.provider or HERMES_PROVIDER
    if provider not in {"openai", "hermes_gateway"}:
        raise HTTPException(
            status_code=503,
            detail={"error": "Provedor Hermes não configurado.", "next_action": "Configure HERMES_PROVIDER como openai ou hermes_gateway."},
        )
    return provider


async def _chat_with_selected_provider(
    req: ChatRequest, session: httpx.AsyncClient, messages: list[dict]
) -> dict:
    if not req.allow_external:
        raise HTTPException(
            status_code=403,
            detail={"error": "Confirme o envio desta conversa ao provedor Hermes escolhido antes de continuar."},
        )
    provider = _requested_chat_provider(req)
    if provider == "openai":
        return await _openai_chat(session, messages)
    return await _hermes_gateway_chat(session, messages)


# ─── Request resolution ───

def _resolve_transit_request(req: TransitRequest) -> dict:
    """Resolve current transits in UTC; never fabricate a civil time or location."""
    supplied = {key: getattr(req, key) for key in ("year", "month", "day", "hour")}
    supplied_count = sum(value is not None for value in supplied.values())

    if supplied_count == 0:
        now_utc = datetime.now(timezone.utc)
        return {
            "year": now_utc.year,
            "month": now_utc.month,
            "day": now_utc.day,
            "hour": now_utc.hour + now_utc.minute / 60 + now_utc.second / 3600,
            "lat": req.lat,
            "lon": req.lon,
            "timezone": "UTC",
            "utc_offset_minutes": 0,
            "include_asteroids": req.include_asteroids,
            "input_time_source": "engine_clock_utc",
        }

    if supplied_count != len(supplied):
        raise HTTPException(
            status_code=422,
            detail={"error": "Transit calculations require year, month, day and hour together."},
        )
    if not req.timezone:
        raise HTTPException(
            status_code=422,
            detail={"error": "An IANA timezone is required when a civil transit time is supplied."},
        )

    return {
        **supplied,
        "lat": req.lat,
        "lon": req.lon,
        "timezone": req.timezone,
        "utc_offset_minutes": req.utc_offset_minutes,
        "include_asteroids": req.include_asteroids,
        "input_time_source": "request",
    }


def _raise_calculation_error(result: dict) -> None:
    """Expose an explicit failure instead of returning an approximate value."""
    message = str(result.get("error", "Calculation failed."))
    status_code = 503 if "unavailable" in message.lower() else 422
    raise HTTPException(status_code=status_code, detail=result)


# ─── Rotas ───

@app.get("/health")
async def health():
    """Health check para o Tauri verificar se o sidecar está vivo."""
    storage = get_storage().diagnostic()
    return {
        "status": "ok",
        "engine": "swisseph" if SWE_AVAILABLE else "kerykeion",
        "port": API_PORT,
        "timestamp_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "storage": {
            "private": storage["private_database"]["integrity"],
            "knowledge": storage["knowledge_database"]["integrity"],
            "legacy_import": storage["legacy_import_status"],
        },
        "auth_mode": AUTH_MODE,
        "browser_contract_version": 2,
        "test_user": os.environ.get("AUREA_TEST_USER", "").strip() == "1",
    }


def _browser_session_owner(token: Optional[str]) -> str:
    if not token:
        raise HTTPException(status_code=401, detail="Sessão local do navegador ausente.")
    with _BROWSER_SESSIONS_LOCK:
        owner_id = _BROWSER_SESSIONS.get(token)
    if not owner_id:
        raise HTTPException(status_code=401, detail="Sessão local do navegador inválida ou expirada.")
    return owner_id


def _browser_issue_session(owner_id: str) -> str:
    token = secrets.token_urlsafe(32)
    with _BROWSER_SESSIONS_LOCK:
        _BROWSER_SESSIONS[token] = owner_id
    return token


def _browser_get_or_issue_local_session(owner_id: str) -> str:
    global _LOCAL_BROWSER_SESSION
    with _BROWSER_SESSIONS_LOCK:
        if _LOCAL_BROWSER_SESSION is not None:
            token, session_owner = _LOCAL_BROWSER_SESSION
            if session_owner == owner_id and _BROWSER_SESSIONS.get(token) == owner_id:
                return token
        token = secrets.token_urlsafe(32)
        _BROWSER_SESSIONS[token] = owner_id
        _LOCAL_BROWSER_SESSION = (token, owner_id)
        return token


def _browser_close_session(token: Optional[str]) -> None:
    global _LOCAL_BROWSER_SESSION
    if not token:
        return
    with _BROWSER_SESSIONS_LOCK:
        _BROWSER_SESSIONS.pop(token, None)
        if _LOCAL_BROWSER_SESSION is not None and _LOCAL_BROWSER_SESSION[0] == token:
            _LOCAL_BROWSER_SESSION = None


def _setup_required(reason: str) -> None:
    raise LocalOwnerSetupRequired(reason, _SETUP_REQUIRED_MESSAGES[reason])


def _one_enabled_matching_owner(accounts: list[dict], workspaces: set[str]) -> Optional[dict]:
    if len(accounts) != 1:
        return None
    account = accounts[0]
    if account["disabled"]:
        return None
    if workspaces - {account["account_id"]}:
        return None
    if not is_workspace_safe_owner_id(str(account["account_id"])):
        return None
    return account


def _raise_from_owner_matrix(accounts: list[dict], workspaces: set[str]) -> None:
    if len(accounts) > 1:
        _setup_required("multiple-owners")
    if len(accounts) == 1:
        account = accounts[0]
        if account["disabled"]:
            _setup_required("disabled-owner")
        _setup_required("owner-conflict")
    if workspaces:
        _setup_required("orphan-workspace")
    _setup_required("owner-conflict")


def _resolve_local_owner() -> dict:
    storage = get_storage()
    accounts = storage.list_private_accounts_for_bootstrap()
    workspaces = list_owner_workspace_ids()

    matching = _one_enabled_matching_owner(accounts, workspaces)
    if matching is not None:
        return {
            "account_id": matching["account_id"],
            "display_name": matching["display_name"],
        }

    if accounts or workspaces:
        _raise_from_owner_matrix(accounts, workspaces)

    try:
        created = storage.create_local_account_if_empty(
            account_id="local-owner",
            display_name="Aurea",
            login_name="local",
            password=secrets.token_urlsafe(32),
        )
    except StorageValidationError:
        accounts = storage.list_private_accounts_for_bootstrap()
        workspaces = list_owner_workspace_ids()
        matching = _one_enabled_matching_owner(accounts, workspaces)
        if matching is not None:
            return {
                "account_id": matching["account_id"],
                "display_name": matching["display_name"],
            }
        _raise_from_owner_matrix(accounts, workspaces)

    return {
        "account_id": str(created["account_id"]),
        "display_name": "Aurea",
    }


def _browser_payload(args: Dict[str, Any]) -> dict:
    raw_payload = args.get("payload")
    if not raw_payload:
        return {}
    if isinstance(raw_payload, dict):
        return raw_payload
    if not isinstance(raw_payload, str):
        raise HTTPException(status_code=422, detail="Payload local inválido.")
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=422, detail="Payload local não é JSON válido.") from error
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Payload local deve ser um objeto JSON.")
    return payload


@app.post("/browser/command")
async def browser_command(
    req: BrowserCommandRequest,
    request: Request,
    x_aurea_browser_session: Optional[str] = Header(default=None),
):
    """Bridge the browser UI to a small, authenticated subset of desktop commands."""
    fetch_site = request.headers.get("sec-fetch-site", "").lower()
    if fetch_site == "cross-site":
        raise HTTPException(status_code=403, detail="Origem de navegador não permitida.")

    origin = request.headers.get("origin")
    allowed_origins = {
        f"http://127.0.0.1:{API_PORT}",
        f"http://localhost:{API_PORT}",
        "http://127.0.0.1:1420",
        "http://localhost:1420",
    }
    if origin and origin not in allowed_origins:
        raise HTTPException(status_code=403, detail="Origem de navegador não permitida.")

    args = req.args

    if req.command == "private_account_register":
        account_id = str(args.get("ownerId") or "")
        result = get_storage().create_private_account(
            account_id=account_id,
            display_name=str(args.get("displayName") or ""),
            login_name=str(args.get("loginName") or ""),
            password=str(args.get("password") or ""),
        )
        owner_id = str(result["account_id"])
        return {"result": owner_id, "browser_session_token": _browser_issue_session(owner_id)}

    if req.command == "private_session_open":
        result = get_storage().authenticate_private_account(
            login_name=str(args.get("loginName") or ""),
            password=str(args.get("password") or ""),
        )
        owner_id = str(result["account_id"])
        requested_owner = str(args.get("ownerId") or "")
        if requested_owner and requested_owner != owner_id:
            raise HTTPException(status_code=403, detail="A conta local não corresponde ao perfil solicitado.")
        return {"result": owner_id, "browser_session_token": _browser_issue_session(owner_id)}

    if req.command == "private_session_close":
        _browser_close_session(x_aurea_browser_session)
        return {"result": True}

    if req.command == "remembered_owner_clear":
        return {"result": True}

    if req.command == "private_initial_access":
        if AUTH_MODE == "require-login":
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "login-required",
                    "message": "Login local obrigatório neste runtime.",
                },
            )
        try:
            with _LOCAL_ACCESS_LOCK:
                owner = _resolve_local_owner()
                token = _browser_get_or_issue_local_session(owner["account_id"])
        except LocalOwnerSetupRequired as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "setup-required",
                    "reason": error.reason,
                    "message": error.message,
                },
            ) from error
        return {
            "result": {
                "kind": "local-owner",
                "ownerId": owner["account_id"],
                "displayName": owner["display_name"],
            },
            "browser_session_token": token,
        }

    if req.command in {"run_astro_engine", "get_transit_positions"}:
        payload = _browser_payload(args)
        is_transit = req.command == "get_transit_positions" or bool(payload.get("transit"))
        if is_transit:
            result = calculate_transit_positions(
                year=payload.get("year"),
                month=payload.get("month"),
                day=payload.get("day"),
                hour=payload.get("hour"),
                lat=payload.get("lat"),
                lon=payload.get("lon"),
                include_asteroids=bool(payload.get("include_asteroids", False)),
                timezone_name=payload.get("timezone"),
                utc_offset_minutes=payload.get("utc_offset_minutes"),
            )
        else:
            result = calculate_astrology(
                year=payload.get("year"),
                month=payload.get("month"),
                day=payload.get("day"),
                hour=payload.get("hour"),
                lat=payload.get("lat"),
                lon=payload.get("lon"),
                house_system=payload.get("house_system", "Regiomontanus"),
                timezone_name=payload.get("timezone"),
                utc_offset_minutes=payload.get("utc_offset_minutes"),
            )
        return {"result": json.dumps(result, ensure_ascii=False)}

    owner_id = _browser_session_owner(x_aurea_browser_session)
    try:
        if req.command == "save_board":
            return {"result": save_board(
                owner_id,
                str(args.get("boardId") or args.get("board_id") or ""),
                str(args.get("name") or "Caderno"),
                args.get("nodes", []),
                args.get("edges", []),
            )}
        if req.command == "load_board":
            return {"result": load_board(owner_id, str(args.get("boardId") or args.get("board_id") or ""))}
        if req.command == "list_boards":
            return {"result": list_boards(owner_id)}
        if req.command == "delete_board":
            return {"result": delete_board(owner_id, str(args.get("boardId") or args.get("board_id") or ""))}
        if req.command == "load_health_memory":
            return {"result": load_health_memory(owner_id, str(args.get("profileId") or args.get("profile_id") or ""))}
        if req.command == "save_health_memory":
            return {"result": save_health_memory(
                owner_id,
                str(args.get("profileId") or args.get("profile_id") or ""),
                args.get("memory", []),
            )}
        if req.command == "diary_list_folders":
            return {"result": list_diary_folders(owner_id)}
        if req.command == "diary_create_folder":
            return {"result": create_diary_folder(owner_id, str(args.get("name") or "Nova pasta"), str(args.get("icon") or "📁"))}
        if req.command == "diary_delete_folder":
            return {"result": delete_diary_folder(owner_id, str(args.get("id") or ""))}
        if req.command == "diary_list_entries":
            folder_id = args.get("folder_id") or args.get("folderId")
            return {"result": list_diary_entries(owner_id, str(folder_id) if folder_id else None)}
        if req.command == "diary_get_entry":
            return {"result": get_diary_entry(owner_id, str(args.get("id") or ""))}
        if req.command == "diary_create_entry":
            return {"result": create_diary_entry(
                owner_id,
                str(args.get("title") or "Nova Nota"),
                str(args.get("folder_id") or args.get("folderId") or "general"),
                str(args.get("status") or "idea"),
            )}
        if req.command == "diary_update_entry":
            changes = {
                key: args[key]
                for key in ("title", "content", "folder_id", "folderId", "status")
                if key in args
            }
            if "folderId" in changes:
                changes["folder_id"] = changes.pop("folderId")
            return {"result": update_diary_entry(owner_id, str(args.get("id") or ""), changes)}
        if req.command == "diary_delete_entry":
            return {"result": delete_diary_entry(owner_id, str(args.get("id") or ""))}
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except (OSError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    if req.command == "private_sidecar_request":
        method = str(args.get("method") or "GET").upper()
        path = str(args.get("path") or "")
        if method not in {"GET", "POST"} or not (path.startswith("/hermes/") or path.startswith("/storage/")):
            raise HTTPException(status_code=403, detail="Rota privada não permitida no navegador.")
        query = args.get("query") or {}
        body = args.get("body") or {}
        supplied_owner = body.get("owner_id") or query.get("owner_id")
        if supplied_owner and str(supplied_owner) != owner_id:
            raise HTTPException(status_code=403, detail="A operação privada pertence a outro proprietário.")
        async with httpx.AsyncClient(base_url=f"http://{API_HOST}:{API_PORT}") as client:
            response = await client.request(
                method,
                path,
                params=query,
                json=body if method == "POST" else None,
                headers={"X-Aurea-Sidecar-Token": _sidecar_token()},
            )
        try:
            response_payload = response.json()
        except ValueError:
            response_payload = {"error": response.text}
        if not response.is_success:
            raise HTTPException(status_code=response.status_code, detail=response_payload)
        return {"result": response_payload}

    raise HTTPException(status_code=404, detail=f"Comando de navegador não implementado: {req.command}")


@app.get("/storage/diagnostic")
async def storage_diagnostic(_: None = Depends(require_sidecar_token)):
    """Expõe somente integridade e versões; nunca conteúdo privado."""
    try:
        return get_storage().diagnostic()
    except Exception as error:
        raise HTTPException(status_code=503, detail={"error": str(error)}) from error


@app.post("/storage/backup/private")
async def storage_backup_private(_: None = Depends(require_sidecar_token)):
    """Cria backup local verificado mediante ação explícita do aplicativo."""
    try:
        return get_storage().backup_private()
    except Exception as error:
        raise HTTPException(status_code=500, detail={"error": str(error)}) from error


def _raise_hermes_storage_error(error: Exception) -> None:
    """Map storage errors without exposing another person's private state."""
    if isinstance(error, StorageValidationError):
        raise HTTPException(status_code=422, detail={"error": str(error)}) from error
    if isinstance(error, StorageNotFoundError):
        raise HTTPException(status_code=404, detail={"error": str(error)}) from error
    raise HTTPException(status_code=503, detail={"error": "Memória local indisponível."}) from error


@app.post("/hermes/threads/open")
async def open_hermes_thread(req: HermesThreadOpenRequest, _: None = Depends(require_sidecar_token)):
    """Create/open a private study thread. No provider call or content inference occurs."""
    try:
        return get_storage().open_hermes_thread(req.owner_id, req.topic_key, req.title)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/accounts")
@app.post("/hermes/auth/register")
async def create_hermes_account(req: HermesAccountCreateRequest, _: None = Depends(require_sidecar_token)):
    """Register a local owner through the desktop shell's private channel."""
    try:
        return get_storage().create_private_account(
            account_id=req.account_id,
            display_name=req.display_name,
            login_name=req.login_name,
            password=req.password,
        )
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/auth/login")
async def login_hermes_account(req: HermesLoginRequest, _: None = Depends(require_sidecar_token)):
    """Authenticate an Argon2id local account."""
    try:
        return get_storage().authenticate_private_account(req.login_name, req.password)
    except StorageValidationError as error:
        raise HTTPException(status_code=401, detail="Credenciais inválidas.") from error
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/hermes/threads")
async def list_hermes_threads(
    owner_id: str = Query(min_length=1, max_length=128),
    limit: int = Query(default=30, ge=1, le=100),
    _: None = Depends(require_sidecar_token),
):
    """List only one owner's non-deleted Hermes threads."""
    try:
        return {"threads": get_storage().list_hermes_threads(owner_id, limit)}
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/hermes/threads/{thread_id}/context")
async def get_hermes_thread_context(
    thread_id: str,
    owner_id: str = Query(min_length=1, max_length=128),
    limit: int = Query(default=50, ge=1, le=100),
    _: None = Depends(require_sidecar_token),
):
    """Reopen a private thread with its recent, explicitly classified messages."""
    try:
        return get_storage().get_hermes_thread_context(owner_id, thread_id, limit)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/threads/{thread_id}/messages")
async def append_hermes_message(thread_id: str, req: HermesMessageCreateRequest, _: None = Depends(require_sidecar_token)):
    """Persist a message only in an active thread owned by req.owner_id."""
    try:
        return get_storage().append_hermes_message(
            owner_id=req.owner_id,
            thread_id=thread_id,
            role=req.role,
            content=req.content,
            provenance_kind=req.provenance_kind,
            calculation_receipt_hash=req.calculation_receipt_hash,
            source_refs=req.source_refs,
        )
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/memories/propose")
async def propose_hermes_memory(req: HermesMemoryProposeRequest, _: None = Depends(require_sidecar_token)):
    """Create a reviewable private memory; it does not enter approved recall automatically."""
    try:
        return get_storage().propose_hermes_memory(
            owner_id=req.owner_id,
            content=req.content,
            memory_type=req.memory_type,
            evidence_note=req.evidence_note,
            topic_key=req.topic_key,
            subject_kind=req.subject_kind,
            subject_ref=req.subject_ref,
            source_thread_id=req.source_thread_id,
            source_message_id=req.source_message_id,
            confidence=req.confidence,
        )
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/knowledge/search")
async def search_knowledge(
    query: str = Query(..., min_length=1, max_length=500),
    types: Optional[str] = Query(default=None, description="Comma-separated knowledge types: concept,claim,source"),
    limit: int = Query(default=20, ge=1, le=50),
):
    try:
        parsed_types = None
        if types:
            parsed_types = [part.strip().lower() for part in types.split(",") if part.strip()]
        return get_storage().search_knowledge(query, limit=limit, types=parsed_types)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.get("/hermes/memories")
async def list_hermes_memories(
    owner_id: str = Query(min_length=1, max_length=128),
    status: Optional[str] = Query(default=None, max_length=20),
    limit: int = Query(default=50, ge=1, le=100),
    _: None = Depends(require_sidecar_token),
):
    """List only one owner's non-deleted Hermes memories."""
    try:
        return {"memories": get_storage().list_hermes_memories(owner_id, status, limit)}
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/hermes/memories/{memory_id}/review")
async def review_hermes_memory(memory_id: str, req: HermesMemoryReviewRequest, _: None = Depends(require_sidecar_token)):
    """Approve, revoke or forget one owned Hermes memory."""
    try:
        return get_storage().review_hermes_memory(req.owner_id, memory_id, req.decision)
    except Exception as error:
        _raise_hermes_storage_error(error)


@app.post("/natal")
async def natal(req: NatalRequest):
    """Mapa natal completo — planetas, casas, aspectos, ângulos, Part of Fortune."""
    params = req.model_dump()

    try:
        result = calculate_astrology(
            year=params["year"],
            month=params["month"],
            day=params["day"],
            hour=params["hour"],
            lat=params["lat"],
            lon=params["lon"],
            house_system=params["house_system"],
            timezone_name=params["timezone"],
            utc_offset_minutes=params["utc_offset_minutes"],
        )
        if "error" in result:
            _raise_calculation_error(result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )


@app.post("/transit")
async def transit(req: TransitRequest):
    """Trânsitos — apenas posições planetárias, sem casas/aspectos."""
    params = _resolve_transit_request(req)

    try:
        result = calculate_transit_positions(
            year=params["year"],
            month=params["month"],
            day=params["day"],
            hour=params["hour"],
            lat=params["lat"],
            lon=params["lon"],
            include_asteroids=params["include_asteroids"],
            timezone_name=params["timezone"],
            utc_offset_minutes=params["utc_offset_minutes"],
        )
        if "error" in result:
            _raise_calculation_error(result)
        result.setdefault("meta", {}).setdefault("receipt", {}).setdefault("request", {})["time_source"] = params["input_time_source"]
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "traceback": traceback.format_exc()}
        )


@app.post("/extract_pdf")
async def extract_pdf(
    request: Request,
    x_aurea_browser_session: Optional[str] = Header(default=None),
    x_aurea_sidecar_token: Optional[str] = Header(default=None),
):
    """Extract text only after an explicit local upload/selection action.

    Chrome sends the selected PDF bytes with the browser session header. The
    native compatibility path may send a JSON body containing a selected local
    path and the sidecar token. No file is stored by this endpoint.
    """
    content_type = (request.headers.get("content-type") or "").split(";", 1)[0].lower()
    if content_type == "application/json":
        payload = await request.json()
        file_path = payload.get("file_path") if isinstance(payload, dict) else None
        if not isinstance(file_path, str) or not file_path.strip():
            raise HTTPException(status_code=422, detail="Caminho do PDF ausente.")
        path = Path(file_path).expanduser().resolve()
        if path.suffix.lower() != ".pdf" or not path.is_file():
            raise HTTPException(status_code=422, detail="O arquivo selecionado não é um PDF válido.")
        try:
            content = path.read_bytes()
        except OSError as error:
            raise HTTPException(status_code=422, detail="Não foi possível ler o PDF selecionado.") from error
        filename = path.name
    else:
        if not x_aurea_browser_session:
            raise HTTPException(status_code=401, detail="Sessão local do navegador ausente.")
        if not _browser_session_owner(x_aurea_browser_session):
            raise HTTPException(status_code=401, detail="Sessão local do navegador inválida.")
        content = await request.body()
        filename = request.headers.get("x-aurea-filename") or "Documento.pdf"

    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="O PDF excede o limite local de 20 MB.")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="O arquivo selecionado não parece ser um PDF.")
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as error:
        raise HTTPException(status_code=422, detail="Não foi possível extrair texto deste PDF.") from error
    return {"filename": filename, "text": text[:10000], "pages": len(reader.pages)}


@app.get("/config")
async def config():
    """Retorna configuração do engine."""
    governance_status = {
        "available": False,
        "mode": None,
        "db_exists": False,
    }
    try:
        gov = EngineGovernance()
        governance_status = {
            "available": True,
            "mode": gov.mode,
            "db_exists": gov.db_path.exists(),
            "db_path": str(gov.db_path),
        }
    except Exception:
        pass
    return {
        "house_systems": list(HOUSE_SYSTEMS.keys()),
        "signs": SIGN_ORDER,
        "swisseph": SWE_AVAILABLE,
        "kerykeion": KERYKEION_AVAILABLE,
        "port": API_PORT,
        "governance": governance_status,
    }


@app.get("/governance/status")
async def governance_status():
    """Retorna status da governança do engine."""
    gov = EngineGovernance()
    gov.connect()
    try:
        preflight = gov.preflight("calculate_astrology")
        rules = [{
            "id": r.id,
            "name": r.name,
            "category": r.category,
            "rule_kind": r.rule_kind,
            "engine_ref": r.engine_ref,
            "library_path": r.library_path,
            "quality_state": r.quality_state,
            "compiled_at": r.compiled_at,
        } for r in preflight.rules_applied]
        review_targets = [{
            "id": t.id,
            "engine_ref": t.engine_ref,
            "library_path": t.library_path,
            "review_type": t.review_type,
            "priority": t.priority,
            "detail": t.detail,
        } for t in preflight.review_targets]
        return {
            "mode": gov.mode,
            "allowed": preflight.allowed,
            "calc_kind": preflight.calc_kind,
            "engine_refs": preflight.engine_refs,
            "rules_applied": rules,
            "review_targets": review_targets,
            "blocking_gaps": preflight.blocking_gaps,
        }
    finally:
        gov.close()


@app.post("/governance/preflight/{calc_kind}")
async def governance_preflight(calc_kind: str):
    """Executa preflight de governança para um ponto de entrada específico."""
    gov = EngineGovernance()
    gov.connect()
    try:
        preflight = gov.preflight(calc_kind)
        return {
            "mode": gov.mode,
            "allowed": preflight.allowed,
            "calc_kind": preflight.calc_kind,
            "engine_refs": preflight.engine_refs,
            "rules_applied": [
                {
                    "id": r.id,
                    "name": r.name,
                    "category": r.category,
                    "rule_kind": r.rule_kind,
                    "engine_ref": r.engine_ref,
                    "library_path": r.library_path,
                    "quality_state": r.quality_state,
                    "params_json": r.params_json,
                    "compiled_at": r.compiled_at,
                }
                for r in preflight.rules_applied
            ],
            "review_targets": [
                {
                    "id": t.id,
                    "engine_ref": t.engine_ref,
                    "library_path": t.library_path,
                    "review_type": t.review_type,
                    "priority": t.priority,
                    "detail": t.detail,
                }
                for t in preflight.review_targets
            ],
            "blocking_gaps": preflight.blocking_gaps,
        }
    finally:
        gov.close()


@app.post("/chat")
async def chat(req: ChatRequest):
    """Chat Hermes pelo provedor escolhido, sem sondar Ollama ou fazer fallback silencioso."""
    system_content = req.system_prompt_override if req.system_prompt_override else SYSTEM_PROMPT
    if req.context:
        system_content += f"\n\n--- CONTEXTO ATUAL ---\n{req.context}\n--- FIM DO CONTEXTO ---"

    messages = [{"role": "system", "content": system_content}]
    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    async with httpx.AsyncClient(timeout=120.0) as session:
        return await _chat_with_selected_provider(req, session, messages)


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """SSE compatível com provedores externos, sem depender de Ollama."""
    system_content = req.system_prompt_override if req.system_prompt_override else SYSTEM_PROMPT
    if req.context:
        system_content += f"\n\n--- CONTEXTO ATUAL ---\n{req.context}\n--- FIM DO CONTEXTO ---"

    messages = [{"role": "system", "content": system_content}]
    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    async def generate():
        async with httpx.AsyncClient(timeout=120.0) as session:
            try:
                response = await _chat_with_selected_provider(req, session, messages)
                yield f"data: {json.dumps({'content': response['reply'], 'provider': response['provider']})}\n\n"
            except HTTPException as error:
                detail = error.detail if isinstance(error.detail, str) else error.detail.get("error", "Provedor Hermes indisponível.")
                yield f"data: {json.dumps({'error': detail})}\n\n"
            except Exception:
                yield f"data: {json.dumps({'error': 'Não foi possível contatar o provedor Hermes escolhido.'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# The Chrome-first launcher uses the production frontend from the same
# loopback origin. Keeping this mount after all API routes prevents the SPA
# fallback from shadowing /health, /openapi.json, and the local API contract.
_FRONTEND_DIST = Path(__file__).resolve().parent / "apps" / "web" / "dist"
if _FRONTEND_DIST.is_dir() and (_FRONTEND_DIST / "index.html").is_file():
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    # The desktop executable is this FastAPI module bundled by PyInstaller.
    # Without this explicit entry point it exited successfully immediately,
    # leaving the Mandala and Hermes with a dead localhost gateway.  Binding
    # only to loopback keeps the local-first boundary intact.
    uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="warning")
