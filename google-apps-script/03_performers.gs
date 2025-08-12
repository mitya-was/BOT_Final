/**
 * Управління виконавцями (executors)
 * Performers/Executors Management
 */

/**
 * Ініціалізація вкладки "Виконавці" з базовими даними
 */
function initializePerformersSheet() {
  Logger.log('=== ІНІЦІАЛІЗАЦІЯ ВКЛАДКИ ВИКОНАВЦІВ ===');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let performersSheet;
    
    // Перевіряємо чи існує вкладка "Виконавці"
    performersSheet = spreadsheet.getSheetByName(CONFIG.SHEETS.PERFORMERS);
    
    if (performersSheet === null) {
      Logger.log('Створюю нову вкладку "Виконавці"...');
      performersSheet = spreadsheet.insertSheet(CONFIG.SHEETS.PERFORMERS);
      Logger.log('✅ Вкладка "Виконавці" створена');
    } else {
      Logger.log('✅ Вкладка "Виконавці" вже існує');
    }
    
    // Заголовки колонок: A–H
    const headers = [
      'Назва виконавця',              // A
      'ЄДРПОУ виконавця',             // B
      'Адреса виконавця',             // C
      'Тип організації виконавця',    // D
      'Банківські реквізити виконавця', // E (вільний текст)
      'Керівник виконавця',           // F
      'Назва банку виконавця',        // G (нове)
      'МФО банку виконавця'           // H (нове)
    ];
    
    // Встановлюємо заголовки
    performersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Форматування заголовків
    const headerRange = performersSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    
    // Ширина колонок A–H
    performersSheet.setColumnWidth(1, 250);
    performersSheet.setColumnWidth(2, 150);
    performersSheet.setColumnWidth(3, 400);
    performersSheet.setColumnWidth(4, 180);
    performersSheet.setColumnWidth(5, 450);
    performersSheet.setColumnWidth(6, 220);
    performersSheet.setColumnWidth(7, 220);
    performersSheet.setColumnWidth(8, 140);
    
    // Додаємо базових виконавців, якщо вкладка порожня
    if (performersSheet.getLastRow() === 1) {
      addDefaultPerformers(performersSheet);
    }
    
    Logger.log('✅ Вкладка "Виконавці" успішно ініціалізована');
    return performersSheet;
    
  } catch (error) {
    Logger.log('❌ Помилка ініціалізації вкладки виконавців:', error.toString());
    throw error;
  }
}

/**
 * Додавання базових виконавців
 */
function addDefaultPerformers(sheet) {
  Logger.log('Додавання базових виконавців...');
  
   const defaultPerformers = [
    [
      'Іваненко Іван Іванович',
      '1234567890',
      'м. Київ, вул. Хрещатик, 1, кв. 10',
      'ФОП',
      'Рахунок: UA123456789012345678901234567',
      'Іваненко Іван Іванович',
      'ПриватБанк',
      '305299'
    ],
    [
      'Петренко Петро Петрович',
      '0987654321',
      'м. Львів, вул. Свободи, 15, кв. 5',
      'ФОП',
      'Рахунок: UA876543210987654321098765432',
      'Петренко Петро Петрович',
      'Ощадбанк',
      '300012'
    ],
    [
      'Сидоренко Сидір Сидорович',
      '1122334455',
      'м. Харків, вул. Сумська, 25, кв. 8',
      'ФОП',
      'Рахунок: UA112233445566778899001122334',
      'Сидоренко Сидір Сидорович',
      'Укргазбанк',
      '320627'
    ],
    [
      'Коваленко Коваль Ковальович',
      '5566778899',
      'м. Одеса, вул. Дерибасівська, 10, кв. 3',
      'ФОП',
      'Рахунок: UA556677889900112233445566778',
      'Коваленко Коваль Ковальович',
      'Райффайзен Банк',
      '380805'
    ]
  ];
  
  // Додаємо виконавців
  for (let i = 0; i < defaultPerformers.length; i++) {
    sheet.appendRow(defaultPerformers[i]);
  }
  
  Logger.log(`✅ Додано ${defaultPerformers.length} базових виконавців`);
}

/**
 * Отримання списку всіх активних виконавців
 */
function getActivePerformers() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PERFORMERS);
    
    if (sheet === null) {
      Logger.log('❌ Вкладка "Виконавці" не знайдена');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    
    const performers = [];
    
    // Пропускаємо заголовки (перший рядок)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      performers.push({
        name: row[0],        // A
        edrpou: row[1],      // B
        address: row[2],     // C
        type: row[3],        // D
        bankDetails: row[4], // E
        director: row[5],    // F
        bankName: row[6] || '', // G
        bankMfo: row[7] || ''   // H
      });
    }
    
    Logger.log(`Отримано ${performers.length} активних виконавців`);
    return performers;
    
  } catch (error) {
    Logger.log('❌ Помилка отримання виконавців:', error.toString());
    return [];
  }
}

