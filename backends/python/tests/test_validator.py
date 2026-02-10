"""Tests for SBOM validator."""

import json
from pathlib import Path

import pytest

from converters.sbom_validator import validate_sbom
from models.sbom import ValidateResponse


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(filename: str) -> dict:
    """Load a test fixture SBOM file."""
    with open(FIXTURES_DIR / filename) as f:
        return json.load(f)


class TestSbomValidator:
    """Test SBOM validation logic."""

    def test_valid_simple_sbom(self):
        """Test validation of a simple valid SBOM."""
        doc = load_fixture("01-simple.cdx.json")
        result = validate_sbom(doc)

        assert isinstance(result, ValidateResponse)
        assert result.valid is True
        assert len(result.issues) == 0
        assert result.schema_version == "1.6"

    def test_valid_gost_full_sbom(self):
        """Test validation of a complex SBOM with full GOST fields."""
        doc = load_fixture("02-gost-full.cdx.json")
        result = validate_sbom(doc)

        assert result.valid is True
        assert len(result.issues) == 0

    def test_invalid_gost_hierarchy(self):
        """Test validation catches GOST hierarchy violations."""
        doc = load_fixture("03-gost-invalid-hierarchy.cdx.json")
        result = validate_sbom(doc)

        assert result.valid is False
        errors = [i for i in result.issues if i.level == "error"]
        assert len(errors) > 0

        # Should find hierarchy violations
        hierarchy_errors = [
            e for e in errors
            if "превышает родительский" in e.message
        ]
        assert len(hierarchy_errors) > 0

    def test_missing_gost_fields_warnings(self):
        """Test validation warns about missing GOST fields."""
        doc = load_fixture("04-no-gost-warnings.cdx.json")
        result = validate_sbom(doc)

        # Should be valid (warnings don't fail validation)
        assert result.valid is True

        warnings = [i for i in result.issues if i.level == "warning"]
        # Should warn about missing GOST fields
        gost_warnings = [
            w for w in warnings
            if "GOST:" in w.message and "Отсутствует" in w.message
        ]
        assert len(gost_warnings) > 0

    def test_broken_structure(self):
        """Test validation catches structural errors."""
        doc = load_fixture("06-minimal-broken.cdx.json")
        result = validate_sbom(doc)

        assert result.valid is False
        errors = [i for i in result.issues if i.level == "error"]

        # Should find missing component type and name
        type_errors = [e for e in errors if "тип" in e.message.lower()]
        name_errors = [e for e in errors if "имя" in e.message.lower()]

        assert len(type_errors) > 0 or len(name_errors) > 0

    def test_large_flat_sbom(self):
        """Test validation handles large flat SBOMs efficiently."""
        doc = load_fixture("05-large-flat.cdx.json")
        result = validate_sbom(doc)

        # Should validate without crashing
        assert isinstance(result, ValidateResponse)
        # Large valid SBOM should pass
        assert result.valid is True

    @pytest.mark.parametrize("invalid_bomformat", [
        {"bomFormat": "SPDX", "specVersion": "1.6"},
        {"bomFormat": None, "specVersion": "1.6"},
        {"specVersion": "1.6"},  # missing bomFormat
    ])
    def test_invalid_bomformat(self, invalid_bomformat):
        """Test validation rejects non-CycloneDX formats."""
        result = validate_sbom(invalid_bomformat)

        assert result.valid is False
        errors = [i for i in result.issues if i.level == "error"]
        format_errors = [e for e in errors if "bomFormat" in e.message]
        assert len(format_errors) > 0

    def test_missing_metadata_warning(self):
        """Test validation warns about missing metadata."""
        doc = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        result = validate_sbom(doc)

        warnings = [i for i in result.issues if i.level == "warning"]
        metadata_warnings = [w for w in warnings if "metadata" in w.message]
        assert len(metadata_warnings) > 0
