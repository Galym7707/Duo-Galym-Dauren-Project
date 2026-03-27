import { type Anomaly, type Incident, type ReportSection } from "./demo-data";

export type StepId = "signal" | "incident" | "verification" | "report";
export type ThemeMode = "day" | "night";
export type Locale = "en" | "ru";
export type NavTarget = StepId | "faq";

export const stepOrder: StepId[] = ["signal", "incident", "verification", "report"];

export const copy = {
  en: {
    brand: "Saryna MRV",
    tagline: "Find the signal. Open the case. Verify it. Export the report.",
    nav: { signal: "Signal", incident: "Incident", verification: "Verify", report: "Report", faq: "FAQ" },
    controls: { language: "Switch language", theme: "Switch theme" },
    hero: {
      title: "A calm MRV workspace for fast decisions.",
      subtitle: "Minimal on the surface. Clear in every step.",
    },
    status: {
      loading: "Loading",
      api: "Live backend",
      fallback: "Demo state",
      apiNote: "The interface is reading the FastAPI backend.",
      fallbackNote: "The backend is unavailable. Local demo data is shown.",
    },
    stats: { signal: "Selected signal", impact: "Potential impact", workflow: "Workflow" },
    queue: {
      eyebrow: "Signals",
      title: "Choose one signal",
      subtitle: "Keep the list short.",
      top: "Top signal",
      live: "live",
    },
    summary: {
      score: "Score",
      region: "Region",
      facility: "Facility",
      confidence: "Confidence",
      detected: "Detected",
      owner: "Owner",
      priority: "Priority",
      window: "Window",
      progress: "Progress",
      generated: "Generated",
      reportSections: "Sections",
      screening: "Screening",
      noReport: "Not generated",
    },
    steps: {
      signal: { eyebrow: "Step 1", title: "Selected signal", subtitle: "Review the strongest facts first." },
      incident: { eyebrow: "Step 2", title: "Incident view", subtitle: "Assign ownership before adding more detail." },
      verification: { eyebrow: "Step 3", title: "Verification tasks", subtitle: "Keep the work visible and small." },
      report: { eyebrow: "Step 4", title: "Report preview", subtitle: "Export the result when the case is ready." },
    },
    panels: {
      map: "Kazakhstan view",
      assets: "Tracked asset",
      noIncident: "No incident yet",
      noIncidentHint: "Promote the signal to unlock the next steps.",
      noReportHint: "Generate the report when verification is ready.",
    },
    actions: {
      openIncident: "Open incident",
      promote: "Promote to incident",
      promoting: "Promoting...",
      openVerification: "Open verification",
      generateReport: "Generate report",
      generating: "Generating...",
      downloadHtml: "Download HTML",
      exporting: "Exporting...",
      printView: "Open print view",
      reviewAnother: "Review another signal",
      completed: "Completed",
      markDone: "Mark done",
      saving: "Saving...",
    },
    footer: {
      line: "Minimal MRV workflow for methane and flare anomaly review.",
      status: "Backend status",
    },
    faq: {
      title: "FAQ",
      intro: "Open a question to see the full answer.",
      items: [
        {
          id: "goal",
          question: "What is the goal of this site?",
          answer: [
            "The goal is to move one methane or flare signal through a clean MRV workflow without overwhelming the user.",
            "Instead of showing many dashboards at once, the site helps the team do four simple things in order: review a signal, create an incident, verify the work, and prepare a report.",
            "This keeps the product easy to understand for operators, ESG teams, and judges.",
          ],
        },
        {
          id: "use",
          question: "How should I use the site?",
          answer: [
            "Start in the Signal step and choose the anomaly that looks strongest.",
            "Promote that signal into an incident so the case gets an owner and a response window.",
            "Move to Verify, mark tasks as complete, and then generate the report in the final step.",
          ],
        },
        {
          id: "data",
          question: "Is the information real or demo data?",
          answer: [
            "The frontend is connected to a real local backend, so the buttons and API routes are live.",
            "The anomaly records themselves are still seeded demo data stored in the current backend service.",
            "So the workflow is real, but the external satellite and weather feeds are not connected yet.",
          ],
        },
        {
          id: "incident",
          question: "What happens when I promote a signal?",
          answer: [
            "The selected anomaly becomes an incident with its own identifier, owner, priority, and verification window.",
            "That changes the story from passive observation to accountable operational work.",
          ],
        },
        {
          id: "report",
          question: "What is inside the report?",
          answer: [
            "The report summarizes what was measured, who owns the case, and how far verification has progressed.",
            "It is meant to be simple enough for fast review and structured enough for ESG and compliance discussions.",
          ],
        },
        {
          id: "settings",
          question: "Can I switch language and theme?",
          answer: [
            "Yes. The globe button switches the site between English and Russian.",
            "The theme button uses sun and moon icons to switch between day and night mode.",
            "The default state is English with day mode.",
          ],
        },
      ],
    },
  },
  ru: {
    brand: "Saryna MRV",
    tagline: "Найди сигнал. Открой кейс. Проверь. Выгрузи отчёт.",
    nav: { signal: "Сигнал", incident: "Инцидент", verification: "Проверка", report: "Отчёт", faq: "FAQ" },
    controls: { language: "Сменить язык", theme: "Сменить тему" },
    hero: {
      title: "Спокойный MRV-интерфейс для быстрых решений.",
      subtitle: "Минимализм снаружи. Ясность на каждом шаге.",
    },
    status: {
      loading: "Загрузка",
      api: "Живой backend",
      fallback: "Демо-режим",
      apiNote: "Интерфейс читает FastAPI backend.",
      fallbackNote: "Backend недоступен. Показаны локальные демо-данные.",
    },
    stats: { signal: "Выбранный сигнал", impact: "Потенциальный эффект", workflow: "Стадия" },
    queue: {
      eyebrow: "Сигналы",
      title: "Выберите один сигнал",
      subtitle: "Список должен быть коротким.",
      top: "Главный сигнал",
      live: "активно",
    },
    summary: {
      score: "Скор",
      region: "Регион",
      facility: "Тип объекта",
      confidence: "Уверенность",
      detected: "Обнаружено",
      owner: "Ответственный",
      priority: "Приоритет",
      window: "Окно",
      progress: "Прогресс",
      generated: "Сформирован",
      reportSections: "Разделы",
      screening: "Скрининг",
      noReport: "Не сформирован",
    },
    steps: {
      signal: { eyebrow: "Шаг 1", title: "Выбранный сигнал", subtitle: "Сначала смотрите на самые сильные факты." },
      incident: { eyebrow: "Шаг 2", title: "Инцидент", subtitle: "Сначала назначьте владельца, потом добавляйте детали." },
      verification: { eyebrow: "Шаг 3", title: "Задачи проверки", subtitle: "Работа должна быть видимой и простой." },
      report: { eyebrow: "Шаг 4", title: "Предпросмотр отчёта", subtitle: "Выгружайте результат, когда кейс готов." },
    },
    panels: {
      map: "Карта Казахстана",
      assets: "Объект",
      noIncident: "Инцидента пока нет",
      noIncidentHint: "Повысьте сигнал до инцидента, чтобы открыть следующие шаги.",
      noReportHint: "Сформируйте отчёт, когда проверка будет готова.",
    },
    actions: {
      openIncident: "Открыть инцидент",
      promote: "Повысить до инцидента",
      promoting: "Создаём...",
      openVerification: "Открыть проверку",
      generateReport: "Сформировать отчёт",
      generating: "Формируем...",
      downloadHtml: "Скачать HTML",
      exporting: "Экспорт...",
      printView: "Версия для печати",
      reviewAnother: "Выбрать другой сигнал",
      completed: "Готово",
      markDone: "Завершить",
      saving: "Сохраняем...",
    },
    footer: {
      line: "Минималистичный MRV-поток для проверки выбросов метана и flare-сигналов.",
      status: "Статус backend",
    },
    faq: {
      title: "FAQ",
      intro: "Нажмите на вопрос, чтобы увидеть полный ответ.",
      items: [
        {
          id: "goal",
          question: "В чём цель этого сайта?",
          answer: [
            "Цель сайта — провести один сигнал по метану или flare через понятный MRV-процесс без перегрузки пользователя.",
            "Вместо множества dashboard-блоков на одном экране продукт помогает сделать четыре простых шага по порядку: посмотреть сигнал, создать инцидент, провести проверку и подготовить отчёт.",
            "Так интерфейс остаётся понятным для операторов, ESG-команд и жюри.",
          ],
        },
        {
          id: "use",
          question: "Как пользоваться сайтом?",
          answer: [
            "Начните с шага Сигнал и выберите аномалию, которая выглядит наиболее сильной.",
            "Переведите её в инцидент, чтобы у кейса появился владелец и окно реакции.",
            "Перейдите в шаг Проверка, отмечайте выполненные задачи и затем формируйте отчёт на последнем шаге.",
          ],
        },
        {
          id: "data",
          question: "Данные настоящие или демонстрационные?",
          answer: [
            "Frontend подключён к настоящему локальному backend, поэтому кнопки и API-маршруты реально работают.",
            "Но сами записи аномалий пока остаются seeded demo-данными внутри текущего backend-сервиса.",
            "То есть workflow уже живой, а внешние спутниковые и погодные API ещё не подключены.",
          ],
        },
        {
          id: "incident",
          question: "Что происходит, когда я повышаю сигнал до инцидента?",
          answer: [
            "Выбранная аномалия превращается в инцидент со своим идентификатором, владельцем, приоритетом и окном верификации.",
            "Это переводит историю из пассивного наблюдения в рабочий процесс с конкретной ответственностью.",
          ],
        },
        {
          id: "report",
          question: "Что находится внутри отчёта?",
          answer: [
            "Отчёт коротко показывает, что было измерено, кто отвечает за кейс и насколько продвинулась проверка.",
            "Он должен быть простым для быстрого чтения и достаточно структурированным для ESG и compliance-команд.",
          ],
        },
        {
          id: "settings",
          question: "Можно ли переключать язык и тему?",
          answer: [
            "Да. Кнопка с глобусом переключает весь сайт между английским и русским языком.",
            "Кнопка темы использует иконки солнца и луны для day и night mode.",
            "По умолчанию сайт открывается на английском языке и в day mode.",
          ],
        },
      ],
    },
  },
} as const;

