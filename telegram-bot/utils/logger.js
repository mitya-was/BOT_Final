/**
 * Централізований логгер для бота
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDir();
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }

    writeToFile(level, formattedMessage) {
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `bot-${date}.log`);
        
        try {
            fs.appendFileSync(logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, meta);
        
        // Завжди виводимо в консоль
        console.log(formattedMessage);
        
        // Записуємо у файл
        this.writeToFile(level, formattedMessage);
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Спеціальні методи для бота
    userAction(chatId, action, details = {}) {
        this.info(`User action: ${action}`, { 
            chatId, 
            action, 
            ...details 
        });
    }

    apiCall(endpoint, params = {}, duration = null) {
        const meta = { endpoint, params };
        if (duration !== null) {
            meta.duration = `${duration}ms`;
        }
        this.info(`API call: ${endpoint}`, meta);
    }

    botError(error, context = {}) {
        this.error(`Bot error: ${error.message}`, {
            error: error.stack,
            context
        });
    }

    contractAction(contractNumber, action, user = null) {
        this.info(`Contract ${action}: ${contractNumber}`, {
            contractNumber,
            action,
            user
        });
    }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;
