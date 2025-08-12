/**
 * Telegram Bot для управління договорами
 * Contract Management Telegram Bot
 */

// Завантаження змінних середовища
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Конфігурація з змінних середовища
const CONFIG = {
    TELEGRAM: {
        BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    },
    FORM_ID: process.env.GOOGLE_FORM_ID || '1Jy7STz5k4y2tUJ-BG0OIGlP72BWNaeY8HHx8kHc31Qs',
    FORM_URL: process.env.GOOGLE_FORM_URL || 'https://docs.google.com/forms/d/e/1FAIpQLScqEjdXsf8Xywfdo-IVoI2iKIkE4aHrypYwmR5uDXTychzINA/viewform?usp=sharing&ouid=109059966451647185106',
    DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '1uVNZTdCgZAu5q-oc7lAzKvn-FRfkJBx9',
    SPREADSHEET_ID: process.env.GOOGLE_SPREADSHEET_ID || '1IG8tGF8g8sulW5snTKt_yUXmscUNUkVOQR9_6UO3vlk',
    GOOGLE_SCRIPT_URL: process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxSBKvSmQ_uTzT9nyQMiaBMufoYda8ndGOrEJz3bEUPdXRQb-3iiMNbdqEch6ybyDUJ/exec',
    API_KEY: process.env.API_KEY || 'a7f89c2d-4e5b-6c8a-9d3f-1e7b4a6c8d9e',
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Створюємо екземпляр бота з покращеними налаштуваннями
if (!CONFIG.TELEGRAM.BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set. Please provide it via .env');
}

// Webhook mode if WEBHOOK_DOMAIN is defined; otherwise fallback to polling
let bot;
const useWebhook = !!process.env.WEBHOOK_DOMAIN;

if (useWebhook) {
    const express = require('express');
    const app = express();
    app.use(express.json());

    const PORT = parseInt(process.env.WEBHOOK_PORT || '3000', 10);
    const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/telegram/webhook';
    const PUBLIC_URL = `https://${process.env.WEBHOOK_DOMAIN}`;
    const SECRET = process.env.WEBHOOK_SECRET_TOKEN || '';

    bot = new TelegramBot(CONFIG.TELEGRAM.BOT_TOKEN, { polling: false });

    // Set webhook with optional secret token
    if (SECRET) {
        bot.setWebHook(`${PUBLIC_URL}${WEBHOOK_PATH}`, { secret_token: SECRET });
    } else {
        bot.setWebHook(`${PUBLIC_URL}${WEBHOOK_PATH}`);
    }

    // Webhook endpoint
    app.post(WEBHOOK_PATH, (req, res) => {
        const tokenHeader = req.get('X-Telegram-Bot-Api-Secret-Token');
        if (SECRET && tokenHeader !== SECRET) return res.sendStatus(401);
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });

    // Simple health endpoint for Traefik checks
    app.get('/healthz', (_req, res) => res.json({ ok: true, mode: 'webhook' }));

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Webhook server listening on ${PORT} at ${PUBLIC_URL}${WEBHOOK_PATH}`);
    });
} else {
    bot = new TelegramBot(CONFIG.TELEGRAM.BOT_TOKEN, {
        polling: {
            interval: 1000,
            autoStart: true,
            params: {
                timeout: 10
            }
        }
    });

    // Обробка помилок polling
    bot.on('polling_error', (error) => {
        console.log('⚠️ Polling error:', error.message);
        console.log('🔄 Перепідключення через 5 секунд...');

        setTimeout(() => {
            console.log('🔄 Перезапуск polling...');
            bot.stopPolling().then(() => {
                bot.startPolling();
            });
        }, 5000);
    });

    console.log('🤖 Bot started in polling mode');
}

/**
 * Головне меню бота
 */
const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📋 Список договорів', '➕ Новий договір'],
            ['💰 Згенерувати рахунок', '📄 Згенерувати акт'],
            ['🔁 Перегенерувати', '✏️ Редагувати договір'],
            ['📊 Статистика', '⚙️ Налаштування']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

/**
 * Обробник команди /start
 */
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🤖 Вітаю! Я бот для управління договорами.

Що я вмію:
📋 Показувати список договорів
💰 Генерувати рахунки
📄 Створювати акти виконаних робіт
📊 Надавати статистику
➕ Допомагати з новими договорами

Оберіть дію з меню нижче:
  `;

    bot.sendMessage(chatId, welcomeMessage, mainMenu);
});

