/**
 * Допоміжна функція для визначення директора замовника (не для ФОП)
 */
function getClientDirectorForDocs(formData) {
  const taxType = (formData.clientTaxType || '').toString().toLowerCase();
  const isFop = taxType.indexOf('фоп') !== -1 || taxType.indexOf('fop') !== -1;
  return isFop ? '' : (formData.director || formData.clientDirector || '');
}

/**
 * Генерація договору з шаблону
 */
function generateContract(formData, folderId) {
  Logger.log('=== ГЕНЕРАЦІЯ ДОГОВОРУ ===');
  Logger.log('formData:', JSON.stringify(formData));
  Logger.log('folderId:', folderId);

  try {
    Logger.log('Крок 1: Отримання шаблону...');
    const template = DriveApp.getFileById(CONFIG.TEMPLATES.CONTRACT);
    Logger.log('✅ Шаблон отримано:', template.getName());

    Logger.log('Крок 2: Отримання папки...');
    const folder = DriveApp.getFolderById(folderId);
    Logger.log('✅ Папка отримана:', folder.getName());

    Logger.log('Крок 3: Створення копії...');
    const fileName = `Договір_${formData.contractNumber}_${formData.clientName || formData.client}`;
    const contractCopy = template.makeCopy(fileName, folder);
    Logger.log('✅ Копія створена, ID:', contractCopy.getId());

    Logger.log('Чекаємо синхронізацію Google Drive (3 секунди)...');
    Utilities.sleep(3000);

    Logger.log('Крок 4: Відкриття документа...');
    let doc, attempts = 0;
    while (attempts < 5) {
      try {
        attempts++;
        doc = DocumentApp.openById(contractCopy.getId());
        break;
      } catch (e) {
        Logger.log(`❌ Спроба ${attempts} не вдалася`);
        Utilities.sleep(Math.pow(2, attempts) * 1000);
      }
    }

    const body = doc.getBody();
    const fmt = (d) => d ? Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd.MM.yyyy') : '';
    const amountWords = amountToWords(parseFloat(formData.amount || '0'));

    const clientDirectorForDocs = getClientDirectorForDocs(formData);

    const replacements = {
      '{{CONTRACT_NUMBER}}': formData.contractNumber,
      '{{CLIENT_NAME}}': formData.clientName || formData.client,
      '{{ACTIVITY_TYPE}}': formData.activityType || '',
      '{{DIRECTOR_NAME}}': clientDirectorForDocs,
      '{{CLIENT_EDRPOU}}': formData.edrpou || formData.clientEdrpou || '',
      '{{CLIENT_ADDRESS}}': formData.clientAddress || '',
      '{{DESCRIPTION}}': formData.description || '',
      '{{AMOUNT}}': formData.amount || '',
      '{{AMOUNT_WORDS}}': amountWords,
      '{{PERFORMER}}': formData.performer,
      '{{PERFORMER_FULL_NAME}}': formData.performerFullName || formData.performer,
      '{{PERFORMER_EDRPOU}}': formData.performerEdrpou || '',
      '{{PERFORMER_ADDRESS}}': formData.performerAddress || '',
      '{{PERFORMER_TYPE}}': formData.performerType || '',
      '{{PERFORMER_BANK_DETAILS}}': formData.performerBankDetails || '',
      '{{PERFORMER_DIRECTOR}}': formData.performerDirector || '',
      '{{PERFORMER_BANK_NAME}}': formData.performerBankName || '',
      '{{PERFORMER_BANK_MFO}}': formData.performerBankMfo || '',
      '{{DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy'),
      '{{YEAR}}': new Date().getFullYear().toString()
    };

    // Додаткові плейсхолдери клієнта та періоду (дати у форматі dd.MM.yyyy)
    replacements['{{CLIENT_BANK_ACCOUNT}}'] = formData.clientBankAccount || '';
    replacements['{{CLIENT_BANK_NAME}}'] = formData.clientBankName || '';
    replacements['{{CLIENT_BANK_MFO}}'] = formData.clientBankMfo || '';
    replacements['{{PERIOD_START}}'] = fmt(formData.periodStart);
    replacements['{{PERIOD_END}}'] = fmt(formData.periodEnd);
    replacements['{{PAYMENT_TERM}}'] = formData.paymentTerm || '';
    replacements['{{CURRENCY}}'] = formData.currency || 'грн';

    Logger.log('Крок 5: Замінюємо дані...');
    for (const [key, val] of Object.entries(replacements)) {
      body.replaceText(key, val);
    }

    doc.saveAndClose();
    Logger.log('✅ Документ збережено');
    return contractCopy.getUrl();

  } catch (error) {
    Logger.log('❌ ПОМИЛКА В ГЕНЕРАЦІЇ ДОГОВОРУ:', error.toString());
    Logger.log('Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Генерація рахунку з шаблону
 */
function generateInvoice(formData, folderId) {
  try {
    const template = DriveApp.getFileById(CONFIG.TEMPLATES.INVOICE);
    const folder = DriveApp.getFolderById(folderId);
    const fileName = `Рахунок_${formData.contractNumber}_${formData.clientName || formData.client}`;
    const copy = template.makeCopy(fileName, folder);
    Utilities.sleep(2000);
    const doc = DocumentApp.openById(copy.getId());
    const body = doc.getBody();

    const total = parseFloat(formData.amount || '0');
    const vatRate = 0; // поки без ПДВ
    const vatAmount = Math.round(total * vatRate);
    const amountWithoutVat = total - vatAmount;
    const clientDirectorForDocs = getClientDirectorForDocs(formData);

    const replacements = {
      '{{INVOICE_NUMBER}}': `${formData.contractNumber}`,
      '{{DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy'),
      '{{PERFORMER}}': formData.performer,
      '{{PERFORMER_FULL_NAME}}': formData.performerFullName || formData.performer,
      '{{PERFORMER_EDRPOU}}': formData.performerEdrpou || '',
      '{{PERFORMER_ADDRESS}}': formData.performerAddress || '',
      '{{BANK_DETAILS}}': formData.performerBankDetails || '',
      '{{PERFORMER_BANK_NAME}}': formData.performerBankName || '',
      '{{PERFORMER_BANK_MFO}}': formData.performerBankMfo || '',
      '{{CLIENT_NAME}}': formData.clientName || formData.client,
      '{{CLIENT_EDRPOU}}': formData.clientEdrpou || formData.edrpou || '',
      '{{CLIENT_ADDRESS}}': formData.clientAddress || '',
      '{{CONTRACT_NUMBER}}': formData.contractNumber,
      '{{CONTRACT_DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy'),
      '{{DESCRIPTION}}': formData.description || '',
      '{{AMOUNT_WITHOUT_VAT}}': amountWithoutVat.toString(),
      '{{VAT_AMOUNT}}': vatAmount.toString(),
      '{{TOTAL_AMOUNT}}': total.toString(),
      '{{TOTAL_AMOUNT_WORDS}}': amountToWords(total)
    };

    for (const [k, v] of Object.entries(replacements)) body.replaceText(k, v);
    doc.saveAndClose();
    return copy.getUrl();
  } catch (e) {
    Logger.log('❌ ПОМИЛКА В ГЕНЕРАЦІЇ РАХУНКУ:', e.toString());
    return '';
  }
}