/**
 * Отримання даних конкретного виконавця за назвою
 */
function getPerformerByName(performerName) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PERFORMERS);
    
    if (sheet === null) {
      Logger.log('❌ Вкладка "Виконавці" не знайдена');
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Шукаємо виконавця за назвою
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === performerName) {
        return {
          name: row[0],
          edrpou: row[1],
          address: row[2],
          type: row[3],
          bankDetails: row[4],
          director: row[5],
          bankName: row[6] || '',
          bankMfo: row[7] || ''
        };
      }
    }
    
    Logger.log(`Виконавець "${performerName}" не знайдено`);
    return null;
    
  } catch (error) {
    Logger.log('❌ Помилка пошуку виконавця:', error.toString());
    return null;
  }
}

/**
 * Додавання нового виконавця
 */
function addNewPerformer(performerData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PERFORMERS);
    
    if (sheet === null) {
      Logger.log('❌ Вкладка "Виконавці" не знайдена');
      return false;
    }
    
    const newRow = [
      performerData.name || '',
      performerData.edrpou || '',
      performerData.address || '',
      performerData.type || '',
      performerData.bankDetails || '',
      performerData.director || '',
      performerData.bankName || '',
      performerData.bankMfo || ''
    ];
    
    sheet.appendRow(newRow);
    Logger.log(`✅ Додано нового виконавця: ${performerData.name}`);
    
    return true;
    
  } catch (error) {
    Logger.log('❌ Помилка додавання виконавця:', error.toString());
    return false;
  }
}

/**
 * Оновлення даних виконавця
 */
function updatePerformer(performerName, updatedData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PERFORMERS);
    
    if (sheet === null) {
      Logger.log('❌ Вкладка "Виконавці" не знайдена');
      return false;
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Шукаємо рядок з виконавцем
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === performerName) {
        const rowNumber = i + 1;
        
        // Оновлюємо дані
        if (updatedData.name) sheet.getRange(rowNumber, 1).setValue(updatedData.name);
        if (updatedData.edrpou) sheet.getRange(rowNumber, 2).setValue(updatedData.edrpou);
        if (updatedData.address) sheet.getRange(rowNumber, 3).setValue(updatedData.address);
        if (updatedData.type) sheet.getRange(rowNumber, 4).setValue(updatedData.type);
        if (updatedData.bankDetails) sheet.getRange(rowNumber, 5).setValue(updatedData.bankDetails);
        if (updatedData.director) sheet.getRange(rowNumber, 6).setValue(updatedData.director);
        if (updatedData.bankName) sheet.getRange(rowNumber, 7).setValue(updatedData.bankName);
        if (updatedData.bankMfo) sheet.getRange(rowNumber, 8).setValue(updatedData.bankMfo);
        
        Logger.log(`✅ Оновлено виконавця: ${performerName}`);
        return true;
      }
    }
    
    Logger.log(`Виконавець "${performerName}" не знайдено для оновлення`);
    return false;
    
  } catch (error) {
    Logger.log('❌ Помилка оновлення виконавця:', error.toString());
    return false;
  }
}

/**
 * Деактивація виконавця
 */
function deactivatePerformer(performerName) {
  return updatePerformer(performerName, { active: false });
}

/**
 * Активація виконавця
 */
function activatePerformer(performerName) {
  return updatePerformer(performerName, { active: true });
}

/**
 * Тестова функція для перевірки роботи з виконавцями
 */
function testPerformersManagement() {
  Logger.log('=== ТЕСТУВАННЯ УПРАВЛІННЯ ВИКОНАВЦЯМИ ===');
  
  try {
    // Ініціалізуємо вкладку
    initializePerformersSheet();
    
    // Отримуємо активних виконавців
    const performers = getActivePerformers();
    Logger.log(`Знайдено ${performers.length} активних виконавців:`);
    
    performers.forEach((performer, index) => {
      Logger.log(`${index + 1}. ${performer.name} (${performer.type})`);
    });
    
    // Тестуємо пошук конкретного виконавця
    const testPerformer = getPerformerByName('IT Company LLC');
    if (testPerformer) {
      Logger.log('✅ Тест пошуку виконавця пройшов успішно');
      Logger.log(`Знайдено: ${testPerformer.fullName}, ЄДРПОУ: ${testPerformer.edrpou}`);
    }
    
    Logger.log('✅ Тестування управління виконавцями завершено успішно');
    
  } catch (error) {
    Logger.log('❌ Помилка тестування:', error.toString());
  }
} 