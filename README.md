# usefuldog-extra

A local web tool suite for security and DevOps utilities, starting with a VEX-to-Confluence converter.

## Architecture

```
Frontend (Next.js + shadcn/ui)     :3000
  ├── /api/tools/vex/*  ──►  Python Backend (FastAPI)  :8001
  └── /api/tools/go/*   ──►  Go Backend (future)       :8002
```

- **Frontend** — Next.js with shadcn/ui, dark mode, sidebar navigation, Recharts for data visualization
- **Python Backend** — FastAPI service for VEX file conversion
- **Proxy** — Frontend proxies API calls via Next.js rewrites (no CORS issues)

## Tools

### VEX to Confluence Converter

Converts CycloneDX VEX files (exported from Dependency-Track) into Confluence wiki markup reports.

Features:
- Drag-and-drop file upload
- Severity distribution pie chart and analysis state bar chart
- Generated Confluence wiki markup with executive summary, vulnerability tables, component breakdown
- Live preview approximating Confluence rendering
- Copy-to-clipboard

Generated report sections:
1. Header with project metadata
2. Table of Contents
3. Executive Summary panel with key metrics
4. Severity distribution bar chart
5. Analysis state breakdown
6. Unreviewed vulnerabilities warning
7. Critical & High severity detailed table
8. All vulnerabilities (expandable)
9. Component summary
10. Appendix with document metadata

## Quick Start

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Python Backend

```bash
cd backends/python
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Project Structure

```
usefuldog-extra/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── tools/vex-converter/page.tsx
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── vex-converter/
│   │   │   │   ├── upload-zone.tsx
│   │   │   │   ├── results-view.tsx
│   │   │   │   ├── charts.tsx
│   │   │   │   ├── confluence-preview.tsx
│   │   │   │   └── vulnerability-summary.tsx
│   │   │   └── common/copy-button.tsx
│   │   └── lib/
│   │       ├── utils.ts
│   │       └── api.ts
├── backends/
│   └── python/
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── main.py
│       ├── converters/vex_to_confluence.py
│       └── models/vex.py
└── test-fixtures/sample-vex.json
```