// /regen <номер>
bot.onText(/\/regen(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const number = (match && match[1]) ? match[1].trim() : '';
    if (!number) {
        bot.sendMessage(chatId, '⚠️ Вкажіть номер договору: наприклад, /regen W-24-01');
        return;
    }
    await handleRegenerate(chatId, number);
});

/**
 * Обробник текстових повідомлень
 */
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Пропускаємо команди
    if (text.startsWith('/')) return;

    try {
        switch (text) {
            case '📋 Список договорів':
                await showContractsList(chatId);
                break;

            case '➕ Новий договір':
                await showNewContractForm(chatId);
                break;

            case '💰 Згенерувати рахунок':
                await showInvoiceGeneration(chatId);
                break;

            case '📄 Згенерувати акт':
                await showActGeneration(chatId);
                break;

            case '🔁 Перегенерувати':
                await showRegenerateMenu(chatId);
                break;
            case '✏️ Редагувати договір':
                await startEditFlow(chatId);
                break;

            case '📊 Статистика':
                await showStatistics(chatId);
                break;

            case '⚙️ Налаштування':
                await showSettings(chatId);
                break;

            default:
                bot.sendMessage(chatId, 'Не розумію команду. Оберіть дію з меню.', mainMenu);
        }
    } catch (error) {
        console.error('Помилка обробки повідомлення:', error);
        bot.sendMessage(chatId, '❌ Виникла помилка. Спробуйте пізніше.');
    }
});

/**
 * Показати список договорів
 */
async function showContractsList(chatId) {
    try {
        // Тут буде запит до Google Sheets для отримання списку договорів
        const contracts = await getContractsFromSheets();

        if (contracts.length === 0) {
            bot.sendMessage(chatId, '📋 Список договорів порожній.');
            return;
        }

        let message = '📋 *Список активних договорів:*\n\n';

        contracts.slice(0, 10).forEach((contract, index) => {
            message += `${index + 1}. ${contract.number}\n`;
            message += `   👤 ${contract.client}\n`;
            message += `   💰 ${contract.amount} грн\n`;
            message += `   📅 ${contract.date}\n\n`;
        });

        if (contracts.length > 10) {
            message += `... та ще ${contracts.length - 10} договорів`;
        }

        // Додаємо inline кнопки для дій
        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📄 Деталі', callback_data: 'contract_details' },
                        { text: '💰 Рахунок', callback_data: 'generate_invoice' }
                    ],
                    [
                        { text: '📝 Акт', callback_data: 'generate_act' },
                        { text: '🔍 Пошук', callback_data: 'search_contract' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, message, options);
    } catch (error) {
        console.error('Помилка отримання списку договорів:', error);
        bot.sendMessage(chatId, '❌ Помилка отримання даних з таблиці.');
    }
}

/**
 * Форма для нового договору
 */
async function showNewContractForm(chatId) {
    const message = `
➕ *Створення нового договору*

Для створення нового договору заповніть форму в Google Forms:
${CONFIG.FORM_URL}

📋 Поля форми:
• Клієнт (назва організації)
• Вид діяльності  
• Директор/Керівник
• ЄДРПОУ замовника
• Опис робіт/послуг
• Вартість (в гривнях)
• Виконавець

Після заповнення форми договір буде автоматично створений і ви отримаєте сповіщення в цьому чаті.
  `;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📝 Заповнити форму', url: CONFIG.FORM_URL }],
                [{ text: '📁 Папка з договорами', url: `https://drive.google.com/drive/folders/${CONFIG.DRIVE_FOLDER_ID}` }],
                [{ text: '🔙 Назад до меню', callback_data: 'back_to_menu' }]
            ]
        }
    };

    bot.sendMessage(chatId, message, options);
}

/**
 * Генерація рахунку
 */
async function showInvoiceGeneration(chatId) {
    const message = `
💰 *Генерація рахунку*

Оберіть договір для якого потрібно згенерувати рахунок:
  `;

    try {
        const contracts = await getActiveContracts();

        if (contracts.length === 0) {
            bot.sendMessage(chatId, '📋 Немає активних договорів для генерації рахунків.');
            return;
        }

        const inlineKeyboard = contracts.slice(0, 5).map(contract => [
            { text: `${contract.number} - ${contract.client}`, callback_data: `invoice_${contract.number}` }
        ]);

        inlineKeyboard.push([{ text: '🔙 Назад до меню', callback_data: 'back_to_menu' }]);

        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        };

        bot.sendMessage(chatId, message, options);
    } catch (error) {
        console.error('Помилка при генерації рахунку:', error);
        bot.sendMessage(chatId, '❌ Помилка отримання списку договорів.');
    }
}

