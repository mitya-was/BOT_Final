#!/bin/bash
# Швидке оновлення бота на VPS до версії 2.0
# Спеціально для існуючої системи в /root/telegram-bot

set -e

# Кольори
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 Оновлення WAS Contract Bot до v2.0"
echo "===================================="

# Перевірка що ми в /root
if [ "$PWD" != "/root" ]; then
    print_error "Запустіть скрипт з /root директорії!"
    print_status "Виконайте: cd /root && ./update-vps.sh"
    exit 1
fi

# Перевірка існуючого бота
if [ ! -d "telegram-bot" ]; then
    print_error "Існуючий бот не знайдено в /root/telegram-bot"
    exit 1
fi

print_status "Знайдено існуючий бот в /root/telegram-bot ✅"

# 1. Резервне копіювання
print_status "1️⃣ Створення backup..."
if [ -d "telegram-bot-backup-v1" ]; then
    rm -rf telegram-bot-backup-v1
fi
cp -r telegram-bot telegram-bot-backup-v1
print_success "Backup створено: telegram-bot-backup-v1/"

# 2. Зупинка поточного бота
print_status "2️⃣ Зупинка поточного бота..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
print_success "Поточний бот зупинено"

# 3. Клонування нового коду
print_status "3️⃣ Завантаження нової версії..."
if [ -d "was-contract-bot-v2" ]; then
    rm -rf was-contract-bot-v2
fi

# Замініть YOUR_GITHUB_REPO на ваш репозиторій
GITHUB_REPO="YOUR_USERNAME/was-contract-bot"
print_status "Клонування з GitHub: $GITHUB_REPO"
git clone https://github.com/$GITHUB_REPO.git was-contract-bot-v2

print_success "Код завантажено"

# 4. Копіювання налаштувань
print_status "4️⃣ Копіювання налаштувань..."
cp telegram-bot/.env was-contract-bot-v2/telegram-bot/.env

# Копіювання логів якщо є
if [ -d "telegram-bot/logs" ]; then
    cp -r telegram-bot/logs was-contract-bot-v2/telegram-bot/
    print_status "Логи скопійовано"
fi

print_success "Налаштування скопійовано"

# 5. Встановлення залежностей
print_status "5️⃣ Встановлення залежностей..."
cd was-contract-bot-v2/telegram-bot
npm install
mkdir -p logs
print_success "Залежності встановлено"

# 6. Запуск нового бота
print_status "6️⃣ Запуск оптимізованого бота..."
pm2 start ecosystem.config.js --env production
pm2 save
print_success "Бот запущено!"

# 7. Перевірка статусу
sleep 3
print_status "7️⃣ Перевірка статусу..."
pm2 status

print_status "Останні логи:"
pm2 logs was-contract-bot-v2 --lines 10

echo ""
print_success "🎉 Оновлення завершено!"
echo ""
print_status "📋 Що змінилось:"
echo "  • Модульна архітектура"
echo "  • 10+ нових команд (/help для перегляду)"
echo "  • Розумний пошук та фільтри"
echo "  • Експорт даних (Excel, PDF, JSON)"
echo "  • Покращене логування"
echo "  • Кешування API запитів"
echo ""
print_status "🧪 Тестування:"
echo "  • Надішліть /health боту"
echo "  • Спробуйте /list для перегляду договорів"
echo "  • Використайте /help для всіх команд"
echo ""
print_status "📊 Корисні команди:"
echo "  pm2 status                     # Статус"
echo "  pm2 logs was-contract-bot-v2   # Логи"
echo "  pm2 restart was-contract-bot-v2  # Перезапуск"
echo ""
print_status "🔄 Rollback (якщо потрібно):"
echo "  pm2 stop was-contract-bot-v2"
echo "  pm2 delete was-contract-bot-v2"
echo "  cd /root/telegram-bot && pm2 start bot.js --name old-bot"
echo ""
print_success "Система готова! 🚀"
