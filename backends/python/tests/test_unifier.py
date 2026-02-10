"""Tests for SBOM unifier."""

import json
from pathlib import Path

from converters.sbom_unifier import unify_sboms
from models.sbom import UnifyResponse


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(filename: str) -> dict:
    """Load a test fixture SBOM file."""
    with open(FIXTURES_DIR / filename) as f:
        return json.load(f)


class TestSbomUnifier:
    """Test SBOM unification logic."""

    def test_unify_two_microservices(self):
        """Test unifying two microservice SBOMs."""
        doc1 = load_fixture("07-unify-microservice-a.cdx.json")
        doc2 = load_fixture("08-unify-microservice-b.cdx.json")

        result = unify_sboms(
            [doc1, doc2],
            app_name="Platform",
            app_version="2.0.0",
            manufacturer="Test Corp",
        )

        assert isinstance(result, UnifyResponse)
        assert result.sources_count == 2
        assert result.components_count > 0

        bom = result.bom
        assert bom["bomFormat"] == "CycloneDX"
        assert bom["specVersion"] == "1.6"
        assert bom["metadata"]["component"]["name"] == "Platform"
        assert bom["metadata"]["component"]["version"] == "2.0.0"
        assert bom["metadata"]["manufacturer"]["name"] == "Test Corp"

        # Should have 2 top-level components (wrappers)
        assert len(bom["components"]) == 2

        # Each wrapper should contain original components
        for wrapper in bom["components"]:
            assert wrapper["type"] == "application"
            assert "components" in wrapper
            assert len(wrapper["components"]) > 0

    def test_unify_aggregates_gost_properties(self):
        """Test that GOST properties are aggregated correctly."""
        doc1 = load_fixture("07-unify-microservice-a.cdx.json")
        doc2 = load_fixture("08-unify-microservice-b.cdx.json")

        result = unify_sboms([doc1, doc2], "App", "1.0", "Corp")
        bom = result.bom

        # Check that wrappers have GOST properties
        for wrapper in bom["components"]:
            props = wrapper.get("properties", [])
            prop_names = {p["name"] for p in props}

            # Should have attack_surface and security_function
            assert "cdx:gost:attack_surface" in prop_names
            assert "cdx:gost:security_function" in prop_names

    def test_unify_same_sbom_twice(self):
        """Test unifying the same SBOM twice (edge case)."""
        doc = load_fixture("01-simple.cdx.json")

        result = unify_sboms([doc, doc], "Duplicate", "1.0", "Test")

        assert result.sources_count == 2
        assert len(result.bom["components"]) == 2

    def test_unify_creates_dependencies(self):
        """Test that unified SBOM has dependency structure."""
        doc1 = load_fixture("07-unify-microservice-a.cdx.json")
        doc2 = load_fixture("08-unify-microservice-b.cdx.json")

        result = unify_sboms([doc1, doc2], "App", "1.0", "Corp")
        bom = result.bom

        # Should have dependencies
        assert "dependencies" in bom
        deps = bom["dependencies"]
        assert len(deps) > 0

        # First dependency should be the top-level app
        top_dep = deps[0]
        assert top_dep["ref"] == bom["metadata"]["component"]["bom-ref"]
        # Should depend on the 2 wrapper components
        assert len(top_dep["dependsOn"]) == 2

    def test_unify_preserves_metadata(self):
        """Test that original metadata is preserved in wrappers."""
        doc1 = load_fixture("02-gost-full.cdx.json")

        result = unify_sboms([doc1], "Single", "1.0", "Corp")
        wrapper = result.bom["components"][0]

        # Should preserve name and version from original metadata component
        meta_comp = doc1["metadata"]["component"]
        assert wrapper["name"] == meta_comp["name"]
        assert wrapper["version"] == meta_comp["version"]

    def test_unify_generates_serial_number(self):
        """Test that unified SBOM has a valid serial number."""
        doc1 = load_fixture("01-simple.cdx.json")
        doc2 = load_fixture("02-gost-full.cdx.json")

        result = unify_sboms([doc1, doc2], "Test", "1.0", "Corp")
        bom = result.bom

        assert "serialNumber" in bom
        assert bom["serialNumber"].startswith("urn:uuid:")

    def test_unify_adds_timestamp(self):
        """Test that unified SBOM has a timestamp."""
        doc1 = load_fixture("01-simple.cdx.json")

        result = unify_sboms([doc1], "Test", "1.0", "Corp")
        bom = result.bom

        assert "metadata" in bom
        assert "timestamp" in bom["metadata"]
        # Should be ISO format with timezone
        timestamp = bom["metadata"]["timestamp"]
        assert "T" in timestamp
        assert ("+00:00" in timestamp or "Z" in timestamp)
