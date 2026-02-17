"""Tests for SBOM validator."""

import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from converters.sbom_validator import (
    validate_sbom,
    validate_vcs_accessibility,
    _is_safe_url,
)
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
        # Valid even with VCS warnings (warnings don't fail validation)
        assert result.valid is True
        # May have VCS warnings for library components without VCS references
        assert result.schema_version == "1.6"

    def test_valid_gost_full_sbom(self):
        """Test validation of a complex SBOM with full GOST fields but missing VCS."""
        doc = load_fixture("02-gost-full.cdx.json")
        result = validate_sbom(doc)

        # VCS missing on application is a warning, not an error
        assert result.valid is True
        warnings = [i for i in result.issues if i.level == "warning"]
        vcs_warnings = [w for w in warnings if "VCS" in w.message]
        assert len(vcs_warnings) > 0

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

    def test_vcs_application_without_vcs_warning(self):
        """Test validation warns on application components without VCS."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "application",
                    "name": "MyApp",
                    "version": "1.0.0"
                    # Missing externalReferences with type: vcs
                }
            ]
        }
        result = validate_sbom(doc)

        # Warnings don't fail validation
        assert result.valid is True
        warnings = [i for i in result.issues if i.level == "warning"]
        vcs_warnings = [w for w in warnings if "VCS" in w.message and "MyApp" in w.message]
        assert len(vcs_warnings) == 1

    def test_vcs_library_without_vcs_warning(self):
        """Test validation warns on library components without VCS."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "SomeLib",
                    "version": "2.0.0"
                    # Missing externalReferences with type: vcs
                }
            ]
        }
        result = validate_sbom(doc)

        # Warnings don't fail validation
        assert result.valid is True
        warnings = [i for i in result.issues if i.level == "warning"]
        vcs_warnings = [w for w in warnings if "VCS" in w.message and "SomeLib" in w.message]
        assert len(vcs_warnings) == 1

    def test_vcs_with_valid_reference(self):
        """Test validation passes when VCS reference is present."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "application",
                    "name": "MyApp",
                    "version": "1.0.0",
                    "externalReferences": [
                        {
                            "type": "vcs",
                            "url": "https://github.com/user/repo"
                        }
                    ]
                }
            ]
        }
        result = validate_sbom(doc)

        # Should not have VCS-related issues
        vcs_issues = [i for i in result.issues if "VCS" in i.message]
        assert len(vcs_issues) == 0

    def test_vcs_skip_os_and_framework(self):
        """Test VCS validation skips operating-system and framework components."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "operating-system",
                    "name": "Ubuntu",
                    "version": "20.04"
                    # No VCS reference, but should not trigger validation
                },
                {
                    "type": "framework",
                    "name": "Django",
                    "version": "4.0"
                    # No VCS reference, but should not trigger validation
                }
            ]
        }
        result = validate_sbom(doc)

        # Should not have VCS-related issues for OS and framework
        vcs_issues = [i for i in result.issues if "VCS" in i.message]
        assert len(vcs_issues) == 0


class TestSsrfProtection:
    """Test SSRF protection for VCS URL validation."""

    def test_https_url_allowed(self):
        assert _is_safe_url("https://github.com/org/repo") is True

    def test_http_url_rejected(self):
        assert _is_safe_url("http://github.com/org/repo") is False

    def test_localhost_rejected(self):
        assert _is_safe_url("https://localhost/repo") is False
        assert _is_safe_url("https://127.0.0.1/repo") is False
        assert _is_safe_url("https://0.0.0.0/repo") is False

    def test_private_ip_rejected(self):
        assert _is_safe_url("https://192.168.1.1/repo") is False
        assert _is_safe_url("https://10.0.0.1/repo") is False
        assert _is_safe_url("https://172.16.0.1/repo") is False

    def test_public_ip_rejected(self):
        # Even public IPs are rejected — only hostnames allowed
        assert _is_safe_url("https://8.8.8.8/repo") is False

    def test_file_scheme_rejected(self):
        assert _is_safe_url("file:///etc/passwd") is False

    def test_empty_url(self):
        assert _is_safe_url("") is False

    def test_no_scheme(self):
        assert _is_safe_url("github.com/org/repo") is False


