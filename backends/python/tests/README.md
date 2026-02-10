# Backend Tests

Unit tests for SBOM validation and unification logic.

## Running Tests

```bash
cd backends/python
uv run --with-requirements requirements.txt pytest
```

Or with verbose output:

```bash
uv run --with-requirements requirements.txt pytest -v
```

Run specific test file:

```bash
uv run --with-requirements requirements.txt pytest tests/test_validator.py
```

## Test Fixtures

Test SBOM files are located in `tests/fixtures/`:

- `01-simple.cdx.json` — Simple valid SBOM (3 components)
- `02-gost-full.cdx.json` — Complex nested SBOM with full GOST fields
- `03-gost-invalid-hierarchy.cdx.json` — Invalid GOST hierarchy (child > parent)
- `04-no-gost-warnings.cdx.json` — Partial GOST fields (warnings)
- `05-large-flat.cdx.json` — Large flat SBOM (30 components)
- `06-minimal-broken.cdx.json` — Missing required fields (errors)
- `07-unify-microservice-a.cdx.json` — User service for unification
- `08-unify-microservice-b.cdx.json` — Order service for unification

## Test Coverage

### `test_validator.py`
- Valid simple SBOM
- Complex SBOM with GOST fields
- GOST hierarchy violations (errors)
- Missing GOST fields (warnings)
- Structural errors (missing type, name)
- Large SBOM performance
- Invalid bomFormat
- Missing metadata

### `test_unifier.py`
- Unify two microservices
- GOST property aggregation
- Duplicate SBOM handling
- Dependency graph creation
- Metadata preservation
- Serial number generation
- Timestamp generation
