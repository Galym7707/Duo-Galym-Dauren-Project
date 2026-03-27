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
    nav: {
      signal: "Signal",
      incident: "Incident",
      verification: "Verify",
      report: "Report",
      faq: "FAQ",
    },
    controls: { language: "Switch language", theme: "Switch theme" },
    hero: {
      title: "One clear screen for each decision.",
      subtitle: "Less noise, better focus, faster action.",
    },
    status: {
      loading: "Loading",
      api: "Live server",
      fallback: "Demo mode",
      apiNote: "The interface is reading the local FastAPI service.",
      fallbackNote: "The server is unavailable. Local demo data is shown.",
    },
    stats: {
      signal: "Selected signal",
      impact: "Potential impact",
      workflow: "Current step",
    },
    queue: {
      eyebrow: "Signals",
      title: "Choose one signal",
      subtitle: "Keep the list short and focused.",
      top: "Strongest signal",
    },
    summary: {
      score: "Signal score",
      region: "Region",
      facility: "Facility type",
      confidence: "Confidence",
      detected: "Detected",
      owner: "Owner",
      priority: "Priority",
      window: "Response window",
      progress: "Progress",
      generated: "Generated",
      reportSections: "Report sections",
      screening: "Initial review",
      noReport: "Not generated",
      coordinates: "Coordinates",
      recommendation: "Recommended action",
      incident: "Case summary",
      tasks: "Verification tasks",
      mapStage: "Location sketch",
      hoursShort: "h",
    },
    steps: {
      signal: {
        eyebrow: "Step 1",
        title: "Selected signal",
        subtitle: "Review the strongest facts first.",
      },
      incident: {
        eyebrow: "Step 2",
        title: "Incident",
        subtitle: "Assign ownership and confirm what must happen next.",
      },
      verification: {
        eyebrow: "Step 3",
        title: "Verification",
        subtitle: "Track the real work and close the open tasks.",
      },
      report: {
        eyebrow: "Step 4",
        title: "Report preview",
        subtitle: "Export the case when the evidence is ready.",
      },
    },
    panels: {
      map: "Location sketch",
      mapNote: "This is a simple position sketch, not a live satellite map.",
      assets: "Selected asset",
      noIncident: "No incident yet",
      noIncidentHint: "Create an incident to unlock the next steps.",
      noReportHint: "Generate the report when verification is ready.",
      incidentNarrative: "Case explanation",
    },
    actions: {
      openIncident: "Open incident",
      promote: "Create incident",
      promoting: "Creating...",
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
      backToSignal: "Back to signal",
    },
    errors: {
      promote: "Incident creation failed. The screen stayed on local demo data.",
      task: "Task update failed. The screen switched to local demo data.",
      report: "Report generation failed. The local report preview stayed active.",
      export: "Report export failed. The preview is still available.",
      noSignal: "No signal is available.",
    },
    help: {
      signal: "This is the strongest signal selected for the current review.",
      score: "The score is a 0 to 100 priority value. Higher means the signal deserves attention sooner.",
      impact: "This is the estimated climate impact if the signal reflects a real emission event.",
      workflow: "This shows where the case is right now: initial review, verification, or mitigation.",
      detected: "This is the timestamp of the latest observation used for the current signal.",
      confidence: "Confidence shows how stable and repeatable the signal looks across the available observations.",
      map: "The dots show relative locations of demo assets inside a simple layout sketch. This is not a live GIS map.",
      demo: "Demo mode means the workflow is live, but the current anomaly content still comes from seeded demo data.",
    },
    footer: {
      note: "Copyright 2026. All rights reserved.",
    },
    faq: {
      title: "FAQ",
      intro: "Open a question to see the full answer.",
      items: [
        {
          id: "goal",
          question: "What is the goal of this site?",
          answer: [
            "The site helps one team move one methane or flare signal through a clear sequence of actions.",
            "Instead of showing too many dashboards at once, it guides the user through four simple steps: review the signal, create an incident, complete verification tasks, and prepare the report.",
            "The goal is speed, clarity, and accountability.",
          ],
        },
        {
          id: "use",
          question: "How should I use the site?",
          answer: [
            "Start with the signal list and choose the strongest case.",
            "Open or create an incident so the case has an owner and a response window.",
            "Move to verification, complete the tasks, and then generate the report in the final step.",
          ],
        },
        {
          id: "score",
          question: "What does the signal score mean?",
          answer: [
            "The signal score is a 0 to 100 priority value used to sort the list.",
            "A higher score means the signal looks stronger, more persistent, or more urgent than the others on the screen.",
            "It is a ranking aid, not final proof by itself.",
          ],
        },
        {
          id: "impact",
          question: "What does potential impact mean?",
          answer: [
            "Potential impact is the estimated climate effect of the signal, shown in tCO2e.",
            "It helps the team compare signals and decide which one deserves attention first.",
            "It is an estimate, not a field measurement.",
          ],
        },
        {
          id: "confidence",
          question: "What does confidence mean?",
          answer: [
            "Confidence describes how stable the signal looks across the available observations.",
            "Higher confidence usually means the signal repeated over time or matches more than one indicator.",
            "Lower confidence means the case may still need another pass before escalation.",
          ],
        },
        {
          id: "map",
          question: "What do the dots in the map block mean?",
          answer: [
            "The dots are markers inside a simple location sketch.",
            "Right now this is not a live map of Kazakhstan and not a satellite layer.",
            "It is a visual aid that helps compare relative asset positions until a real map layer is connected.",
          ],
        },
        {
          id: "demo",
          question: "Why can demo mode appear?",
          answer: [
            "Demo mode appears when the interface cannot read the local backend.",
            "The workflow still works, but the anomaly content shown on the page comes from local seeded demo data.",
            "That means the buttons and steps are usable, but the source data is not live.",
          ],
        },
        {
          id: "incident-meaning",
          question: "What is an incident?",
          answer: [
            "An incident is the working case created from a signal that needs action.",
            "It gives the signal an owner, a priority, and a time window for verification.",
            "The signal says something may be wrong. The incident says who is responsible for checking it.",
          ],
        },
        {
          id: "report",
          question: "What is inside the report?",
          answer: [
            "The report summarizes the signal, the case owner, completed tasks, and the current verification status.",
            "It is meant to close the loop for internal review and external communication.",
          ],
        },
      ],
    },
  },
  ru: {
    brand: "Saryna MRV",
    tagline: "Найдите сигнал. Откройте кейс. Проверьте. Выгрузите отчёт.",
    nav: {
      signal: "Сигнал",
      incident: "Инцидент",
      verification: "Проверка",
      report: "Отчёт",
      faq: "Вопросы",
    },
    controls: { language: "Сменить язык", theme: "Сменить тему" },
    hero: {
      title: "Один понятный экран для каждого решения.",
      subtitle: "Меньше шума, больше ясности, быстрее действие.",
    },
    status: {
      loading: "Загрузка",
      api: "Рабочий сервер",
      fallback: "Демо-режим",
      apiNote: "Интерфейс получает данные с локального сервера FastAPI.",
      fallbackNote: "Сервер сейчас недоступен. Показаны локальные демонстрационные данные.",
    },
    stats: {
      signal: "Выбранный сигнал",
      impact: "Потенциальный эффект",
      workflow: "Текущий шаг",
    },
    queue: {
      eyebrow: "Сигналы",
      title: "Выберите один сигнал",
      subtitle: "Список должен оставаться коротким и понятным.",
      top: "Самый сильный сигнал",
    },
    summary: {
      score: "Оценка сигнала",
      region: "Регион",
      facility: "Тип объекта",
      confidence: "Уверенность",
      detected: "Обнаружено",
      owner: "Ответственный",
      priority: "Приоритет",
      window: "Срок реакции",
      progress: "Прогресс",
      generated: "Сформирован",
      reportSections: "Разделы отчёта",
      screening: "Первичный разбор",
      noReport: "Ещё не сформирован",
      coordinates: "Координаты",
      recommendation: "Рекомендуемое действие",
      incident: "Кратко о кейсе",
      tasks: "Задачи проверки",
      mapStage: "Схема расположения",
      hoursShort: "ч",
    },
    steps: {
      signal: {
        eyebrow: "Шаг 1",
        title: "Выбранный сигнал",
        subtitle: "Сначала посмотрите на самые сильные факты.",
      },
      incident: {
        eyebrow: "Шаг 2",
        title: "Инцидент",
        subtitle: "Назначьте ответственного и подтвердите, что делать дальше.",
      },
      verification: {
        eyebrow: "Шаг 3",
        title: "Проверка",
        subtitle: "Следите за реальными задачами и закрывайте их по мере выполнения.",
      },
      report: {
        eyebrow: "Шаг 4",
        title: "Предпросмотр отчёта",
        subtitle: "Выгружайте результат, когда доказательства уже собраны.",
      },
    },
    panels: {
      map: "Схема расположения",
      mapNote: "Это условная схема позиций, а не живая спутниковая карта.",
      assets: "Выбранный объект",
      noIncident: "Инцидент ещё не создан",
      noIncidentHint: "Создайте инцидент, чтобы открыть следующие шаги.",
      noReportHint: "Сформируйте отчёт, когда проверка будет готова.",
      incidentNarrative: "Пояснение по кейсу",
    },
    actions: {
      openIncident: "Открыть инцидент",
      promote: "Создать инцидент",
      promoting: "Создаём...",
      openVerification: "Открыть проверку",
      generateReport: "Сформировать отчёт",
      generating: "Формируем...",
      downloadHtml: "Скачать HTML",
      exporting: "Выгружаем...",
      printView: "Версия для печати",
      reviewAnother: "Посмотреть другой сигнал",
      completed: "Готово",
      markDone: "Отметить как выполнено",
      saving: "Сохраняем...",
      backToSignal: "Вернуться к сигналу",
    },
    errors: {
      promote: "Не удалось создать инцидент. На экране остались локальные демонстрационные данные.",
      task: "Не удалось обновить задачу. Экран переключился на локальные демонстрационные данные.",
      report: "Не удалось сформировать отчёт. Локальный предпросмотр остался доступен.",
      export: "Не удалось выгрузить отчёт. Предпросмотр всё ещё доступен.",
      noSignal: "Сигнал сейчас недоступен.",
    },
    help: {
      signal: "Это самый важный сигнал, выбранный для текущего разбора.",
      score: "Оценка сигнала — это приоритет по шкале от 0 до 100. Чем выше число, тем раньше стоит заняться этим случаем.",
      impact: "Потенциальный эффект показывает расчётную климатическую значимость сигнала, если выброс подтвердится.",
      workflow: "Здесь видно, на каком этапе находится кейс: первичный разбор, проверка или устранение.",
      detected: "Это время последнего наблюдения, на котором основан текущий сигнал.",
      confidence: "Уверенность показывает, насколько устойчиво и повторяемо выглядит сигнал по доступным наблюдениям.",
      map: "Точки показывают относительное расположение объектов на условной схеме. Это не живая GIS-карта.",
      demo: "Демо-режим означает, что сам интерфейс работает, но содержание сигналов пока берётся из демонстрационных данных.",
    },
    footer: {
      note: "Copyright 2026. Все права защищены.",
    },
    faq: {
      title: "Частые вопросы",
      intro: "Нажмите на вопрос, чтобы увидеть полный ответ.",
      items: [
        {
          id: "goal",
          question: "В чём цель этого сайта?",
          answer: [
            "Сайт помогает команде провести один сигнал по метану или факельной активности через понятную последовательность действий.",
            "Вместо перегруженного набора дашбордов интерфейс ведёт пользователя по четырём шагам: посмотреть сигнал, создать инцидент, выполнить проверку и подготовить отчёт.",
            "Главная цель — скорость, ясность и понятная ответственность.",
          ],
        },
        {
          id: "use",
          question: "Как пользоваться сайтом?",
          answer: [
            "Начните со списка сигналов и выберите самый сильный случай.",
            "Откройте или создайте инцидент, чтобы у кейса появился ответственный и срок реакции.",
            "Перейдите в шаг проверки, закройте задачи и затем сформируйте отчёт на последнем шаге.",
          ],
        },
        {
          id: "score",
          question: "Что означает оценка сигнала?",
          answer: [
            "Оценка сигнала — это приоритет по шкале от 0 до 100, который помогает отсортировать список.",
            "Чем выше значение, тем сильнее, устойчивее или важнее выглядит сигнал по сравнению с другими на экране.",
            "Это инструмент ранжирования, а не окончательное доказательство сам по себе.",
          ],
        },
        {
          id: "impact",
          question: "Что означает потенциальный эффект?",
          answer: [
            "Потенциальный эффект — это расчётная климатическая значимость сигнала в tCO2e.",
            "Он помогает сравнить случаи между собой и понять, чем стоит заняться в первую очередь.",
            "Это оценка, а не полевое измерение.",
          ],
        },
        {
          id: "confidence",
          question: "Что означает уверенность?",
          answer: [
            "Уверенность показывает, насколько стабильно сигнал выглядит по доступным наблюдениям.",
            "Высокая уверенность обычно означает, что сигнал повторялся или подтверждался несколькими признаками.",
            "Более низкая уверенность означает, что случаю может понадобиться ещё одно наблюдение перед эскалацией.",
          ],
        },
        {
          id: "map",
          question: "Что означают точки на схеме?",
          answer: [
            "Точки — это маркеры объектов внутри простой схемы расположения.",
            "Сейчас это не живая карта Казахстана и не спутниковый слой.",
            "Схема нужна как временная визуальная подсказка, пока не подключён настоящий картографический слой.",
          ],
        },
        {
          id: "demo",
          question: "Почему может появляться демо-режим?",
          answer: [
            "Демо-режим появляется, когда интерфейс не может получить данные с локального сервера.",
            "Сами шаги и кнопки продолжают работать, но содержание сигналов берётся из локальных демонстрационных данных.",
            "Это значит, что сценарий использования живой, а источник данных пока не боевой.",
          ],
        },
        {
          id: "incident-meaning",
          question: "Что такое инцидент?",
          answer: [
            "Инцидент — это рабочий кейс, который создаётся из сигнала, если по нему уже нужно действие.",
            "Он даёт сигналу ответственного, приоритет и срок для проверки.",
            "Проще говоря, сигнал говорит, что может быть проблема, а инцидент показывает, кто теперь отвечает за разбор.",
          ],
        },
        {
          id: "report",
          question: "Что входит в отчёт?",
          answer: [
            "Отчёт коротко собирает сам сигнал, ответственного по кейсу, выполненные задачи и текущий статус проверки.",
            "Он нужен, чтобы замкнуть процесс для внутреннего разбора и внешней коммуникации.",
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
  en: { high: "Urgent", medium: "Check", watch: "Watch" },
  ru: { high: "Срочно", medium: "Проверить", watch: "Наблюдать" },
} as const;

export const incidentStatusLabel = {
  en: { triage: "Review", verification: "Verification", mitigation: "Mitigation" },
  ru: { triage: "Разбор", verification: "Проверка", mitigation: "Устранение" },
} as const;

const facilityTranslations = {
  "Gathering and compression": { en: "Gathering and compression", ru: "Сбор и компрессия" },
  "Processing and storage": { en: "Processing and storage", ru: "Переработка и хранение" },
  "Terminal and flare line": { en: "Terminal and flare line", ru: "Терминал и факельная линия" },
} as const;

const regionTranslations = {
  "Atyrau Region": { en: "Atyrau Region", ru: "Атырауская область" },
  "Mangystau Region": { en: "Mangystau Region", ru: "Мангистауская область" },
} as const;

const assetTranslations = {
  "Tengiz satellite cluster": { en: "Tengiz satellite cluster", ru: "Тенгизский спутниковый кластер" },
  "Karabatan processing block": { en: "Karabatan processing block", ru: "Карабатанский перерабатывающий блок" },
  "Mangystau export hub": { en: "Mangystau export hub", ru: "Мангистауский экспортный узел" },
} as const;

const confidenceTranslations = {
  "High confidence / persistent over 8 days": {
    en: "High confidence / persistent over 8 days",
    ru: "Высокая уверенность / сигнал держится 8 дней",
  },
  "High confidence / persistent over 8 days / live GEE sync verified": {
    en: "High confidence / persistent over 8 days / live GEE sync verified",
    ru: "Высокая уверенность / сигнал держится 8 дней / синхронизация GEE подтверждена",
  },
  "Medium confidence / single-week deviation": {
    en: "Medium confidence / single-week deviation",
    ru: "Средняя уверенность / отклонение замечено за одну неделю",
  },
  "Watchlist / flare-led signal": {
    en: "Watchlist / flare-led signal",
    ru: "Наблюдение / сигнал в основном связан с факельной активностью",
  },
} as const;

const ownerTranslations = {
  "Field integrity desk": { en: "Field integrity desk", ru: "Группа полевой целостности" },
  "Ops coordinator": { en: "Ops coordinator", ru: "Координатор эксплуатации" },
  "Reliability engineer": { en: "Reliability engineer", ru: "Инженер по надёжности" },
  "ESG lead": { en: "ESG lead", ru: "Руководитель ESG" },
  "Response lead": { en: "Response lead", ru: "Ответственный за реагирование" },
  "Remote sensing analyst": { en: "Remote sensing analyst", ru: "Аналитик дистанционного зондирования" },
  "Area operations coordinator": {
    en: "Area operations coordinator",
    ru: "Координатор площадки",
  },
  "Compliance lead": { en: "Compliance lead", ru: "Руководитель по соответствию" },
} as const;

const taskTitleTranslations = {
  "Dispatch LDAR walkdown request": {
    en: "Dispatch LDAR walkdown request",
    ru: "Отправить запрос на LDAR-обход",
  },
  "Cross-check flare line maintenance history": {
    en: "Cross-check flare line maintenance history",
    ru: "Проверить историю обслуживания факельной линии",
  },
  "Draft note for regulator": {
    en: "Draft note for regulator",
    ru: "Подготовить заметку для регулятора",
  },
  "Validate signal persistence against 12-week baseline": {
    en: "Validate signal persistence against 12-week baseline",
    ru: "Проверить устойчивость сигнала по базовому периоду в 12 недель",
  },
  "Assign field verification owner": {
    en: "Assign field verification owner",
    ru: "Назначить ответственного за выездную проверку",
  },
  "Assign field review owner": {
    en: "Assign field review owner",
    ru: "Назначить ответственного за полевой осмотр",
  },
  "Cross-check recent maintenance activity": {
    en: "Cross-check recent maintenance activity",
    ru: "Проверить недавние работы по обслуживанию",
  },
  "Prepare ESG evidence note": {
    en: "Prepare ESG evidence note",
    ru: "Подготовить пояснение по ESG",
  },
} as const;

const incidentTitleTranslations = {
  "Persistent methane uplift near compression corridor": {
    en: "Persistent methane uplift near compression corridor",
    ru: "Устойчивый рост метана у компрессорного коридора",
  },
} as const;

const incidentNarrativeTranslations = {
  "Current workflow assumes a screening layer: we are not claiming pinpoint source identification, only a clear operational priority for field verification.": {
    en: "Current workflow assumes a screening layer: we are not claiming pinpoint source identification, only a clear operational priority for field verification.",
    ru: "Текущий процесс пока работает на уровне предварительного отбора: он не утверждает точный источник, а лишь показывает понятный приоритет для выездной проверки.",
  },
  "Fallback incident created in the frontend so the flow remains usable when the API is unavailable.": {
    en: "Fallback incident created in the frontend so the flow remains usable when the API is unavailable.",
    ru: "Резервный инцидент создан на стороне интерфейса, чтобы сценарий оставался рабочим, даже когда API недоступен.",
  },
} as const;

const anomalySummaryTranslations = {
  "Elevated methane column overlaps recurring Nightfire activity close to a compression corridor.": {
    en: "Elevated methane column overlaps recurring Nightfire activity close to a compression corridor.",
    ru: "Повышенная концентрация метана совпадает с повторяющейся Nightfire-активностью рядом с компрессорным коридором.",
  },
  "Methane anomaly is above 12-week median, but flare persistence is less stable than the leading incident.": {
    en: "Methane anomaly is above 12-week median, but flare persistence is less stable than the leading incident.",
    ru: "Аномалия по метану выше медианы за 12 недель, но факельная активность выглядит менее устойчивой, чем у главного случая.",
  },
  "Nightfire signal is strong, methane spread remains low. Good candidate for trend monitoring rather than emergency dispatch.": {
    en: "Nightfire signal is strong, methane spread remains low. Good candidate for trend monitoring rather than emergency dispatch.",
    ru: "Nightfire-сигнал сильный, но распространение метана остаётся низким. Этот случай больше подходит для наблюдения за динамикой, чем для срочного выезда.",
  },
} as const;

const recommendedActionTranslations = {
  "Escalate to field integrity desk and request same-day verification route.": {
    en: "Escalate to field integrity desk and request same-day verification route.",
    ru: "Передать случай группе полевой целостности и запросить выездную проверку в тот же день.",
  },
  "Create watchlist incident only if another pass confirms persistence in the next 24 hours.": {
    en: "Create watchlist incident only if another pass confirms persistence in the next 24 hours.",
    ru: "Создавать инцидент наблюдения только в том случае, если следующий проход подтвердит устойчивость сигнала в ближайшие 24 часа.",
  },
  "Keep visible in weekly MRV review and compare against operator maintenance schedule.": {
    en: "Keep visible in weekly MRV review and compare against operator maintenance schedule.",
    ru: "Оставить случай в еженедельном разборе и сопоставить его с графиком обслуживания оператора.",
  },
} as const;

function translateWithMap<T extends string>(
  value: string,
  locale: Locale,
  dictionary: Record<T, { en: string; ru: string }>,
) {
  return dictionary[value as T]?.[locale] ?? value;
}

export function translateRegion(region: string, locale: Locale) {
  return translateWithMap(region, locale, regionTranslations);
}

export function translateFacility(facility: string, locale: Locale) {
  return translateWithMap(facility, locale, facilityTranslations);
}

export function translateAssetName(assetName: string, locale: Locale) {
  return translateWithMap(assetName, locale, assetTranslations);
}

export function translateConfidence(confidence: string, locale: Locale) {
  return translateWithMap(confidence, locale, confidenceTranslations);
}

export function translateOwner(owner: string, locale: Locale) {
  return translateWithMap(owner, locale, ownerTranslations);
}

export function translateTaskTitle(title: string, locale: Locale) {
  return translateWithMap(title, locale, taskTitleTranslations);
}

export function translateIncidentTitle(title: string, locale: Locale) {
  return translateWithMap(title, locale, incidentTitleTranslations);
}

export function translateIncidentNarrative(narrative: string, locale: Locale) {
  return translateWithMap(narrative, locale, incidentNarrativeTranslations);
}

export function translateAnomalySummary(summary: string, locale: Locale) {
  return translateWithMap(summary, locale, anomalySummaryTranslations);
}

export function translateRecommendedAction(action: string, locale: Locale) {
  return translateWithMap(action, locale, recommendedActionTranslations);
}

export function translateWindow(windowLabel: string, locale: Locale) {
  if (locale === "ru") {
    if (windowLabel === "Next 12 hours") return "В ближайшие 12 часов";
    if (windowLabel === "Next 24 hours") return "В ближайшие 24 часа";
    if (windowLabel === "Next 48 hours") return "В ближайшие 48 часов";
  }

  return windowLabel;
}

export function formatTaskProgress(done: number, total: number, locale: Locale) {
  return locale === "ru" ? `${done} из ${total}` : `${done} of ${total}`;
}

export function formatHours(hours: number, locale: Locale) {
  return locale === "ru" ? `${hours} ч` : `${hours}h`;
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
        title: "Что увидели",
        body: `Спутниковый разбор отметил объект ${translateAssetName(anomaly.assetName, locale)} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${anomaly.methaneDeltaPct}% и ${anomaly.flareHours} часами факельной активности.`,
      },
      {
        title: "Кто отвечает",
        body: `${translateOwner(incident.owner, locale)} ведёт этот кейс с приоритетом ${incident.priority} и сроком реакции ${translateWindow(incident.verificationWindow, locale).toLowerCase()}.`,
      },
      {
        title: "Как продвигается проверка",
        body: `Выполнено ${completedTasks} из ${incident.tasks.length} задач. Текущая оценка возможного эффекта составляет ${anomaly.co2eTonnes} tCO2e.`,
      },
    ];
  }

  return [
    {
      title: "What was observed",
      body: `Satellite review flagged ${translateAssetName(anomaly.assetName, locale)} in ${translateRegion(anomaly.region, locale)} with ${anomaly.methaneDeltaPct}% methane uplift and ${anomaly.flareHours} hours of flare activity.`,
    },
    {
      title: "Who owns the case",
      body: `${translateOwner(incident.owner, locale)} owns this case under ${incident.priority} priority with a ${translateWindow(incident.verificationWindow, locale).toLowerCase()} response window.`,
    },
    {
      title: "How verification is progressing",
      body: `${completedTasks} of ${incident.tasks.length} tasks are complete. The current estimated impact is ${anomaly.co2eTonnes} tCO2e.`,
    },
  ];
}
