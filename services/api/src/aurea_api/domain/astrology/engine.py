"""
Astro Engine - Swiss Ephemeris + Kerykeion Hybrid
High-precision astrology calculations for Aurea Solaris.

Uses Swiss Ephemeris (swe) for planetary positions and house cusps.
Uses kerykeion for Chiron (if ephemeris unavailable) and as fallback.

Governance:
- Every public calculation entrypoint passes through EngineGovernance preflight.
- The engine never silently ignores the Biblioteca de Engenharia Astrológica.
- In strict mode, unresolved quality errors block the calculation.
- In observe mode, unresolved quality warnings are reported but do not block.
- In disabled mode, no governance checks are performed.

Refactored: 2026-06-11 — Precision & performance overhaul.
  - Direct transit calculations (no unnecessary house/aspect overhead)
  - Professional orbs per planet with aspect-type multipliers
  - Nocturnal Part of Fortune formula
  - Duffet cosine illumination
  - Kerykeion-only fallback (no arithmetic hacks)
  - Optional minor aspects
  - Ecliptic latitude in output
  - Vertex validated per house system
  - LRU cache for repeated transit queries
  - Pre-calculated house ranges
  - Mandatory governance preflight against biblioteca
"""

# ──────────────────────────────────────────────────────
#  ALL IMPORTS (top-level, no duplicates)
# ──────────────────────────────────────────────────────
from datetime import datetime, timezone, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional
import ast
import hashlib
import io
from importlib import metadata as importlib_metadata
import json
import math
import os
import sys
import traceback
import warnings
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# ──────────────────────────────────────────────────────
#  SUPPRESS ONLY SWISSEPH DEPRECATION WARNINGS
# ──────────────────────────────────────────────────────
warnings.filterwarnings("ignore", category=DeprecationWarning, module="swisseph")

# ──────────────────────────────────────────────────────
#  SWISS EPHEMERIS
# ──────────────────────────────────────────────────────
SWE_AVAILABLE = False
try:
    import swisseph as swe
    SWE_AVAILABLE = True
    project_root = os.path.dirname(os.path.abspath(__file__))
    ephe_dir = os.path.join(project_root, "ephe")
    if os.path.isdir(ephe_dir):
        swe.set_ephe_path(ephe_dir)
    else:
        swe.set_ephe_path(project_root)
except ImportError:
    SWE_AVAILABLE = False


# This version is intentionally maintained by the application, independently
# from the package version of the Swiss Ephemeris binding.
ENGINE_NAME = "aurea-solaris-astro-engine"
ENGINE_VERSION = "2026.08.audit-1"
RECEIPT_SCHEMA_VERSION = "calculation-receipt.v1"

# ──────────────────────────────────────────────────────
#  KERYKEION
# ──────────────────────────────────────────────────────
KERYKEION_AVAILABLE = False
try:
    from kerykeion import AstrologicalSubject
    KERYKEION_AVAILABLE = True
except ImportError:
    KERYKEION_AVAILABLE = False

# ──────────────────────────────────────────────────────
#  ENGINE GOVERNANCE (mandatory preflight against biblioteca)
# ──────────────────────────────────────────────────────
try:
    from engine_governance import EngineGovernance, ENTRYPOINT_RULES, GovernanceResult

    _GOVERNANCE_AVAILABLE = True
except ImportError:
    EngineGovernance = None  # type: ignore[assignment,misc]
    ENTRYPOINT_RULES = {}  # type: ignore[assignment]
    GovernanceResult = Any  # type: ignore[assignment,misc]
    _GOVERNANCE_AVAILABLE = False

# ──────────────────────────────────────────────────────
#  CONSTANTS
# ──────────────────────────────────────────────────────

# Chaldean order for planetary hours
CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
DAY_REGENTS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

# Zodiac signs (tropical)
SIGN_ORDER = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

# Planet IDs for Swiss Ephemeris
SWE_PLANETS: Dict[str, int] = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
}

# House system codes for Swiss Ephemeris
HOUSE_SYSTEMS: Dict[str, str] = {
    "Regiomontanus": "R",
    "Placidus": "P",
    "Koch": "K",
    "Porphyrius": "O",
    "Campanus": "C",
    "Morinus": "M",
    "Whole_Sign": "W",
    "Equal": "E",
}

# Vertex is only meaningful for systems using the vertical great circle
VERTEX_SYSTEMS = {"Placidus", "Koch", "Campanus"}

# ─── Aspect definitions ───
# Major aspects (traditional 5 + Quincunx)
ASPECTS_MAJOR = [
    {"type": "Conjunction",     "angle": 0,   "orb": 8.0, "symbol": "☌"},
    {"type": "Opposition",      "angle": 180, "orb": 8.0, "symbol": "☍"},
    {"type": "Trine",           "angle": 120, "orb": 8.0, "symbol": "△"},
    {"type": "Square",          "angle": 90,  "orb": 6.0, "symbol": "□"},
    {"type": "Sextile",         "angle": 60,  "orb": 4.0, "symbol": "＊"},
    {"type": "Quincunx",        "angle": 150, "orb": 3.0, "symbol": "☽"},
]

# Minor aspects (supplementary — opt-in)
ASPECTS_MINOR = [
    {"type": "Quintile",            "angle": 72,  "orb": 3.0, "symbol": "Q"},
    {"type": "Bi-Quintile",         "angle": 144, "orb": 3.0, "symbol": "bQ"},
    {"type": "Semi-Sextile",        "angle": 30,  "orb": 2.0, "symbol": "⧬"},
    {"type": "Semi-Square",         "angle": 45,  "orb": 2.0, "symbol": "∠"},
    {"type": "Sesqui-Quadrature",   "angle": 135, "orb": 2.0, "symbol": "⚼"},
]

# Default: major aspects only
ASPECTS = ASPECTS_MAJOR

