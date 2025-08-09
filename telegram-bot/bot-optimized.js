/**
 * Оптимізований Telegram Bot для управління договорами
 * Версія 2.0 - Modular & Enhanced
 */

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const logger = require('./utils/logger');
const ApiClient = require('./utils/apiClient');
const MessageBuilder = require('./utils/messageBuilder');
const ContractHandlers = require('./handlers/contractHandlers');
const CommandHandlers = require('./handlers/commandHandlers');

const { MESSAGES, BUTTON_TEXTS, EMOJI } = require('./utils/constants');

// Конфігурація
const CONFIG = {
    TELEGRAM: {
        BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    },
    GOOGLE_SCRIPT_URL: process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxSBKvSmQ_uTzT9nyQMiaBMufoYda8ndGOrEJz3bEUPdXRQb-3iiMNbdqEch6ybyDUJ/exec',
    API_KEY: process.env.API_KEY || 'a7f89c2d-4e5b-6c8a-9d3f-1e7b4a6c8d9e',
    FORM_URL: process.env.GOOGLE_FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLScqEjdXsf8Xywfdo-IVoI2iKIkE4aHrypYwmR5uDXTychzINA/viewform',
    DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '1uVNZTdCgZAu5q-oc7lAzKvn-FRfkJBx9'
};

// Валідація конфігурації
if (!CONFIG.TELEGRAM.BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set. Please provide it via .env');
}

// Ініціалізація компонентів
const bot = new TelegramBot(CONFIG.TELEGRAM.BOT_TOKEN, {
    polling: {
        interval: 1000,
        autoStart: true,
        params: { timeout: 10 }
    }
});

const apiClient = new ApiClient(CONFIG.GOOGLE_SCRIPT_URL, CONFIG.API_KEY);
const contractHandlers = new ContractHandlers(bot, apiClient);
const commandHandlers = new CommandHandlers(bot, apiClient, contractHandlers);

// Глобальна обробка помилок
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    process.exit(1);
});

// Обробка помилок polling
bot.on('polling_error', (error) => {
    logger.warn('Polling error:', { error: error.message });
    
    setTimeout(() => {
        logger.info('Restarting polling...');
        bot.stopPolling().then(() => {
            bot.startPolling();
        });
    }, 5000);
});

// ==================== ОБРОБНИКИ КОМАНД ====================

// Команда /start
bot.onText(/\/start/, (msg) => commandHandlers.handleStart(msg));

// Команда /help
bot.onText(/\/help/, (msg) => commandHandlers.handleHelp(msg));

// Команда /list [фільтр]
bot.onText(/\/list(?:\s+(.+))?/, (msg, match) => commandHandlers.handleList(msg, match));

// Команда /stats
bot.onText(/\/stats/, (msg) => commandHandlers.handleStats(msg));

// Команда /search <запит>
bot.onText(/\/search(?:\s+(.+))?/, (msg, match) => commandHandlers.handleSearch(msg, match));

// Команда /regen <номер>
bot.onText(/\/regen(?:\s+(\S+))?/, (msg, match) => commandHandlers.handleRegenerate(msg, match));

// Команда /invoice <номер>
bot.onText(/\/invoice(?:\s+(\S+))?/, (msg, match) => commandHandlers.handleInvoice(msg, match));

// Команда /act <номер>
bot.onText(/\/act(?:\s+(\S+))?/, (msg, match) => commandHandlers.handleAct(msg, match));

// Команда /export [формат]
bot.onText(/\/export(?:\s+(\w+))?/, (msg, match) => commandHandlers.handleExport(msg, match));

// Команда /health
bot.onText(/\/health/, (msg) => commandHandlers.handleHealth(msg));

