const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Статические файлы из текущей папки
app.use(express.static(path.join(__dirname)));

// ===== КОНФИГУРАЦИЯ =====
// Загружаем переменные из .env файла в папке бота
const envPath = path.join(__dirname, '..', 'stefan-budimir-bot', '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const BIN_ID = process.env.JSONBIN_ID || '69a06fc543b1c97be9a0c7fd';
const API_KEY = process.env.JSONBIN_KEY;
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '800391069');
const TON_ADDRESS = process.env.TON_ADDRESS || 'UQBX5kKdfM_OnE3H-HWkgYEIi1AO_xOtJL3_6NK65KQykpWc';

console.log('🚀 Сервер запускается...');
console.log('📦 BIN_ID:', BIN_ID);
console.log('📦 API_KEY:', API_KEY ? '✅' : '❌');
console.log('👑 ADMIN_ID:', ADMIN_ID);

// ===== ФУНКЦИЯ ПРОВЕРКИ INITDATA =====
function validateTelegramData(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();
        
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        return calculatedHash === hash;
    } catch (error) {
        console.error('❌ Ошибка валидации:', error.message);
        return false;
    }
}

// ===== API MIDDLEWARE (исправленный синтаксис) =====
// Вместо '/api/*' используем конкретные маршруты
app.use('/api/check-admin', (req, res, next) => {
    handleApiAuth(req, res, next);
});

app.use('/api/data', (req, res, next) => {
    handleApiAuth(req, res, next);
});

app.use('/api/ton-address', (req, res, next) => {
    handleApiAuth(req, res, next);
});

// Общая функция обработки авторизации для API
function handleApiAuth(req, res, next) {
    console.log(`📨 API запрос: ${req.method} ${req.url}`);
    
    // Для тестирования из браузера пропускаем без проверки
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('⚠️ Запрос без авторизации (режим разработки)');
        req.isAdmin = false;
        req.user = null;
        return next();
    }
    
    const initData = authHeader.slice(7);
    const isValid = validateTelegramData(initData);
    
    if (!isValid) {
        console.log('❌ Недействительная подпись initData');
        return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Получаем данные пользователя
    try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
            req.user = JSON.parse(decodeURIComponent(userStr));
            req.isAdmin = req.user.id === ADMIN_ID;
            console.log(`👤 Пользователь: ${req.user.id} (admin: ${req.isAdmin})`);
        }
    } catch (e) {
        console.log('⚠️ Нет данных пользователя');
    }
    
    next();
}

// ===== API ЭНДПОИНТЫ =====

// Проверка прав админа
app.get('/api/check-admin', (req, res) => {
    res.json({ isAdmin: req.isAdmin || false });
});

// Получение данных
app.get('/api/data', async (req, res) => {
    console.log('📥 Запрос данных из JSONBin...');
    
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            headers: { 'X-Access-Key': API_KEY }
        });
        
        if (!response.ok) {
            console.error('❌ JSONBin ошибка:', response.status);
            return res.status(response.status).json({ error: 'JSONBin error' });
        }
        
        const data = await response.json();
        console.log('✅ Данные получены, постов:', data.record.posts?.length);
        res.json(data.record);
    } catch (error) {
        console.error('❌ Ошибка JSONBin:', error);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// Сохранение данных
app.post('/api/data', async (req, res) => {
    console.log('📤 Сохранение данных...');
    
    if (!req.isAdmin) {
        console.log('⛔ Недостаточно прав для сохранения');
        return res.status(403).json({ error: 'Admin only' });
    }
    
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': API_KEY
            },
            body: JSON.stringify(req.body)
        });
        
        if (response.ok) {
            console.log('✅ Данные сохранены');
            res.json({ success: true });
        } else {
            console.error('❌ JSONBin ошибка:', response.status);
            res.status(response.status).json({ error: 'Failed to save' });
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Получение TON адреса
app.get('/api/ton-address', (req, res) => {
    res.json({ address: TON_ADDRESS });
});

// ===== ЗАПУСК СЕРВЕРА =====
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Комбинированный сервер запущен на порту ${PORT}`);
    console.log(`📍 Локальный адрес: http://localhost:${PORT}`);
    console.log(`📁 Статика: текущая папка`);
    console.log(`🔌 API эндпоинты:`);
    console.log(`   - GET  /api/check-admin`);
    console.log(`   - GET  /api/data`);
    console.log(`   - POST /api/data`);
    console.log(`   - GET  /api/ton-address`);
    console.log('='.repeat(50) + '\n');
});
// Экспортируем app для Vercel (ОЧЕНЬ ВАЖНО!)
module.exports = app;

// Или если хочешь и локально запускать:
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}