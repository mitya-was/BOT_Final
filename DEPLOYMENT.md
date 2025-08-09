# 🚀 Інструкція по розгортанню на VPS

## 📋 **Передумови:**

### **Системні вимоги:**
- Ubuntu/Debian/CentOS сервер
- Node.js >= 16.0.0
- npm >= 8.0.0
- PM2 (встановлюється автоматично)
- Git

### **Доступи:**
- SSH доступ до VPS
- Telegram Bot Token
- Google Apps Script Web App URL + API Key

---

## 🔧 **Автоматичне розгортання:**

### **1️⃣ Клонування проекту:**
```bash
# На VPS сервері
git clone https://github.com/your-username/was-contract-bot.git
cd was-contract-bot
```

### **2️⃣ Запуск скрипту розгортання:**
```bash
# Надати права на виконання (якщо потрібно)
chmod +x deploy-vps.sh

# Запустити розгортання
./deploy-vps.sh
```

Скрипт автоматично:
- ✅ Перевірить середовище
- ✅ Створить резервну копію
- ✅ Встановить залежності
- ✅ Налаштує .env файл
- ✅ Зупинить старий бот
- ✅ Запустить новий бот
- ✅ Налаштує автозапуск

### **3️⃣ Налаштування .env:**
```bash
cd telegram-bot
nano .env
```

Вставити ваші дані:
```env
TELEGRAM_BOT_TOKEN=1234567890:AAGhnyEswcHCVvwxwpBzeQIH58vALOpT1HA
TELEGRAM_CHAT_ID=156212174
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx.../exec
API_KEY=a7f89c2d-4e5b-6c8a-9d3f-1e7b4a6c8d9e
```

### **4️⃣ Перезапуск бота:**
```bash
pm2 restart was-contract-bot-v2
```

---

## 📊 **Управління ботом:**

### **PM2 команди:**
```bash
# Статус всіх процесів
pm2 status

# Логи бота
pm2 logs was-contract-bot-v2

# Перезапуск
pm2 restart was-contract-bot-v2

# Зупинка
pm2 stop was-contract-bot-v2

# Видалення процесу
pm2 delete was-contract-bot-v2

# Моніторинг в реальному часі
pm2 monit
```

### **Логи бота:**
```bash
# Логи через PM2
pm2 logs was-contract-bot-v2 --lines 50

# Логи бота (структуровані)
tail -f telegram-bot/logs/bot-$(date +%Y-%m-%d).log

# Всі логи за сьогодні
cat telegram-bot/logs/bot-$(date +%Y-%m-%d).log
```

---

## 🔍 **Діагностика проблем:**

### **Перевірка здоров'я системи:**
```bash
# В Telegram боті
/health

# Через curl (якщо є Web App)
curl "$GOOGLE_SCRIPT_URL?action=health&key=$API_KEY"
```

### **Часті проблеми:**

1. **Бот не запускається:**
   ```bash
   # Перевірити .env файл
   cat telegram-bot/.env
   
   # Перевірити логи помилок
   pm2 logs was-contract-bot-v2 --err --lines 20
   ```

2. **API помилки:**
   ```bash
   # Перевірити Google Apps Script URL
   curl -I "$GOOGLE_SCRIPT_URL"
   
   # Перевірити API ключ
   echo $API_KEY
   ```

3. **Проблеми з пам'яттю:**
   ```bash
   # Моніторинг ресурсів
   pm2 monit
   
   # Перезапуск при перевищенні пам'яті
   pm2 restart was-contract-bot-v2
   ```

---

## 🔄 **Оновлення бота:**

### **Оновлення коду:**
```bash
# Зупинити бот
pm2 stop was-contract-bot-v2

# Оновити код з GitHub
git pull origin main

# Встановити нові залежності (якщо є)
cd telegram-bot && npm install

# Запустити бот
pm2 start was-contract-bot-v2
```

### **Rollback до попередньої версії:**
```bash
# Зупинити новий бот
pm2 stop was-contract-bot-v2

# Відновити з backup
rm -rf telegram-bot
mv telegram-bot-backup telegram-bot

# Запустити старий бот
cd telegram-bot
pm2 start bot.js --name was-contract-bot-v1
```

---

## 📈 **Моніторинг та обслуговування:**

### **Щоденні завдання:**
```bash
# Перевірка статусу
pm2 status

# Перегляд логів за останню годину
pm2 logs was-contract-bot-v2 --lines 100
```

### **Щотижневі завдання:**
```bash
# Очистка старих логів (старше 7 днів)
find telegram-bot/logs/ -name "*.log" -mtime +7 -delete

# Перезапуск для очистки пам'яті
pm2 restart was-contract-bot-v2
```

### **Резервне копіювання:**
```bash
# Backup налаштувань
tar -czf backup-$(date +%Y%m%d).tar.gz telegram-bot/.env telegram-bot/logs/

# Backup на віддалений сервер (опціонально)
scp backup-$(date +%Y%m%d).tar.gz user@backup-server:/backups/
```

---

## 🔐 **Безпека:**

### **Рекомендації:**
1. **Ніколи не commitте .env файли в Git**
2. **Регулярно ротуйте API ключі**
3. **Використовуйте firewall для обмеження доступу**
4. **Моніторьте логи на підозрілу активність**

### **Налаштування firewall:**
```bash
# Дозволити тільки SSH та HTTPS
ufw allow ssh
ufw allow https
ufw enable
```

---

## 📞 **Підтримка:**

При проблемах перевірте:
1. Логи PM2: `pm2 logs was-contract-bot-v2`
2. Логи бота: `tail -f telegram-bot/logs/bot-*.log`
3. Статус системи: `/health` в Telegram
4. Доступність Google Apps Script

**Система готова до продакшну! 🎉**