// ==================== ОБРОБНИКИ ТЕКСТОВИХ ПОВІДОМЛЕНЬ ====================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Пропускаємо команди (вони обробляються окремо)
    if (text.startsWith('/')) return;

    try {
        logger.userAction(chatId, 'text_message', { text });

        switch (text) {
            case BUTTON_TEXTS.LIST_CONTRACTS:
                await contractHandlers.showContractsList(chatId);
                break;

            case BUTTON_TEXTS.NEW_CONTRACT:
                await showNewContractForm(chatId);
                break;

            case BUTTON_TEXTS.GENERATE_INVOICE:
                await showInvoiceGeneration(chatId);
                break;

            case BUTTON_TEXTS.GENERATE_ACT:
                await showActGeneration(chatId);
                break;

            case BUTTON_TEXTS.REGENERATE:
                await showRegenerateMenu(chatId);
                break;

            case BUTTON_TEXTS.EDIT_CONTRACT:
                await startEditFlow(chatId);
                break;

            case BUTTON_TEXTS.STATISTICS:
                await commandHandlers.handleStats({ chat: { id: chatId } });
                break;

            case BUTTON_TEXTS.SETTINGS:
                await showSettings(chatId);
                break;

            default:
                await bot.sendMessage(chatId, 
                    'Не розумію команду. Оберіть дію з меню або використовуйте /help для довідки.', 
                    MessageBuilder.createMainMenu()
                );
        }
    } catch (error) {
        logger.botError(error, { action: 'text_message_handler', chatId, text });
        await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
});

// ==================== ОБРОБНИКИ CALLBACK ЗАПИТІВ ====================

bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    try {
        logger.userAction(chatId, 'callback_query', { action });

        // Підтверджуємо callback одразу
        await bot.answerCallbackQuery(callbackQuery.id);

        // Роутинг callback'ів
        await handleCallbackQuery(chatId, action, msg);

    } catch (error) {
        logger.botError(error, { action: 'callback_handler', chatId, callback: action });
        await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
});

// ==================== РОУТЕР CALLBACK ЗАПИТІВ ====================

async function handleCallbackQuery(chatId, action, originalMessage) {
    // Базові дії
    if (action === 'back_to_menu') {
        await bot.sendMessage(chatId, 'Оберіть дію:', MessageBuilder.createMainMenu());
        return;
    }

    // Пагінація договорів
    if (action.startsWith('contracts_page_')) {
        const page = parseInt(action.replace('contracts_page_', ''));
        await contractHandlers.showContractsList(chatId, page);
        return;
    }

    // Деталі договору
    if (action.startsWith('contract_details_')) {
        const contractNumber = action.replace('contract_details_', '');
        await contractHandlers.showContractDetails(chatId, contractNumber);
        return;
    }

    // Генерація рахунку
    if (action.startsWith('invoice_')) {
        const contractNumber = action.replace('invoice_', '');
        await contractHandlers.generateInvoice(chatId, contractNumber);
        return;
    }

    // Генерація акту
    if (action.startsWith('act_')) {
        const contractNumber = action.replace('act_', '');
        await contractHandlers.generateAct(chatId, contractNumber);
        return;
    }

    // Перегенерація
    if (action.startsWith('regen_')) {
        const contractNumber = action.replace('regen_', '');
        await contractHandlers.regenerateContract(chatId, contractNumber);
        return;
    }

    // Редагування
    if (action.startsWith('edit_')) {
        const contractNumber = action.replace('edit_', '');
        await startEditContract(chatId, contractNumber);
        return;
    }

    // Фільтри
    if (action.startsWith('filter_')) {
        await handleFilterAction(chatId, action);
        return;
    }

    // Експорт
    if (action.startsWith('export_')) {
        const format = action.replace('export_', '');
        await commandHandlers.handleExportData(chatId, format);
        return;
    }

    // Пошук
    if (action === 'search_contracts') {
        await bot.sendMessage(chatId, MESSAGES.SEARCH_PROMPT);
        return;
    }

    // Швидкі дії
    if (action === 'quick_invoice' || action === 'quick_act' || action === 'quick_regen') {
        await showQuickActionMenu(chatId, action);
        return;
    }

    // Налаштування
    if (action.startsWith('settings_')) {
        await handleSettingsAction(chatId, action);
        return;
    }

    // Невідома дія
    logger.warn('Unknown callback action', { action, chatId });
    await bot.sendMessage(chatId, '⚠️ Невідома дія. Поверніться до головного меню.');
}

// ==================== ДОПОМІЖНІ ФУНКЦІЇ ====================

