"""SBOM validation: CycloneDX schema checks + GOST/FSTEC hierarchy rules."""

from __future__ import annotations

import asyncio
import ipaddress
import re
from typing import Any
from urllib.parse import urlparse

import httpx

from models.sbom import ValidationIssue, ValidateResponse
from converters.sbom_utils import get_gost_prop, eval_prop

_VCS_CHECK_TIMEOUT = 5.0
_VCS_MAX_REDIRECTS = 3


def _validate_structure(document: dict[str, Any]) -> list[ValidationIssue]:
    """Validate basic CycloneDX BOM structure."""
    issues: list[ValidationIssue] = []

    bom_format = document.get("bomFormat")
    if bom_format != "CycloneDX":
        issues.append(
            ValidationIssue(
                level="error",
                message=f'bomFormat должен быть "CycloneDX", получено: "{bom_format}"',
                path="$.bomFormat",
            )
        )

    spec_version = document.get("specVersion")
    if not spec_version:
        issues.append(
            ValidationIssue(
                level="error",
                message="specVersion обязателен",
                path="$.specVersion",
            )
        )
    elif spec_version not in ("1.4", "1.5", "1.6"):
        issues.append(
            ValidationIssue(
                level="warning",
                message=f"specVersion {spec_version} может не поддерживаться полностью",
                path="$.specVersion",
            )
        )

    if "components" not in document and "vulnerabilities" not in document:
        issues.append(
            ValidationIssue(
                level="warning",
                message="Документ не содержит ни components, ни vulnerabilities",
                path="$",
            )
        )

    metadata = document.get("metadata")
    if not metadata:
        issues.append(
            ValidationIssue(
                level="warning",
                message="Отсутствует секция metadata",
                path="$.metadata",
            )
        )
    else:
        if not metadata.get("timestamp"):
            issues.append(
                ValidationIssue(
                    level="warning",
                    message="Отсутствует timestamp в metadata",
                    path="$.metadata.timestamp",
                )
            )

    return issues


def _validate_components(
    components: list[dict[str, Any]], base_path: str = "$.components"
) -> list[ValidationIssue]:
    """Validate component fields."""
    issues: list[ValidationIssue] = []

    for i, comp in enumerate(components):
        path = f"{base_path}[{i}]"

        if not comp.get("type"):
            issues.append(
                ValidationIssue(
                    level="error",
                    message="Компонент должен иметь тип (type)",
                    path=path,
                )
            )

        if not comp.get("name"):
            issues.append(
                ValidationIssue(
                    level="error",
                    message="Компонент должен иметь имя (name)",
                    path=path,
                )
            )

        valid_types = {
            "application",
            "framework",
            "library",
            "container",
            "platform",
            "operating-system",
            "device",
            "device-driver",
            "firmware",
            "file",
            "machine-learning-model",
            "data",
        }
        comp_type = comp.get("type", "")
        if comp_type and comp_type not in valid_types:
            issues.append(
                ValidationIssue(
                    level="warning",
                    message=f'Неизвестный тип компонента: "{comp_type}"',
                    path=f"{path}.type",
                )
            )

        # Recursively validate nested components
        children = comp.get("components", [])
        if children:
            issues.extend(
                _validate_components(children, f"{path}.components")
            )

    return issues


def _validate_gost_hierarchy(
    document: dict[str, Any],
) -> list[ValidationIssue]:
    """Validate GOST property hierarchy rules for container format.

    Rules:
    - attack_surface of parent >= all children
    - security_function of parent >= all children
    Hierarchy: yes(2) > indirect(1) > no(0)
    """
    issues: list[ValidationIssue] = []
    components = document.get("components", [])

    def check_hierarchy(
        comps: list[dict[str, Any]], base_path: str
    ) -> None:
        for i, comp in enumerate(comps):
            path = f"{base_path}[{i}]"
            children = comp.get("components", [])
            if not children:
                continue

            for prop_name, label in [
                ("attack_surface", "GOST:attack_surface"),
                ("security_function", "GOST:security_function"),
            ]:
                parent_val = get_gost_prop(comp, prop_name)
                parent_level = eval_prop(parent_val)

                for j, child in enumerate(children):
                    child_val = get_gost_prop(child, prop_name)
                    child_level = eval_prop(child_val)

                    if child_level > parent_level and parent_level >= 0:
                        issues.append(
                            ValidationIssue(
                                level="error",
                                message=(
                                    f'{label} дочернего компонента "{child.get("name", "?")}" '
                                    f'({child_val}) превышает родительский '
                                    f'"{comp.get("name", "?")}" ({parent_val})'
                                ),
                                path=f"{path}.components[{j}]",
                            )
                        )

            check_hierarchy(children, f"{path}.components")

    check_hierarchy(components, "$.components")
    return issues


