from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote


CANONICAL_ENTRY_DOCS = (
    "README.md",
    "AGENTS.md",
    "docs/CONSTITUICAO.md",
    "docs/AI_WORKING_GUIDE.md",
    "docs/index.md",
    "docs/CURRENT_STATE.md",
    "docs/NEW_FEATURE_GUIDE.md",
    "docs/arquitetura.md",
    "apps/web/AGENTS.md",
    "services/api/AGENTS.md",
    "supabase/AGENTS.md",
)

HISTORICAL_PREFIXES = (
    "docs/archive/",
    "docs/operations/deployments/",
)

HISTORICAL_FILES = {
    "docs/operations/WEB_V1_COMPLETION_REPORT.md",
    "docs/RELEASE_VALIDATION_2026-08-10.md",
}

MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
SNAPSHOT_RE = re.compile(r"^Snapshot:\s+\*\*(?P<timestamp>[^*]+)\*\*", re.MULTILINE)
SNAPSHOT_SHA_RE = re.compile(
    r"^Upstream `main` at snapshot:\s+\*\*`(?P<sha>[^`]+)`\*\*",
    re.MULTILINE,
)
FULL_SHA_RE = re.compile(r"^[0-9a-f]{40}$")

NEGATIVE_OR_HISTORICAL_CONTEXT = (
    "not part",
    "is not",
    "isn't",
    "does not",
    "do not",
    "don't",
    "must not",
    "never",
    "retired",
    "historical",
    "former",
    "legacy",
    "deprecated",
    "aposent",
    "históric",
    "histor",\n    "não ",
    "nao ",
    "antigo",
)

MIRROR = "fernandodamaso/aureasolaris-deploy"


@dataclass(frozen=True)
class Violation:
    path: Path
    rule: str
    message: str
    line: int | None = None

    def render(self) -> str:
        location = self.path.as_posix()
        if self.line is not None:
            location = f"{location}:{self.line}"
        return f"{location} [{self.rule}] {self.message}"


@dataclass(frozen=True)
class ArchitectureAssertion:
    rule: str
    path: str
    required_terms: tuple[str, ...]
    description: str


ARCHITECTURE_ASSERTIONS = (
    ArchitectureAssertion(
        "architecture.web_v1",
        "docs/CURRENT_STATE.md",
        ("private web v1", "only supported application runtime"),
        "Private Web V1 must remain the documented active product runtime.",
    ),
    ArchitectureAssertion(
        "architecture.source_repo",
        "docs/CURRENT_STATE.md",
        ("vivicabsb-eng/aureasolaris", "development/source of truth"),
        "The development source-of-truth repository must remain explicit.",
    ),
    ArchitectureAssertion(
        "architecture.deploy_mirror",
        "docs/CURRENT_STATE.md",
        (MIRROR, "deployment-only mirror"),
        "The deployment mirror must remain deployment-only.",
    ),
    ArchitectureAssertion(
        "architecture.vercel",
        "docs/CURRENT_STATE.md",
        ("apps/web", "services/api", "hosted by vercel"),
        "Vercel must remain the documented Web/API host.",
    ),
    ArchitectureAssertion(
        "architecture.supabase",
        "docs/CURRENT_STATE.md",
        ("supabase auth + postgres + rls",),
        "Supabase must remain the documented Auth/Postgres/RLS boundary.",
    ),
    ArchitectureAssertion(
        "architecture.owner_scope",
        "docs/CURRENT_STATE.md",
        ("owner-scoped",),
        "Private product persistence must remain owner-scoped.",
    ),
    ArchitectureAssertion(
        "architecture.desktop_retired",
        "docs/CURRENT_STATE.md",
        ("former desktop/local product runtime is retired",),
        "The former desktop/local product runtime must remain explicitly retired.",
    ),
)


def _normalized(path: Path) -> str:
    return path.as_posix().removeprefix("./")


def classify_document(path: Path) -> str:
    normalized = _normalized(path)
    if normalized in HISTORICAL_FILES or any(normalized.startswith(prefix) for prefix in HISTORICAL_PREFIXES):
        return "historical"
    if normalized.startswith("docs/operations/"):
        return "operational"
    if normalized in {"AGENTS.md", "docs/CONSTITUICAO.md"}:
        return "normative"
    return "current"


def _display_path(root: Path, path: Path) -> Path:
    try:
        return path.resolve().relative_to(root.resolve())
    except ValueError:
        return path


def _local_markdown_target(source: Path, raw_target: str) -> Path | None:
    target = raw_target.strip()
    if not target or target.startswith(("#", "http://", "https://", "mailto:")):
        return None

    if target.startswith("<") and ">" in target:
        target = target[1 : target.index(">")]
    else:
        target = target.split(maxsplit=1)[0]

    target = unquote(target).split("#", 1)[0].split("?", 1)[0]
    if not target:
        return None
    return (source.parent / target).resolve()


