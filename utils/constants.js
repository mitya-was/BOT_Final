/**
 * Константи для Telegram бота
 */

const MESSAGES = {
    // Вітальні повідомлення
    WELCOME: `🤖 Вітаю! Я бот для управління договорами.

Що я вмію:
📋 Показувати список договорів
💰 Генерувати рахунки
📄 Створювати акти виконаних робіт
📊 Надавати статистику
➕ Допомагати з новими договорами
🔍 Швидкий пошук та фільтрація
📤 Експорт даних

Оберіть дію з меню або використовуйте швидкі команди:
• /list - список договорів
• /stats - статистика
• /search <текст> - пошук
• /help - допомога`,

    // Помилки
    ERROR_GENERIC: '❌ Виникла помилка. Спробуйте пізніше.',
    ERROR_API_TIMEOUT: '⏱️ Операція триває довше звичайного. Спробуйте пізніше.',
    ERROR_API_UNAVAILABLE: '🔌 Сервіс тимчасово недоступний. Спробуйте за кілька хвилин.',
    ERROR_NO_PERMISSION: '🚫 У вас немає прав для цієї операції.',
    ERROR_INVALID_FORMAT: '⚠️ Неправильний формат. Перевірте введені дані.',

    // Інформаційні
    NO_CONTRACTS: '📋 Немає договорів за вашим запитом.',
    NO_ACTIVE_CONTRACTS: '📋 Немає активних договорів.',
    LOADING: '⏳ Завантажую...',
    PROCESSING: '🔄 Обробляю запит...',
    
    // Успішні операції
    SUCCESS_GENERATED: '✅ Документ успішно створено!',
    SUCCESS_UPDATED: '✅ Дані оновлено!',
    SUCCESS_EXPORTED: '✅ Дані експортовано!',

    // Підтвердження
    CONFIRM_DELETE: '⚠️ Ви впевнені, що хочете видалити цей договір?',
    CONFIRM_REGENERATE: '🔄 Перегенерувати всі документи для договору?',
    CONFIRM_BULK_ACTION: '📦 Застосувати дію до всіх вибраних договорів?',

    // Допомога
    HELP: `🆘 **Довідка по командах:**

**Основні команди:**
• /start - головне меню
• /list [фільтр] - список договорів
• /stats - статистика
• /search <текст> - пошук договорів
• /export [формат] - експорт даних

**Фільтри для /list:**
• \`/list активні\` - тільки активні договори
• \`/list >50000\` - сума більше 50,000
• \`/list грудень\` - договори за грудень
• \`/list ТОВ\` - клієнти з "ТОВ" в назві

**Формати експорту:**
• \`/export excel\` - Excel файл
• \`/export pdf\` - PDF звіт
• \`/export json\` - JSON дані

**Швидкі дії:**
• \`/regen W-25-01\` - перегенерувати договір
• \`/invoice W-25-01\` - створити рахунок
• \`/act W-25-01\` - створити акт`,

    // Статистика
    STATS_HEADER: '📊 **Статистика договорів**',
    STATS_NO_DATA: '📊 Немає даних для статистики.',

    // Пошук
    SEARCH_PROMPT: '🔍 Введіть запит для пошуку (номер, клієнт, сума):',
    SEARCH_NO_RESULTS: '🔍 За вашим запитом нічого не знайдено.',
    SEARCH_TOO_MANY: '🔍 Знайдено забагато результатів. Уточніть запит.',

    // Експорт
    EXPORT_PROCESSING: '📤 Готую експорт даних...',
    EXPORT_READY: '📤 Файл готовий до завантаження:',
    EXPORT_FAILED: '❌ Помилка при експорті даних.',

    // Редагування
    EDIT_PROMPT: `✏️ **Редагування договору**

Надішліть зміни у форматі: \`поле=значення; поле2=значення2\`

**Доступні поля:**
• \`amount=120000\` - сума
• \`description=Новий опис\` - опис послуг
• \`client=Нова назва\` - назва клієнта
• \`performer=Інший виконавець\` - виконавець

**Приклад:**
\`amount=75000; description=Розробка сайту та мобільного додатку\``,

    EDIT_SUCCESS: '✅ **Договір оновлено!**\n\nОновлені документи:',
    EDIT_CANCELLED: '❌ Редагування скасовано.',

    // Нові договори
    NEW_CONTRACT_FORM: `➕ **Створення нового договору**

Для створення нового договору заповніть форму в Google Forms.

📋 **Поля форми:**
• Клієнт (назва організації)
• Вид діяльності  
• Директор/Керівник
• ЄДРПОУ замовника
• Опис робіт/послуг
• Вартість (в гривнях)
• Виконавець

Після заповнення форми договір буде автоматично створений і ви отримаєте сповіщення в цьому чаті.`,

    // Налаштування
    SETTINGS_HEADER: `⚙️ **Налаштування системи**

🔧 **Поточні налаштування:**
• Автосповіщення: ✅ Увімкнено
• Формат номера: W-(YY)-XX
• Папка Drive: Налаштовано
• Мова інтерфейсу: Українська

📝 **Доступні дії:**`
};