def _validate_gost_fields(
    document: dict[str, Any],
) -> list[ValidationIssue]:
    """Warn about missing GOST fields if any GOST fields are present."""
    issues: list[ValidationIssue] = []
    components = document.get("components", [])

    has_any_gost = False

    def check_gost_presence(comps: list[dict[str, Any]]) -> bool:
        for comp in comps:
            if get_gost_prop(comp, "attack_surface") is not None:
                return True
            if get_gost_prop(comp, "security_function") is not None:
                return True
            children = comp.get("components", [])
            if children and check_gost_presence(children):
                return True
        return False

    has_any_gost = check_gost_presence(components)
    if not has_any_gost:
        return issues

    def check_missing(
        comps: list[dict[str, Any]], base_path: str
    ) -> None:
        for i, comp in enumerate(comps):
            path = f"{base_path}[{i}]"
            as_val = get_gost_prop(comp, "attack_surface")
            sf_val = get_gost_prop(comp, "security_function")

            if as_val is None:
                issues.append(
                    ValidationIssue(
                        level="warning",
                        message=f'Отсутствует GOST:attack_surface у компонента "{comp.get("name", "?")}"',
                        path=path,
                    )
                )
            elif as_val == "":
                issues.append(
                    ValidationIssue(
                        level="warning",
                        message=f'GOST:attack_surface не заполнен у компонента "{comp.get("name", "?")}"',
                        path=path,
                    )
                )
            if sf_val is None:
                issues.append(
                    ValidationIssue(
                        level="warning",
                        message=f'Отсутствует GOST:security_function у компонента "{comp.get("name", "?")}"',
                        path=path,
                    )
                )
            elif sf_val == "":
                issues.append(
                    ValidationIssue(
                        level="warning",
                        message=f'GOST:security_function не заполнен у компонента "{comp.get("name", "?")}"',
                        path=path,
                    )
                )

            children = comp.get("components", [])
            if children:
                check_missing(children, f"{path}.components")

    check_missing(components, "$.components")
    return issues


def _validate_vcs_references(
    document: dict[str, Any],
) -> list[ValidationIssue]:
    """Validate that components have VCS (version control system) references.

    Rules:
    - ERROR for type: "application" components without VCS (your own code must have VCS)
    - WARNING for type: "library" components without VCS (external deps may not have VCS)
    - Skip validation for type: "operating-system" and "framework"
    """
    issues: list[ValidationIssue] = []
    components = document.get("components", [])

    def check_vcs(comps: list[dict[str, Any]], base_path: str) -> None:
        for i, comp in enumerate(comps):
            path = f"{base_path}[{i}]"
            comp_type = comp.get("type", "")
            comp_name = comp.get("name", "?")

            # Skip validation for operating-system and framework
            if comp_type in ("operating-system", "framework"):
                continue

            # Check for VCS reference
            external_refs = comp.get("externalReferences", [])
            has_vcs = any(ref.get("type") == "vcs" for ref in external_refs)

            if not has_vcs:
                if comp_type in ("application", "library"):
                    issues.append(
                        ValidationIssue(
                            level="warning",
                            message=f"Компонент '{comp_name}': Отсутствует ссылка на VCS (система контроля версий). Добавьте externalReferences с type='vcs'.",
                            path=path,
                        )
                    )

            # Recursively check nested components
            children = comp.get("components", [])
            if children:
                check_vcs(children, f"{path}.components")

    check_vcs(components, "$.components")
    return issues