def _iter_local_link_targets(source: Path) -> list[Path]:
    text = source.read_text(encoding="utf-8")
    targets: list[Path] = []
    for match in MARKDOWN_LINK_RE.finditer(text):
        resolved = _local_markdown_target(source, match.group(1))
        if resolved is not None:
            targets.append(resolved)
    return targets


def check_markdown_links(root: Path, paths: list[Path] | tuple[Path, ...] | set[Path]) -> list[Violation]:
    root = root.resolve()
    violations: list[Violation] = []
    for source in sorted({path.resolve() for path in paths}, key=lambda item: item.as_posix()):
        if not source.is_file() or source.suffix.lower() != ".md":
            continue
        text = source.read_text(encoding="utf-8")
        for match in MARKDOWN_LINK_RE.finditer(text):
            raw_target = match.group(1)
            resolved = _local_markdown_target(source, raw_target)
            if resolved is None:
                continue
            display = _display_path(root, source)
            try:
                resolved.relative_to(root)
            except ValueError:
                violations.append(
                    Violation(display, "link.escape", f"repository-local link escapes repository: {raw_target}")
                )
                continue
            if not resolved.exists():
                violations.append(
                    Violation(display, "link.missing", f"missing repository-local link target: {raw_target}")
                )
    return violations


def _is_negative_or_historical_line(lower_line: str) -> bool:
    return any(marker in lower_line for marker in NEGATIVE_OR_HISTORICAL_CONTEXT)


def check_active_guidance(path: Path, text: str) -> list[Violation]:
    if classify_document(path) == "historical":
        return []

    violations: list[Violation] = []
    for line_number, raw_line in enumerate(text.splitlines(), 1):
        lower = raw_line.lower().strip()
        if not lower or _is_negative_or_historical_line(lower):
            continue

        if "railway" in lower and re.search(
            r"\b(host|hosts|hosted|hosting|deploy|deploys|deployed|deployment|runtime|production|web v1|api)\b",
            lower,
        ):
            violations.append(
                Violation(
                    path,
                    "runtime.railway_active",
                    "Railway is presented as an active Web V1 runtime/deployment path; current hosting is Vercel.",
                    line_number,
                )
            )

        if "tauri" in lower and re.search(
            r"(?:\b(?:run|use|build|launch|package)\b.{0,40}\btauri\b|\btauri\b.{0,40}\b(?:runtime|active|supported|run|build|launch|package)\b)",
            lower,
        ):
            violations.append(
                Violation(
                    path,
                    "runtime.tauri_active",
                    "Tauri/native desktop execution is presented as active; it is retired for the product runtime.",
                    line_number,
                )
            )

        if "sidecar" in lower and re.search(
            r"(?:\b(?:run|use|start|launch|build)\b.{0,40}\bsidecar\b|\bsidecar\b.{0,40}\b(?:runtime|active|supported|run|start|launch)\b)",
            lower,
        ):
            violations.append(
                Violation(
                    path,
                    "runtime.sidecar_active",
                    "A local sidecar is presented as an active product runtime; that path is retired.",
                    line_number,
                )
            )

        if "sqlite" in lower and re.search(
            r"\b(private|product|web v1|persistence|storage|database|store)\b",
            lower,
        ):
            violations.append(
                Violation(
                    path,
                    "data.sqlite_active",
                    "SQLite is presented as current private product persistence; Web V1 private data belongs in Supabase/Postgres.",
                    line_number,
                )
            )

        if MIRROR in lower:
            mirror_escaped = re.escape(MIRROR)
            direct_development = re.search(
                rf"\b(?:develop|work)(?:\s+features?)?(?:\s+directly)?\s+(?:in|on|from)\s+`?{mirror_escaped}`?",
                lower,
            )
            mirror_as_source = re.search(
                rf"`?{mirror_escaped}`?.{{0,80}}\b(?:development source|source of truth for development|development repository)\b",
                lower,
            )
            development_happens = re.search(
                rf"\bdevelopment\s+(?:happens|occurs)\s+(?:in|on)\s+`?{mirror_escaped}`?",
                lower,
            )
            if direct_development or mirror_as_source or development_happens:
                violations.append(
                    Violation(
                        path,
                        "repo.mirror_development",
                        "The deployment mirror is presented as a development checkout; develop only in vivicabsb-eng/AureaSolaris.",
                        line_number,
                    )
                )

    return violations