const LIMITS = {
    // Пагінація
    CONTRACTS_PER_PAGE: 10,
    MAX_SEARCH_RESULTS: 20,
    MAX_EXPORT_RECORDS: 1000,
    
    // API
    API_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
    
    // Інтерфейс
    MAX_INLINE_BUTTONS: 8,
    MAX_MESSAGE_LENGTH: 4000,
    
    // Пошук
    MIN_SEARCH_LENGTH: 2,
    MAX_SEARCH_LENGTH: 50
};

const EMOJI = {
    // Статуси
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    PROCESSING: '🔄',
    
    // Документи
    CONTRACT: '📋',
    INVOICE: '💰',
    ACT: '📄',
    FOLDER: '📁',
    EXPORT: '📤',
    
    // Дії
    SEARCH: '🔍',
    EDIT: '✏️',
    DELETE: '🗑️',
    REGENERATE: '🔁',
    NEW: '➕',
    BACK: '🔙',
    
    // Навігація
    PREV: '⬅️',
    NEXT: '➡️',
    FIRST: '⏪',
    LAST: '⏩',
    
    // Статистика
    STATS: '📊',
    TREND_UP: '📈',
    TREND_DOWN: '📉',
    CALENDAR: '📅',
    MONEY: '💰',
    
    // Налаштування
    SETTINGS: '⚙️',
    NOTIFICATIONS: '🔔',
    HELP: '🆘'
};

const BUTTON_TEXTS = {
    // Основне меню
    LIST_CONTRACTS: '📋 Список договорів',
    NEW_CONTRACT: '➕ Новий договір',
    GENERATE_INVOICE: '💰 Згенерувати рахунок',
    GENERATE_ACT: '📄 Згенерувати акт',
    REGENERATE: '🔁 Перегенерувати',
    EDIT_CONTRACT: '✏️ Редагувати договір',
    STATISTICS: '📊 Статистика',
    SETTINGS: '⚙️ Налаштування',
    
    // Навігація
    BACK_TO_MENU: '🔙 Назад до меню',
    PREVIOUS_PAGE: '⬅️ Попередня',
    NEXT_PAGE: 'Наступна ➡️',
    
    // Дії з договорами
    VIEW_DETAILS: '👁️ Деталі',
    CREATE_INVOICE: '💰 Рахунок',
    CREATE_ACT: '📄 Акт',
    REGENERATE_ALL: '🔄 Перегенерувати',
    EDIT: '✏️ Редагувати',
    
    // Пошук та фільтри
    SEARCH_ALL: '🔍 Пошук',
    FILTER_ACTIVE: '✅ Активні',
    FILTER_COMPLETED: '✔️ Завершені',
    FILTER_THIS_MONTH: '📅 Цей місяць',
    CLEAR_FILTERS: '🗑️ Очистити фільтри',
    
    // Експорт
    EXPORT_EXCEL: '📊 Excel',
    EXPORT_PDF: '📄 PDF',
    EXPORT_JSON: '💾 JSON',
    
    // Підтвердження
    CONFIRM_YES: '✅ Так',
    CONFIRM_NO: '❌ Ні',
    CONFIRM_CANCEL: '🚫 Скасувати'
};

const REGEX_PATTERNS = {
    CONTRACT_NUMBER: /^W-\d{2}-\d{2,3}$/,
    AMOUNT: /^\d+(\.\d{2})?$/,
    EDRPOU: /^\d{8,10}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?3?8?\d{10}$/
};

const API_ENDPOINTS = {
    CONTRACTS: 'contracts',
    STATS: 'stats',
    REGENERATE: 'regenerate',
    GENERATE_INVOICE: 'generateInvoice',
    GENERATE_ACT: 'generateAct',
    UPDATE: 'update',
    HEALTH: 'health'
};

module.exports = {
    MESSAGES,
    LIMITS,
    EMOJI,
    BUTTON_TEXTS,
    REGEX_PATTERNS,
    API_ENDPOINTS
};
