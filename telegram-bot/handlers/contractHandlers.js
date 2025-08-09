/**
 * Обробники для роботи з договорами
 */

const logger = require('../utils/logger');
const MessageBuilder = require('../utils/messageBuilder');
const { MESSAGES, LIMITS, EMOJI } = require('../utils/constants');

class ContractHandlers {
    constructor(bot, apiClient) {
        this.bot = bot;
        this.api = apiClient;
    }

    // Показати список договорів з пагінацією
    async showContractsList(chatId, page = 1, filters = {}) {
        try {
            logger.userAction(chatId, 'view_contracts_list', { page, filters });
            
            const loadingMsg = await this.bot.sendMessage(chatId, MESSAGES.LOADING);
            
            const response = await this.api.getContracts(LIMITS.MAX_SEARCH_RESULTS);
            
            if (!response.ok || !Array.isArray(response.items)) {
                await this.bot.editMessageText(MESSAGES.NO_CONTRACTS, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
                return;
            }

            let contracts = response.items;
            
            // Застосовуємо фільтри
            if (Object.keys(filters).length > 0) {
                contracts = this.applyFilters(contracts, filters);
            }

            if (contracts.length === 0) {
                await this.bot.editMessageText(MESSAGES.NO_CONTRACTS, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
                return;
            }

            // Пагінація
            const totalPages = Math.ceil(contracts.length / LIMITS.CONTRACTS_PER_PAGE);
            const startIndex = (page - 1) * LIMITS.CONTRACTS_PER_PAGE;
            const endIndex = startIndex + LIMITS.CONTRACTS_PER_PAGE;
            const pageContracts = contracts.slice(startIndex, endIndex);

            const message = MessageBuilder.formatContractsList(pageContracts, page, totalPages);
            const keyboard = this.createContractsListKeyboard(pageContracts, page, totalPages);

            await this.bot.editMessageText(message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'Markdown',
                ...keyboard
            });

        } catch (error) {
            logger.botError(error, { action: 'showContractsList', chatId });
            await this.bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
        }
    }

    // Застосування фільтрів
    applyFilters(contracts, filters) {
        return contracts.filter(contract => {
            // Фільтр за статусом
            if (filters.status && contract.status !== filters.status) {
                return false;
            }

            // Фільтр за сумою
            if (filters.minAmount && parseFloat(contract.amount) < filters.minAmount) {
                return false;
            }

            // Фільтр за періодом
            if (filters.period) {
                const contractDate = new Date(contract.date);
                const now = new Date();
                
                switch (filters.period) {
                    case 'month':
                        if (contractDate.getMonth() !== now.getMonth() || 
                            contractDate.getFullYear() !== now.getFullYear()) {
                            return false;
                        }
                        break;
                    case 'week':
                        const weekAgo = new Date();
                        weekAgo.setDate(now.getDate() - 7);
                        if (contractDate < weekAgo) {
                            return false;
                        }
                        break;
                }
            }

            // Фільтр за текстом (клієнт, номер)
            if (filters.text) {
                const searchText = filters.text.toLowerCase();
                const searchFields = [
                    contract.number,
                    contract.client,
                    contract.description
                ].join(' ').toLowerCase();
                
                if (!searchFields.includes(searchText)) {
                    return false;
                }
            }

            return true;
        });
    }

    // Створення клавіатури для списку договорів
    createContractsListKeyboard(contracts, currentPage, totalPages) {
        const buttons = [];

        // Кнопки дій для кожного договору
        contracts.forEach(contract => {
            buttons.push([
                { 
                    text: `${contract.number} - ${contract.client}`, 
                    callback_data: `contract_details_${contract.number}` 
                }
            ]);
        });

        // Кнопки швидких дій
        buttons.push([
            { text: `${EMOJI.INVOICE} Рахунок`, callback_data: 'quick_invoice' },
            { text: `${EMOJI.ACT} Акт`, callback_data: 'quick_act' },
            { text: `${EMOJI.REGENERATE} Перегенерувати`, callback_data: 'quick_regen' }
        ]);

        // Пагінація
        if (totalPages > 1) {
            const navButtons = [];
            
            if (currentPage > 1) {
                navButtons.push({ 
                    text: `${EMOJI.PREV} Попередня`, 
                    callback_data: `contracts_page_${currentPage - 1}` 
                });
            }
            
            navButtons.push({ 
                text: `${currentPage}/${totalPages}`, 
                callback_data: 'page_info' 
            });
            
            if (currentPage < totalPages) {
                navButtons.push({ 
                    text: `Наступна ${EMOJI.NEXT}`, 
                    callback_data: `contracts_page_${currentPage + 1}` 
                });
            }
            
            buttons.push(navButtons);
        }

        // Фільтри та пошук
        buttons.push([
            { text: `${EMOJI.SEARCH} Пошук`, callback_data: 'search_contracts' },
            { text: '🎛️ Фільтри', callback_data: 'show_filters' }
        ]);

        // Назад до меню
        buttons.push([{ 
            text: '🔙 Назад до меню', 
            callback_data: 'back_to_menu' 
        }]);

        return { reply_markup: { inline_keyboard: buttons } };
    }

    // Показати деталі договору
    async showContractDetails(chatId, contractNumber) {
        try {
            logger.userAction(chatId, 'view_contract_details', { contractNumber });
            
            const loadingMsg = await this.bot.sendMessage(chatId, MESSAGES.LOADING);
            
            // Отримуємо дані договору
            const response = await this.api.getContracts();
            const contract = response.items?.find(c => c.number === contractNumber);
            
            if (!contract) {
                await this.bot.editMessageText(
                    `❌ Договір ${contractNumber} не знайдено.`,
                    {
                        chat_id: chatId,
                        message_id: loadingMsg.message_id
                    }
                );
                return;
            }

            const message = this.formatContractDetails(contract);
            const keyboard = this.createContractDetailsKeyboard(contractNumber);

            await this.bot.editMessageText(message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'Markdown',
                ...keyboard
            });

        } catch (error) {
            logger.botError(error, { action: 'showContractDetails', chatId, contractNumber });
            await this.bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
        }
    }

