# Duo Galym Dauren Project

MVP-платформа для нефтегаза Казахстана, позиционируемая как MRV-инструмент:

- Measurement: обнаружение CH4-анomalий и flare events по спутниковым данным
- Reporting: формирование incident cards и MRV-отчетов
- Verification: перевод аномалии в задачу на проверку и статус устранения

Главный demo loop:

1. Загрузка данных
2. Нормализация
3. Аномалия
4. Incident card
5. Задача
6. MRV-отчет

## Позиционирование

Это не "еще один dashboard" и не "магический AI".

Продукт подается как:

- MRV-инструмент для methane & flaring visibility
- Screening and operational prioritization layer
- Pre-LDAR intelligence layer
- ESG / compliance / operations bridge

## Почему это сильная ставка для Kazakhstan Startup Challenge 2026

- Попадает в экологическую, ESG и энергоэффективную повестку нефтегаза Казахстана
- Использует открытые данные, поэтому MVP можно показать без доступа к данным оператора
- Отличается от типичных конкурсных решений тем, что показывает workflow, а не только карту или чат
- Хорошо звучит для жюри PetroDigital: риск, регуляторика, контроль, доказуемость, операционная реакция

## MVP до 3 апреля

- Карта с выбранной территорией и слоями CH4 / flare events
- Индекс аномалии по CH4
- Карточка инцидента
- Создание задачи на проверку
- Экспорт краткого MRV-отчета

## Полировка к 9 апреля

- Улучшение narrative для сценического pitch
- Чище UI и понятнее demo flow
- Сильнее экономика: tCO2e, KZT, время реакции, regulatory exposure
- Более уверенный Q&A по ограничениям и pilot scope

## Источники данных

- Sentinel-5P / TROPOMI для CH4
- VIIRS Nightfire для flare detection
- Перевод CH4 в CO2e с использованием актуальных GWP-коэффициентов

## Базовый стек

- Frontend: Next.js, TypeScript, Tailwind, MapLibre, Recharts
- Backend: FastAPI, Python, Pydantic, SQLAlchemy, GeoPandas, Shapely
- Database: PostgreSQL + PostGIS
- Background jobs: APScheduler или Celery
- Storage: Supabase Storage или S3-compatible

## Документы в репозитории

- `docs/project-brief.md`: рабочая рамка для MVP, demo и pitch
- `docs/contest-research.md`: конспект конкурсного исследования из исходного документа
- `docs/demo-script.md`: 90-second screencast path, exact click order, and safe fallback narration
- `docs/pitch-qna-pack.md`: short opening, why-now framing, and ready answers for jury Q&A
- `docs/final-submission-pack.md`: final preflight, fallback, and must-show checklist for April 3, 2026 and April 9, 2026
- `docs/source/Победный проект для Kazakhstan Startup Challenge.docx`: исходный документ

## Текущая структура MVP

- `apps/web`: Next.js demo surface для anomaly -> incident -> task -> report
- `apps/api`: FastAPI backend scaffold с typed MRV endpoints и seeded demo state

## Быстрый старт

Frontend:

```bash
npm install
npm run dev --workspace=@duo/web
```

Optional environment for live API wiring:

```bash
set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Backend:

```bash
cd apps/api
pip install "fastapi[standard]"
fastapi dev app/main.py
```

Earth Engine project for live CH4 sync:

```bash
set EARTH_ENGINE_PROJECT=gen-lang-client-0372752376
```

Live backend runbook:

- `docs/backend-live-sync.md`

## Что уже реализовано

- demo-safe anomaly queue
- incident workspace с задачами верификации
- MRV report preview
- FastAPI API contract под дальнейшую интеграцию реальных данных
- frontend tries the FastAPI contract first and falls back to seeded state if the API is unavailable
- pipeline status and manual Earth Engine sync scaffold for CH4 screening
- MRV audit feed exposed as first-class API resources for global and incident-specific evidence views
- audit events now carry source, actor, entity, and metadata so the timeline reads like evidence, not just UI copy
- frontend now supports a stage-safe `Run GEE sync -> Return to seeded mode` loop with visible live screening markers in the signal queue

## Что дальше по приоритету

1. Подключить frontend к backend API вместо локального seeded state
2. Добавить ingest-normalize pipeline для Sentinel-5P и VIIRS Nightfire
3. Перейти с in-memory store на Postgres/PostGIS
