/**
 * Обробники швидких команд
 */

const logger = require('../utils/logger');
const MessageBuilder = require('../utils/messageBuilder');
const { MESSAGES, LIMITS, REGEX_PATTERNS } = require('../utils/constants');

class CommandHandlers {
    constructor(bot, apiClient, contractHandlers) {
        this.bot = bot;
        this.api = apiClient;
        this.contractHandlers = contractHandlers;
    }

    // Команда /start
    async handleStart(msg) {
        const chatId = msg.chat.id;
        const userName = msg.from.first_name || 'Користувач';
        
        logger.userAction(chatId, 'start_command', { userName });
        
        await this.bot.sendMessage(chatId, MESSAGES.WELCOME, MessageBuilder.createMainMenu());
    }

    // Команда /help
    async handleHelp(msg) {
        const chatId = msg.chat.id;
        logger.userAction(chatId, 'help_command');
        
        await this.bot.sendMessage(chatId, MESSAGES.HELP, { parse_mode: 'Markdown' });
    }

    // Команда /list [фільтр]
    async handleList(msg, match) {
        const chatId = msg.chat.id;
        const filterText = match && match[1] ? match[1].trim() : '';
        
        logger.userAction(chatId, 'list_command', { filter: filterText });
        
        const filters = this.parseListFilters(filterText);
        await this.contractHandlers.showContractsList(chatId, 1, filters);
    }