def check_current_state_metadata(
    path: Path,
    *,
    now: datetime | None = None,
    max_age_days: int = 180,
) -> list[Violation]:
    text = path.read_text(encoding="utf-8")
    violations: list[Violation] = []
    display = Path("docs/CURRENT_STATE.md") if path.name == "CURRENT_STATE.md" else path

    timestamp_match = SNAPSHOT_RE.search(text)
    if timestamp_match is None:
        violations.append(Violation(display, "snapshot.timestamp", "missing Snapshot ISO-8601 metadata"))
    else:
        raw_timestamp = timestamp_match.group("timestamp").strip()
        try:
            snapshot = datetime.fromisoformat(raw_timestamp.replace("Z", "+00:00"))
            if snapshot.tzinfo is None:
                raise ValueError("timezone required")
        except ValueError:
            violations.append(
                Violation(display, "snapshot.timestamp", f"invalid Snapshot timestamp: {raw_timestamp!r}")
            )
        else:
            current = now or datetime.now(timezone.utc)
            if current.tzinfo is None:
                current = current.replace(tzinfo=timezone.utc)
            age_days = (current.astimezone(timezone.utc) - snapshot.astimezone(timezone.utc)).total_seconds() / 86400
            if age_days > max_age_days:
                violations.append(
                    Violation(
                        display,
                        "snapshot.stale",
                        f"snapshot is {age_days:.0f} days old (limit {max_age_days}); refresh timestamp/SHA when the factual state is reviewed",
                    )
                )
            if age_days < -1:
                violations.append(
                    Violation(display, "snapshot.future", "snapshot timestamp is more than one day in the future")
                )

    sha_match = SNAPSHOT_SHA_RE.search(text)
    if sha_match is None:
        violations.append(Violation(display, "snapshot.sha", "missing upstream main SHA metadata"))
    else:
        sha = sha_match.group("sha").strip().lower()
        if FULL_SHA_RE.fullmatch(sha) is None:
            violations.append(Violation(display, "snapshot.sha", f"snapshot SHA must be 40 lowercase hex characters: {sha!r}"))

    return violations


def _operational_runbooks(root: Path) -> set[Path]:
    operations = root / "docs" / "operations"
    if not operations.is_dir():
        return set()
    return {
        path.resolve()
        for path in operations.glob("*.md")
        if classify_document(path.relative_to(root)) == "operational"
    }


def _required_and_routed_docs(root: Path) -> tuple[set[Path], list[Violation]]:
    required: set[Path] = set()
    violations: list[Violation] = []

    for relative in CANONICAL_ENTRY_DOCS:
        path = (root / relative).resolve()
        if not path.is_file():
            violations.append(Violation(Path(relative), "doc.missing", "required agent-facing document is missing"))
            continue
        required.add(path)

    required.update(_operational_runbooks(root))

    routed: set[Path] = set()
    for source in required:
        if source.suffix.lower() != ".md":
            continue
        for target in _iter_local_link_targets(source):
            try:
                relative_target = target.relative_to(root.resolve())
            except ValueError:
                continue
            if target.is_file() and target.suffix.lower() == ".md" and classify_document(relative_target) != "historical":
                routed.add(target)

    return required | routed, violations


def _check_architecture_assertions(root: Path) -> list[Violation]:
    violations: list[Violation] = []
    for assertion in ARCHITECTURE_ASSERTIONS:
        path = root / assertion.path
        if not path.is_file():
            violations.append(Violation(Path(assertion.path), assertion.rule, assertion.description))
            continue
        lower = path.read_text(encoding="utf-8").lower()
        missing = [term for term in assertion.required_terms if term.lower() not in lower]
        if missing:
            violations.append(
                Violation(
                    Path(assertion.path),
                    assertion.rule,
                    f"{assertion.description} Missing marker(s): {', '.join(repr(item) for item in missing)}",
                )
            )
    return violations


def validate_repository(
    root: Path,
    *,
    now: datetime | None = None,
    max_snapshot_age_days: int = 180,
) -> list[Violation]:
    root = root.resolve()
    documents, violations = _required_and_routed_docs(root)

    violations.extend(check_markdown_links(root, documents))

    for document in sorted(documents, key=lambda item: item.as_posix()):
        relative = _display_path(root, document)
        if classify_document(relative) == "historical":
            continue
        violations.extend(check_active_guidance(relative, document.read_text(encoding="utf-8")))

    violations.extend(_check_architecture_assertions(root))

    current_state = root / "docs" / "CURRENT_STATE.md"
    if current_state.is_file():
        violations.extend(
            check_current_state_metadata(
                current_state,
                now=now,
                max_age_days=max_snapshot_age_days,
            )
        )

    unique = {(item.path.as_posix(), item.rule, item.message, item.line): item for item in violations}
    return sorted(unique.values(), key=lambda item: (item.path.as_posix(), item.line or 0, item.rule, item.message))


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate Aurea Solaris agent-facing documentation contracts.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--max-snapshot-age-days", type=int, default=180)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    violations = validate_repository(args.root, max_snapshot_age_days=args.max_snapshot_age_days)
    if violations:
        for violation in violations:
            print(violation.render(), file=sys.stderr)
        print(f"Documentation contract failed: {len(violations)} violation(s).", file=sys.stderr)
        return 1

    print("Documentation contract OK: current agent-facing docs, routed links, architecture facts, and snapshot metadata are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
