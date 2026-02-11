# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-02-11

### Added
- Add component dialog with target selector (root/child) and import-from-project-SBOM mode
- All component fields available in add dialog (scope, group, PURL, CPE, VCS, description, GOST)
- Inline validation errors and warnings displayed directly in component tree
- VCS URL field in component edit form
- Select all / deselect all in batch GOST editor
- One-click "Add empty GOST fields" button for all components
- Collapsible file explorer sidebar with localStorage persistence
- Project SBOM selection in Unifier tab

### Changed
- Main navigation sidebar collapsed by default (icon-only strip, expandable)
- Removed "Просмотр" and "Валидация" tabs — validation integrated into editor view
- "Add component" moved from inline panel to dialog with explicit target selection
- "Import SBOM as component" merged into add component dialog
- Toolbar buttons (GOST fields, batch editor) left-aligned above component grid

### Fixed
- Stale component form when switching between components (key-based remount)
- Validation issue matching uses JSONPath parsing instead of flaky bom-ref string matching
- Backend now warns about empty GOST field values

## [0.2.0] - 2026-02-11

### Added

#### SBOM Editor
- Full-featured CycloneDX SBOM editor with 4 tabs: View, Edit, Validate, Unify
- Visual component tree editor with drag-and-drop support
- Component form with all CycloneDX fields (name, version, type, licenses, hashes, etc.)
- GOST-specific fields support (attack surface, security function)
- Batch GOST editor for bulk property updates
- Component import from saved SBOMs
- Component deletion with confirmation dialog and children count warning
- Real-time validation against CycloneDX 1.6 spec
- GOST-specific validation rules
- SBOM unification (merge multiple SBOMs into one)
- Empty SBOM creation from template
- Download edited SBOM as JSON

#### Persistent Storage
- File-based project storage with Docker volume mount
- Project management API (create, list, get, delete)
- SBOM management API (upload, get, update, delete)
- Data persists across container rebuilds (`./data` directory)

#### UX Improvements
- File explorer sidebar with projects and SBOMs
- Welcome screen with onboarding guide
- Breadcrumbs navigation showing current project/SBOM
- Toast notifications instead of browser alerts
- Confirmation dialogs for destructive actions
- **Instant auto-save** - all changes saved immediately
- Save status indicator (Сохранение.../Сохранено)
- Compact file explorer design (280px width)
- Validation error highlighting in component tree
- Filter components by validation status (errors/warnings)

#### Localization
- Full Russian localization of UI
- Technical terms (CVE, SBOM, CVSS, etc.) kept in English
- CLAUDE.md with development workflow in Russian

#### Backend
- FastAPI endpoints for SBOM validation and unification
- ProjectStore for file-based persistence
- Comprehensive test suite with pytest
- Test fixtures for various SBOM scenarios

### Changed
- Updated Next.js proxy configuration for multiple backend endpoints
- Improved error handling with user-friendly messages
- Optimized loading by preloading all SBOMs in parallel

### Fixed
- Docker data persistence with correct `/data` path
- Project selection propagation through component hierarchy
- ESLint warnings cleanup

## [0.1.0] - 2026-02-09

### Added
- VEX-to-Confluence converter tool
- CycloneDX VEX JSON parser
- Confluence wiki markup generator
- Vulnerability severity and state charts
- Dashboard with tool cards
- Docker Compose deployment
- Dark mode support

[0.2.1]: https://github.com/legoushka/usefuldog-extra/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/legoushka/usefuldog-extra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/legoushka/usefuldog-extra/releases/tag/v0.1.0
