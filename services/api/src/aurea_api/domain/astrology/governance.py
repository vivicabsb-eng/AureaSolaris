"""
Engine Governance
=================
Camada obrigatória de preflight e governança de regras.

Nenhum cálculo astrológico é executado sem passar por esta camada.
Ela consulta a biblioteca de Engenharia Astrológica compilada e decide:
- strict: bloqueia execução se houver erro/revisão pendente
- observe: adverte mas executa
- disabled: sem governança (apenas fallback)

Filosofia:
- A Biblioteca explica e preserva o “porquê”.
- O motor calcula, mas só depois de verificar governança.
- Fixtures testam.
- Divergências ficam visíveis — sem fingir equivalência ou apagar escolas.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ─── Mapeamento oficial de pontos de entrada calculáveis ───────────────
# Regras são separadas por domínio executável:
# - Python: regras que o astro_engine.py realmente executa.
# - TS: regras que competem ao frontend/biblioteca JS, não ao Python.
ENTRYPOINT_RULES: Dict[str, List[str]] = {
    "calculate_astrology": [
        "calculate_astrology|astro_engine.py",
        "PLANET_ORBS / ASPECT_MULTIPLIER|astro_engine.py",
        "house_system_whole_sign|astro_engine.py",
        "moon_phase_duffet|astro_engine.py",
    ],
    "calculate_transit_positions": [
        "calculate_transit_positions|astro_engine.py",
        "PLANET_ORBS / ASPECT_MULTIPLIER|astro_engine.py",
        "moon_phase_duffet|astro_engine.py",
    ],
    "calculate_whole_sign_houses": [
        "calculate_whole_sign_houses|astro_engine.py",
        "house_system_whole_sign|astro_engine.py",
    ],
    "calculate_aspects": [
        "PLANET_ORBS / ASPECT_MULTIPLIER|astro_engine.py",
    ],
    "get_moon_phase_name": [
        "get_moon_phase_name|astro_engine.py",
        "moon_phase_duffet|astro_engine.py",
    ],
}


@dataclass(frozen=True)
class EngineRule:
    id: str
    name: str
    category: str
    rule_kind: str
    engine_ref: str
    library_path: str
    params_json: str
    quality_state: str
    source_hash: str
    compiled_at: str


@dataclass(frozen=True)
class ReviewTarget:
    id: str
    engine_ref: str
    library_path: str
    review_type: str
    priority: int
    detail: str


@dataclass(frozen=True)
class GovernanceResult:
    allowed: bool
    mode: str  # strict | observe | disabled
    calc_kind: str
    engine_refs: List[str]
    blocking_gaps: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    review_targets: List[ReviewTarget] = field(default_factory=list)
    rules_applied: List[EngineRule] = field(default_factory=list)
    receipt: Dict[str, Any] = field(default_factory=dict)


def _resolve_default_db_path() -> Path:
    # Default operacional: knowledge.sqlite na raiz da biblioteca.
    # Fallback opcional para o build antigo se ainda existir.
    here = Path(__file__).resolve().parent
    candidates = [
        # The versioned study snapshot is the only editorial database a clean
        # checkout is guaranteed to contain. Local staging databases must
        # never become an implicit production dependency.
        here / "knowledge" / "engenharia_astrologica" / "knowledge" / "build" / "editorial_current.sqlite",
        here / "knowledge" / "engenharia_astrologica" / "knowledge" / "engenharia_astrologica.sqlite",
        here / "knowledge" / "engenharia_astrologica" / "knowledge" / "build" / "engenharia_astrologica.sqlite",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


class EngineGovernance:
    """Governança obrigatória do engine."""

    def __init__(self, db_path: Optional[Path] = None, mode: str = "strict") -> None:
        self.db_path = db_path or _resolve_default_db_path()
        self.mode = mode if mode in ("strict", "observe", "disabled") else "strict"
        self._connection: Optional[sqlite3.Connection] = None

    def connect(self) -> bool:
        if self.db_path.exists():
            self._connection = sqlite3.connect(str(self.db_path))
            self._connection.row_factory = sqlite3.Row
            return True
        return False

    def close(self) -> None:
        if self._connection:
            self._connection.close()
            self._connection = None

    def __enter__(self) -> "EngineGovernance":
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):  # type: ignore[no-untyped-def]
        self.close()

    def _conn(self) -> sqlite3.Connection:
        if self._connection is None:
            raise RuntimeError(
                "EngineGovernance não está conectado. "
                "Use `with EngineGovernance() as gov:` ou chame connect()."
            )
        return self._connection

    @staticmethod
    def _row_to_rule(row: sqlite3.Row) -> EngineRule:
        return EngineRule(
            id=row["id"],
            name=row["name"],
            category=row["category"],
            rule_kind=row["rule_kind"],
            engine_ref=row["engine_ref"],
            library_path=row["library_path"],
            params_json=row["params_json"],
            quality_state=row["quality_state"],
            source_hash=row["source_hash"],
            compiled_at=row["compiled_at"],
        )

    @staticmethod
    def _row_to_review(row: sqlite3.Row) -> ReviewTarget:
        return ReviewTarget(
            id=row["id"],
            engine_ref=row["engine_ref"],
            library_path=row["library_path"],
            review_type=row["review_type"],
            priority=row["priority"],
            detail=row["detail"],
        )

    def preflight(self, calc_kind: str) -> GovernanceResult:
        """Executa a governança obrigatória antes do cálculo.

        Usa ENTRYPOINT_RULES para mapear o ponto de entrada aos engine_refs
        correspondentes na biblioteca e valida obrigatoriedade completa.
        """
        engine_refs = ENTRYPOINT_RULES.get(calc_kind, [calc_kind])
        now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
        receipt: Dict[str, Any] = {
            "calc_kind": calc_kind,
            "engine_refs_required": engine_refs,
            "mode": self.mode,
            "db_path": str(self.db_path),
            "db_exists": self.db_path.exists(),
            "timestamp_utc": now,
        }

        if self.mode == "disabled":
            return GovernanceResult(
                allowed=True,
                mode="disabled",
                calc_kind=calc_kind,
                engine_refs=engine_refs,
                receipt=receipt,
            )

        if not self.db_path.exists():
            receipt["status"] = "blocked"
            return GovernanceResult(
                allowed=False,
                mode=self.mode,
                calc_kind=calc_kind,
                engine_refs=engine_refs,
                blocking_gaps=[{
                    "engine_ref": "|".join(engine_refs),
                    "library_path": str(self.db_path),
                    "gap_type": "missing_rule",
                    "detail": "Biblioteca de Engenharia Astrológica indisponível.",
                    "priority": 1,
                }],
                receipt=receipt,
            )

        with self._lock_connection() as conn:
            # Regras obrigatórias ausentes bloqueiam sempre.
            # Só considera obrigatórias as regras mapeadas em ENTRYPOINT_RULES
            # para este calc_kind. Regras de outros domínios executáveis não podem bloquear
            # este ponto de entrada.
            placeholders = ",".join("?" for _ in engine_refs)
            present_rows = conn.execute(
                f"SELECT engine_ref FROM engine_rule WHERE engine_ref IN ({placeholders})",
                engine_refs,
            ).fetchall()
            present_refs = {row[0] for row in present_rows}
            missing_refs = [ref for ref in engine_refs if ref not in present_refs]

            blocking_gaps: List[Dict[str, Any]] = []
            warnings_out: List[Dict[str, Any]] = []

            for ref in missing_refs:
                blocking_gaps.append({
                    "engine_ref": ref,
                    "library_path": str(self.db_path),
                    "gap_type": "missing_rule",
                    "detail": f"Regra obrigatória ausente para '{calc_kind}': {ref}",
                    "priority": 1,
                })

            rows = conn.execute(
                f"""
                SELECT * FROM engine_rule
                WHERE engine_ref IN ({placeholders})
                   OR category = ?
                   OR rule_kind = ?
                """,
                engine_refs + [calc_kind, calc_kind],
            ).fetchall()
            rules = [self._row_to_rule(row) for row in rows]

            rows_review = conn.execute(
                f"""
                SELECT * FROM engine_review_target
                WHERE engine_ref IN ({placeholders})
                   OR review_type = ?
                """,
                engine_refs + [calc_kind],
            ).fetchall()
            review_targets = [self._row_to_review(row) for row in rows_review]

            for rule in rules:
                if rule.quality_state == "error":
                    blocking_gaps.append({
                        "engine_ref": rule.engine_ref,
                        "library_path": rule.library_path,
                        "gap_type": "quality_error",
                        "detail": f"Regra '{rule.name}' com quality_state=error.",
                        "priority": 1,
                    })
                elif rule.quality_state == "warning":
                    if self.mode == "strict":
                        blocking_gaps.append({
                            "engine_ref": rule.engine_ref,
                            "library_path": rule.library_path,
                            "gap_type": "quality_warning",
                            "detail": f"Regra '{rule.name}' com quality_state=warning.",
                            "priority": 2,
                        })
                    else:
                        warnings_out.append({
                            "engine_ref": rule.engine_ref,
                            "library_path": rule.library_path,
                            "gap_type": "quality_warning",
                            "detail": f"Regra '{rule.name}' com quality_state=warning.",
                            "priority": 2,
                        })

            for target in review_targets:
                if self.mode == "strict":
                    blocking_gaps.append({
                        "engine_ref": target.engine_ref,
                        "library_path": target.library_path,
                        "gap_type": "review_target",
                        "detail": target.detail,
                        "priority": target.priority,
                    })
                else:
                    warnings_out.append({
                        "engine_ref": target.engine_ref,
                        "library_path": target.library_path,
                        "gap_type": "review_target",
                        "detail": target.detail,
                        "priority": target.priority,
                    })

            receipt["status"] = "blocked" if blocking_gaps else "allowed"
            receipt["missing_rules_count"] = len(missing_refs)
            receipt["quality_rules_count"] = len(rules)
            receipt["review_targets_count"] = len(review_targets)
            receipt["warning_count"] = len(warnings_out)

            return GovernanceResult(
                allowed=len(blocking_gaps) == 0,
                mode=self.mode,
                calc_kind=calc_kind,
                engine_refs=engine_refs,
                blocking_gaps=blocking_gaps,
                warnings=warnings_out,
                review_targets=review_targets,
                rules_applied=rules,
                receipt=receipt,
            )

    def _lock_connection(self):
        class _Ctx:
            def __init__(inner, gov: EngineGovernance) -> None:
                inner.gov = gov
            def __enter__(inner):
                if inner.gov._connection is None:
                    raise RuntimeError("EngineGovernance não está conectado.")
                return inner.gov._connection
            def __exit__(inner, exc_type, exc_val, exc_tb):
                pass
        return _Ctx(self)