class TestVcsAccessibility:
    """Test async VCS accessibility checks."""

    @pytest.mark.asyncio
    async def test_vcs_accessible_valid_repo(self):
        """Valid git repo returns info issue."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "test-lib",
                    "externalReferences": [
                        {"type": "vcs", "url": "https://github.com/org/repo"}
                    ],
                }
            ],
        }

        mock_response = httpx.Response(
            200,
            headers={"content-type": "application/x-git-upload-pack-advertisement"},
            request=httpx.Request("GET", "https://github.com/org/repo.git/info/refs"),
        )

        with patch("converters.sbom_validator.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            issues = await validate_vcs_accessibility(doc)

        assert len(issues) == 1
        assert issues[0].level == "info"
        assert "доступен" in issues[0].message

    @pytest.mark.asyncio
    async def test_vcs_inaccessible_404(self):
        """404 response returns warning issue."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "bad-lib",
                    "externalReferences": [
                        {"type": "vcs", "url": "https://github.com/org/nonexistent"}
                    ],
                }
            ],
        }

        mock_response = httpx.Response(
            404,
            headers={"content-type": "text/html"},
            request=httpx.Request("GET", "https://github.com/org/nonexistent.git/info/refs"),
        )

        with patch("converters.sbom_validator.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            issues = await validate_vcs_accessibility(doc)

        assert len(issues) == 1
        assert issues[0].level == "warning"
        assert "недоступен" in issues[0].message

    @pytest.mark.asyncio
    async def test_vcs_timeout(self):
        """Timeout returns warning issue."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "slow-lib",
                    "externalReferences": [
                        {"type": "vcs", "url": "https://slow-host.example.com/repo"}
                    ],
                }
            ],
        }

        with patch("converters.sbom_validator.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            issues = await validate_vcs_accessibility(doc)

        assert len(issues) == 1
        assert issues[0].level == "warning"
        assert "Таймаут" in issues[0].message

    @pytest.mark.asyncio
    async def test_vcs_ssrf_http_url_skipped(self):
        """HTTP URLs are skipped with warning."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "insecure-lib",
                    "externalReferences": [
                        {"type": "vcs", "url": "http://internal.corp/repo"}
                    ],
                }
            ],
        }

        issues = await validate_vcs_accessibility(doc)

        assert len(issues) == 1
        assert issues[0].level == "warning"
        assert "только HTTPS" in issues[0].message

    @pytest.mark.asyncio
    async def test_vcs_no_vcs_url_no_check(self):
        """Components without VCS URLs skip accessibility check."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "no-vcs-lib",
                }
            ],
        }

        issues = await validate_vcs_accessibility(doc)
        assert len(issues) == 0

    @pytest.mark.asyncio
    async def test_vcs_concurrent_checks(self):
        """Multiple VCS URLs are checked concurrently."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "lib-a",
                    "externalReferences": [
                        {"type": "vcs", "url": "https://github.com/org/repo-a"}
                    ],
                },
                {
                    "type": "library",
                    "name": "lib-b",
                    "externalReferences": [
                        {"type": "vcs", "url": "https://github.com/org/repo-b"}
                    ],
                },
            ],
        }

        mock_response = httpx.Response(
            200,
            headers={"content-type": "application/x-git-upload-pack-advertisement"},
            request=httpx.Request("GET", "https://github.com/org/repo.git/info/refs"),
        )

        with patch("converters.sbom_validator.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            issues = await validate_vcs_accessibility(doc)

        # Both should be checked
        assert len(issues) == 2
        assert all(i.level == "info" for i in issues)
        assert mock_client.get.call_count == 2

    @pytest.mark.asyncio
    async def test_vcs_connect_error(self):
        """Connection error returns warning issue."""
        doc = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [
                {
                    "type": "library",
                    "name": "unreachable-lib",
                    "externalReferences": [
                        {"type": "vcs", "url": "https://unreachable.example.com/repo"}
                    ],
                }
            ],
        }

        with patch("converters.sbom_validator.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.ConnectError("connection refused"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            issues = await validate_vcs_accessibility(doc)

        assert len(issues) == 1
        assert issues[0].level == "warning"
        assert "подключиться" in issues[0].message
