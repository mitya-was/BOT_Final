# 🚀 Оновлення бота на VPS до версії 2.0

## 📋 **Поточна конфігурація VPS:**
- **Шлях до бота:** `/root/telegram-bot`
- **Поточний .env:** Вже налаштований ✅
- **PM2:** Працює з поточним ботом
- **n8n:** Окремий Docker контейнер
- **Система:** Готова до оновлення

---

## 🔄 **Оновлення до версії 2.0:**

### **1️⃣ Підключення до VPS:**
```bash
ssh root@your-vps-ip
cd /root
```

### **2️⃣ Резервне копіювання поточного бота:**
```bash
# Створити backup поточної версії
cp -r telegram-bot telegram-bot-backup-v1
echo "✅ Backup створено: telegram-bot-backup-v1/"

# Зупинити поточний бот
pm2 stop all
pm2 delete all
```

### **3️⃣ Клонування оновленого проекту:**
```bash
# Клонувати новий код (замініть YOUR_USERNAME)
git clone https://github.com/YOUR_USERNAME/was-contract-bot.git was-contract-bot-v2

# Скопіювати налаштований .env файл
cp telegram-bot/.env was-contract-bot-v2/telegram-bot/.env

# Скопіювати логи (якщо є)
if [ -d "telegram-bot/logs" ]; then
    cp -r telegram-bot/logs was-contract-bot-v2/telegram-bot/
fi
```

### **4️⃣ Встановлення нової версії:**
```bash
cd was-contract-bot-v2
chmod +x deploy-vps.sh

# Запустити оновлення (скрипт адаптований під існуючу систему)
./deploy-vps.sh
```

### **5️⃣ Перевірка роботи:**
```bash
# Статус нового бота
pm2 status

# Логи запуску
pm2 logs was-contract-bot-v2 --lines 20

# Тест в Telegram
# Надішліть /health боту для перевірки
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
