#!/bin/bash

# Скрипт для запуску Telegram Bot
# Script to start Telegram Bot

echo "🤖 Запуск Telegram Bot для системи автоматизації договорів..."
echo "🤖 Starting Telegram Bot for contract automation system..."

# Перевіряємо чи встановлено Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не встановлено. Встановіть Node.js спершу."
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Встановлюємо залежності якщо немає
if [ ! -d "node_modules" ]; then
    echo "📦 Встановлення залежностей..."
    echo "📦 Installing dependencies..."
    npm install
fi

# Перевіряємо наявність файлу бота
if [ ! -f "bot.js" ]; then
    echo "❌ Файл bot.js не знайдено!"
    echo "❌ bot.js file not found!"
    exit 1
fi

echo "✅ Запуск бота..."
echo "✅ Starting bot..."

# Запускаємо бота
node bot.js