"""Convert a CycloneDX VEX document to rich Confluence wiki markup."""

from __future__ import annotations

from datetime import datetime, timezone

from models.vex import (
    ConvertResponse,
    SeverityCounts,
    Stats,
    VexDocument,
    Vulnerability,
    VulnerabilityInfo,
)

# ── Helpers ──────────────────────────────────────────────────────────────────

SEVERITY_ORDER = ["critical", "high", "medium", "low", "info", "none", "unknown"]

SEVERITY_COLOURS: dict[str, str] = {
    "critical": "Red",
    "high": "Red",
    "medium": "Yellow",
    "low": "Green",
    "info": "Blue",
    "none": "Grey",
    "unknown": "Grey",
}

STATE_COLOURS: dict[str, str] = {
    "resolved": "Green",
    "resolved_with_pedigree": "Green",
    "not_affected": "Green",
    "false_positive": "Blue",
    "in_triage": "Yellow",
    "exploitable": "Red",
}


def _sev(vuln: Vulnerability) -> str:
    """Return the best-guess severity string for a vulnerability."""
    if vuln.ratings:
        for r in vuln.ratings:
            if r.severity:
                return r.severity.lower()
    return "unknown"


def _score(vuln: Vulnerability) -> float | None:
    """Return the best-guess numeric score."""
    if vuln.ratings:
        for r in vuln.ratings:
            if r.score is not None:
                return r.score
    return None


def _source_name(vuln: Vulnerability) -> str:
    """Return the source name for a vulnerability."""
    if vuln.source and vuln.source.name:
        return vuln.source.name
    if vuln.ratings:
        for r in vuln.ratings:
            if r.source and r.source.name:
                return r.source.name
    return "Unknown"


def _state(vuln: Vulnerability) -> str | None:
    if vuln.analysis and vuln.analysis.state:
        return vuln.analysis.state
    return None


def _severity_status(severity: str) -> str:
    colour = SEVERITY_COLOURS.get(severity, "Grey")
    label = severity.upper()
    return f"{{status:colour={colour}|title={label}}}"


def _state_status(state: str) -> str:
    colour = STATE_COLOURS.get(state, "Grey")
    label = state.replace("_", " ").title()
    return f"{{status:colour={colour}|title={label}}}"


def _truncate(text: str | None, length: int = 120) -> str:
    if not text:
        return ""
    text = text.replace("\n", " ").strip()
    if len(text) > length:
        return text[:length] + "..."
    return text


def _affected_refs(vuln: Vulnerability) -> list[str]:
    if not vuln.affects:
        return []
    return [a.ref for a in vuln.affects if a.ref]


# ── Stats computation ────────────────────────────────────────────────────────


def _compute_stats(vulns: list[Vulnerability]) -> Stats:
    severity_counts: dict[str, int] = {}
    state_counts: dict[str, int] = {}
    source_counts: dict[str, int] = {}
    affected_components: set[str] = set()

    for v in vulns:
        sev = _sev(v)
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

        st = _state(v)
        if st:
            state_counts[st] = state_counts.get(st, 0) + 1
        else:
            state_counts["unreviewed"] = state_counts.get("unreviewed", 0) + 1

        src = _source_name(v)
        source_counts[src] = source_counts.get(src, 0) + 1

        for ref in _affected_refs(v):
            affected_components.add(ref)

    return Stats(
        total=len(vulns),
        by_severity=SeverityCounts(**{s: severity_counts.get(s, 0) for s in SEVERITY_ORDER}),
        by_state=state_counts,
        by_source=source_counts,
        components_affected=len(affected_components),
    )


def _build_vuln_infos(vulns: list[Vulnerability]) -> list[VulnerabilityInfo]:
    result: list[VulnerabilityInfo] = []
    for v in vulns:
        result.append(
            VulnerabilityInfo(
                id=v.id or "N/A",
                severity=_sev(v),
                score=_score(v),
                source=_source_name(v),
                state=_state(v),
                description=_truncate(v.description, 200),
                cwes=v.cwes or [],
            )
        )
    return result


# ── Markup sections ──────────────────────────────────────────────────────────


