"""Utility functions for SBOM processing."""

from __future__ import annotations

from typing import Any

GOST_PREFIX = "cdx:gost:"

# GOST property value hierarchy: yes(2) > indirect(1) > no(0)
GOST_HIERARCHY = {"yes": 2, "indirect": 1, "no": 0}


def get_prop(component: dict[str, Any], prop_name: str) -> str | None:
    """Extract a property value from a component's properties array."""
    properties = component.get("properties", [])
    if not properties:
        return None
    for prop in properties:
        if prop.get("name") == prop_name:
            return prop.get("value")
    return None


def get_gost_prop(component: dict[str, Any], gost_name: str) -> str | None:
    """Extract a GOST property value (e.g., 'attack_surface')."""
    return get_prop(component, f"{GOST_PREFIX}{gost_name}")


def eval_prop(value: str | None) -> int:
    """Evaluate a GOST property value to its hierarchy level."""
    if value is None:
        return -1
    return GOST_HIERARCHY.get(value.lower(), -1)


def flatten_components(components: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Flatten a nested component tree into a flat list."""
    result: list[dict[str, Any]] = []
    stack = list(components)
    while stack:
        comp = stack.pop()
        result.append(comp)
        children = comp.get("components", [])
        if children:
            stack.extend(children)
    return result