    // Форматування деталей договору
    formatContractDetails(contract) {
        const status = MessageBuilder.getStatusEmoji(contract.status);
        
        return `📋 **Деталі договору ${contract.number}** ${status}

👤 **Клієнт:** ${contract.client}
💰 **Сума:** ${MessageBuilder.formatAmount(contract.amount)}
📅 **Дата:** ${MessageBuilder.formatDate(contract.date)}
👨‍💼 **Виконавець:** ${contract.performer || 'Не вказано'}
📝 **Статус:** ${contract.status || 'Активний'}

📄 **Опис:**
${contract.description || 'Не вказано'}

🔗 **Документи:**
${contract.contractUrl ? `• [Договір](${contract.contractUrl})` : '• Договір: не створено'}
${contract.invoiceUrl ? `• [Рахунок](${contract.invoiceUrl})` : '• Рахунок: не створено'}
${contract.actUrl ? `• [Акт](${contract.actUrl})` : '• Акт: не створено'}
${contract.folderUrl ? `• [Папка Drive](${contract.folderUrl})` : ''}`;
    }

    // Клавіатура для деталей договору
    createContractDetailsKeyboard(contractNumber) {
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
                    ],
                    [
                        { text: '🔙 До списку', callback_data: 'contracts_page_1' },
                        { text: '🏠 До меню', callback_data: 'back_to_menu' }
                    ]
                ]
            }
        };
    }

    // Генерація рахунку
    async generateInvoice(chatId, contractNumber) {
        try {
            logger.contractAction(contractNumber, 'generate_invoice', chatId);
            
            const processingMsg = await this.bot.sendMessage(
                chatId, 
                `💰 Генерую рахунок для договору ${contractNumber}...`
            );

            const response = await this.api.generateInvoice(contractNumber);
            
            if (response.ok) {
                await this.bot.editMessageText(
                    `✅ Рахунок створено!\n\n📄 [Переглянути рахунок](${response.url})`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            } else {
                await this.bot.editMessageText(
                    `❌ Помилка створення рахунку: ${response.error || 'невідома'}`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id
                    }
                );
            }

        } catch (error) {
            logger.botError(error, { action: 'generateInvoice', contractNumber });
            await this.bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
        }
    }

    // Генерація акту
    async generateAct(chatId, contractNumber) {
        try {
            logger.contractAction(contractNumber, 'generate_act', chatId);
            
            const processingMsg = await this.bot.sendMessage(
                chatId, 
                `📄 Генерую акт для договору ${contractNumber}...`
            );

            const response = await this.api.generateAct(contractNumber);
            
            if (response.ok) {
                await this.bot.editMessageText(
                    `✅ Акт створено!\n\n📄 [Переглянути акт](${response.url})`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            } else {
                await this.bot.editMessageText(
                    `❌ Помилка створення акту: ${response.error || 'невідома'}`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id
                    }
                );
            }

        } catch (error) {
            logger.botError(error, { action: 'generateAct', contractNumber });
            await this.bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
        }
    }

    // Перегенерація договору
    async regenerateContract(chatId, contractNumber) {
        try {
            logger.contractAction(contractNumber, 'regenerate', chatId);
            
            const processingMsg = await this.bot.sendMessage(
                chatId, 
                `🔄 Перегенеровую всі документи для договору ${contractNumber}...`
            );

            const response = await this.api.regenerateContract(contractNumber);
            
            if (response.ok) {
                let message = `✅ Документи оновлено для ${contractNumber}!\n\n`;
                if (response.contractUrl) message += `📋 [Договір](${response.contractUrl})\n`;
                if (response.invoiceUrl) message += `💰 [Рахунок](${response.invoiceUrl})\n`;
                if (response.actUrl) message += `📄 [Акт](${response.actUrl})\n`;

                await this.bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown'
                });
            } else {
                await this.bot.editMessageText(
                    `❌ Помилка перегенерації: ${response.error || 'невідома'}`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id
                    }
                );
            }

        } catch (error) {
            logger.botError(error, { action: 'regenerateContract', contractNumber });
            await this.bot.sendMessage(chatId, MESSAGES.ERROR_GENERIC);
        }
    }
}

module.exports = ContractHandlers;