/**
 * Генерація акту виконаних робіт
 */
async function showActGeneration(chatId) {
    const message = `
📄 *Генерація акту виконаних робіт*

Оберіть договір для якого потрібно згенерувати акт:
  `;

    try {
        const contracts = await getActiveContracts();

        if (contracts.length === 0) {
            bot.sendMessage(chatId, '📋 Немає активних договорів для генерації актів.');
            return;
        }

        const inlineKeyboard = contracts.slice(0, 5).map(contract => [
            { text: `${contract.number} - ${contract.client}`, callback_data: `act_${contract.number}` }
        ]);

        inlineKeyboard.push([{ text: '🔙 Назад до меню', callback_data: 'back_to_menu' }]);

        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        };

        bot.sendMessage(chatId, message, options);
    } catch (error) {
        console.error('Помилка при генерації акту:', error);
        bot.sendMessage(chatId, '❌ Помилка отримання списку договорів.');
    }
}

/**
 * Показати статистику
 */
async function showStatistics(chatId) {
    try {
        const stats = await getContractStatistics();

        const message = `
📊 *Статистика договорів*

📋 Всього договорів: ${stats.total}
✅ Активних: ${stats.active}
✔️ Виконаних: ${stats.completed}
❌ Скасованих: ${stats.cancelled}

💰 Загальна сума активних: ${stats.totalAmount} грн
📅 Середній термін виконання: ${stats.avgDuration} днів

🎯 За поточний місяць:
   ➕ Створено: ${stats.thisMonth.created}
   ✅ Завершено: ${stats.thisMonth.completed}
   💰 Сума: ${stats.thisMonth.amount} грн
    `;

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Помилка отримання статистики:', error);
        bot.sendMessage(chatId, '❌ Помилка отримання статистики.');
    }
}

/**
 * Налаштування
 */
async function showSettings(chatId) {
    const message = `
⚙️ *Налаштування системи*

🔧 Поточні налаштування:
• Автосповіщення: ✅ Увімкнено
• Формат номера: W-(YY)-XX
• Папка Drive: Налаштовано
• Telegram чат: ${chatId}

📝 Доступні дії:
  `;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔔 Сповіщення', callback_data: 'settings_notifications' },
                    { text: '📁 Drive', callback_data: 'settings_drive' }
                ],
                [
                    { text: '📊 Експорт даних', callback_data: 'export_data' },
                    { text: '🔙 Назад до меню', callback_data: 'back_to_menu' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, message, options);
}

/**
 * Обробник callback запитів
 */
bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;

    try {
        switch (action) {
            case 'back_to_menu':
                bot.sendMessage(chatId, 'Оберіть дію:', mainMenu);
                break;

            case 'contract_details':
                bot.sendMessage(chatId, '🚧 Функція в розробці. Використовуйте "📋 Список договорів"');
                break;

            case 'search_contract':
                bot.sendMessage(chatId, '🚧 Функція в розробці. Використовуйте "📋 Список договорів"');
                break;

            default:
                if (action.startsWith('invoice_')) {
                    const contractNumber = action.replace('invoice_', '');
                    await generateInvoiceForContract(chatId, contractNumber);
                } else if (action.startsWith('act_')) {
                    const contractNumber = action.replace('act_', '');
                    await generateActForContract(chatId, contractNumber);
                } else if (action.startsWith('regen_')) {
                    const contractNumber = action.replace('regen_', '');
                    await handleRegenerate(chatId, contractNumber);
                } else if (action.startsWith('edit_')) {
                    const contractNumber = action.replace('edit_', '');
                    await promptEditContract(chatId, contractNumber);
                }
        }
    } catch (error) {
        console.error('Помилка обробки callback:', error);
        bot.sendMessage(chatId, '❌ Виникла помилка при обробці запиту.');
    }

    // Підтверджуємо callback
    bot.answerCallbackQuery(callbackQuery.id);
});