export const severityTone: Record<Anomaly["severity"], string> = {
  high: "severity-high",
  medium: "severity-medium",
  watch: "severity-watch",
};

export const severityLabel = {
  en: { high: "Escalate", medium: "Verify", watch: "Watch" },
  ru: { high: "Эскалация", medium: "Проверить", watch: "Наблюдать" },
} as const;

export const incidentStatusLabel = {
  en: { triage: "Triage", verification: "Verification", mitigation: "Mitigation" },
  ru: { triage: "Триаж", verification: "Проверка", mitigation: "Смягчение" },
} as const;

const facilityTranslations = {
  "Gathering and compression": { en: "Gathering and compression", ru: "Сбор и компрессия" },
  "Processing and storage": { en: "Processing and storage", ru: "Переработка и хранение" },
  "Terminal and flare line": { en: "Terminal and flare line", ru: "Терминал и flare-линия" },
} as const;

const regionTranslations = {
  "Atyrau Region": { en: "Atyrau Region", ru: "Атырауская область" },
  "Mangystau Region": { en: "Mangystau Region", ru: "Мангистауская область" },
} as const;

const ownerTranslations = {
  "Field integrity desk": { en: "Field integrity desk", ru: "Группа полевой целостности" },
  "Ops coordinator": { en: "Ops coordinator", ru: "Координатор эксплуатации" },
  "Reliability engineer": { en: "Reliability engineer", ru: "Инженер по надежности" },
  "ESG lead": { en: "ESG lead", ru: "Руководитель ESG" },
  "MRV response lead": { en: "MRV response lead", ru: "Руководитель MRV-реагирования" },
  "Remote sensing analyst": { en: "Remote sensing analyst", ru: "Аналитик ДЗЗ" },
  "Area operations coordinator": { en: "Area operations coordinator", ru: "Координатор площадки" },
  "Compliance lead": { en: "Compliance lead", ru: "Руководитель compliance" },
} as const;

