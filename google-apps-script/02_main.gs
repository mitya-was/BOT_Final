/**
 * Головний файл Google Apps Script для автоматизації договорів
 * Main Google Apps Script file for contract automation
 */

/**
 * Обробник форми - викликається при надходженні нових даних
 * Form submission handler
 */
function onFormSubmit(e) {
  Logger.log('=== НОВА ЗАЯВКА НА ДОГОВІР ===');
  Logger.log('Timestamp:', new Date().toLocaleString());
  Logger.log('Event object існує:', !!e);
  Logger.log('Event.values існує:', !!(e && e.values));
  
  try {
    // Перевіряємо чи є дані в event
    if (!e || !e.values) {
      Logger.log('❌ ПОМИЛКА: Немає даних в event object');
      sendQuickTelegramMessage('❌ Помилка: Немає даних в формі');
      return;
    }
    
    // Отримуємо дані з форми (по заголовках, з рядка сабміту)
    const formData = parseFormData(e);
    Logger.log('Дані форми після парсингу:', JSON.stringify(formData));
    
    // Перевіряємо обов'язкові поля (ОНОВЛЕНІ)
    if (!formData.clientName || !formData.amount || !formData.performer) {
      Logger.log('❌ ПОМИЛКА: Не заповнені обов\'язкові поля');
      Logger.log('Назва компанії:', formData.clientName);
      Logger.log('Сума:', formData.amount);
      Logger.log('Виконавець:', formData.performer);
      sendQuickTelegramMessage(`❌ Помилка: Не заповнені поля.\nКомпанія: ${formData.clientName}\nСума: ${formData.amount}\nВиконавець: ${formData.performer}`);
      return;
    }
    // Основний процес створення договору
    const contractNumber = generateContractNumber();
    formData.contractNumber = contractNumber;
    // Вирівнюємо назви полів
    formData.client = formData.clientName;

    const folderId = createFolderStructure(formData);

    // Збагачуємо formData даними виконавця для шаблонів
    const performerData = getPerformerByName(formData.performer) || {};
    formData.performerFullName = performerData.name || formData.performer;
    formData.performerEdrpou = performerData.edrpou || '';
    formData.performerAddress = performerData.address || '';
    formData.performerType = performerData.type || '';
    formData.performerBankDetails = performerData.bankDetails || '';
    formData.performerDirector = performerData.director || '';
    formData.performerBankName = performerData.bankName || '';
    formData.performerBankMfo = performerData.bankMfo || '';

    const contractUrl = generateContract(formData, folderId);
    const folderUrl = DriveApp.getFolderById(folderId).getUrl();

    // Генеруємо Рахунок та Акт одразу
    const invoiceUrl = generateInvoice(formData, folderId);
    const actUrl = generateAct(formData, folderId);

    // Оновлюємо ТОЙ ЖЕ рядок RESPONSES: A, Q–U, V–X
    const targetRow = (e && e.range) ? e.range.getRow() : getResponsesSheet().getLastRow();
    updateResponsesRow(targetRow, {
      ...formData,
      folderUrl,
      contractUrl,
      invoiceUrl,
      actUrl
    }, performerData);
    sendTelegramNotification(formData, contractUrl);
  } catch (error) {
    Logger.log('❌ Помилка в onFormSubmit:', error.toString());
    try { sendErrorNotification(error); } catch (e2) {}
  }
}

/**
 * Парсинг даних з форми (ОНОВЛЕНА СТРУКТУРА)
 */