// Меню перегенерації документів
async function showRegenerateMenu(chatId) {
    const message = `\n🔁 Перегенерація документів\n\nОберіть договір для повної перегенерації (договір/рахунок/акт):`;
    try {
        const contracts = await getActiveContracts();
        if (contracts.length === 0) {
            bot.sendMessage(chatId, '📋 Немає активних договорів для перегенерації.');
            return;
        }
        const inlineKeyboard = contracts.slice(0, 5).map(c => [
            { text: `${c.number} - ${c.client}`, callback_data: `regen_${c.number}` },
            { text: '✏️ Редагувати', callback_data: `edit_${c.number}` }
        ]);
        inlineKeyboard.push([{ text: '🔙 Назад до меню', callback_data: 'back_to_menu' }]);
        const options = { reply_markup: { inline_keyboard: inlineKeyboard } };
        bot.sendMessage(chatId, message, options);
    } catch (err) {
        console.error('Помилка меню перегенерації:', err);
        bot.sendMessage(chatId, '❌ Помилка отримання списку договорів.');
    }
}

// Виклик GAS Web App для перегенерації
async function handleRegenerate(chatId, contractNumber) {
    if (!CONFIG.GOOGLE_SCRIPT_URL || !CONFIG.API_KEY) {
        bot.sendMessage(chatId, '⚠️ Не налаштовано GOOGLE_SCRIPT_URL або API_KEY у .env');
        return;
    }
    try {
        await bot.sendMessage(chatId, `🔁 Запускаю перегенерацію для договору ${contractNumber}...`);
        const res = await axios.get(CONFIG.GOOGLE_SCRIPT_URL, {
            params: { action: 'regenerate', number: contractNumber, key: CONFIG.API_KEY },
            timeout: 30000
        });
        const data = res.data || {};
        if (data.ok) {
            let msg = `✅ Готово. Оновлені документи для ${contractNumber}.`;
            if (data.contractUrl) msg += `\n• Договір: ${data.contractUrl}`;
            if (data.invoiceUrl) msg += `\n• Рахунок: ${data.invoiceUrl}`;
            if (data.actUrl) msg += `\n• Акт: ${data.actUrl}`;
            bot.sendMessage(chatId, msg);
        } else {
            bot.sendMessage(chatId, `❌ Помилка: ${data.error || 'невідома'}`);
        }
    } catch (err) {
        console.error('Regenerate error:', err.response?.data || err.message);
        bot.sendMessage(chatId, '❌ Помилка виклику Web App. Перевірте URL/API_KEY.');
    }
}

/**
 * Функції для роботи з Google Sheets API
 */

async function getContractsFromSheets() {
    // Отримуємо список з GAS Web App
    try {
        const data = await axios.get(CONFIG.GOOGLE_SCRIPT_URL, {
            params: { action: 'contracts', key: CONFIG.API_KEY, limit: 50 },
            timeout: 30000
        });
        const res = data.data || {};
        if (res.ok && Array.isArray(res.items)) return res.items;
        return [];
    } catch (e) {
        console.error('contracts fetch error:', e.response?.data || e.message);
        return [];
    }
}

async function getActiveContracts() {
    const allContracts = await getContractsFromSheets();
    return allContracts.filter(contract => (contract.status || '').toLowerCase() === 'активний' || !contract.status);
}

async function getContractStatistics() {
    try {
        const data = await axios.get(CONFIG.GOOGLE_SCRIPT_URL, {
            params: { action: 'stats', key: CONFIG.API_KEY },
            timeout: 30000
        });
        const res = data.data || {};
        if (res.ok && res.stats) return res.stats;
        return { total: 0, active: 0, completed: 0, cancelled: 0, totalAmount: '0', avgDuration: 0, thisMonth: { created: 0, completed: 0, amount: '0' } };
    } catch (e) {
        console.error('stats fetch error:', e.response?.data || e.message);
        return { total: 0, active: 0, completed: 0, cancelled: 0, totalAmount: '0', avgDuration: 0, thisMonth: { created: 0, completed: 0, amount: '0' } };
    }
}

async function generateInvoiceForContract(chatId, contractNumber) {
    bot.sendMessage(chatId, `💰 Генерую рахунок для договору ${contractNumber}...`);
    try {
        const res = await axios.get(CONFIG.GOOGLE_SCRIPT_URL, {
            params: { action: 'generateInvoice', number: contractNumber, key: CONFIG.API_KEY },
            timeout: 30000
        });
        if (res.data?.ok) {
            bot.sendMessage(chatId, `✅ Рахунок створено. Посилання: ${res.data.url}`);
        } else {
            bot.sendMessage(chatId, `❌ Помилка: ${res.data?.error || 'невідома'}`);
        }
    } catch (e) {
        console.error('generateInvoice error:', e.response?.data || e.message);
        bot.sendMessage(chatId, '❌ Помилка при створенні рахунку.');
    }
}