/**
 * Генерація акту виконаних робіт
 */
function generateAct(formData, folderId) {
  try {
    const template = DriveApp.getFileById(CONFIG.TEMPLATES.ACT);
    const folder = DriveApp.getFolderById(folderId);
    const fileName = `Акт_${formData.contractNumber}_${formData.clientName || formData.client}`;
    const copy = template.makeCopy(fileName, folder);
    Utilities.sleep(2000);
    const doc = DocumentApp.openById(copy.getId());
    const body = doc.getBody();
    const clientDirectorForDocs = getClientDirectorForDocs(formData);

    const replacements = {
      '{{ACT_NUMBER}}': `${formData.contractNumber}`,
      '{{DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy'),
      '{{CONTRACT_NUMBER}}': formData.contractNumber,
      '{{CONTRACT_DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy'),
      '{{CLIENT_NAME}}': formData.clientName || formData.client,
      '{{CLIENT_EDRPOU}}': formData.clientEdrpou || formData.edrpou || '',
      '{{DIRECTOR_NAME}}': clientDirectorForDocs,
      '{{PERFORMER}}': formData.performer,
      '{{PERFORMER_FULL_NAME}}': formData.performerFullName || formData.performer,
      '{{PERFORMER_EDRPOU}}': formData.performerEdrpou || '',
      '{{PERFORMER_ADDRESS}}': formData.performerAddress || '',
      '{{PERFORMER_BANK_NAME}}': formData.performerBankName || '',
      '{{PERFORMER_BANK_MFO}}': formData.performerBankMfo || '',
      '{{PERFORMER_DIRECTOR}}': formData.performerDirector || '',
      '{{DESCRIPTION}}': formData.description || '',
      '{{AMOUNT}}': formData.amount || '',
      '{{AMOUNT_WORDS}}': amountToWords(parseFloat(formData.amount || '0'))
    };

    for (const [k, v] of Object.entries(replacements)) body.replaceText(k, v);
    doc.saveAndClose();
    return copy.getUrl();
  } catch (e) {
    Logger.log('❌ ПОМИЛКА В ГЕНЕРАЦІЇ АКТУ:', e.toString());
    return '';
  }
}