def _section_header(doc: VexDocument) -> str:
    """Section 1: Page title header with metadata."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    doc_version = doc.version or 1
    spec_version = doc.spec_version or "N/A"

    component_name = "Unknown Component"
    component_version = ""
    if doc.metadata and doc.metadata.component:
        component_name = doc.metadata.component.name or component_name
        if doc.metadata.component.version:
            component_version = f" v{doc.metadata.component.version}"

    lines = [
        f"h1. VEX Report: {component_name}{component_version}",
        "",
        f"_Generated {timestamp} | Document version {doc_version} | CycloneDX spec {spec_version}_",
        "",
        "----",
        "",
    ]
    return "\n".join(lines)


def _section_toc() -> str:
    """Section 2: Table of contents."""
    return "{toc:maxLevel=3}\n\n"


def _section_executive_summary(stats: Stats, doc: VexDocument) -> str:
    """Section 3: Executive summary panel."""
    sev = stats.by_severity
    lines = [
        "{panel:title=Executive Summary|borderStyle=solid|borderColor=#ccc|titleBGColor=#f0f0f0|bgColor=#fafafa}",
    ]

    component_name = "the scanned component"
    if doc.metadata and doc.metadata.component and doc.metadata.component.name:
        component_name = f"*{doc.metadata.component.name}*"

    lines.append(
        f"This report covers *{stats.total}* vulnerabilities affecting {component_name}."
    )
    lines.append("")

    # Key metrics table
    lines.append("||Metric||Value||")
    lines.append(f"|Total vulnerabilities|{stats.total}|")
    lines.append(f"|Critical|{_severity_status('critical')} {sev.critical}|")
    lines.append(f"|High|{_severity_status('high')} {sev.high}|")
    lines.append(f"|Medium|{_severity_status('medium')} {sev.medium}|")
    lines.append(f"|Low|{_severity_status('low')} {sev.low}|")
    lines.append(f"|Components affected|{stats.components_affected}|")
    lines.append("{panel}")
    lines.append("")
    return "\n".join(lines)


def _section_severity_distribution(stats: Stats) -> str:
    """Section 4: Severity distribution text-based bar chart."""
    sev = stats.by_severity
    total = stats.total or 1  # avoid division by zero
    bar_width = 40

    lines = [
        "h2. Severity Distribution",
        "",
        "{noformat}",
    ]

    for s in SEVERITY_ORDER:
        count = getattr(sev, s, 0)
        if count == 0:
            continue
        pct = count / total
        filled = max(1, round(pct * bar_width)) if count > 0 else 0
        bar = "\u2588" * filled + "\u2591" * (bar_width - filled)
        label = f"{s.upper():>10}"
        lines.append(f"  {label} |{bar}| {count:>3} ({pct:.0%})")

    lines.append("{noformat}")
    lines.append("")
    return "\n".join(lines)


def _section_state_breakdown(stats: Stats) -> str:
    """Section 5: Analysis state breakdown."""
    lines = [
        "h2. Analysis State Breakdown",
        "",
        "||State||Count||Proportion||",
    ]
    total = stats.total or 1
    for state, count in sorted(stats.by_state.items(), key=lambda x: -x[1]):
        pct = f"{count / total:.0%}"
        status = _state_status(state) if state != "unreviewed" else "{status:colour=Grey|title=UNREVIEWED}"
        lines.append(f"|{status}|{count}|{pct}|")

    lines.append("")
    return "\n".join(lines)


def _section_unreviewed_warning(vulns: list[Vulnerability]) -> str:
    """Section 6: Warning panel for vulnerabilities without analysis."""
    unreviewed = [v for v in vulns if not _state(v)]
    if not unreviewed:
        return ""

    ids = ", ".join(v.id or "N/A" for v in unreviewed[:15])
    more = f" _and {len(unreviewed) - 15} more_" if len(unreviewed) > 15 else ""

    lines = [
        "{warning:title=Unreviewed Vulnerabilities}",
        f"*{len(unreviewed)}* vulnerabilities have no analysis state and require review:",
        "",
        f"{ids}{more}",
        "{warning}",
        "",
    ]
    return "\n".join(lines)


def _section_critical_high_table(vulns: list[Vulnerability]) -> str:
    """Section 7: Detailed table of critical and high severity vulns."""
    crit_high = [v for v in vulns if _sev(v) in ("critical", "high")]
    if not crit_high:
        lines = [
            "h2. Critical & High Severity Vulnerabilities",
            "",
            "{info}",
            "No critical or high severity vulnerabilities found. (y)",
            "{info}",
            "",
        ]
        return "\n".join(lines)

    # Sort by severity (critical first), then score descending
    crit_high.sort(key=lambda v: (0 if _sev(v) == "critical" else 1, -(_score(v) or 0)))

    lines = [
        "h2. Critical & High Severity Vulnerabilities",
        "",
        "||ID||Severity||Score||Source||State||Affected||Description||",
    ]

    for v in crit_high:
        vid = v.id or "N/A"
        sev = _severity_status(_sev(v))
        score = f"{_score(v):.1f}" if _score(v) is not None else "N/A"
        source = _source_name(v)
        state = _state_status(_state(v)) if _state(v) else "{status:colour=Grey|title=UNREVIEWED}"
        refs = ", ".join(_affected_refs(v)[:3]) or "N/A"
        desc = _truncate(v.description, 80)
        lines.append(f"|{vid}|{sev}|{score}|{source}|{state}|{refs}|{desc}|")

    lines.append("")
    return "\n".join(lines)


def _section_all_vulnerabilities(vulns: list[Vulnerability]) -> str:
    """Section 8: Expandable table with all vulnerabilities."""
    if not vulns:
        return ""

    # Sort by severity order
    def sort_key(v: Vulnerability) -> tuple[int, float]:
        sev = _sev(v)
        idx = SEVERITY_ORDER.index(sev) if sev in SEVERITY_ORDER else len(SEVERITY_ORDER)
        return (idx, -(_score(v) or 0))

    sorted_vulns = sorted(vulns, key=sort_key)

    lines = [
        "h2. All Vulnerabilities",
        "",
        f"{{expand:title=View all {len(vulns)} vulnerabilities}}",
        "||#||ID||Severity||Score||Source||State||CWEs||Description||",
    ]

    for i, v in enumerate(sorted_vulns, 1):
        vid = v.id or "N/A"
        sev = _severity_status(_sev(v))
        score = f"{_score(v):.1f}" if _score(v) is not None else "N/A"
        source = _source_name(v)
        state = _state_status(_state(v)) if _state(v) else "{status:colour=Grey|title=UNREVIEWED}"
        cwes = ", ".join(f"CWE-{c}" for c in (v.cwes or [])) or "N/A"
        desc = _truncate(v.description, 60)
        lines.append(f"|{i}|{vid}|{sev}|{score}|{source}|{state}|{cwes}|{desc}|")

    lines.append("{expand}")
    lines.append("")
    return "\n".join(lines)


def _section_component_summary(vulns: list[Vulnerability], doc: VexDocument) -> str:
    """Section 9: Component summary — which components are affected and how."""
    # Build component ref → name mapping from doc.components
    ref_to_name: dict[str, str] = {}
    if doc.components:
        for c in doc.components:
            ref = c.bom_ref or c.purl or c.name or ""
            name = c.name or ref
            version = f"@{c.version}" if c.version else ""
            ref_to_name[ref] = f"{name}{version}"

    # Aggregate
    comp_vulns: dict[str, list[str]] = {}
    comp_severities: dict[str, list[str]] = {}
    for v in vulns:
        for ref in _affected_refs(v):
            comp_vulns.setdefault(ref, []).append(v.id or "N/A")
            comp_severities.setdefault(ref, []).append(_sev(v))

    if not comp_vulns:
        return ""

    lines = [
        "h2. Component Summary",
        "",
        "||Component||Vulnerabilities||Highest Severity||Count||",
    ]

    for ref in sorted(comp_vulns.keys()):
        name = ref_to_name.get(ref, ref)
        vuln_ids = ", ".join(comp_vulns[ref][:5])
        if len(comp_vulns[ref]) > 5:
            vuln_ids += f" (+{len(comp_vulns[ref]) - 5})"
        severities = comp_severities[ref]
        highest = min(severities, key=lambda s: SEVERITY_ORDER.index(s) if s in SEVERITY_ORDER else 99)
        mono_name = "{{" + name + "}}"
        lines.append(f"|{mono_name}|{vuln_ids}|{_severity_status(highest)}|{len(comp_vulns[ref])}|")

    lines.append("")
    return "\n".join(lines)


def _section_appendix(doc: VexDocument) -> str:
    """Section 10: Appendix with document metadata."""
    lines = [
        "h2. Appendix",
        "",
        "{panel:title=Document Metadata|borderStyle=dashed|borderColor=#999}",
        "||Field||Value||",
    ]

    lines.append(f"|Format|{doc.bom_format or 'CycloneDX'}|")
    lines.append(f"|Spec version|{doc.spec_version or 'N/A'}|")
    serial = "{{" + (doc.serial_number or "N/A") + "}}"
    lines.append(f"|Serial number|{serial}|")
    lines.append(f"|Document version|{doc.version or 'N/A'}|")

    if doc.metadata and doc.metadata.timestamp:
        lines.append(f"|Timestamp|{doc.metadata.timestamp}|")

    if doc.metadata and doc.metadata.tools:
        tools = doc.metadata.tools
        if isinstance(tools, dict) and "components" in tools:
            tool_names = ", ".join(
                t.get("name", "?") + (" " + t.get("version", "") if t.get("version") else "")
                for t in tools["components"]
            )
            lines.append(f"|Tools|{tool_names}|")
        elif isinstance(tools, list):
            tool_names = ", ".join(
                t.get("name", "?") + (" " + t.get("version", "") if t.get("version") else "")
                for t in tools
            )
            lines.append(f"|Tools|{tool_names}|")

    lines.append("{panel}")
    lines.append("")
    lines.append("----")
    gen_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines.append(f"_Report generated automatically on {gen_ts}_")
    lines.append("")
    return "\n".join(lines)


# ── Public API ───────────────────────────────────────────────────────────────


def convert_vex_to_confluence(doc: VexDocument) -> ConvertResponse:
    """Convert a VexDocument to Confluence wiki markup with stats."""
    vulns = doc.vulnerabilities or []
    stats = _compute_stats(vulns)
    vuln_infos = _build_vuln_infos(vulns)

    markup_parts = [
        _section_header(doc),
        _section_toc(),
        _section_executive_summary(stats, doc),
        _section_severity_distribution(stats),
        _section_state_breakdown(stats),
        _section_unreviewed_warning(vulns),
        _section_critical_high_table(vulns),
        _section_all_vulnerabilities(vulns),
        _section_component_summary(vulns, doc),
        _section_appendix(doc),
    ]

    markup = "\n".join(part for part in markup_parts if part)

    return ConvertResponse(
        markup=markup,
        stats=stats,
        vulnerabilities=vuln_infos,
    )