// Форма нового договору
async function showNewContractForm(chatId) {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📝 Заповнити форму', url: CONFIG.FORM_URL }],
                [{ text: '📁 Папка з договорами', url: `https://drive.google.com/drive/folders/${CONFIG.DRIVE_FOLDER_ID}` }],
                [{ text: '🔙 Назад до меню', callback_data: 'back_to_menu' }]
            ]
        }
    };

    await bot.sendMessage(chatId, MESSAGES.NEW_CONTRACT_FORM, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

// Генерація рахунку (вибір договору)
async function showInvoiceGeneration(chatId) {
    try {
        const contracts = await getActiveContracts();
        
        if (contracts.length === 0) {
            await bot.sendMessage(chatId, MESSAGES.NO_ACTIVE_CONTRACTS);
            return;
        }

        const keyboard = MessageBuilder.createContractsKeyboard(contracts, 'invoice_');
        await bot.sendMessage(chatId, 
            `💰 **Генерація рахунку**\n\nОберіть договір:`, 
            { parse_mode: 'Markdown', ...keyboard }
        );
    } catch (error) {
        logger.botError(error, { action: 'showInvoiceGeneration' });
        await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
}

// Генерація акту (вибір договору)
async function showActGeneration(chatId) {
    try {
        const contracts = await getActiveContracts();
        
        if (contracts.length === 0) {
            await bot.sendMessage(chatId, MESSAGES.NO_ACTIVE_CONTRACTS);
            return;
        }

        const keyboard = MessageBuilder.createContractsKeyboard(contracts, 'act_');
        await bot.sendMessage(chatId, 
            `📄 **Генерація акту**\n\nОберіть договір:`, 
            { parse_mode: 'Markdown', ...keyboard }
        );
    } catch (error) {
        logger.botError(error, { action: 'showActGeneration' });
        await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
}

// Меню перегенерації
async function showRegenerateMenu(chatId) {
    try {
        const contracts = await getActiveContracts();
        
        if (contracts.length === 0) {
            await bot.sendMessage(chatId, MESSAGES.NO_ACTIVE_CONTRACTS);
            return;
        }

        const keyboard = MessageBuilder.createContractsKeyboard(contracts, 'regen_', true);
        await bot.sendMessage(chatId, 
            `🔁 **Перегенерація документів**\n\nОберіть договір:`, 
            { parse_mode: 'Markdown', ...keyboard }
        );
    } catch (error) {
        logger.botError(error, { action: 'showRegenerateMenu' });
        await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
}

// Редагування договору
async function startEditFlow(chatId) {
    try {
        const contracts = await getActiveContracts();
        
        if (contracts.length === 0) {
            await bot.sendMessage(chatId, MESSAGES.NO_ACTIVE_CONTRACTS);
            return;
        }

        const keyboard = MessageBuilder.createContractsKeyboard(contracts, 'edit_');
        await bot.sendMessage(chatId, 
            `✏️ **Редагування договору**\n\nОберіть договір:`, 
            { parse_mode: 'Markdown', ...keyboard }
        );
    } catch (error) {
        logger.botError(error, { action: 'startEditFlow' });
        await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
}

// Початок редагування конкретного договору
async function startEditContract(chatId, contractNumber) {
    await bot.sendMessage(chatId, MESSAGES.EDIT_PROMPT, { parse_mode: 'Markdown' });
    
    // Створюємо listener для наступного повідомлення
    const listener = async (msg) => {
        if (msg.chat.id !== chatId) return;
        if (!msg.text || msg.text.startsWith('/')) return;
        
        bot.removeListener('message', listener);
        await handleEditInput(chatId, contractNumber, msg.text);
    };
    
    bot.on('message', listener);
    
    // Автоматично видаляємо listener через 5 хвилин
    setTimeout(() => {
        bot.removeListener('message', listener);
        bot.sendMessage(chatId, MESSAGES.EDIT_CANCELLED);
    }, 5 * 60 * 1000);
}

// Обробка введення для редагування
async function handleEditInput(chatId, contractNumber, input) {
    try {
        const updates = parseKeyValuePairs(input);
        
        if (Object.keys(updates).length === 0) {
            await bot.sendMessage(chatId, MESSAGES.ERROR_INVALID_FORMAT);
            return;
        }

        logger.contractAction(contractNumber, 'edit', chatId);
        
        const processingMsg = await bot.sendMessage(chatId, 
            `✏️ Оновлюю договір ${contractNumber}...`);

        const response = await apiClient.updateContract(contractNumber, updates);
        
        if (response.ok) {
            let message = MESSAGES.EDIT_SUCCESS + '\n\n';
            if (response.contractUrl) message += `📋 [Договір](${response.contractUrl})\n`;
            if (response.invoiceUrl) message += `💰 [Рахунок](${response.invoiceUrl})\n`;
            if (response.actUrl) message += `📄 [Акт](${response.actUrl})\n`;

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: 'Markdown'
            });
        } else {
            await bot.editMessageText(
                `❌ Помилка оновлення: ${response.error || 'невідома'}`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                }
            );
        }
    } catch (error) {
        logger.botError(error, { action: 'handleEditInput', contractNumber });
        await bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
    }
}

// Налаштування
async function showSettings(chatId) {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔔 Сповіщення', callback_data: 'settings_notifications' },
                    { text: '📁 Drive', callback_data: 'settings_drive' }
                ],
                [
                    { text: '📊 Експорт даних', callback_data: 'export_excel' },
                    { text: '🔧 Система', callback_data: 'settings_system' }
                ],
                [
                    { text: '🔙 Назад до меню', callback_data: 'back_to_menu' }
                ]
            ]
        }
    };

    await bot.sendMessage(chatId, MESSAGES.SETTINGS_HEADER, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

// Обробка дій налаштувань
async function handleSettingsAction(chatId, action) {
    switch (action) {
        case 'settings_system':
            const health = await apiClient.healthCheck();
            const cacheStats = apiClient.getCacheStats();
            
            const systemInfo = `🔧 **Системна інформація**

**API статус:** ${health.healthy ? '✅ Працює' : '❌ Помилка'}
**Час відповіді:** ${health.responseTime || 'N/A'}ms
**Кеш:** ${cacheStats.size} записів
**Версія бота:** 2.0 Optimized
**Час роботи:** ${Math.round(process.uptime() / 60)} хвилин`;

            await bot.sendMessage(chatId, systemInfo, { parse_mode: 'Markdown' });
            break;
            
        default:
            await bot.sendMessage(chatId, '🚧 Ця функція в розробці.');
    }
}

// ==================== УТИЛІТИ ====================

// Отримання активних договорів
async function getActiveContracts() {
    try {
        const response = await apiClient.getContracts();
        if (response.ok && Array.isArray(response.items)) {
            return response.items.filter(contract => 
                (contract.status || '').toLowerCase() === 'активний' || !contract.status
            );
        }
        return [];
    } catch (error) {
        logger.error('Failed to get active contracts', { error: error.message });
        return [];
    }
}

// Парсинг пар ключ=значення
function parseKeyValuePairs(text) {
    const pairs = {};
    text.split(';').forEach(pair => {
        const [key, ...valueParts] = pair.split('=');
        if (key && valueParts.length > 0) {
            const trimmedKey = key.trim();
            const value = valueParts.join('=').trim();
            if (trimmedKey && value) {
                pairs[trimmedKey] = value;
            }
        }
    });
    return pairs;
}

// ==================== ПУБЛІЧНІ ФУНКЦІЇ ====================

// Функція для відправки сповіщень про нові договори
function sendNewContractNotification(contractData) {
    const message = MessageBuilder.formatNewContractNotification(contractData);
    const keyboard = MessageBuilder.createNewContractKeyboard(contractData.number);

    bot.sendMessage(CONFIG.TELEGRAM.CHAT_ID, message, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

// ==================== ЗАПУСК ====================

logger.info('🤖 Optimized Telegram Bot started!', {
    version: '2.0',
    features: ['Modular Architecture', 'Enhanced Logging', 'API Caching', 'Rich Commands']
});

// Експорт для використання в інших модулях
module.exports = {
    bot,
    sendNewContractNotification,
    apiClient
};

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down bot...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Shutting down bot...');
    bot.stopPolling();
    process.exit(0);
});
