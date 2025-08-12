/**
 * API клієнт з retry логікою та кешуванням
 */

const axios = require('axios');
const logger = require('./logger');
const { LIMITS, API_ENDPOINTS } = require('./constants');

class ApiClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 хвилин
    }

    // Генерація ключа для кешу
    getCacheKey(endpoint, params) {
        const sortedParams = Object.keys(params || {})
            .sort()
            .reduce((result, key) => {
                result[key] = params[key];
                return result;
            }, {});
        return `${endpoint}_${JSON.stringify(sortedParams)}`;
    }

    // Перевірка кешу
    getFromCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            logger.debug('Cache hit', { cacheKey });
            return cached.data;
        }
        return null;
    }

    // Збереження в кеш
    saveToCache(cacheKey, data) {
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
        
        // Очистка старого кешу
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    // Основний метод для API викликів з retry
    async makeRequest(endpoint, params = {}, useCache = true) {
        const cacheKey = this.getCacheKey(endpoint, params);
        
        // Перевіряємо кеш для GET запитів
        if (useCache && !this.isWriteOperation(endpoint)) {
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;
        }

        const requestParams = {
            ...params,
            key: this.apiKey
        };

        let lastError;
        const startTime = Date.now();

        for (let attempt = 1; attempt <= LIMITS.RETRY_ATTEMPTS; attempt++) {
            try {
                logger.debug(`API request attempt ${attempt}`, { 
                    endpoint, 
                    params: requestParams 
                });

                const response = await axios.get(this.baseUrl, {
                    params: { action: endpoint, ...requestParams },
                    timeout: LIMITS.API_TIMEOUT
                });

                const duration = Date.now() - startTime;
                logger.apiCall(endpoint, params, duration);

                const data = response.data || {};
                
                if (data.ok) {
                    // Зберігаємо в кеш тільки успішні GET запити
                    if (useCache && !this.isWriteOperation(endpoint)) {
                        this.saveToCache(cacheKey, data);
                    }
                    return data;
                } else {
                    throw new Error(data.error || 'API returned error');
                }

            } catch (error) {
                lastError = error;
                const duration = Date.now() - startTime;
                
                logger.warn(`API request failed, attempt ${attempt}`, {
                    endpoint,
                    error: error.message,
                    duration,
                    attempt
                });

                // Не retry для останньої спроби
                if (attempt < LIMITS.RETRY_ATTEMPTS) {
                    await this.sleep(LIMITS.RETRY_DELAY * attempt);
                }
            }
        }

        // Всі спроби неуспішні
        logger.error('API request failed after all retries', {
            endpoint,
            error: lastError.message,
            attempts: LIMITS.RETRY_ATTEMPTS
        });

        throw lastError;
    }

    // Перевірка чи це операція запису
    isWriteOperation(endpoint) {
        const writeOperations = [
            API_ENDPOINTS.REGENERATE,
            API_ENDPOINTS.GENERATE_INVOICE,
            API_ENDPOINTS.GENERATE_ACT,
            API_ENDPOINTS.UPDATE
        ];
        return writeOperations.includes(endpoint);
    }

    // Утиліта для затримки
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Спеціалізовані методи для різних endpoints

    async getContracts(limit = 50) {
        return await this.makeRequest(API_ENDPOINTS.CONTRACTS, { limit });
    }

    async getStats() {
        return await this.makeRequest(API_ENDPOINTS.STATS);
    }

    async regenerateContract(contractNumber) {
        return await this.makeRequest(API_ENDPOINTS.REGENERATE, { 
            number: contractNumber 
        }, false);
    }

    async generateInvoice(contractNumber) {
        return await this.makeRequest(API_ENDPOINTS.GENERATE_INVOICE, { 
            number: contractNumber 
        }, false);
    }

    async generateAct(contractNumber) {
        return await this.makeRequest(API_ENDPOINTS.GENERATE_ACT, { 
            number: contractNumber 
        }, false);
    }

    async updateContract(contractNumber, updates) {
        return await this.makeRequest(API_ENDPOINTS.UPDATE, { 
            number: contractNumber,
            ...updates
        }, false);
    }

    async healthCheck() {
        try {
            const startTime = Date.now();
            await this.makeRequest(API_ENDPOINTS.HEALTH, {}, false);
            const responseTime = Date.now() - startTime;
            
            logger.info('Health check passed', { responseTime });
            return { healthy: true, responseTime };
        } catch (error) {
            logger.error('Health check failed', { error: error.message });
            return { healthy: false, error: error.message };
        }
    }

    // Очистка кешу
    clearCache() {
        this.cache.clear();
        logger.info('Cache cleared');
    }

    // Статистика кешу
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

module.exports = ApiClient;