# ─── Professional orbs per planet/body ───
PLANET_ORBS: Dict[str, float] = {
    "Sun": 8.0, "Moon": 8.0,
    "Mercury": 6.0, "Venus": 6.0, "Mars": 6.0,
    "Jupiter": 5.0, "Saturn": 5.0,
    "Uranus": 4.0, "Neptune": 3.0, "Pluto": 2.0,
    "Chiron": 4.0,
    "ASC": 8.0, "MC": 6.0,
}

# Orb multiplier per aspect type
ASPECT_MULTIPLIER: Dict[str, float] = {
    "Conjunction": 1.0,
    "Opposition": 1.0,
    "Trine": 1.0,
    "Square": 0.75,
    "Sextile": 0.5,
    "Quincunx": 0.4,
    "Quintile": 0.3,
    "Bi-Quintile": 0.3,
    "Semi-Sextile": 0.25,
    "Semi-Square": 0.25,
    "Sesqui-Quadrature": 0.25,
}

# ─── Brazil DST lookup ───
BRAZIL_DST_YEARS: Dict[int, bool] = {
    1931: True,  1932: True,  1933: True,
    1949: True,  1950: True,  1951: True,  1952: True,  1953: True,
    1963: True,  1964: True,  1965: True,  1966: True,  1967: True,  1968: True,
    1985: True,  1986: True,  1987: True,  1988: True,  1989: True,
    1990: True,  1991: True,  1992: True,  1993: True,  1994: True,
    1995: True,  1996: True,  1997: True,  1998: True,  1999: True,
    2000: True,  2001: True,  2002: True,  2003: True,  2004: True,
    2005: True,  2006: True,  2007: True,  2008: True,  2009: True,
    2010: True,  2011: True,  2012: True,  2013: True,  2014: True,
    2015: True,  2016: True,  2017: True,  2018: True,  2019: True,
}


# ──────────────────────────────────────────────────────
#  HELPER FUNCTIONS
# ──────────────────────────────────────────────────────

def is_brazil_dst(local_dt: datetime) -> bool:
    """Retorna True se o horário de verão (DST) estava vigente no momento dado.

    Brasil teve DST nos períodos: 1931-1933, 1949-1953, 1963-1968, 1985-2018.
    O último DST foi o de 2018/2019 (4/nov/2018 a 17/fev/2019). Abolido em abril/2019.

    Regras para o período 1985-2018:
    - Início: primeiro domingo de outubro às 00:00 local
    - Fim: terceiro domingo de fevereiro às 00:00 (ano SEGUINTE se mês >= 10)
    """
    year = local_dt.year
    if year not in BRAZIL_DST_YEARS or not BRAZIL_DST_YEARS[year]:
        return False

    oct1 = datetime(year, 10, 1)
    dst_start = oct1 + timedelta(days=(6 - oct1.weekday()) % 7)

    end_year = year if local_dt.month < 10 else year + 1
    feb1 = datetime(end_year, 2, 1)
    days_to_first_sun = (6 - feb1.weekday()) % 7
    third_sun = feb1 + timedelta(days=days_to_first_sun + 14)

    if local_dt.month >= 10:
        return local_dt >= dst_start
    else:
        return local_dt < third_sun


def _package_version(distribution: str, module: Any) -> Optional[str]:
    """Return a library version without making the calculation depend on it."""
    for attribute in ("__version__", "version"):
        value = getattr(module, attribute, None)
        try:
            value = value() if callable(value) else value
        except Exception:
            value = None
        if value:
            return str(value)
    try:
        return importlib_metadata.version(distribution)
    except importlib_metadata.PackageNotFoundError:
        return None