const taskTitleTranslations = {
  "Dispatch LDAR walkdown request": { en: "Dispatch LDAR walkdown request", ru: "Отправить запрос на LDAR-обход" },
  "Cross-check flare line maintenance history": { en: "Cross-check flare line maintenance history", ru: "Проверить историю обслуживания flare-линии" },
  "Draft regulator-facing MRV note": { en: "Draft regulator-facing MRV note", ru: "Подготовить MRV-заметку для регулятора" },
  "Validate signal persistence against 12-week baseline": { en: "Validate signal persistence against 12-week baseline", ru: "Проверить устойчивость сигнала по 12-недельной базе" },
  "Assign field verification owner": { en: "Assign field verification owner", ru: "Назначить владельца полевой проверки" },
  "Assign field review owner": { en: "Assign field review owner", ru: "Назначить владельца полевого обзора" },
  "Cross-check recent maintenance activity": { en: "Cross-check recent maintenance activity", ru: "Проверить недавние работы по обслуживанию" },
  "Prepare ESG evidence note": { en: "Prepare ESG evidence note", ru: "Подготовить ESG-пояснение" },
} as const;

export function translateRegion(region: string, locale: Locale) {
  return regionTranslations[region as keyof typeof regionTranslations]?.[locale] ?? region;
}

