/**
 * Конфігурація проекту (уніфікована для всіх файлів GAS)
 */

const CONFIG = {
  // Telegram
  TELEGRAM: {
    // Не зберігайте реальний токен у коді. Додайте TELEGRAM_TOKEN у Script Properties.
    TOKEN: '',
    CHAT_ID: '156212174'
  },

  // Google Sheets
  SPREADSHEET_ID: '1IG8tGF8g8sulW5snTKt_yUXmscUNUkVOQR9_6UO3vlk',
  SHEETS: {
    RESPONSES: 'Form_Responses2',
    CONTRACTS: 'Contracts', // за потреби буде створено автоматично
    PERFORMERS: 'Виконавці'
  },

  // Google Form
  FORM: {
    ID: '1Jy7STz5k4y2tUJ-BG0OIGlP72BWNaeY8HHx8kHc31Qs',
    URL: 'https://forms.gle/BSXoQxshSYB6jbaW9'
  },

  // Шаблони документів (Google Docs IDs)
  TEMPLATES: {
    CONTRACT: '1IEYroQ4MYeEkqmePDUCx1oW0h8IlllGGjEeIyB31dBc',
    ACT: '1oR3umTEKv5zNgD5Ujhpk-cQlabio5I1AiP9QBC-AUcQ',
    INVOICE: '1J7aLxM0M_CwhgI8CFz2DzwR8TOndtEAOD96Gs5bQp_c'
  },

  // Папка в Drive для збереження контрактів
  DRIVE_FOLDER_ID: '1uVNZTdCgZAu5q-oc7lAzKvn-FRfkJBx9',

  // Формат номера договору
  CONTRACT_NUMBER_FORMAT: {
    PREFIX: 'W',
    YEAR_FORMAT: 'YY',
    SEPARATOR: '-'
  },

  // Назва папки: {номер}_{НазваКлієнта}
  FOLDER_NAME_FORMAT: '{contractNumber}_{clientName}',

  // Поля з Google Form/Responses (індекси з 0, для RESPONSES)
  FORM_FIELDS: {
    CONTRACT_NUMBER: 0,
    CLIENT_NAME: 1,
    CLIENT_TAX_TYPE: 2,
    CLIENT_DIRECTOR: 3,
    CLIENT_ADDRESS: 4,
    CLIENT_EDRPOU: 5,
    CLIENT_BANK_ACCOUNT: 6,
    CLIENT_BANK_NAME: 7,
    CLIENT_BANK_MFO: 8,
    DESCRIPTION: 9,
    PERIOD_START: 10,
    PERIOD_END: 11,
    AMOUNT: 12,
    CURRENCY: 13,
    PAYMENT_TERM: 14,
    PERFORMER_NAME: 15
    // Дані виконавця будуть підтягуватись з SHEETS.PERFORMERS
  },

  // Статуси договорів
  CONTRACT_STATUS: {
    DRAFT: 'Чернетка',
    ACTIVE: 'Активний',
    COMPLETED: 'Завершений',
    CANCELLED: 'Скасований'
  },

  // Типи документів
  DOCUMENT_TYPES: {
    CONTRACT: 'Договір',
    ACT: 'Акт',
    INVOICE: 'Рахунок'
  }
};