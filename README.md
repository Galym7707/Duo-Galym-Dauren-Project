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
- `docs/source/Победный проект для Kazakhstan Startup Challenge.docx`: исходный документ
