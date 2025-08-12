#!/bin/bash
# Скрипт розгортання оптимізованого бота на VPS

set -e  # Зупинка при помилці

echo "🚀 Розгортання WAS Contract Bot v2.0 на VPS..."

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функція для виводу з кольором
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Перевірка середовища
check_environment() {
    print_status "Перевірка середовища..."
    
    # Перевірка Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js не встановлено!"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Потрібна версія Node.js >= 16. Поточна: $(node -v)"
        exit 1
    fi
    
    # Перевірка npm
    if ! command -v npm &> /dev/null; then
        print_error "npm не встановлено!"
        exit 1
    fi
    
    # Перевірка PM2
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 не встановлено. Встановлюю..."
        npm install -g pm2
    fi
    
    print_success "Середовище готове"
}

# Резервне копіювання
backup_old_version() {
    print_status "Створення резервної копії..."
    
    if [ -d "telegram-bot-backup" ]; then
        rm -rf telegram-bot-backup
    fi
    
    if [ -d "telegram-bot" ]; then
        cp -r telegram-bot telegram-bot-backup
        print_success "Резервна копія створена: telegram-bot-backup/"
    fi
}

# Встановлення залежностей
install_dependencies() {
    print_status "Встановлення залежностей..."
    
    cd telegram-bot
    
    # Створення папки для логів
    mkdir -p logs
    
    # Встановлення пакетів
    npm install
    
    print_success "Залежності встановлені"
}

# Налаштування .env
setup_environment() {
    print_status "Перевірка змінних середовища..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env файл не знайдено."
        
        # Перевірити чи є backup з попередньої версії
        if [ -f "../../telegram-bot-backup-v1/.env" ]; then
            print_status "Копіюю .env з backup версії..."
            cp ../../telegram-bot-backup-v1/.env .env
        elif [ -f "env.example" ]; then
            print_warning "Створюю .env з прикладу..."
            cp env.example .env
            print_warning "⚠️  УВАГА: Відредагуйте .env файл з правильними значеннями!"
            print_warning "nano .env"
        else
            print_error ".env файл не знайдено! Створіть його вручну."
            exit 1
        fi
    fi
    
    # Перевірка обов'язкових змінних
    if ! grep -q "TELEGRAM_BOT_TOKEN=" .env || ! grep -q "API_KEY=" .env; then
        print_warning "Перевірте налаштування в .env файлі"
        print_status "Поточний вміст .env:"
        cat .env | grep -v "TOKEN\|KEY" | head -5
    fi
    
    print_success "Змінні середовища налаштовані"
}

# Зупинка старого бота
stop_old_bot() {
    print_status "Зупинка старого бота..."
    
    # Зупинка всіх процесів бота
    pm2 stop was-contract-bot 2>/dev/null || true
    pm2 stop was-contract-bot-v1 2>/dev/null || true
    pm2 stop was-contract-bot-v2 2>/dev/null || true
    pm2 delete was-contract-bot 2>/dev/null || true
    pm2 delete was-contract-bot-v1 2>/dev/null || true
    pm2 delete was-contract-bot-v2 2>/dev/null || true
    
    print_success "Старі процеси зупинені"
}

# Запуск нового бота
start_new_bot() {
    print_status "Запуск оптимізованого бота..."
    
    # Перевірка файлів
    if [ ! -f "bot-optimized.js" ]; then
        print_error "bot-optimized.js не знайдено!"
        exit 1
    fi
    
    if [ ! -f "ecosystem.config.js" ]; then
        print_error "ecosystem.config.js не знайдено!"
        exit 1
    fi
    
    # Запуск через PM2
    pm2 start ecosystem.config.js --env production
    
    # Збереження конфігурації PM2
    pm2 save
    pm2 startup
    
    print_success "Бот запущений!"
}

# Перевірка статусу
check_status() {
    print_status "Перевірка статусу бота..."
    
    sleep 3  # Даємо час на запуск
    
    pm2 status was-contract-bot-v2
    
    # Перевірка логів
    print_status "Останні 10 рядків логів:"
    pm2 logs was-contract-bot-v2 --lines 10
    
    print_success "Розгортання завершено!"
    echo ""
    print_status "Корисні команди:"
    echo "  pm2 status                    # Статус процесів"
    echo "  pm2 logs was-contract-bot-v2  # Перегляд логів"
    echo "  pm2 restart was-contract-bot-v2  # Перезапуск"
    echo "  pm2 stop was-contract-bot-v2     # Зупинка"
    echo "  tail -f logs/bot-\$(date +%Y-%m-%d).log  # Логи бота"
}

# Головна функція
main() {
    echo "🤖 WAS Contract Bot v2.0 Deployment Script"
    echo "=========================================="
    
    check_environment
    backup_old_version
    install_dependencies
    setup_environment
    stop_old_bot
    start_new_bot
    check_status
    
    print_success "🎉 Розгортання успішно завершено!"
    print_status "Бот працює в режимі production з автоматичним перезапуском"
}

# Обробка помилок
trap 'print_error "Розгортання перервано через помилку"; exit 1' ERR

# Запуск
main "$@"