def _canonical_input_hash(inputs: Dict[str, Any]) -> str:
    """Hash the exact normalized calculation inputs in a reproducible format."""
    canonical = json.dumps(
        inputs,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _resolve_local_datetime(
    year: int,
    month: int,
    day: int,
    hour: float,
    timezone_name: str,
    utc_offset_minutes: Optional[int] = None,
) -> tuple[datetime, datetime, int]:
    """Resolve a civil instant to UTC without inferring a timezone or DST fold.

    A local civil time during a DST fall-back occurs twice.  It is rejected
    unless the caller supplies the intended UTC offset.  A nonexistent civil
    time during a spring-forward transition is always rejected.
    """
    if not isinstance(timezone_name, str) or not timezone_name.strip():
        raise ValueError("IANA timezone is required for a reproducible calculation.")

    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown IANA timezone: {timezone_name}") from exc

    total_seconds = round(float(hour) * 3600)
    if total_seconds < 0 or total_seconds >= 24 * 3600:
        raise ValueError("Hour must be between 00:00 and 23:59:59.")

    local_naive = datetime(year, month, day) + timedelta(seconds=total_seconds)
    candidates: List[tuple[datetime, datetime, int]] = []
    seen_offsets = set()

    for fold in (0, 1):
        local_aware = local_naive.replace(tzinfo=zone, fold=fold)
        utc_dt = local_aware.astimezone(timezone.utc)
        round_trip = utc_dt.astimezone(zone)
        if round_trip.replace(tzinfo=None) != local_naive:
            continue
        offset = int(local_aware.utcoffset().total_seconds() // 60)
        if offset not in seen_offsets:
            candidates.append((local_aware, utc_dt, offset))
            seen_offsets.add(offset)

    if not candidates:
        raise ValueError(
            "The local date/time does not exist in the supplied IANA timezone. "
            "Choose a valid civil time."
        )

    if utc_offset_minutes is not None:
        candidates = [candidate for candidate in candidates if candidate[2] == utc_offset_minutes]
        if not candidates:
            raise ValueError(
                "The supplied UTC offset does not match the IANA timezone at the requested instant."
            )

    if len(candidates) > 1:
        raise ValueError(
            "The local date/time is ambiguous in the supplied IANA timezone. "
            "Provide utc_offset_minutes to identify the intended instant."
        )

    return candidates[0]


def _serialize_governance_result(result: GovernanceResult) -> Dict[str, Any]:
    return {
        "mode": result.mode,
        "calc_kind": result.calc_kind,
        "engine_refs": result.engine_refs,
        "allowed": result.allowed,
        "blocking_gaps": result.blocking_gaps,
        "warnings": [
            {
                "engine_ref": w["engine_ref"],
                "library_path": w["library_path"],
                "gap_type": w["gap_type"],
                "detail": w["detail"],
                "priority": w["priority"],
            }
            for w in result.warnings
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
            for t in result.review_targets
        ],
        "rules_applied": [
            {
                "id": r.id,
                "name": r.name,
                "category": r.category,
                "rule_kind": r.rule_kind,
                "engine_ref": r.engine_ref,
                "library_path": r.library_path,
                "params_json": r.params_json,
                "quality_state": r.quality_state,
                "source_hash": r.source_hash,
                "compiled_at": r.compiled_at,
            }
            for r in result.rules_applied
        ],
        "receipt": result.receipt,
    }


def _calculation_receipt(
    *,
    calculation_kind: str,
    input_parameters: Dict[str, Any],
    local_dt: datetime,
    utc_dt: datetime,
    utc_offset_minutes: int,
    ephemeris_mode: str,
    house_system: Optional[str] = None,
    include_minor_aspects: Optional[bool] = None,
) -> Dict[str, Any]:
    """Build the immutable provenance block returned with every calculation."""
    ephemeris_version = _package_version("pyswisseph", swe) if SWE_AVAILABLE else None
    receipt = {
        "schema_version": RECEIPT_SCHEMA_VERSION,
        "kind": calculation_kind,
        "engine": {"name": ENGINE_NAME, "version": ENGINE_VERSION},
        "calculated_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "input": input_parameters,
        "input_hash": _canonical_input_hash(input_parameters),
        "resolved_time": {
            "local": local_dt.isoformat(),
            "utc": utc_dt.isoformat().replace("+00:00", "Z"),
            "iana_timezone": str(local_dt.tzinfo),
            "utc_offset_minutes": utc_offset_minutes,
        },
        "zodiac": "tropical",
        "ayanamsa": None,
        "ephemeris": {
            "library": "pyswisseph" if SWE_AVAILABLE else None,
            "library_version": ephemeris_version,
            "mode": ephemeris_mode,
        },
    }
    if house_system is not None:
        receipt["house_system"] = house_system
    if include_minor_aspects is not None:
        receipt["aspects"] = {
            "include_minor": include_minor_aspects,
            "orb_policy": "minimum-body-orb × aspect-multiplier",
        }
    return receipt


def to_julian_day(year: int, month: int, day: int, hour: float) -> float:
    """Calculate Julian Day from civil date and time."""
    return swe.julday(year, month, day, hour)


def degree_to_sign(degree: float) -> tuple:
    """Convert absolute degree (0-360) to (sign_name, position_in_sign)."""
    normalized = degree % 360
    sign_index = int(normalized // 30)
    pos_in_sign = normalized % 30
    return SIGN_ORDER[sign_index], pos_in_sign


def get_planetary_hour(dt: datetime) -> str:
    """Calculate the planet ruling the current hour (Chaldean order)."""
    day_of_week = (dt.weekday() + 1) % 7
    day_regent = DAY_REGENTS[day_of_week]
    start_idx = CHALDEAN_ORDER.index(day_regent)
    hour_idx = (start_idx + dt.hour) % len(CHALDEAN_ORDER)
    return str(CHALDEAN_ORDER[hour_idx])


def get_moon_phase_name(diff: float) -> dict:
    """Calculate moon phase from Sun-Moon longitude difference.

    Uses Duffet cosine formula for illumination:
        illumination = 50 * (1 - cos(diff))
    """
    illumination = round(50 * (1 - math.cos(math.radians(diff))), 1)

    if diff < 22.5 or diff >= 337.5:
        return {"phase": "Nova", "icon": "🌑", "illumination": 0.0}
    elif diff < 67.5:
        return {"phase": "Crescente", "icon": "🌒", "illumination": illumination}
    elif diff < 112.5:
        return {"phase": "Quarto Crescente", "icon": "🌓", "illumination": illumination}
    elif diff < 157.5:
        return {"phase": "Gibosa Crescente", "icon": "🌔", "illumination": illumination}
    elif diff < 202.5:
        return {"phase": "Cheia", "icon": "🌕", "illumination": 100.0}
    elif diff < 247.5:
        return {"phase": "Gibosa Minguante", "icon": "🌖", "illumination": illumination}
    elif diff < 292.5:
        return {"phase": "Quarto Minguante", "icon": "🌗", "illumination": illumination}
    else:
        return {"phase": "Minguante", "icon": "🌘", "illumination": illumination}


def calculate_whole_sign_houses(asc_degree: float) -> List[float]:
    """Calculate Whole Sign house cusps. House 1 starts at 0 of the sign containing ASC."""
    asc_sign_start = (asc_degree // 30) * 30
    return [(asc_sign_start + i * 30) % 360 for i in range(12)]


def _resolve_house_system(house_system: str) -> str:
    """Normalize house system input to match HOUSE_SYSTEMS keys."""
    if not house_system:
        return "Regiomontanus"
    # Accept both 'Whole Sign' and 'Whole_Sign'
    normalized = house_system.replace(" ", "_") if " " in house_system and "_" not in house_system else house_system
    if normalized in HOUSE_SYSTEMS:
        return normalized
    return house_system


# ──────────────────────────────────────────────────────
#  ORB CALCULATION (Professional)
# ──────────────────────────────────────────────────────

def get_orb_limit(asp_type: str, p1: str, p2: str) -> float:
    """Return the applicable orb limit using the MINOR orb of the two bodies,
    scaled by the aspect multiplier.

    Formula: min(orb_p1, orb_p2) * multiplier_aspect
    """
    orb1 = PLANET_ORBS.get(p1, 5.0)
    orb2 = PLANET_ORBS.get(p2, 5.0)
    base_orb = min(orb1, orb2)
    multiplier = ASPECT_MULTIPLIER.get(asp_type, 0.5)
    return base_orb * multiplier


# ──────────────────────────────────────────────────────
#  HOUSE RANGE OPTIMIZATION
# ──────────────────────────────────────────────────────

def build_house_ranges(cusps_raw: List[float]) -> List[tuple]:
    """Pre-calculate house ranges for O(1) house assignment."""
    ranges = []
    for i in range(12):
        start = cusps_raw[i]
        end = cusps_raw[(i + 1) % 12]
        ranges.append((start, end, i + 1))
    return ranges


def assign_to_house(deg: float, house_ranges: List[tuple]) -> int:
    """Assign a degree to a house using pre-calculated ranges."""
    for start, end, house_num in house_ranges:
        if start < end:
            if start <= deg < end:
                return house_num
        else:  # wraps around 0°
            if deg >= start or deg < end:
                return house_num
    return 12


# ──────────────────────────────────────────────────────
#  ASPECTS
# ──────────────────────────────────────────────────────

def calculate_aspects(planets: Dict, speeds: Dict, include_minor: bool = False) -> List[Dict]:
    """Calculate all aspects between planets with correct applying/separating logic.

    Applying = the angular distance to the exact aspect angle is DECREASING.
    Separating = the angular distance is INCREASING.

    Parameters
    ----------
    planets : dict
        Planet data keyed by name, each with 'degree'.
    speeds : dict
        Orbital speeds keyed by name.
    include_minor : bool
        If True, include minor aspects (Quintile, Bi-Quintile, etc.).
        Default: False (major + Quincunx only).
    """
    aspects_to_check = list(ASPECTS_MAJOR)
    if include_minor:
        aspects_to_check.extend(ASPECTS_MINOR)

    keys = list(planets.keys())
    aspects_list = []

    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            p1 = keys[i]
            p2 = keys[j]
            d1 = planets[p1].get("degree", 0)
            d2 = planets[p2].get("degree", 0)

            diff = abs(d1 - d2) % 360
            dist = 360 - diff if diff > 180 else diff

            for asp in aspects_to_check:
                angle_val = asp["angle"]
                orb_limit = get_orb_limit(asp["type"], p1, p2)
                dist_from_angle = abs(dist - angle_val)

                if dist_from_angle < orb_limit:
                    s1 = speeds.get(p1, 0)
                    s2 = speeds.get(p2, 0)

                    # Signed angular difference normalized to [-180, 180]
                    signed_diff = (d1 - d2) % 360
                    if signed_diff > 180:
                        signed_diff -= 360

                    # Rate of change of signed angular difference
                    rate = s1 - s2

                    # signed_diff * rate < 0 means approaching the aspect → applying
                    if rate != 0:
                        applying = (signed_diff * rate) < 0
                    else:
                        applying = True  # stationary, assume applying

                    aspects_list.append({
                        "p1": p1,
                        "p2": p2,
                        "type": asp["type"],
                        "symbol": asp["symbol"],
                        "orb": round(dist_from_angle, 2),
                        "applying": applying,
                    })
                    break

    return aspects_list


# ──────────────────────────────────────────────────────
#  MAIN CALCULATION
# ──────────────────────────────────────────────────────

def calculate_astrology(
    year: int,
    month: int,
    day: int,
    hour: float,
    lat: float,
    lon: float,
    house_system: str = "Regiomontanus",
    timezone_name: str = "",
    utc_offset_minutes: Optional[int] = None,
) -> Dict[str, Any]:
    """Main calculation: Swiss Ephemeris for planets + houses.

    Natal calculations require an explicit IANA timezone.  We never infer it
    from a city, coordinate, browser locale, or the host machine.
    """
    # ─── MANDATORY GOVERNANCE PREFLIGHT ─────────────────────
    governance = EngineGovernance(mode="strict")
    with governance:
        preflight_result = governance.preflight("calculate_astrology")
    if not preflight_result.allowed:
        return {
            "error": "Governance blocked this calculation.",
            "governance": _serialize_governance_result(preflight_result),
        }
    # ────────────────────────────────────────────────────────

    if not SWE_AVAILABLE:
        return {"error": "Swiss Ephemeris is unavailable; no natal chart was calculated."}

    try:
        # Convert the explicit civil time to UTC for the Julian Day.
        local_dt, utc_dt, resolved_offset_minutes = _resolve_local_datetime(
            year,
            month,
            day,
            hour,
            timezone_name,
            utc_offset_minutes,
        )
        utc_hour = (
            utc_dt.hour
            + utc_dt.minute / 60
            + utc_dt.second / 3600
            + utc_dt.microsecond / 3_600_000_000
        )

        # Normalize house system input
        house_system = _resolve_house_system(house_system)

        # Swiss Ephemeris receives a Julian Day in UTC.  The civil input date
        # can cross a UTC day boundary (for example, Brazil late at night), so
        # using the local year/month/day here silently shifted every position
        # by one day.  Always derive all four JD fields from the resolved UTC
        # instant recorded in the receipt.
        jd = to_julian_day(utc_dt.year, utc_dt.month, utc_dt.day, utc_hour)
        flags = swe.FLG_SWIEPH | swe.FLG_SPEED

        # ─── PLANETS via Swiss Ephemeris ───
        planets_data: Dict[str, Dict[str, Any]] = {}
        speeds: Dict[str, float] = {}
        ephemeris_mode = "unknown"

        for name, pid in SWE_PLANETS.items():
            r = swe.calc(jd, pid, flags)
            if r and r[0]:
                # Detect ephemeris fallback on first planet
                if ephemeris_mode == "unknown":
                    returned_flags = r[1]
                    if returned_flags & swe.FLG_SWIEPH:
                        ephemeris_mode = "swiss"
                    elif returned_flags & swe.FLG_MOSEPH:
                        ephemeris_mode = "moshier"
                    elif returned_flags & swe.FLG_JPLEPH:
                        ephemeris_mode = "jpl"
                    else:
                        ephemeris_mode = f"unknown({returned_flags})"
                ecl_lon = r[0][0] % 360
                ecl_lat = r[0][1]
                speed = r[0][3] if len(r[0]) > 3 else 0
                sign, pos = degree_to_sign(ecl_lon)

                planets_data[name] = {
                    "degree": round(ecl_lon, 2),
                    "latitude": round(ecl_lat, 2),
                    "sign": sign[:3],
                    "sign_full": sign,
                    "pos_in_sign": round(pos, 2),
                    "retrograde": speed < 0,
                    "speed": round(speed, 4),
                    "stationary": abs(speed) < 0.001,
                }
                speeds[name] = speed

        # ─── HOUSES via Swiss Ephemeris ───
        hsys = HOUSE_SYSTEMS.get(house_system, "R")
        swe_vertex: Optional[float] = None
        if house_system in ("Whole_Sign",):
            _, ascmc = swe.houses(jd, lat, lon, b'P')
            asc_degree = ascmc[0]
            mc_degree = ascmc[1]
            swe_vertex = ascmc[3] if len(ascmc) > 3 else None
            cusps_raw = calculate_whole_sign_houses(asc_degree)
            house_system_used = "Whole_Sign"
        else:
            cusps_raw, ascmc = swe.houses(jd, lat, lon, hsys.encode())
            asc_degree = ascmc[0]
            mc_degree = ascmc[1]
            swe_vertex = ascmc[3] if len(ascmc) > 3 else None
            house_system_used = house_system

        # Pre-calculate house ranges for O(1) assignment
        house_ranges = build_house_ranges(cusps_raw)

        # Angles
        angles = {
            "ASC": round(asc_degree, 2),
            "MC": round(mc_degree, 2),
            "DSC": round((asc_degree + 180) % 360, 2),
            "IC": round((mc_degree + 180) % 360, 2),
        }

        # Add ASC and MC to planets for aspect calculation
        asc_sign, asc_pos = degree_to_sign(asc_degree)
        planets_data["ASC"] = {
            "degree": round(asc_degree, 2),
            "latitude": 0.0,
            "sign": asc_sign[:3],
            "sign_full": asc_sign,
            "pos_in_sign": round(asc_pos, 2),
            "retrograde": False,
            "speed": 0,
        }
        speeds["ASC"] = 0

        mc_sign, mc_pos = degree_to_sign(mc_degree)
        planets_data["MC"] = {
            "degree": round(mc_degree, 2),
            "latitude": 0.0,
            "sign": mc_sign[:3],
            "sign_full": mc_sign,
            "pos_in_sign": round(mc_pos, 2),
            "retrograde": False,
            "speed": 0,
        }
        speeds["MC"] = 0

        # Houses list
        houses_list = []
        for i, deg in enumerate(cusps_raw, 1):
            sign, pos = degree_to_sign(deg)
            houses_list.append({
                "house": i,
                "degree": round(deg, 2),
                "sign": sign,
                "pos_in_sign": round(pos, 2),
            })

        # Assign planets to houses (using pre-calculated ranges)
        for name in planets_data:
            if name in ("ASC", "MC", "DSC", "IC"):
                continue
            planets_data[name]["house"] = assign_to_house(
                planets_data[name]["degree"], house_ranges
            )

        # ─── CHIRON ───
        chiron_deg = None
        if SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.CHIRON, flags)
                if r and r[0]:
                    chiron_deg = r[0][0] % 360
                    ecl_lat = r[0][1]
                    speed = r[0][3] if len(r[0]) > 3 else 0
                    sign, pos = degree_to_sign(chiron_deg)
                    planets_data["Chiron"] = {
                        "degree": round(chiron_deg, 2),
                        "latitude": round(ecl_lat, 2),
                        "sign": sign[:3],
                        "sign_full": sign,
                        "pos_in_sign": round(pos, 2),
                        "retrograde": speed < 0,
                        "speed": round(speed, 4),
                    }
                    speeds["Chiron"] = speed
            except Exception:
                chiron_deg = None

        # Fallback to kerykeion for Chiron
        if "Chiron" not in planets_data and KERYKEION_AVAILABLE:
            try:
                ksubject = AstrologicalSubject(
                    "tmp", year, month, day, int(hour), int((hour % 1) * 60),
                    lat=lat, lng=lon, tz_str=timezone_name,
                    is_dst=bool(local_dt.dst()),
                )
                kmodel = ksubject.model()
                kchiron = getattr(kmodel, "chiron", None)
                if kchiron is not None:
                    chiron_deg = float(kchiron.abs_pos)
                    speed = float(kchiron.speed)
                    sign, pos = degree_to_sign(chiron_deg)
                    planets_data["Chiron"] = {
                        "degree": round(chiron_deg, 2),
                        "latitude": 0.0,
                        "sign": sign[:3],
                        "sign_full": sign,
                        "pos_in_sign": round(pos, 2),
                        "retrograde": bool(kchiron.retrograde) if hasattr(kchiron, 'retrograde') else False,
                        "speed": round(speed, 4),
                        "precision": "reduced",
                    }
                    speeds["Chiron"] = speed
            except Exception:
                pass

        # Assign Chiron to house
        if chiron_deg and "Chiron" in planets_data:
            planets_data["Chiron"]["house"] = assign_to_house(chiron_deg, house_ranges)

        # ─── SECONDARY BODIES ───
        moon_deg = planets_data.get("Moon", {}).get("degree", 0)
        sun_deg = planets_data.get("Sun", {}).get("degree", 0)
        asc_d = angles["ASC"]

        secondary: Dict[str, Dict[str, Any]] = {}

        # North Node (True Lunar Node) via Swiss Ephemeris
        if SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.TRUE_NODE, flags)
                if r and r[0]:
                    nn_deg = r[0][0] % 360
                    sign, pos = degree_to_sign(nn_deg)
                    secondary["NorthNode"] = {
                        "degree": round(nn_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                    }
                    sn_deg = (nn_deg + 180) % 360
                    sign, pos = degree_to_sign(sn_deg)
                    secondary["SouthNode"] = {
                        "degree": round(sn_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                    }
            except Exception:
                pass  # skip — better no node than wrong node

        # North Node fallback: kerykeion only (no arithmetic hack)
        if "NorthNode" not in secondary and KERYKEION_AVAILABLE:
            try:
                ksubject = AstrologicalSubject(
                    "tmp", year, month, day, int(hour), int((hour % 1) * 60),
                    lat=lat, lng=lon, tz_str=timezone_name,
                    is_dst=bool(local_dt.dst()),
                )
                kmodel = ksubject.model()
                knn = getattr(kmodel, "north_node", None)
                if knn is not None:
                    nn_deg = float(knn.abs_pos)
                    sign, pos = degree_to_sign(nn_deg)
                    secondary["NorthNode"] = {
                        "degree": round(nn_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                        "precision": "reduced",
                    }
                    sn_deg = (nn_deg + 180) % 360
                    sign, pos = degree_to_sign(sn_deg)
                    secondary["SouthNode"] = {
                        "degree": round(sn_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                        "precision": "reduced",
                    }
            except Exception:
                pass

        # Lilith (Mean Lunar Apogee)
        if SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.MEAN_APOG, flags)
                if r and r[0]:
                    lil_deg = r[0][0] % 360
                    sign, pos = degree_to_sign(lil_deg)
                    secondary["Lilith"] = {
                        "degree": round(lil_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                    }
            except Exception:
                pass

        # Lilith fallback: kerykeion only (no arithmetic hack)
        if "Lilith" not in secondary and KERYKEION_AVAILABLE:
            try:
                ksubject = AstrologicalSubject(
                    "tmp", year, month, day, int(hour), int((hour % 1) * 60),
                    lat=lat, lng=lon, tz_str=timezone_name,
                    is_dst=bool(local_dt.dst()),
                )
                kmodel = ksubject.model()
                klil = getattr(kmodel, "lilith", None)
                if klil is not None:
                    lil_deg = float(klil.abs_pos)
                    sign, pos = degree_to_sign(lil_deg)
                    secondary["Lilith"] = {
                        "degree": round(lil_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                        "precision": "reduced",
                    }
            except Exception:
                pass

        # ─── PART OF FORTUNE ───
        # Diurnal (Sun above horizon): FoF = ASC + Moon - Sun
        # Nocturnal (Sun below horizon): FoF = ASC + Sun - Moon
        dsc = (asc_d + 180) % 360
        if asc_d < dsc:
            sun_above = asc_d <= sun_deg < dsc
        else:
            sun_above = sun_deg >= asc_d or sun_deg < dsc
        if sun_above:
            fo_deg = (asc_d + moon_deg - sun_deg) % 360  # diurnal chart
        else:
            fo_deg = (asc_d + sun_deg - moon_deg) % 360  # nocturnal chart
        sign, pos = degree_to_sign(fo_deg)
        secondary["PartOfFortune"] = {
            "degree": round(fo_deg, 2),
            "sign": sign,
            "pos_in_sign": round(pos, 2),
        }

        # ─── VERTEX (validated per house system) ───
        if house_system_used in VERTEX_SYSTEMS and swe_vertex is not None:
            v_deg = swe_vertex % 360
            if v_deg > 0:  # SWE returns 0 for unsupported systems
                sign, pos = degree_to_sign(v_deg)
                secondary["Vertex"] = {
                    "degree": round(v_deg, 2),
                    "sign": sign,
                    "pos_in_sign": round(pos, 2),
                }

        # Assign secondary bodies to houses
        for name in secondary:
            secondary[name]["house"] = assign_to_house(
                secondary[name]["degree"], house_ranges
            )

        # ─── ASPECTS ───
        aspects_list = calculate_aspects(planets_data, speeds)

        # ─── MOON PHASE ───
        lunar_diff = (moon_deg - sun_deg) % 360
        moon_phase = get_moon_phase_name(lunar_diff)

        # ─── REGENCE ───
        regence = {
            "day_regent": str(DAY_REGENTS[(local_dt.weekday() + 1) % 7]),
            "hour_regent": get_planetary_hour(local_dt),
        }

        return {
            "planets": planets_data,
            "secondary": secondary,
            "angles": angles,
            "aspects": aspects_list,
            "houses": houses_list,
            "regence": regence,
            "moon_phase": moon_phase,
            "meta": {
                # Backwards-compatible summary fields for the current UI.
                "timestamp": local_dt.isoformat(),
                "timestamp_utc": utc_dt.isoformat().replace("+00:00", "Z"),
                "timezone": timezone_name,
                "location": {"lat": lat, "lon": lon},
                "house_system": house_system_used,
                "ephemeris": ephemeris_mode,
                "jd": round(jd, 6),
                "receipt": _calculation_receipt(
                    calculation_kind="natal",
                    input_parameters={
                        "year": year,
                        "month": month,
                        "day": day,
                        "hour": hour,
                        "lat": lat,
                        "lon": lon,
                        "timezone": timezone_name,
                        "utc_offset_minutes": utc_offset_minutes,
                        "house_system": house_system_used,
                    },
                    local_dt=local_dt,
                    utc_dt=utc_dt,
                    utc_offset_minutes=resolved_offset_minutes,
                    ephemeris_mode=ephemeris_mode,
                    house_system=house_system_used,
                    include_minor_aspects=False,
                ),
                "governance": _serialize_governance_result(preflight_result),
            },
        }

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


# ──────────────────────────────────────────────────────
#  TRANSIT POSITIONS (Lightweight, Direct, Cached)
# ──────────────────────────────────────────────────────

def _transit_core(
    year: int,
    month: int,
    day: int,
    hour_rounded: float,
    lat: Optional[float],
    lon: Optional[float],
    include_asteroids: bool,
    timezone_name: str,
    utc_offset_minutes: Optional[int],
) -> Dict[str, Any]:
    """Internal transit calculator — arguments must be hashable for LRU cache.

    Calculates ONLY ecliptic positions, velocities, and retrogradade.
    No houses, no aspects, no regency, no angles, no Part of Fortune.
    """
    # ─── MANDATORY GOVERNANCE PREFLIGHT ─────────────────────
    governance = EngineGovernance(mode="strict")
    with governance:
        preflight_result = governance.preflight("calculate_transit_positions")
    if not preflight_result.allowed:
        return {
            "error": "Governance blocked this transit calculation.",
            "governance": _serialize_governance_result(preflight_result),
        }
    # ────────────────────────────────────────────────────────

    if not SWE_AVAILABLE:
        return {"error": "Swiss Ephemeris is unavailable; no transit was calculated."}

    try:
        local_dt, utc_dt, resolved_offset_minutes = _resolve_local_datetime(
            year,
            month,
            day,
            hour_rounded,
            timezone_name,
            utc_offset_minutes,
        )
        utc_hour = (
            utc_dt.hour
            + utc_dt.minute / 60
            + utc_dt.second / 3600
            + utc_dt.microsecond / 3_600_000_000
        )

        # Transit positions use the same UTC invariant as natal charts.  This
        # keeps the certified receipt and ephemeris instant identical around
        # midnight in non-UTC time zones.
        jd = to_julian_day(utc_dt.year, utc_dt.month, utc_dt.day, utc_hour)
        flags = swe.FLG_SWIEPH | swe.FLG_SPEED

        # ─── PLANETS via Swiss Ephemeris (direct — nothing else) ───
        planets_data: Dict[str, Dict[str, Any]] = {}

        if SWE_AVAILABLE:
            for name, pid in SWE_PLANETS.items():
                try:
                    r = swe.calc(jd, pid, flags)
                    if r and r[0]:
                        ecl_lon = r[0][0] % 360
                        ecl_lat = r[0][1]
                        speed = r[0][3] if len(r[0]) > 3 else 0
                        sign, pos = degree_to_sign(ecl_lon)
                        planets_data[name] = {
                            "degree": round(ecl_lon, 2),
                            "latitude": round(ecl_lat, 2),
                            "sign": sign[:3],
                            "sign_full": sign,
                            "pos_in_sign": round(pos, 2),
                            "retrograde": speed < 0,
                            "speed": round(speed, 4),
                            "stationary": abs(speed) < 0.001,
                        }
                except Exception:
                    pass

        # ─── SECONDARY BODIES (minimal) ───
        secondary: Dict[str, Dict[str, Any]] = {}

        # True Node
        if SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.TRUE_NODE, flags)
                if r and r[0]:
                    nn_deg = r[0][0] % 360
                    sign, pos = degree_to_sign(nn_deg)
                    secondary["NorthNode"] = {
                        "degree": round(nn_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                    }
                    sn_deg = (nn_deg + 180) % 360
                    sign, pos = degree_to_sign(sn_deg)
                    secondary["SouthNode"] = {
                        "degree": round(sn_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                    }
            except Exception:
                pass

        # Lilith (Mean Apogee) — only if include_asteroids
        if include_asteroids and SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.MEAN_APOG, flags)
                if r and r[0]:
                    lil_deg = r[0][0] % 360
                    sign, pos = degree_to_sign(lil_deg)
                    secondary["Lilith"] = {
                        "degree": round(lil_deg, 2),
                        "sign": sign,
                        "pos_in_sign": round(pos, 2),
                    }
            except Exception:
                pass

        # Chiron — only if include_asteroids
        if include_asteroids and SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.CHIRON, flags)
                if r and r[0]:
                    chiron_deg = r[0][0] % 360
                    ecl_lat = r[0][1]
                    speed = r[0][3] if len(r[0]) > 3 else 0
                    sign, pos = degree_to_sign(chiron_deg)
                    planets_data["Chiron"] = {
                        "degree": round(chiron_deg, 2),
                        "latitude": round(ecl_lat, 2),
                        "sign": sign[:3],
                        "sign_full": sign,
                        "pos_in_sign": round(pos, 2),
                        "retrograde": speed < 0,
                        "speed": round(speed, 4),
                    }
            except Exception:
                pass

        # ─── MOON PHASE (Duffet cosine formula) ───
        sun_deg = planets_data.get("Sun", {}).get("degree", 0)
        moon_deg = planets_data.get("Moon", {}).get("degree", 0)
        lunar_diff = (moon_deg - sun_deg) % 360
        illumination = round(50 * (1 - math.cos(math.radians(lunar_diff))), 1)

        if lunar_diff < 22.5 or lunar_diff >= 337.5:
            phase_name, phase_icon = "Nova", "🌑"
        elif lunar_diff < 67.5:
            phase_name, phase_icon = "Crescente", "🌒"
        elif lunar_diff < 112.5:
            phase_name, phase_icon = "Quarto Crescente", "🌓"
        elif lunar_diff < 157.5:
            phase_name, phase_icon = "Gibosa Crescente", "🌔"
        elif lunar_diff < 202.5:
            phase_name, phase_icon = "Cheia", "🌕"
        elif lunar_diff < 247.5:
            phase_name, phase_icon = "Gibosa Minguante", "🌖"
        elif lunar_diff < 292.5:
            phase_name, phase_icon = "Quarto Minguante", "🌗"
        else:
            phase_name, phase_icon = "Minguante", "🌘"

        moon_phase = {"phase": phase_name, "icon": phase_icon, "illumination": illumination}

        return {
            "planets": planets_data,
            "secondary": secondary,
            "moon_phase": moon_phase,
            "meta": {
                # Backwards-compatible summary fields for the current UI.
                "timestamp": local_dt.isoformat(),
                "timestamp_utc": utc_dt.isoformat().replace("+00:00", "Z"),
                "timezone": timezone_name,
                "location": {"lat": lat, "lon": lon} if lat is not None and lon is not None else None,
                "ephemeris": "swiss",
                "jd": round(jd, 6),
                "receipt": _calculation_receipt(
                    calculation_kind="transit",
                    input_parameters={
                        "year": year,
                        "month": month,
                        "day": day,
                        "hour": hour_rounded,
                        "lat": lat,
                        "lon": lon,
                        "timezone": timezone_name,
                        "utc_offset_minutes": utc_offset_minutes,
                        "include_asteroids": include_asteroids,
                    },
                    local_dt=local_dt,
                    utc_dt=utc_dt,
                    utc_offset_minutes=resolved_offset_minutes,
                    ephemeris_mode="swiss",
                ),
                "governance": _serialize_governance_result(preflight_result),
            },
        }

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@lru_cache(maxsize=16)
def _cached_transit_core(
    year: int,
    month: int,
    day: int,
    hour_rounded: float,
    lat: Optional[float],
    lon: Optional[float],
    include_asteroids: bool,
    timezone_name: str,
    utc_offset_minutes: Optional[int],
) -> Dict[str, Any]:
    """LRU-cached wrapper for transit calculations.

    The hour is pre-rounded to the nearest minute by the public caller,
    so repeated calls within the same minute return instantly from cache.
    """
    return _transit_core(
        year,
        month,
        day,
        hour_rounded,
        lat,
        lon,
        include_asteroids,
        timezone_name,
        utc_offset_minutes,
    )


def calculate_transit_positions(
    year: int,
    month: int,
    day: int,
    hour: float,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    include_asteroids: bool = False,
    timezone_name: str = "",
    utc_offset_minutes: Optional[int] = None,
) -> Dict[str, Any]:
    """Calcula posições planetárias atuais (trânsitos) para data/hora fornecida.

    Cálculo DIRETO com Swiss Ephemeris — sem chamar calculate_astrology.
    Retorna apenas planetas, corpos secundários e fase lunar (sem casas,
    aspectos, ângulos, regência nem Part of Fortune).

    Uses LRU cache keyed to the nearest minute to avoid redundant calculations.
    """
    # ─── MANDATORY GOVERNANCE PREFLIGHT ─────────────────────
    governance = EngineGovernance(mode="strict")
    with governance:
        preflight_result = governance.preflight("calculate_transit_positions")
    if not preflight_result.allowed:
        return {
            "error": "Governance blocked this transit calculation.",
            "governance": {
                "mode": preflight_result.mode,
                "calc_kind": preflight_result.calc_kind,
                "engine_refs": preflight_result.engine_refs,
                "blocking_gaps": preflight_result.blocking_gaps,
            },
        }
    # ────────────────────────────────────────────────────────

    # Round hour to the nearest minute for effective caching.  The rounded
    # instant is what the receipt signs, so the displayed evidence and result
    # can always be reproduced together.
    total_minutes = round(float(hour) * 60)
    if total_minutes < 0 or total_minutes >= 24 * 60:
        return {"error": "Hour must be between 00:00 and 23:59:59."}
    hour_rounded = total_minutes / 60.0

    return _cached_transit_core(
        year,
        month,
        day,
        hour_rounded,
        lat,
        lon,
        include_asteroids,
        timezone_name,
        utc_offset_minutes,
    )


# ──────────────────────────────────────────────────────
#  STANDALONE MODE
# ──────────────────────────────────────────────────────

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    try:
        data = None
        if len(sys.argv) > 1:
            raw_data = sys.argv[1]
            try:
                data = json.loads(raw_data)
            except Exception:
                try:
                    data = ast.literal_eval(raw_data)
                except Exception:
                    cleaned = raw_data.strip('"').replace('\\"', '"').replace("'", '"')
                    data = json.loads(cleaned)

        if not data:
            raise ValueError("A calculation input JSON is required; no natal defaults are available.")

        transit = bool(data.get("transit", False))
        include_asteroids = bool(data.get("include_asteroids", False))
        house_system = str(data.get("house_system", "Regiomontanus"))
        timezone_name = str(data.get("timezone", ""))
        utc_offset_minutes = data.get("utc_offset_minutes")

        time_fields = ("year", "month", "day", "hour")
        supplied_time_fields = [field for field in time_fields if data.get(field) is not None]
        if transit and not supplied_time_fields:
            now_utc = datetime.now(timezone.utc)
            y, m, d = now_utc.year, now_utc.month, now_utc.day
            time_val = now_utc.hour + now_utc.minute / 60 + now_utc.second / 3600
            timezone_name = "UTC"
            utc_offset_minutes = 0
        else:
            if len(supplied_time_fields) != len(time_fields):
                raise ValueError("year, month, day and hour must be supplied together.")
            if not timezone_name:
                raise ValueError("An IANA timezone is required for an explicit civil time.")
            y = int(data["year"])
            m = int(data["month"])
            d = int(data["day"])
            time_val = float(data["hour"])

        if transit:
            lat = float(data["lat"]) if data.get("lat") is not None else None
            lon = float(data["lon"]) if data.get("lon") is not None else None
        else:
            missing_natal_fields = [
                field
                for field in ("lat", "lon")
                if data.get(field) is None
            ]
            if not timezone_name:
                missing_natal_fields.append("timezone")
            if missing_natal_fields:
                raise ValueError(f"Natal calculation requires: {', '.join(missing_natal_fields)}.")
            lat = float(data["lat"])
            lon = float(data["lon"])

        if transit:
            result = calculate_transit_positions(
                y, m, d, time_val, lat, lon,
                include_asteroids=include_asteroids,
                timezone_name=timezone_name,
                utc_offset_minutes=utc_offset_minutes,
            )
        else:
            result = calculate_astrology(
                y,
                m,
                d,
                time_val,
                lat,
                lon,
                house_system,
                timezone_name,
                utc_offset_minutes,
            )
        output = json.dumps(result, ensure_ascii=False, indent=2)

        print(output, flush=True)

        with open("astro_data.json", "w", encoding="utf-8") as f:
            f.write(output)

        if os.path.exists("public"):
            with open("public/astro_data.json", "w", encoding="utf-8") as f:
                f.write(output)

        history_path = "astro_history.json"
        history_cache = []
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    history_cache = loaded
        except (FileNotFoundError, json.JSONDecodeError):
            pass

        history_cache.append(result)
        while len(history_cache) > 100:
            history_cache.pop(0)

        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(history_cache, f, ensure_ascii=False, indent=2)

    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