function parseFormData(e) {
  Logger.log('=== ПАРСИНГ ДАНИХ ФОРМИ (НОВА СТРУКТУРА) ===');
  if (!e || !e.values) {
    Logger.log('❌ Немає e.values');
    return {};
  }

  // Переважно читаємо дані саме з рядка таблиці, який сабмітила форма
  try {
    const sheet = getResponsesSheet();
    const rowIdx = (e && e.range) ? e.range.getRow() : sheet.getLastRow();
    const row = sheet.getRange(rowIdx, 1, 1, Math.max(24, sheet.getLastColumn())).getValues()[0];
    const headerMap = getResponsesHeaderMap(sheet);
    const mapped = formDataFromRowWithHeaders(row, headerMap);
    mapped.contractNumber = '';
    return mapped;
  } catch (readErr) {
    Logger.log('Помилка читання рядка сабміту, спробую e.values: ' + readErr.toString());
  }

  const values = e.values;
  Logger.log('Кількість значень:', values.length);
  Logger.log('Всі значення:', JSON.stringify(values));

  // Визначаємо, чи перший стовпець — Timestamp (стандарт для Google Forms)
  const first = values[0];
  const looksLikeTimestamp = (first instanceof Date) || (typeof first === 'string' && /\d/.test(first) && (first.indexOf('-') >= 0 || first.indexOf('.') >= 0 || first.indexOf('/') >= 0));
  const base = looksLikeTimestamp ? 1 : 0;

  let result = {
    contractNumber: '', // генерується пізніше
    clientName: values[base + 0] || '',
    clientTaxType: values[base + 1] || '',
    clientDirector: values[base + 2] || '',
    clientAddress: values[base + 3] || '',
    clientEdrpou: values[base + 4] || '',
    clientBankAccount: values[base + 5] || '',
    clientBankName: values[base + 6] || '',
    clientBankMfo: values[base + 7] || '',
    description: values[base + 8] || '',
    periodStart: values[base + 9] || '',
    periodEnd: values[base + 10] || '',
    amount: values[base + 11] || '',
    currency: values[base + 12] || 'грн',
    paymentTerm: values[base + 13] || '',
    performer: values[base + 14] || ''
  };

  // Якщо ключові поля порожні (невірний порядок у формі), читаємо з останнього рядка RESPONSES по фіксованим колонкам
  if (!result.clientName || !result.performer) {
    try {
      const fallback = parseFormDataFromSheetLastRow();
      if (fallback && fallback.clientName) {
        result = fallback;
      }
    } catch (e2) {
      Logger.log('Fallback parse error: ' + e2.toString());
    }
  }

  Logger.log('Результат парсингу:', JSON.stringify(result));
  return result;
}

function parseFormDataFromSheetLastRow() {
  const sheet = getResponsesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};
  const row = sheet.getRange(lastRow, 1, 1, Math.max(24, sheet.getLastColumn())).getValues()[0];
  const headerMap = getResponsesHeaderMap(sheet);
  return formDataFromRowWithHeaders(row, headerMap);
}

/**
 * Ручний запуск для останнього рядка RESPONSES
 */
function runForLastRow() {
  const sheet = getResponsesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) { Logger.log('Немає даних у RESPONSES'); return; }
  const row = sheet.getRange(lastRow, 1, 1, Math.max(24, sheet.getLastColumn())).getValues()[0];
  const headerMap = getResponsesHeaderMap(sheet);
  const formData = formDataFromRowWithHeaders(row, headerMap);
  formData.client = formData.clientName;
  const contractNumber = generateContractNumber();
  formData.contractNumber = contractNumber;
  const folderId = createFolderStructure(formData);
  const performerData = getPerformerByName(formData.performer) || {};
  formData.performerFullName = performerData.name || formData.performer;
  formData.performerEdrpou = performerData.edrpou || '';
  formData.performerAddress = performerData.address || '';
  formData.performerType = performerData.type || '';
  formData.performerBankDetails = performerData.bankDetails || '';
  formData.performerDirector = performerData.director || '';
  formData.performerBankName = performerData.bankName || '';
  formData.performerBankMfo = performerData.bankMfo || '';
  const contractUrl = generateContract(formData, folderId);
  const invoiceUrl = generateInvoice(formData, folderId);
  const actUrl = generateAct(formData, folderId);
  const folderUrl = DriveApp.getFolderById(folderId).getUrl();
  updateResponsesRow(lastRow, { ...formData, folderUrl, contractUrl, invoiceUrl, actUrl }, performerData);
  sendTelegramNotification(formData, contractUrl);
  Logger.log('✅ runForLastRow завершено');
}

/**
 * Безпечне отримання токена з Script Properties
 */
function getTelegramToken() {
  try {
    const prop = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
    return prop && prop.trim().length > 0 ? prop.trim() : CONFIG.TELEGRAM.TOKEN;
  } catch (e) {
    return CONFIG.TELEGRAM.TOKEN;
  }
}

/**
 * Генерація унікального номера договору
 * Формат: W-(YY)-XX
 */
