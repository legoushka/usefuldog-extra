"""SBOM unification: merge multiple CycloneDX SBOMs into one."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from converters.sbom_utils import get_gost_prop, eval_prop, flatten_components
from models.sbom import UnifyResponse

GOST_PREFIX = "cdx:gost:"


def _aggregate_gost(
    components: list[dict[str, Any]], prop_name: str
) -> str | None:
    """Aggregate a GOST property across components.

    Returns the highest value in the hierarchy: yes > indirect > no.
    """
    max_level = -1
    max_value: str | None = None
    for comp in components:
        val = get_gost_prop(comp, prop_name)
        level = eval_prop(val)
        if level > max_level:
            max_level = level
            max_value = val
    return max_value


def _set_gost_prop(
    properties: list[dict[str, Any]], prop_name: str, value: str | None
) -> list[dict[str, Any]]:
    """Set or update a GOST property in a properties list."""
    if value is None:
        return properties

    full_name = f"{GOST_PREFIX}{prop_name}"
    for prop in properties:
        if prop.get("name") == full_name:
            prop["value"] = value
            return properties
    properties.append({"name": full_name, "value": value})
    return properties


def unify_sboms(
    documents: list[dict[str, Any]],
    app_name: str,
    app_version: str,
    manufacturer: str,
) -> UnifyResponse:
    """Unify multiple CycloneDX SBOM documents into a single BOM.

    Each input SBOM becomes a top-level component of type 'application'
    containing its original components as children.

    Args:
        documents: List of parsed CycloneDX SBOM JSON documents.
        app_name: Name for the unified application.
        app_version: Version for the unified application.
        manufacturer: Manufacturer name.

    Returns:
        UnifyResponse with the merged BOM.
    """
    unified_components: list[dict[str, Any]] = []
    all_dependencies: list[dict[str, Any]] = []
    total_flat_count = 0

    for doc in documents:
        components = doc.get("components", [])
        dependencies = doc.get("dependencies", [])
        metadata = doc.get("metadata", {})
        meta_component = metadata.get("component", {})

        # Use metadata component info or fallback
        comp_name = meta_component.get("name", "Unknown")
        comp_version = meta_component.get("version", "")
        comp_group = meta_component.get("group")
        bom_ref = meta_component.get("bom-ref") or f"unified-{comp_name}-{comp_version}"

        # Aggregate GOST properties from all children
        flat = flatten_components(components)
        total_flat_count += len(flat)

        properties: list[dict[str, Any]] = []
        for prop_name in ["attack_surface", "security_function"]:
            agg_value = _aggregate_gost(flat, prop_name)
            properties = _set_gost_prop(properties, prop_name, agg_value)

        # Copy original GOST properties from meta component if present
        for prop_name in ["provided_by", "source_langs"]:
            val = get_gost_prop(meta_component, prop_name) if meta_component else None
            if val:
                properties = _set_gost_prop(properties, prop_name, val)

        wrapper: dict[str, Any] = {
            "type": "application",
            "name": comp_name,
            "bom-ref": bom_ref,
            "components": components,
        }
        if comp_version:
            wrapper["version"] = comp_version
        if comp_group:
            wrapper["group"] = comp_group
        if properties:
            wrapper["properties"] = properties

        unified_components.append(wrapper)

        # Merge dependencies
        if dependencies:
            all_dependencies.extend(dependencies)

    # Build the unified BOM
    now = datetime.now(timezone.utc).isoformat()
    app_bom_ref = f"unified-{app_name}-{app_version}"

    unified_bom: dict[str, Any] = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": now,
            "component": {
                "type": "application",
                "name": app_name,
                "version": app_version,
                "bom-ref": app_bom_ref,
            },
        },
        "components": unified_components,
    }

    if manufacturer:
        unified_bom["metadata"]["manufacturer"] = {"name": manufacturer}

    if all_dependencies:
        # Add top-level dependency entry
        top_dep = {
            "ref": app_bom_ref,
            "dependsOn": [c["bom-ref"] for c in unified_components],
        }
        unified_bom["dependencies"] = [top_dep] + all_dependencies

    return UnifyResponse(
        bom=unified_bom,
        components_count=total_flat_count + len(unified_components),
        sources_count=len(documents),
    )
