# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A local web tool suite for security and DevOps utilities. Currently implements a VEX-to-Confluence converter that transforms CycloneDX VEX JSON documents (from Dependency-Track) into rich Confluence wiki markup reports.

## Architecture

Frontend (Next.js, port 3000) proxies API calls to backend services via Next.js rewrites configured in `frontend/next.config.ts`. The proxy maps `/api/tools/vex/*` to the Python backend at port 8001. This avoids CORS issues and keeps the frontend as the single entry point.

- **Frontend:** Next.js 16 + React 19 + shadcn/ui + Tailwind 4 + Recharts
- **Python Backend:** FastAPI + Pydantic for VEX file conversion
- **Deployment:** Docker Compose with multi-stage builds

The `PYTHON_BACKEND_URL` env var controls the backend URL (defaults to `http://python-backend:8001` for Docker).

## Common Commands

### Full stack (Docker)
```bash
docker compose up --build        # Build and run everything on localhost:3000
```

### Frontend development
```bash
cd frontend
npm install
npm run dev                      # Dev server on port 3000
npm run build                    # Production build
npm run lint                     # ESLint
```

### Python backend development
```bash
cd backends/python
uv run --with-requirements requirements.txt uvicorn main:app --host 0.0.0.0 --port 8001 --reload
# Или для одноразовых проверок:
uv run --with-requirements requirements.txt python -c "from main import app; print('OK')"
# Запуск тестов:
uv run --with-requirements requirements.txt pytest -v
```

> **Note:** Используем `uv` вместо pip/venv. Не нужно создавать виртуальное окружение — `uv run` управляет зависимостями автоматически.

## Key Data Flow

1. User uploads a CycloneDX VEX JSON file via drag-and-drop (`upload-zone.tsx`)
2. Frontend calls `uploadVexFile()` from `lib/api.ts` which POSTs to `/api/tools/vex/convert/vex`
3. Next.js rewrites proxy the request to the Python backend's `POST /api/convert/vex`
4. Backend parses the file with Pydantic models (`models/vex.py`), runs conversion (`converters/vex_to_confluence.py`)
5. Response includes: Confluence wiki markup, aggregated stats, and vulnerability info list
6. Frontend renders results: summary cards, severity pie chart, state bar chart, Confluence preview, raw markup

## Backend API

- `POST /api/convert/vex` — Accepts multipart file upload of VEX JSON, returns `ConvertResponse` (markup + stats + vulnerabilities)
- `GET /health` — Health check

## Frontend Component Organization

- `src/app/` — Next.js App Router pages (dashboard at `/`, VEX converter at `/tools/vex-converter`)
- `src/components/ui/` — shadcn/ui primitives (do not edit manually; managed by `shadcn` CLI)
- `src/components/vex-converter/` — VEX tool-specific components (upload, results, charts, Confluence preview)
- `src/lib/api.ts` — API client functions with TypeScript types matching backend response models
- `confluence-preview.tsx` — Client-side renderer that converts Confluence wiki markup to HTML (supports status macros, panels, tables, expand sections, etc.)

## Процесс разработки

### Полный воркфлоу: задача → релиз

#### 1. Задача

Каждая задача (фича, баг, chore) — GitHub Issue с лейблом и привязкой к milestone.

Лейблы: `feature`, `fix`, `chore`, `docs`.

```bash
gh issue create --title "..." --label feature --milestone v0.2.0
```

#### 2. Ветка

Создаётся от `development`. Имя ветки содержит номер issue:

```bash
git checkout development && git pull
git checkout -b feature/42-vex-export    # или fix/43-upload-crash
```

При параллельной работе нескольких агентов — `git worktree` для изолированных рабочих директорий:

```bash
git worktree add ../usefuldog-extra-42 feature/42-vex-export
```

#### 3. Документация → Код → Тесты

При реализации новых фич порядок следующий:
1. **Документация** — описать фичу, поведение, API-контракты, UI-макет в markdown-файле внутри `docs/`
2. **Код** — реализация на основе написанной документации
3. **Тесты** — покрытие тестами на основе описанных в документации сценариев

#### 4. Проверка перед коммитом

Перед каждым коммитом обязательно запустить линтеры и тесты. Если что-то падает — сначала исправить, потом коммитить.

```bash
cd frontend && npm run lint        # ESLint
cd frontend && npm test            # Vitest
cd backends/python && uv run --with-requirements requirements.txt pytest -v
```

#### 5. PR в development

```bash
git push -u origin feature/42-vex-export
gh pr create --base development --title "..." --body "Closes #42"
```