function generateContractNumber() {
  const sheet = getResponsesSheet();
  const currentYear = new Date().getFullYear().toString().slice(-2);
  let sequenceNumber = 1;

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const colAValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const thisYearNumbers = colAValues
      .map(v => (v || '').toString())
      .filter(v => v.indexOf(`W-${currentYear}-`) === 0)
      .map(v => {
        const parts = v.split('-');
        return parts.length === 3 ? parseInt(parts[2], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    if (thisYearNumbers.length > 0) {
      sequenceNumber = Math.max(...thisYearNumbers) + 1;
    }
  }

  const formattedNumber = sequenceNumber.toString().padStart(2, '0');
  return `${CONFIG.CONTRACT_NUMBER_FORMAT.PREFIX}${CONFIG.CONTRACT_NUMBER_FORMAT.SEPARATOR}${currentYear}${CONFIG.CONTRACT_NUMBER_FORMAT.SEPARATOR}${formattedNumber}`;
}

/**
 * Оновлення останньої строки з даними договору (замість додавання нової)
 */
function updateResponsesRow(rowIndex, formData, performerData) {
  Logger.log('=== ОНОВЛЕННЯ РЯДКА RESPONSES ===');
  const sheet = getResponsesSheet();

  // A: номер договору
  sheet.getRange(rowIndex, 1).setValue(formData.contractNumber);

  // Визначаємо чи потрібно заповнювати директора замовника (тільки якщо не ФОП)
  const taxType = (formData.clientTaxType || '').toString().toLowerCase();
  const isFop = taxType.indexOf('фоп') !== -1 || taxType.indexOf('fop') !== -1;
  const clientDirectorCell = isFop ? '' : (formData.clientDirector || '');

  // B–P: основні поля форми (перезаписуємо чітко у потрібні колонки)
  const bpValues = [[
    formData.clientName || '',        // B
    formData.clientTaxType || '',     // C
    clientDirectorCell,               // D (умовно)
    formData.clientAddress || '',     // E
    formData.clientEdrpou || '',      // F
    formData.clientBankAccount || '', // G
    formData.clientBankName || '',    // H
    formData.clientBankMfo || '',     // I
    formData.description || '',       // J
    formData.periodStart || '',       // K
    formData.periodEnd || '',         // L
    formData.amount || '',            // M
    formData.currency || 'грн',       // N
    formData.paymentTerm || '',       // O
    formData.performer || ''          // P
  ]];
  sheet.getRange(rowIndex, 2, 1, 15).setValues(bpValues);

  // Q–U: данные исполнителя
  sheet.getRange(rowIndex, 17).setValue(performerData.edrpou || '');      // Q
  sheet.getRange(rowIndex, 18).setValue(performerData.address || '');     // R
  sheet.getRange(rowIndex, 19).setValue(performerData.type || '');        // S
  sheet.getRange(rowIndex, 20).setValue(performerData.bankDetails || ''); // T
  sheet.getRange(rowIndex, 21).setValue(performerData.director || '');    // U

  // V–X: гиперссылки
  const contractRich = SpreadsheetApp.newRichTextValue().setText('Договір').setLinkUrl(formData.contractUrl).build();
  sheet.getRange(rowIndex, 22).setRichTextValue(contractRich);            // V

  if (formData.invoiceUrl) {
    const invoiceRich = SpreadsheetApp.newRichTextValue().setText('Рахунок').setLinkUrl(formData.invoiceUrl).build();
    sheet.getRange(rowIndex, 23).setRichTextValue(invoiceRich);           // W
  }
  if (formData.actUrl) {
    const actRich = SpreadsheetApp.newRichTextValue().setText('Акт').setLinkUrl(formData.actUrl).build();
    sheet.getRange(rowIndex, 24).setRichTextValue(actRich);               // X
  }

  // Приводимо колонку M (Загальна сума) до числового формату, щоб не відображалась як дата
  try {
    const amountNumeric = (function (val) {
      if (typeof val === 'number') return val;
      const num = parseFloat((val || '').toString().replace(/\s/g, '').replace(',', '.'));
      return isNaN(num) ? 0 : num;
    })(formData.amount);
    const amountCell = sheet.getRange(rowIndex, 13); // M
    amountCell.setValue(amountNumeric);
    amountCell.setNumberFormat('0'); // або '0.00' за потреби
  } catch (fmtErr) {
    Logger.log('Форматування суми не вдалося: ' + fmtErr.toString());
  }
}





/**
 * Створення структури папок в Google Drive
 */
function createFolderStructure(formData) {
  const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  
  // Назва папки: номер_НазваКлієнта
  const folderName = `${formData.contractNumber}_${formData.clientName}`;
  
  // Перевіряємо, чи не існує вже така папка
  const existingFolders = parentFolder.getFoldersByName(folderName);
  if (existingFolders.hasNext()) {
    return existingFolders.next().getId();
  }
  
  // Створюємо нову папку
  const newFolder = parentFolder.createFolder(folderName);
  return newFolder.getId();
}







/**
 * Відправка сповіщення в Telegram
 */
function sendTelegramNotification(formData, contractUrl) {
  if (!CONFIG.TELEGRAM.CHAT_ID) {
    Logger.log('⚠️ Chat ID не налаштовано для сповіщень');
    return;
  }
  
  const message = `🎉 Новий договір створено!

📋 Номер: ${formData.contractNumber}
🏢 Клієнт: ${formData.client}
💰 Сума: ${formData.amount} грн
👤 Виконавець: ${formData.performer}

📄 Документ: ${contractUrl}

⏰ Час: ${new Date().toLocaleString()}`;
  
  const payload = {
    chat_id: CONFIG.TELEGRAM.CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  };
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  try {
    Logger.log('Відправка Telegram сповіщення...');
    const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${getTelegramToken()}/sendMessage`, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.ok) {
      Logger.log('✅ Telegram сповіщення відправлено успішно');
    } else {
      Logger.log('❌ Помилка Telegram API:', result.description);
    }
    
  } catch (error) {
    Logger.log('❌ Помилка відправки в Telegram:', error.toString());
  }
}

/**
 * Відправка сповіщення про помилку
 */
function sendErrorNotification(error) {
  if (!CONFIG.TELEGRAM.CHAT_ID) return;
  
  const message = `❌ Помилка при створенні договору:

${error.toString()}

⏰ Час: ${new Date().toLocaleString()}`;
  
  const payload = {
    chat_id: CONFIG.TELEGRAM.CHAT_ID,
    text: message
  };
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${getTelegramToken()}/sendMessage`, options);
  } catch (e) {
    Logger.log('Помилка відправки помилки в Telegram:', e.toString());
  }
}

/**
 * Допоміжна функція для витягування ID папки з URL
 */
function extractFolderIdFromUrl(url) {
  const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}



/**
 * Швидке відправлення Telegram повідомлення
 */
function sendQuickTelegramMessage(text) {
  if (!CONFIG.TELEGRAM.CHAT_ID) {
    Logger.log('❌ Chat ID не налаштовано для швидкого повідомлення');
    return;
  }
  
  const payload = {
    chat_id: CONFIG.TELEGRAM.CHAT_ID,
    text: text
  };
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${getTelegramToken()}/sendMessage`, options);
    Logger.log('✅ Швидке повідомлення відправлено');
  } catch (error) {
    Logger.log('❌ Помилка швидкого повідомлення:', error.toString());
  }
}

/**
 * =====================
 *   WEB APP ENDPOINTS
 * =====================
 */

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = (params.action || '').toString();
    const key = (params.key || '').toString();
    if (!isApiKeyValid(key)) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 403);
    }

    if (action === 'regenerate') {
      const number = (params.number || '').toString();
      if (!number) return jsonResponse({ ok: false, error: 'number_required' }, 400);
      const result = regenerateByNumber(number);
      return jsonResponse(result, result.ok ? 200 : 500);
    }

    if (action === 'generateInvoice') {
      const number = (params.number || '').toString();
      if (!number) return jsonResponse({ ok: false, error: 'number_required' }, 400);
      const res = generateSingleDoc(number, 'invoice');
      return jsonResponse(res, res.ok ? 200 : 500);
    }

    if (action === 'generateAct') {
      const number = (params.number || '').toString();
      if (!number) return jsonResponse({ ok: false, error: 'number_required' }, 400);
      const res = generateSingleDoc(number, 'act');
      return jsonResponse(res, res.ok ? 200 : 500);
    }

    if (action === 'update') {
      const number = (params.number || '').toString();
      if (!number) return jsonResponse({ ok: false, error: 'number_required' }, 400);
      const res = updateContractRow(number, params);
      return jsonResponse(res, res.ok ? 200 : 500);
    }

    if (action === 'contracts') {
      const limit = parseInt(params.limit || '50', 10);
      const items = getContractsSummary(isNaN(limit) ? 50 : limit);
      return jsonResponse({ ok: true, items });
    }

    if (action === 'stats') {
      const stats = getContractsStats();
      return jsonResponse({ ok: true, stats });
    }

    if (action === 'health') {
      return jsonResponse({ ok: true, now: new Date().toISOString() }, 200);
    }

    return jsonResponse({ ok: false, error: 'unknown_action' }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() }, 500);
  }
}

function doPost(e) {
  try {
    const key = e && e.parameter ? (e.parameter.key || '') : '';
    if (!isApiKeyValid(key)) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 403);
    }
    // Резерв на майбутнє: прийом JSON для створення запису
    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() }, 500);
  }
}

function isApiKeyValid(key) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty('API_KEY');
    return expected && key && key === expected;
  } catch (e) {
    return false;
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Пошук індекса рядка за номером договору
 */
function findRowIndexByNumber(sheet, contractNumber) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] || '').toString() === contractNumber) return i + 1; // 1-based
  }
  return -1;
}

/**
 * Отримати formData з рядка за номером
 */
function formDataByNumber(contractNumber) {
  const sheet = getResponsesSheet();
  const rowIndex = findRowIndexByNumber(sheet, contractNumber);
  if (rowIndex === -1) throw new Error('not_found');
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const fd = formDataFromRow(row);
  fd.contractNumber = contractNumber;
  return { sheet, rowIndex, formData: fd };
}

/**
 * Перегенерація одного документа (invoice|act) без зміни інших
 */
function generateSingleDoc(contractNumber, kind) {
  try {
    const { sheet, rowIndex, formData } = formDataByNumber(contractNumber);
    const folderId = createFolderStructure(formData);
    let url = '';
    if (kind === 'invoice') {
      url = generateInvoice(formData, folderId);
    } else if (kind === 'act') {
      url = generateAct(formData, folderId);
    } else {
      return { ok: false, error: 'unknown_kind' };
    }
    const performerData = getPerformerByName(formData.performer) || {};
    const folderUrl = DriveApp.getFolderById(folderId).getUrl();
    const payload = { ...formData, folderUrl };
    if (kind === 'invoice') payload.invoiceUrl = url; else payload.invoiceUrl = '';
    if (kind === 'act') payload.actUrl = url; else payload.actUrl = '';
    // Не чіпаємо договірне посилання якщо не генеруємо заново
    payload.contractUrl = (sheet.getRange(rowIndex, 22).getRichTextValue() || SpreadsheetApp.newRichTextValue().setText('').build()).getLinkUrl();
    updateResponsesRow(rowIndex, payload, performerData);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

/**
 * Оновити дані договору за номером і повністю перегенерувати документи
 */
function updateContractRow(contractNumber, params) {
  try {
    const { rowIndex, formData } = formDataByNumber(contractNumber);
    const updated = applyOverrides(formData, params);
    const folderId = createFolderStructure(updated);
    const contractUrl = generateContract(updated, folderId);
    const invoiceUrl = generateInvoice(updated, folderId);
    const actUrl = generateAct(updated, folderId);
    const folderUrl = DriveApp.getFolderById(folderId).getUrl();
    const performerData = getPerformerByName(updated.performer) || {};
    updateResponsesRow(rowIndex, { ...updated, folderUrl, contractUrl, invoiceUrl, actUrl }, performerData);
    return { ok: true, contractUrl, invoiceUrl, actUrl };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function applyOverrides(original, params) {
  const map = {
    clientName: 'clientName',
    clientTaxType: 'clientTaxType',
    clientDirector: 'clientDirector',
    clientAddress: 'clientAddress',
    clientEdrpou: 'clientEdrpou',
    clientBankAccount: 'clientBankAccount',
    clientBankName: 'clientBankName',
    clientBankMfo: 'clientBankMfo',
    description: 'description',
    periodStart: 'periodStart',
    periodEnd: 'periodEnd',
    amount: 'amount',
    currency: 'currency',
    paymentTerm: 'paymentTerm',
    performer: 'performer'
  };
  const updated = { ...original };
  Object.keys(map).forEach(k => {
    if (params[k] !== undefined) updated[map[k]] = params[k];
  });
  // Вирівнюємо сумісні поля
  updated.client = updated.clientName;
  return updated;
}

/**
 * Повертає короткий список договорів з листа RESPONSES (останній стан)
 */
function getContractsSummary(limit) {
  const sheet = getResponsesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const rows = Math.min(limit || 50, lastRow - 1);
  const lastCol = Math.max(24, sheet.getLastColumn());
  const headerMap = getResponsesHeaderMap(sheet);
  const data = sheet.getRange(Math.max(2, lastRow - rows + 1), 1, rows, lastCol).getValues();
  const items = [];
  for (let i = data.length - 1; i >= 0; i--) {
    const r = data[i];
    const number = (r[0] || '').toString();
    const client = safeCell(r, (headerMap.clientName >= 0 ? headerMap.clientName : 0) + 1).toString();
    const amount = safeCell(r, (headerMap.amount >= 0 ? headerMap.amount : 11) + 1).toString();
    const date = '';
    if (number || client) {
      items.push({ number, client, amount, date, status: 'Активний' });
    }
  }
  return items;
}

/**
 * Повертає агреговану статистику по RESPONSES
 */
function getContractsStats() {
  const sheet = getResponsesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { total: 0, active: 0, completed: 0, cancelled: 0, totalAmount: 0, avgDuration: 0, thisMonth: { created: 0, completed: 0, amount: 0 } };
  }
  const data = sheet.getRange(2, 1, lastRow - 1, Math.max(24, sheet.getLastColumn())).getValues();
  const total = data.length;
  const active = total; // поки всі вважаємо активними
  const completed = 0;
  const cancelled = 0;
  let totalAmount = 0;
  let thisMonthCreated = 0;
  let thisMonthAmount = 0;
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  data.forEach(r => {
    const amount = parseFloat((r[12] || '0').toString().replace(/\s/g, '').replace(',', '.')) || 0;
    totalAmount += amount;
    const ts = r[1] && (typeof r[1] === 'string' || r[1] instanceof Date) ? new Date(r[1]) : null;
    if (ts && ts.getMonth && ts.getMonth() === m && ts.getFullYear() === y) {
      thisMonthCreated += 1;
      thisMonthAmount += amount;
    }
  });
  return {
    total,
    active,
    completed,
    cancelled,
    totalAmount: totalAmount.toString(),
    avgDuration: 0,
    thisMonth: { created: thisMonthCreated, completed: 0, amount: thisMonthAmount.toString() }
  };
}

/**
 * Регeнерація документів за номером договору
 */
function regenerateByNumber(contractNumber) {
  try {
    const sheet = getResponsesSheet();
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === contractNumber) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return { ok: false, error: 'not_found' };

    const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    const formData = formDataFromRow(row);
    formData.contractNumber = contractNumber;

    // Папка: номер_Клієнт
    const folderId = createFolderStructure(formData);

    // Виконавець
    const performerData = getPerformerByName(formData.performer) || {};
    formData.performerFullName = performerData.name || formData.performer;
    formData.performerEdrpou = performerData.edrpou || '';
    formData.performerAddress = performerData.address || '';
    formData.performerType = performerData.type || '';
    formData.performerBankDetails = performerData.bankDetails || '';
    formData.performerDirector = performerData.director || '';

    // Генерація
    const contractUrl = generateContract(formData, folderId);
    const invoiceUrl = generateInvoice(formData, folderId);
    const actUrl = generateAct(formData, folderId);
    const folderUrl = DriveApp.getFolderById(folderId).getUrl();

    updateResponsesRow(rowIndex, { ...formData, folderUrl, contractUrl, invoiceUrl, actUrl }, performerData);

    return { ok: true, contractUrl, invoiceUrl, actUrl };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function formDataFromRow(row) {
  // row індекси: A=0, B=1, ...
  return {
    contractNumber: row[0] || '',
    clientName: row[1] || '',
    clientTaxType: row[2] || '',
    clientDirector: row[3] || '',
    clientAddress: row[4] || '',
    clientEdrpou: row[5] || '',
    clientBankAccount: row[6] || '',
    clientBankName: row[7] || '',
    clientBankMfo: row[8] || '',
    description: row[9] || '',
    periodStart: row[10] || '',
    periodEnd: row[11] || '',
    amount: row[12] || '',
    currency: row[13] || 'грн',
    paymentTerm: row[14] || '',
    performer: row[15] || ''
  };
}

function getResponsesHeaderMap(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(h => (h || '').toString().trim());

  const normalize = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const headersNorm = headers.map(normalize);

  function findHeaderIndex(patterns) {
    const pats = Array.isArray(patterns) ? patterns : [patterns];
    for (let p of pats) {
      const pn = normalize(p);
      // exact
      let idx = headersNorm.findIndex(h => h === pn);
      if (idx >= 0) return idx;
      // contains
      idx = headersNorm.findIndex(h => h.indexOf(pn) !== -1);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  return {
    clientName: findHeaderIndex(['Назва компанії замовника']),
    clientTaxType: findHeaderIndex(['Тип оподаткування замовника']),
    clientDirector: findHeaderIndex(['ПІБ директора/представника замовника', 'ПІБ директора/представника']),
    clientAddress: findHeaderIndex(['Адреса замовника']),
    clientEdrpou: findHeaderIndex(['ЄДРПОУ замовника']),
    clientBankAccount: findHeaderIndex(['Банківський рахунок замовника', 'Рахунок замовника']),
    clientBankName: findHeaderIndex(['Назва банку замовника', 'Банк замовника']),
    clientBankMfo: findHeaderIndex(['МФО банку замовника', 'МФО замовника']),
    description: findHeaderIndex(['Опис послуг']),
    periodStart: findHeaderIndex(['Початок періоду розміщення', 'Початок періоду']),
    periodEnd: findHeaderIndex(['Кінець періоду розміщення', 'Кінець періоду']),
    amount: findHeaderIndex(['Загальна сума']),
    currency: findHeaderIndex(['Валюта']),
    paymentTerm: findHeaderIndex(['Термін оплати']),
    performer: findHeaderIndex(['Назва виконавця', 'Виконавець'])
  };
}

function formDataFromRowWithHeaders(row, map) {
  // У Google Forms перша колонка — Timestamp, тому до індексів додаємо +1
  const b = 1;
  return {
    contractNumber: row[0] || '',
    clientName: safeCell(row, (map.clientName >= 0 ? map.clientName : 0) + b),
    clientTaxType: safeCell(row, (map.clientTaxType >= 0 ? map.clientTaxType : 1) + b),
    clientDirector: safeCell(row, (map.clientDirector >= 0 ? map.clientDirector : 2) + b),
    clientAddress: safeCell(row, (map.clientAddress >= 0 ? map.clientAddress : 3) + b),
    clientEdrpou: safeCell(row, (map.clientEdrpou >= 0 ? map.clientEdrpou : 4) + b),
    clientBankAccount: safeCell(row, (map.clientBankAccount >= 0 ? map.clientBankAccount : 5) + b),
    clientBankName: safeCell(row, (map.clientBankName >= 0 ? map.clientBankName : 6) + b),
    clientBankMfo: safeCell(row, (map.clientBankMfo >= 0 ? map.clientBankMfo : 7) + b),
    description: safeCell(row, (map.description >= 0 ? map.description : 8) + b),
    periodStart: safeCell(row, (map.periodStart >= 0 ? map.periodStart : 9) + b),
    periodEnd: safeCell(row, (map.periodEnd >= 0 ? map.periodEnd : 10) + b),
    amount: safeCell(row, (map.amount >= 0 ? map.amount : 11) + b),
    currency: safeCell(row, (map.currency >= 0 ? map.currency : 12) + b) || 'грн',
    paymentTerm: safeCell(row, (map.paymentTerm >= 0 ? map.paymentTerm : 13) + b),
    performer: safeCell(row, (map.performer >= 0 ? map.performer : 14) + b)
  };
}

function safeCell(row, idx) {
  return idx >= 0 && idx < row.length ? row[idx] || '' : '';
}

/**
 * Повертає аркуш з відповідями форми, намагається знайти за назвою або за заголовками
 */
function getResponsesSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const preferredName = CONFIG.SHEETS.RESPONSES;
  let sheet = ss.getSheetByName(preferredName);
  if (sheet) return sheet;

  // Альтернативні можливі назви
  const altNames = [
    'Form Responses 1',
    'Form Responses 2',
    'Form Responses',
    'Form_Responses1',
    'Form_Responses2',
    'Form_Responses',
    'Відповіді форми'
  ];
  for (let name of altNames) {
    sheet = ss.getSheetByName(name);
    if (sheet) return sheet;
  }

  // Визначення аркуша за заголовками
  const expectedHeaders = [
    'Назва компанії замовника',
    'Тип оподаткування замовника',
    'Назва виконавця',
    'Опис послуг'
  ];
  const sheets = ss.getSheets();
  let bestMatch = null;
  let bestScore = -1;
  for (let s of sheets) {
    const lastCol = s.getLastColumn();
    if (lastCol === 0) continue;
    const headers = s.getRange(1, 1, 1, lastCol).getValues()[0].map(v => (v || '').toString().trim().toLowerCase());
    let score = 0;
    for (let h of expectedHeaders) {
      const hn = h.toLowerCase();
      if (headers.some(x => x.indexOf(hn) !== -1)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = s;
    }
  }
  if (bestMatch && bestScore >= 2) return bestMatch;

  throw new Error('❌ Не знайдено лист з відповідями форми. Перевірте назву аркуша у CONFIG.SHEETS.RESPONSES');
}

/**
 * ДІАГНОСТИКА - перевірка доступу до всіх шаблонів
 */
function testTemplateAccess() {
  Logger.log('=== ДІАГНОСТИКА ДОСТУПУ ДО ШАБЛОНІВ ===');
  
  const templates = {
    'Договір': CONFIG.TEMPLATES.CONTRACT,
    'Рахунок': CONFIG.TEMPLATES.INVOICE, 
    'Акт': CONFIG.TEMPLATES.ACT
  };
  
  for (const [name, id] of Object.entries(templates)) {
    try {
      Logger.log(`Перевіряю ${name} (${id})...`);
      const file = DriveApp.getFileById(id);
      Logger.log(`✅ ${name}: ${file.getName()} - ДОСТУП Є`);
    } catch (error) {
      Logger.log(`❌ ${name} (${id}): ${error.toString()}`);
      sendQuickTelegramMessage(`❌ Немає доступу до шаблону ${name}: ${id}`);
    }
  }
  
  // Перевіряємо таблицю теж
  try {
    Logger.log(`Перевіряю таблицю (${CONFIG.SPREADSHEET_ID})...`);
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    Logger.log(`✅ Таблиця: ${sheet.getName()} - ДОСТУП Є`);
  } catch (error) {
    Logger.log(`❌ Таблиця (${CONFIG.SPREADSHEET_ID}): ${error.toString()}`);
  }
  
  // Перевіряємо папку
  try {
    Logger.log(`Перевіряю папку (${CONFIG.DRIVE_FOLDER_ID})...`);
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    Logger.log(`✅ Папка: ${folder.getName()} - ДОСТУП Є`);
  } catch (error) {
    Logger.log(`❌ Папка (${CONFIG.DRIVE_FOLDER_ID}): ${error.toString()}`);
  }
}

// Видалено тестові функції для чистоти коду

/**
 * Конвертація числа в слова (сума прописом)
 */
function numberToWords(number) {
  const units = ['', 'один', 'два', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
  const teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'];
  const tens = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
  const hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];
  
  const thousandsNames = ['', 'тисяча', 'тисячі', 'тисяч'];
  const millionsNames = ['', 'мільйон', 'мільйони', 'мільйонів'];
  
  function convertGroup(num, group) {
    if (num === 0) return '';
    
    let result = '';
    
    // Сотні
    if (num >= 100) {
      result += hundreds[Math.floor(num / 100)] + ' ';
      num %= 100;
    }
    
    // Десятки та одиниці
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
      if (num > 0) {
        result += units[num] + ' ';
      }
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
    } else if (num > 0) {
      result += units[num] + ' ';
    }
    
    // Додаємо назву групи
    if (group === 'thousands') {
      if (num === 1) result += thousandsNames[1] + ' ';
      else if (num >= 2 && num <= 4) result += thousandsNames[2] + ' ';
      else result += thousandsNames[3] + ' ';
    } else if (group === 'millions') {
      if (num === 1) result += millionsNames[1] + ' ';
      else if (num >= 2 && num <= 4) result += millionsNames[2] + ' ';
      else result += millionsNames[3] + ' ';
    }
    
    return result;
  }
  
  // Розбиваємо число на частини
  const millionsPart = Math.floor(number / 1000000);
  const thousandsPart = Math.floor((number % 1000000) / 1000);
  const remainder = number % 1000;
  
  let result = '';
  
  if (millionsPart > 0) {
    result += convertGroup(millionsPart, 'millions');
  }
  
  if (thousandsPart > 0) {
    result += convertGroup(thousandsPart, 'thousands');
  }
  
  if (remainder > 0) {
    result += convertGroup(remainder, '');
  }
  
  return result.trim();
}

/**
 * Конвертація суми в гривні прописом
 */
function amountToWords(amount) {
  if (amount === 0) return 'нуль гривень';
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  let result = numberToWords(integerPart);
  
  // Додаємо "гривень/гривні/гривня"
  const lastDigit = integerPart % 10;
  const lastTwoDigits = integerPart % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    result += ' гривень';
  } else if (lastDigit === 1) {
    result += ' гривня';
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    result += ' гривні';
  } else {
    result += ' гривень';
  }
  
  // Додаємо копійки
  if (decimalPart > 0) {
    result += ' ' + numberToWords(decimalPart);
    
    const lastDigitKop = decimalPart % 10;
    const lastTwoDigitsKop = decimalPart % 100;
    
    if (lastTwoDigitsKop >= 11 && lastTwoDigitsKop <= 19) {
      result += ' копійок';
    } else if (lastDigitKop === 1) {
      result += ' копійка';
    } else if (lastDigitKop >= 2 && lastDigitKop <= 4) {
      result += ' копійки';
    } else {
      result += ' копійок';
    }
  }
  
  return result;
}

