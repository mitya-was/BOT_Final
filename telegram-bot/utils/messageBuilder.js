/**
 * Утиліта для створення повідомлень та клавіатур
 */

const { EMOJI, BUTTON_TEXTS, LIMITS } = require('./constants');

class MessageBuilder {
    
    // Створення основного меню
    static createMainMenu() {
        return {
            reply_markup: {
                keyboard: [
                    [BUTTON_TEXTS.LIST_CONTRACTS, BUTTON_TEXTS.NEW_CONTRACT],
                    [BUTTON_TEXTS.GENERATE_INVOICE, BUTTON_TEXTS.GENERATE_ACT],
                    [BUTTON_TEXTS.REGENERATE, BUTTON_TEXTS.EDIT_CONTRACT],
                    [BUTTON_TEXTS.STATISTICS, BUTTON_TEXTS.SETTINGS]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        };
    }

    // Створення inline клавіатури з договорами
    static createContractsKeyboard(contracts, actionPrefix, showEdit = false) {
        const buttons = contracts.slice(0, LIMITS.MAX_INLINE_BUTTONS).map(contract => {
            const row = [{
                text: `${contract.number} - ${contract.client}`,
                callback_data: `${actionPrefix}${contract.number}`
            }];
            
            if (showEdit) {
                row.push({
                    text: `${EMOJI.EDIT}`,
                    callback_data: `edit_${contract.number}`
                });
            }
            
            return row;
        });

        buttons.push([{
            text: BUTTON_TEXTS.BACK_TO_MENU,
            callback_data: 'back_to_menu'
        }]);

        return { reply_markup: { inline_keyboard: buttons } };
    }

    // Створення клавіатури з пагінацією
    static createPaginationKeyboard(currentPage, totalPages, baseCallback) {
        const buttons = [];
        
        // Навігаційні кнопки
        if (totalPages > 1) {
            const navRow = [];
            
            if (currentPage > 1) {
                navRow.push({
                    text: `${EMOJI.FIRST} 1`,
                    callback_data: `${baseCallback}_page_1`
                });
                navRow.push({
                    text: `${EMOJI.PREV}`,
                    callback_data: `${baseCallback}_page_${currentPage - 1}`
                });
            }
            
            navRow.push({
                text: `${currentPage}/${totalPages}`,
                callback_data: 'page_info'
            });
            
            if (currentPage < totalPages) {
                navRow.push({
                    text: `${EMOJI.NEXT}`,
                    callback_data: `${baseCallback}_page_${currentPage + 1}`
                });
                navRow.push({
                    text: `${totalPages} ${EMOJI.LAST}`,
                    callback_data: `${baseCallback}_page_${totalPages}`
                });
            }
            
            buttons.push(navRow);
        }

        // Кнопка назад
        buttons.push([{
            text: BUTTON_TEXTS.BACK_TO_MENU,
            callback_data: 'back_to_menu'
        }]);

        return { reply_markup: { inline_keyboard: buttons } };
    }

    // Форматування списку договорів
    static formatContractsList(contracts, page = 1, totalPages = 1) {
        if (contracts.length === 0) {
            return '📋 Список договорів порожній.';
        }

        let message = `📋 **Список договорів** (сторінка ${page}/${totalPages}):\n\n`;

        contracts.forEach((contract, index) => {
            const status = contract.status ? this.getStatusEmoji(contract.status) : '';
            message += `**${index + 1}.** ${contract.number} ${status}\n`;
            message += `   👤 ${contract.client}\n`;
            message += `   💰 ${this.formatAmount(contract.amount)}\n`;
            message += `   📅 ${this.formatDate(contract.date)}\n\n`;
        });

        return message;
    }

    // Форматування статистики
    static formatStatistics(stats) {
        if (!stats) {
            return '📊 Немає даних для статистики.';
        }

        return `📊 **Статистика договорів**

📋 Всього договорів: **${stats.total}**
✅ Активних: **${stats.active}**
✔️ Виконаних: **${stats.completed}**
❌ Скасованих: **${stats.cancelled}**

💰 Загальна сума активних: **${this.formatAmount(stats.totalAmount)}**
📅 Середній термін виконання: **${stats.avgDuration} днів**

🎯 **За поточний місяць:**
   ➕ Створено: **${stats.thisMonth?.created || 0}**
   ✅ Завершено: **${stats.thisMonth?.completed || 0}**
   💰 Сума: **${this.formatAmount(stats.thisMonth?.amount || 0)}**

📈 **Тренди:**
   • Середня сума договору: **${this.formatAmount(stats.averageAmount || 0)}**
   • Найбільший договір: **${this.formatAmount(stats.maxAmount || 0)}**
   • Успішність виконання: **${stats.successRate || 0}%**`;
    }

    // Форматування повідомлення про новий договір
    static formatNewContractNotification(contractData) {
        return `🎉 **Новий договір створено!**

📋 Номер: **${contractData.number}**
🏢 Клієнт: **${contractData.client}**
💰 Сума: **${this.formatAmount(contractData.amount)}**
👤 Виконавець: **${contractData.performer}**

📄 [Переглянути договір](${contractData.contractUrl})
💰 [Переглянути рахунок](${contractData.invoiceUrl})
📄 [Переглянути акт](${contractData.actUrl})
📁 [Відкрити папку](${contractData.folderUrl})`;
    }

    // Створення клавіатури для нового договору
    static createNewContractKeyboard(contractNumber) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `${EMOJI.INVOICE} Рахунок`, callback_data: `invoice_${contractNumber}` },
                        { text: `${EMOJI.ACT} Акт`, callback_data: `act_${contractNumber}` }
                    ],
                    [
                        { text: `${EMOJI.REGENERATE} Перегенерувати`, callback_data: `regen_${contractNumber}` },
                        { text: `${EMOJI.EDIT} Редагувати`, callback_data: `edit_${contractNumber}` }
                    ]
                ]
            }
        };
    }

    // Створення клавіатури підтвердження
    static createConfirmationKeyboard(action, contractNumber = null) {
        const confirmData = contractNumber ? `confirm_${action}_${contractNumber}` : `confirm_${action}`;
        const cancelData = contractNumber ? `cancel_${action}_${contractNumber}` : `cancel_${action}`;

        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: BUTTON_TEXTS.CONFIRM_YES, callback_data: confirmData },
                        { text: BUTTON_TEXTS.CONFIRM_NO, callback_data: cancelData }
                    ]
                ]
            }
        };
    }

    // Створення клавіатури для експорту
    static createExportKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: BUTTON_TEXTS.EXPORT_EXCEL, callback_data: 'export_excel' },
                        { text: BUTTON_TEXTS.EXPORT_PDF, callback_data: 'export_pdf' }
                    ],
                    [
                        { text: BUTTON_TEXTS.EXPORT_JSON, callback_data: 'export_json' },
                        { text: BUTTON_TEXTS.BACK_TO_MENU, callback_data: 'back_to_menu' }
                    ]
                ]
            }
        };
    }

    // Створення клавіатури для фільтрів
    static createFiltersKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: BUTTON_TEXTS.FILTER_ACTIVE, callback_data: 'filter_active' },
                        { text: BUTTON_TEXTS.FILTER_COMPLETED, callback_data: 'filter_completed' }
                    ],
                    [
                        { text: BUTTON_TEXTS.FILTER_THIS_MONTH, callback_data: 'filter_month' },
                        { text: BUTTON_TEXTS.CLEAR_FILTERS, callback_data: 'filter_clear' }
                    ],
                    [
                        { text: BUTTON_TEXTS.BACK_TO_MENU, callback_data: 'back_to_menu' }
                    ]
                ]
            }
        };
    }

    // Утиліти для форматування

    static formatAmount(amount) {
        if (!amount) return '0 грн';
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `${num.toLocaleString('uk-UA')} грн`;
    }

    static formatDate(dateString) {
        if (!dateString) return 'Не вказано';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('uk-UA');
        } catch {
            return dateString;
        }
    }

    static getStatusEmoji(status) {
        const statusMap = {
            'активний': '✅',
            'завершений': '✔️',
            'скасований': '❌',
            'чернетка': '📝',
            'очікує': '⏳'
        };
        return statusMap[status.toLowerCase()] || '';
    }

    // Обрізання тексту для Telegram
    static truncateText(text, maxLength = LIMITS.MAX_MESSAGE_LENGTH) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // Екранування Markdown
    static escapeMarkdown(text) {
        return text.replace(/[*_`\[\]]/g, '\\$&');
    }

    // Створення прогрес-бару
    static createProgressBar(current, total, width = 10) {
        const progress = Math.round((current / total) * width);
        const filled = '▓'.repeat(progress);
        const empty = '░'.repeat(width - progress);
        const percentage = Math.round((current / total) * 100);
        return `[${filled}${empty}] ${percentage}%`;
    }
}

module.exports = MessageBuilder;