def _is_safe_url(url: str) -> bool:
    """Check if URL is safe for SSRF protection (HTTPS only, no private IPs)."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    if parsed.scheme != "https":
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    # Reject localhost variants
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        return False

    # Reject IP addresses (only allow hostnames)
    try:
        addr = ipaddress.ip_address(hostname)
        # If it parses as IP, reject private/reserved ranges
        if addr.is_private or addr.is_reserved or addr.is_loopback or addr.is_link_local:
            return False
        # Even public IPs are rejected — only hostnames allowed
        return False
    except ValueError:
        pass  # Not an IP — good, it's a hostname

    # Reject suspicious hostnames
    if re.match(r"^(\d{1,3}\.){3}\d{1,3}$", hostname):
        return False

    return True


def _normalize_vcs_url(url: str) -> str:
    """Normalize VCS URL for Git Smart HTTP check."""
    url = url.rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    return url


async def _check_single_vcs(
    client: httpx.AsyncClient,
    url: str,
    path: str,
    comp_name: str,
) -> ValidationIssue:
    """Check a single VCS URL for accessibility via Git Smart HTTP protocol."""
    normalized = _normalize_vcs_url(url)
    check_url = f"{normalized}.git/info/refs?service=git-upload-pack"

    try:
        resp = await client.get(check_url)
        content_type = resp.headers.get("content-type", "")

        if (
            resp.status_code == 200
            and "application/x-git-upload-pack-advertisement" in content_type
        ):
            return ValidationIssue(
                level="info",
                message=f"Компонент '{comp_name}': VCS репозиторий доступен ({url})",
                path=path,
            )
        else:
            return ValidationIssue(
                level="warning",
                message=f"Компонент '{comp_name}': VCS репозиторий недоступен ({url}) — HTTP {resp.status_code}",
                path=path,
            )
    except httpx.TimeoutException:
        return ValidationIssue(
            level="warning",
            message=f"Компонент '{comp_name}': Таймаут при проверке VCS репозитория ({url})",
            path=path,
        )
    except httpx.ConnectError:
        return ValidationIssue(
            level="warning",
            message=f"Компонент '{comp_name}': Не удалось подключиться к VCS репозиторию ({url})",
            path=path,
        )
    except Exception:
        return ValidationIssue(
            level="warning",
            message=f"Компонент '{comp_name}': Ошибка при проверке VCS репозитория ({url})",
            path=path,
        )


def _collect_vcs_urls(
    components: list[dict[str, Any]],
    base_path: str = "$.components",
) -> list[tuple[str, str, str]]:
    """Collect all VCS URLs from components with their paths and names.

    Returns list of (url, json_path, component_name) tuples.
    """
    result: list[tuple[str, str, str]] = []

    for i, comp in enumerate(components):
        path = f"{base_path}[{i}]"
        comp_name = comp.get("name", "?")
        external_refs = comp.get("externalReferences", [])

        for ref in external_refs:
            if ref.get("type") == "vcs" and ref.get("url"):
                result.append((ref["url"], path, comp_name))

        children = comp.get("components", [])
        if children:
            result.extend(_collect_vcs_urls(children, f"{path}.components"))

    return result


async def validate_vcs_accessibility(
    document: dict[str, Any],
) -> list[ValidationIssue]:
    """Validate that VCS URLs in components are accessible git repositories.

    Uses Git Smart HTTP protocol to verify repository accessibility.
    Only HTTPS URLs are checked (SSRF protection).
    """
    issues: list[ValidationIssue] = []
    components = document.get("components", [])
    if not components:
        return issues

    vcs_entries = _collect_vcs_urls(components)
    if not vcs_entries:
        return issues

    # Filter out unsafe URLs
    safe_entries: list[tuple[str, str, str]] = []
    for url, path, name in vcs_entries:
        if not _is_safe_url(url):
            issues.append(
                ValidationIssue(
                    level="warning",
                    message=f"Компонент '{name}': VCS URL пропущен — допускается только HTTPS ({url})",
                    path=path,
                )
            )
        else:
            safe_entries.append((url, path, name))

    if not safe_entries:
        return issues

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(_VCS_CHECK_TIMEOUT),
        follow_redirects=True,
        max_redirects=_VCS_MAX_REDIRECTS,
    ) as client:
        tasks = [
            _check_single_vcs(client, url, path, name)
            for url, path, name in safe_entries
        ]
        results = await asyncio.gather(*tasks)
        issues.extend(results)

    return issues


def validate_sbom(
    document: dict[str, Any], format: str = "oss"
) -> ValidateResponse:
    """Validate an SBOM document.

    Args:
        document: The parsed SBOM JSON document.
        format: "oss" for standard validation, "container" for GOST checks.

    Returns:
        ValidateResponse with validation results.
    """
    issues: list[ValidationIssue] = []

    # Step 1: Structural validation
    issues.extend(_validate_structure(document))

    # Step 2: Component validation
    components = document.get("components", [])
    if components:
        issues.extend(_validate_components(components))

    # Step 3: GOST hierarchy checks
    issues.extend(_validate_gost_hierarchy(document))
    issues.extend(_validate_gost_fields(document))

    # Step 4: VCS reference validation
    issues.extend(_validate_vcs_references(document))

    has_errors = any(i.level == "error" for i in issues)
    spec_version = document.get("specVersion")

    return ValidateResponse(
        valid=not has_errors,
        issues=issues,
        schema_version=spec_version,
    )