async function generateActForContract(chatId, contractNumber) {
    bot.sendMessage(chatId, `📄 Генерую акт виконаних робіт для договору ${contractNumber}...`);
    try {
        const res = await axios.get(CONFIG.GOOGLE_SCRIPT_URL, {
            params: { action: 'generateAct', number: contractNumber, key: CONFIG.API_KEY },
            timeout: 30000
        });
        if (res.data?.ok) {
            bot.sendMessage(chatId, `✅ Акт створено. Посилання: ${res.data.url}`);
        } else {
            bot.sendMessage(chatId, `❌ Помилка: ${res.data?.error || 'невідома'}`);
        }
    } catch (e) {
        console.error('generateAct error:', e.response?.data || e.message);
        bot.sendMessage(chatId, '❌ Помилка при створенні акту.');
    }
}

/**
 * Функція для відправки сповіщень про нові договори
 */
function sendNewContractNotification(contractData) {
    const message = `
🎉 *Новий договір створено!*

📋 Номер: ${contractData.number}
🏢 Клієнт: ${contractData.client}
💰 Сума: ${contractData.amount} грн
👤 Виконавець: ${contractData.performer}

📄 [Переглянути документ](${contractData.documentUrl})
📁 [Відкрити папку](${contractData.folderUrl})
  `;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💰 Створити рахунок', callback_data: `invoice_${contractData.number}` },
                    { text: '📄 Створити акт', callback_data: `act_${contractData.number}` }
                ],
                [
                    { text: '🔁 Перегенерувати', callback_data: `regen_${contractData.number}` }
                ]
            ]
        }
    };

    bot.sendMessage(CONFIG.TELEGRAM.CHAT_ID, message, options);
}

// Експорт функцій для використання в інших модулях
module.exports = {
    bot,
    sendNewContractNotification
};

// Старт простого потоку редагування
async function startEditFlow(chatId) {
    const contracts = await getActiveContracts();
    if (contracts.length === 0) {
        bot.sendMessage(chatId, 'Немає активних договорів для редагування.');
        return;
    }
    const inlineKeyboard = contracts.slice(0, 5).map(c => [
        { text: `${c.number} - ${c.client}`, callback_data: `edit_${c.number}` }
    ]);
    inlineKeyboard.push([{ text: '🔙 Назад до меню', callback_data: 'back_to_menu' }]);
    bot.sendMessage(chatId, 'Оберіть договір для редагування:', { reply_markup: { inline_keyboard: inlineKeyboard } });
}

// Простий промпт: користувач надсилає "поле=значення; поле2=значення2"
async function promptEditContract(chatId, contractNumber) {
    bot.sendMessage(chatId, `Надішліть зміни для ${contractNumber} у форматі: поле=значення; поле2=значення2\nНапр.: amount=120000; description=Оновлений опис`);
    const listener = async (msg) => {
        if (msg.chat.id !== chatId) return;
        if (!msg.text || msg.text.startsWith('/')) return;
        bot.removeListener('message', listener);
        const updates = parseKeyValuePairs(msg.text);
        try {
            const res = await axios.get(CONFIG.GOOGLE_SCRIPT_URL, {
                params: { action: 'update', number: contractNumber, key: CONFIG.API_KEY, ...updates },
                timeout: 30000
            });
            if (res.data?.ok) {
                bot.sendMessage(chatId, `✅ Оновлено та перегенеровано.\nДоговір: ${res.data.contractUrl}\nРахунок: ${res.data.invoiceUrl}\nАкт: ${res.data.actUrl}`);
            } else {
                bot.sendMessage(chatId, `❌ Помилка: ${res.data?.error || 'невідома'}`);
            }
        } catch (e) {
            console.error('update error:', e.response?.data || e.message);
            bot.sendMessage(chatId, '❌ Помилка оновлення.');
        }
    };
    bot.on('message', listener);
}

function parseKeyValuePairs(text) {
    const out = {};
    text.split(';').forEach(pair => {
        const [k, ...rest] = pair.split('=');
        if (!k || rest.length === 0) return;
        const key = k.trim();
        const value = rest.join('=').trim();
        if (key && value !== undefined) out[key] = value;
    });
    return out;
}

console.log('🤖 Telegram Bot запущено!');