export function translateFacility(facility: string, locale: Locale) {
  return facilityTranslations[facility as keyof typeof facilityTranslations]?.[locale] ?? facility;
}

export function translateOwner(owner: string, locale: Locale) {
  return ownerTranslations[owner as keyof typeof ownerTranslations]?.[locale] ?? owner;
}

export function translateTaskTitle(title: string, locale: Locale) {
  return taskTitleTranslations[title as keyof typeof taskTitleTranslations]?.[locale] ?? title;
}

export function translateWindow(windowLabel: string, locale: Locale) {
  if (locale === "ru") {
    if (windowLabel === "Next 12 hours") return "Следующие 12 часов";
    if (windowLabel === "Next 24 hours") return "Следующие 24 часа";
    if (windowLabel === "Next 48 hours") return "Следующие 48 часов";
  }

  return windowLabel;
}

export function formatTaskProgress(done: number, total: number, locale: Locale) {
  return locale === "ru" ? `${done} из ${total}` : `${done} of ${total}`;
}

export function formatTimestamp(value: string, locale: Locale) {
  const iso = value.replace(" ", "T");
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function buildLocalizedReportSections(
  anomaly: Anomaly,
  incident: Incident,
  completedTasks: number,
  locale: Locale,
): ReportSection[] {
  if (locale === "ru") {
    return [
      {
        title: "Измерение",
        body: `Спутниковый скрининг выделил ${anomaly.assetName} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${anomaly.methaneDeltaPct}% и ${anomaly.flareHours} flare-часами.`,
      },
      {
        title: "Операционная реакция",
        body: `${translateOwner(incident.owner, locale)} отвечает за кейс с приоритетом ${incident.priority} и окном ${translateWindow(incident.verificationWindow, locale).toLowerCase()}.`,
      },
      {
        title: "Статус проверки",
        body: `Выполнено ${completedTasks} из ${incident.tasks.length} задач. Текущая оценка воздействия составляет ${anomaly.co2eTonnes} tCO2e.`,
      },
    ];
  }

  return [
    {
      title: "Measurement",
      body: `Satellite screening flagged ${anomaly.assetName} in ${translateRegion(anomaly.region, locale)} with ${anomaly.methaneDeltaPct}% methane uplift and ${anomaly.flareHours} flare-observed hours.`,
    },
    {
      title: "Operational response",
      body: `${translateOwner(incident.owner, locale)} owns the case under ${incident.priority} priority with a ${translateWindow(incident.verificationWindow, locale).toLowerCase()} window.`,
    },
    {
      title: "Verification status",
      body: `${completedTasks} of ${incident.tasks.length} tasks are complete. The current estimated impact is ${anomaly.co2eTonnes} tCO2e.`,
    },
  ];
}
