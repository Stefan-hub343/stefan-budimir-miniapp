const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Конфигурация
const BOT_TOKEN = process.env.BOT_TOKEN || 'dummy-token';
const BIN_ID = process.env.JSONBIN_ID || '69a06fc543b1c97be9a0c7fd';
const API_KEY = process.env.JSONBIN_KEY || 'dummy-key';
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '800391069');
const TON_ADDRESS = process.env.TON_ADDRESS || 'UQBX5kKdfM_OnE3H-HWkgYEIi1AO_xOtJL3_6NK65KQykpWc';

console.log('🚀 API Server запускается...');
console.log('📦 BIN_ID:', BIN_ID);
console.log('📦 API_KEY:', API_KEY ? '✅ присутствует' : '❌ отсутствует');
console.log('👑 ADMIN_ID:', ADMIN_ID);

// Функция проверки initData
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

// Функция для проверки авторизации
function handleApiAuth(req, res, next) {
    console.log(`📨 API запрос: ${req.method} ${req.url}`);
    
    const authHeader = req.headers.authorization;
    
    // Разрешаем запросы без авторизации в режиме разработки
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('⚠️ Запрос без авторизации');
        req.isAdmin = false;
        req.user = null;
        return next();
    }
    
    const initData = authHeader.slice(7);
    const isValid = validateTelegramData(initData);
    
    if (!isValid) {
        console.log('❌ Недействительная подпись initData');
        // В продакшене возвращаем ошибку, но для разработки пропускаем
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Invalid signature' });
        } else {
            console.log('⚠️ Пропускаем в режиме разработки');
            req.isAdmin = false;
            req.user = null;
            return next();
        }
    }
    
    try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
            req.user = JSON.parse(decodeURIComponent(userStr));
            req.isAdmin = req.user.id === ADMIN_ID;
            console.log(`👤 Пользователь: ${req.user.id} (admin: ${req.isAdmin})`);
        } else {
            req.isAdmin = false;
        }
    } catch (e) {
        console.log('⚠️ Ошибка парсинга user:', e);
        req.isAdmin = false;
    }
    
    next();
}

// Применяем middleware к конкретным маршрутам (БЕЗ ЗВЕЗДОЧЕК!)
app.use('/api/check-admin', handleApiAuth);
app.use('/api/data', handleApiAuth);
app.use('/api/ton-address', handleApiAuth);

// ===== API ЭНДПОИНТЫ =====

// Проверка прав админа
app.get('/api/check-admin', (req, res) => {
    // В режиме разработки (без initData) всегда false
    if (!req.user) {
        console.log('👑 Проверка админа: нет пользователя -> false');
        return res.json({ isAdmin: false });
    }
    console.log(`👑 Проверка админа: ${req.isAdmin ? 'ДА' : 'НЕТ'}`);
    res.json({ isAdmin: req.isAdmin || false });
});

// Получение данных
app.get('/api/data', async (req, res) => {
    console.log('📥 GET /api/data called');
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            headers: { 'X-Access-Key': API_KEY }
        });
        
        if (!response.ok) {
            throw new Error(`JSONBin error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Data received, posts:', data.record.posts?.length);
        res.json(data.record);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Сохранение данных - ДОСТУПНО ВСЕМ ПОЛЬЗОВАТЕЛЯМ (лайки, комментарии, отзывы)
app.post('/api/data', async (req, res) => {
    console.log('📤 POST /api/data called');
    
    // Проверка на админа НЕ НУЖНА - все могут сохранять
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
// Для Vercel нужно экспортировать app
module.exports = app;

// Для локального запуска
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n' + '='.repeat(50));
        console.log(`✅ API Server запущен на порту ${PORT}`);
        console.log(`📍 http://localhost:${PORT}`);
        console.log('🔌 API эндпоинты:');
        console.log('   - GET  /api/check-admin');
        console.log('   - GET  /api/data');
        console.log('   - POST /api/data');
        console.log('   - GET  /api/ton-address');
        console.log('='.repeat(50) + '\n');
    });
}