    // Команда /stats
    async handleStats(msg) {
        const chatId = msg.chat.id;
        logger.userAction(chatId, 'stats_command');
        
        try {
            const loadingMsg = await this.bot.sendMessage(chatId, MESSAGES.LOADING);
            
            const response = await this.api.getStats();
            
            if (response.ok && response.stats) {
                const message = MessageBuilder.formatStatistics(response.stats);
                await this.bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown'
                });
            } else {
                await this.bot.editMessageText(MESSAGES.STATS_NO_DATA, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
            }
        } catch (error) {
            logger.botError(error, { action: 'handleStats', chatId });
            await this.bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
        }
    }

    // Команда /search <запит>
    async handleSearch(msg, match) {
        const chatId = msg.chat.id;
        const searchQuery = match && match[1] ? match[1].trim() : '';
        
        if (!searchQuery) {
            await this.bot.sendMessage(chatId, MESSAGES.SEARCH_PROMPT);
            return;
        }

        if (searchQuery.length < LIMITS.MIN_SEARCH_LENGTH) {
            await this.bot.sendMessage(chatId, 
                `⚠️ Запит занадто короткий. Мінімум ${LIMITS.MIN_SEARCH_LENGTH} символи.`);
            return;
        }

        logger.userAction(chatId, 'search_command', { query: searchQuery });
        
        const filters = { text: searchQuery };
        await this.contractHandlers.showContractsList(chatId, 1, filters);
    }

    // Команда /regen <номер>
    async handleRegenerate(msg, match) {
        const chatId = msg.chat.id;
        const contractNumber = match && match[1] ? match[1].trim() : '';
        
        if (!contractNumber) {
            await this.bot.sendMessage(chatId, 
                '⚠️ Вкажіть номер договору: наприклад, `/regen W-24-01`', 
                { parse_mode: 'Markdown' });
            return;
        }

        if (!REGEX_PATTERNS.CONTRACT_NUMBER.test(contractNumber)) {
            await this.bot.sendMessage(chatId, 
                '⚠️ Неправильний формат номера договору. Очікується: W-YY-XX');
            return;
        }

        logger.userAction(chatId, 'regen_command', { contractNumber });
        await this.contractHandlers.regenerateContract(chatId, contractNumber);
    }

    // Команда /invoice <номер>
    async handleInvoice(msg, match) {
        const chatId = msg.chat.id;
        const contractNumber = match && match[1] ? match[1].trim() : '';
        
        if (!contractNumber) {
            await this.bot.sendMessage(chatId, 
                '⚠️ Вкажіть номер договору: наприклад, `/invoice W-24-01`', 
                { parse_mode: 'Markdown' });
            return;
        }

        if (!REGEX_PATTERNS.CONTRACT_NUMBER.test(contractNumber)) {
            await this.bot.sendMessage(chatId, 
                '⚠️ Неправильний формат номера договору. Очікується: W-YY-XX');
            return;
        }

        logger.userAction(chatId, 'invoice_command', { contractNumber });
        await this.contractHandlers.generateInvoice(chatId, contractNumber);
    }

    // Команда /act <номер>
    async handleAct(msg, match) {
        const chatId = msg.chat.id;
        const contractNumber = match && match[1] ? match[1].trim() : '';
        
        if (!contractNumber) {
            await this.bot.sendMessage(chatId, 
                '⚠️ Вкажіть номер договору: наприклад, `/act W-24-01`', 
                { parse_mode: 'Markdown' });
            return;
        }

        if (!REGEX_PATTERNS.CONTRACT_NUMBER.test(contractNumber)) {
            await this.bot.sendMessage(chatId, 
                '⚠️ Неправильний формат номера договору. Очікується: W-YY-XX');
            return;
        }

        logger.userAction(chatId, 'act_command', { contractNumber });
        await this.contractHandlers.generateAct(chatId, contractNumber);
    }

    // Команда /export [формат]
    async handleExport(msg, match) {
        const chatId = msg.chat.id;
        const format = match && match[1] ? match[1].trim().toLowerCase() : 'excel';
        
        const supportedFormats = ['excel', 'pdf', 'json'];
        if (!supportedFormats.includes(format)) {
            await this.bot.sendMessage(chatId, 
                `⚠️ Непідтримуваний формат. Доступні: ${supportedFormats.join(', ')}`);
            return;
        }

        logger.userAction(chatId, 'export_command', { format });
        await this.handleExportData(chatId, format);
    }

    // Команда /health
    async handleHealth(msg) {
        const chatId = msg.chat.id;
        logger.userAction(chatId, 'health_command');
        
        try {
            const healthStatus = await this.api.healthCheck();
            
            if (healthStatus.healthy) {
                await this.bot.sendMessage(chatId, 
                    `✅ Система працює нормально\n⏱️ Час відповіді: ${healthStatus.responseTime}ms`);
            } else {
                await this.bot.sendMessage(chatId, 
                    `❌ Проблеми з системою: ${healthStatus.error}`);
            }
        } catch (error) {
            logger.botError(error, { action: 'handleHealth', chatId });
            await this.bot.sendMessage(chatId, '❌ Помилка перевірки системи');
        }
    }

    // Парсинг фільтрів для команди /list
    parseListFilters(filterText) {
        if (!filterText) return {};
        
        const filters = {};
        const text = filterText.toLowerCase();

        // Фільтр за статусом
        if (text.includes('активні') || text.includes('активний')) {
            filters.status = 'активний';
        } else if (text.includes('завершені') || text.includes('завершений')) {
            filters.status = 'завершений';
        } else if (text.includes('скасовані') || text.includes('скасований')) {
            filters.status = 'скасований';
        }

        // Фільтр за сумою (>50000)
        const amountMatch = text.match(/[>>=]\s*(\d+)/);
        if (amountMatch) {
            filters.minAmount = parseInt(amountMatch[1]);
        }

        // Фільтр за періодом
        if (text.includes('місяць') || text.includes('грудень') || text.includes('листопад')) {
            filters.period = 'month';
        } else if (text.includes('тиждень')) {
            filters.period = 'week';
        }

        // Текстовий пошук
        if (!filters.status && !filters.minAmount && !filters.period) {
            filters.text = filterText;
        }

        return filters;
    }

    // Експорт даних
    async handleExportData(chatId, format) {
        try {
            const processingMsg = await this.bot.sendMessage(chatId, MESSAGES.EXPORT_PROCESSING);
            
            // Отримуємо всі договори
            const response = await this.api.getContracts(LIMITS.MAX_EXPORT_RECORDS);
            
            if (!response.ok || !response.items) {
                await this.bot.editMessageText(MESSAGES.EXPORT_FAILED, {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                });
                return;
            }

            const contracts = response.items;
            let exportData, fileName, mimeType;

            switch (format) {
                case 'excel':
                    ({ exportData, fileName, mimeType } = this.generateExcelExport(contracts));
                    break;
                case 'pdf':
                    ({ exportData, fileName, mimeType } = this.generatePdfExport(contracts));
                    break;
                case 'json':
                    ({ exportData, fileName, mimeType } = this.generateJsonExport(contracts));
                    break;
            }

            // Відправляємо файл
            await this.bot.sendDocument(chatId, Buffer.from(exportData), {
                filename: fileName,
                contentType: mimeType
            }, {
                caption: `📤 Експорт договорів (${contracts.length} записів)`
            });

            // Видаляємо повідомлення про обробку
            await this.bot.deleteMessage(chatId, processingMsg.message_id);

        } catch (error) {
            logger.botError(error, { action: 'handleExportData', format });
            await this.bot.sendMessage(chatId, MESSAGES.EXPORT_FAILED);
        }
    }

    // Генерація Excel експорту (спрощена версія)
    generateExcelExport(contracts) {
        const csvData = this.contractsToCsv(contracts);
        return {
            exportData: csvData,
            fileName: `contracts_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv'
        };
    }

    // Генерація PDF експорту (спрощена версія)
    generatePdfExport(contracts) {
        const htmlData = this.contractsToHtml(contracts);
        return {
            exportData: htmlData,
            fileName: `contracts_${new Date().toISOString().split('T')[0]}.html`,
            mimeType: 'text/html'
        };
    }

    // Генерація JSON експорту
    generateJsonExport(contracts) {
        return {
            exportData: JSON.stringify(contracts, null, 2),
            fileName: `contracts_${new Date().toISOString().split('T')[0]}.json`,
            mimeType: 'application/json'
        };
    }

    // Конвертація в CSV
    contractsToCsv(contracts) {
        const headers = ['Номер', 'Клієнт', 'Сума', 'Дата', 'Статус', 'Виконавець'];
        const rows = contracts.map(contract => [
            contract.number,
            contract.client,
            contract.amount,
            contract.date,
            contract.status,
            contract.performer
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell || ''}"`).join(','))
            .join('\n');
    }

    // Конвертація в HTML
    contractsToHtml(contracts) {
        const rows = contracts.map(contract => `
            <tr>
                <td>${contract.number}</td>
                <td>${contract.client}</td>
                <td>${MessageBuilder.formatAmount(contract.amount)}</td>
                <td>${MessageBuilder.formatDate(contract.date)}</td>
                <td>${contract.status}</td>
                <td>${contract.performer}</td>
            </tr>
        `).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Звіт по договорах</title>
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Звіт по договорах</h1>
            <p>Дата створення: ${new Date().toLocaleDateString('uk-UA')}</p>
            <table>
                <thead>
                    <tr>
                        <th>Номер</th>
                        <th>Клієнт</th>
                        <th>Сума</th>
                        <th>Дата</th>
                        <th>Статус</th>
                        <th>Виконавець</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </body>
        </html>`;
    }
}

module.exports = CommandHandlers;