Issue закроется автоматически при мерже PR.

#### 6. Релиз

Когда все issues в milestone закрыты:

1. **Обновить документацию перед тегом:**
   - `CHANGELOG.md` — добавить секцию новой версии (Added / Changed / Fixed / Removed)
   - `README.md` — обновить описание проекта, инструкции, список фич если изменились
   - `CLAUDE.md` — обновить Backend API, Frontend Component Organization, архитектуру если менялась структура
   - `.env.example` — добавить новые переменные окружения если появились

2. **Создать тег и релиз:**
```bash
git checkout development && git pull
git checkout main && git merge development
# обновить документацию (см. выше)
git tag v0.2.0
git push origin main --tags
gh release create v0.2.0 --title "v0.2.0" --notes-from-tag
gh api repos/{owner}/{repo}/milestones/{number} -X PATCH -f state=closed
```

> **Важно:** Документация должна быть актуальной на момент создания тега. Не создавать тег без обновлённых CHANGELOG.md и README.md.

### Ветки

- `main` — стабильный релиз, мержится из `development` при выпуске версии
- `development` — основная ветка разработки, все PR идут сюда
- `feature/*`, `fix/*` — рабочие ветки от `development`

### Локализация

Язык интерфейса по умолчанию — **русский**. Все тексты пользовательского интерфейса (заголовки, подсказки, кнопки, сообщения об ошибках, плейсхолдеры) пишутся на русском языке. Технические термины (CVE, VEX, CVSS, CycloneDX и т.п.) остаются на английском.

Код, комментарии, переменные, имена компонентов и коммиты — на английском.

### Changelog

При создании релизов вести `CHANGELOG.md` в формате [Keep a Changelog](https://keepachangelog.com/). Категории: Added, Changed, Fixed, Removed.

## UI/UX паттерны

Ниже зафиксированы текущие подходы, которых нужно придерживаться для единообразия интерфейса.

### Структура страниц

Каждая страница инструмента следует единому макету:
- Заголовок `h1` (`text-2xl font-bold tracking-tight`) + подзаголовок (`text-muted-foreground`)
- Контент через `space-y-6` для вертикальных отступов
- Обёрнут в `<main className="flex-1 p-6">` через root layout

### Навигация

- Боковая панель (sidebar) от shadcn/ui с логотипом, переключателем темы и навигационными ссылками
- Активный роут подсвечивается через `isActive={pathname === item.url}`
- Новые инструменты добавляются в массив `navItems` в `app-sidebar.tsx` и в массив `tools` на дашборде `page.tsx`

### Карточки инструментов (дашборд)

Grid `md:grid-cols-2 lg:grid-cols-3`. Каждый инструмент — `Card` с hover-эффектом (`hover:bg-accent/50`), иконкой из Lucide, названием и `Badge` со статусом.

### Состояния загрузки и ошибки

- Загрузка: `Skeleton` компоненты, повторяющие форму будущего контента (grid карточек, затем графики, затем результат)
- Ошибки: `Alert variant="destructive"` с иконкой `AlertCircle`, заголовком и описанием
- Во время загрузки зона взаимодействия получает `opacity-50 pointer-events-none`

### Графики

- Recharts внутри `Card` с `CardTitle text-sm font-medium`
- `ResponsiveContainer width="100%" height={250}`
- Severity pie chart: donut (`innerRadius={50} outerRadius={90}`) с подписями и легендой
- Bar chart: скруглённые столбцы (`radius={[4,4,0,0]}`), сетка `strokeDasharray="3 3"`

### Цветовая палитра severity/state

Severity: critical `#dc2626`, high `#f97316`, medium `#eab308`, low `#3b82f6`, info `#38bdf8`, none `#9ca3af`, unknown `#6b7280`

State: resolved `#22c55e`, exploitable `#ef4444`, in_triage `#f59e0b`, false_positive `#94a3b8`, not_affected `#3b82f6`

Эти цвета используются единообразно в графиках (hex) и в Badge-компонентах (Tailwind-классы). При добавлении новых severity/state-значений — расширять оба маппинга.

### Тема

Поддержка system/light/dark через `next-themes`. Шрифты: Geist Sans + Geist Mono.

## Conventions

- Frontend uses `"use client"` directive for interactive components; layout and page files are server components where possible
- Pydantic models in `models/vex.py` mirror the CycloneDX VEX schema structure; TypeScript types in `lib/api.ts` mirror the backend response
- Test fixture at `test-fixtures/sample-vex.json` provides a real-world CycloneDX VEX document for manual testing
- Next.js is configured with `output: "standalone"` for Docker deployment
