# UsefulDog Extra

Локальный набор инструментов для безопасности и DevOps. Работает как веб-приложение на `localhost:3000`.

## Инструменты

### VEX Конвертер
Конвертация CycloneDX VEX JSON документов (из Dependency-Track) в Confluence wiki-разметку. Drag-and-drop загрузка, графики по severity/state, предпросмотр разметки, копирование в буфер.

### SBOM Редактор
Просмотр, редактирование, валидация и объединение CycloneDX SBOM. Визуальный редактор компонентов, поддержка ГОСТ-полей, проверка доступности VCS-репозиториев, мгновенное автосохранение, файловый менеджер проектов.

## Архитектура

```
Frontend (Next.js + shadcn/ui)     :3000
  ├── /api/tools/vex/*  ──►  Python Backend (FastAPI)  :8001
  └── /api/tools/sbom/* ──►  Python Backend (FastAPI)  :8001
  └── /api/projects/*   ──►  Python Backend (FastAPI)  :8001
```

- **Frontend** — Next.js 16, React 19, shadcn/ui, Tailwind 4, Recharts
- **Backend** — Python, FastAPI, Pydantic
- **Proxy** — Frontend проксирует API через Next.js rewrites
- **Инфраструктура** — Docker Compose, uv

## Быстрый старт

### Docker (рекомендуется)

```bash
docker compose up --build
```

Приложение на [http://localhost:3000](http://localhost:3000).

### Локальная разработка

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (в отдельном терминале)
cd backends/python
uv run --with-requirements requirements.txt uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `PYTHON_BACKEND_URL` | URL бэкенда для фронтенда (Docker) | `http://python-backend:8001` |
| `DATA_DIR` | Директория хранения проектов | `/data` |
| `CORS_ORIGINS` | Разрешённые CORS origins (через запятую) | `http://localhost:3000` |

См. [`.env.example`](.env.example).

## Тестирование

```bash
# Frontend (Vitest + Testing Library)
cd frontend && npm test

# Backend (pytest)
cd backends/python
uv run --with-requirements requirements.txt pytest -v
```

## Структура проекта

```
├── frontend/                  # Next.js приложение
│   ├── src/app/               # Страницы (App Router)
│   ├── src/components/        # React компоненты
│   │   ├── ui/                # shadcn/ui примитивы
│   │   ├── vex-converter/     # VEX конвертер
│   │   └── sbom-editor/       # SBOM редактор
│   ├── src/hooks/             # Кастомные React хуки
│   ├── src/lib/               # API клиенты, утилиты, типы
│   └── src/__tests__/         # Фронтенд тесты
├── backends/python/           # FastAPI бэкенд
│   ├── converters/            # Логика конвертации
│   ├── models/                # Pydantic модели
│   ├── storage/               # Файловое хранилище проектов
│   └── tests/                 # Бэкенд тесты
├── docker-compose.yml
├── .env.example
└── CHANGELOG.md
```

## API

### VEX
- `POST /api/convert/vex` — Конвертация VEX JSON в Confluence разметку

### SBOM
- `POST /api/sbom/validate` — Валидация SBOM (файл)
- `POST /api/sbom/validate/json` — Валидация SBOM (JSON body)
- `POST /api/sbom/unify` — Объединение нескольких SBOM

### Проекты
- `GET /api/projects` — Список проектов
- `POST /api/projects` — Создание проекта
- `GET /api/projects/{id}` — Детали проекта
- `DELETE /api/projects/{id}` — Удаление проекта
- `POST /api/projects/{id}/sboms` — Загрузка SBOM
- `GET /api/projects/{id}/sboms/{sbom_id}` — Получение SBOM
- `PUT /api/projects/{id}/sboms/{sbom_id}` — Обновление SBOM
- `DELETE /api/projects/{id}/sboms/{sbom_id}` — Удаление SBOM

### Служебные
- `GET /health` — Healthcheck
