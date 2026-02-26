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
        return false;
    }
}

// Функция для проверки авторизации
function handleApiAuth(req, res, next) {
    console.log(`📨 API запрос: ${req.method} ${req.url}`);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('⚠️ Запрос без авторизации');
        req.isAdmin = false;
        return next();
    }
    
    const initData = authHeader.slice(7);
    const isValid = validateTelegramData(initData);
    
    if (!isValid) {
        console.log('❌ Недействительная подпись initData');
        return res.status(403).json({ error: 'Invalid signature' });
    }
    
    try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
            req.user = JSON.parse(decodeURIComponent(userStr));
            req.isAdmin = req.user.id === ADMIN_ID;
            console.log(`👤 Пользователь: ${req.user.id} (admin: ${req.isAdmin})`);
        }
    } catch (e) {}
    
    next();
}

// Применяем middleware к конкретным маршрутам
app.use('/api/check-admin', handleApiAuth);
app.use('/api/data', handleApiAuth);
app.use('/api/ton-address', handleApiAuth);

// API эндпоинты
app.get('/api/check-admin', (req, res) => {
    res.json({ isAdmin: req.isAdmin || false });
});

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

app.post('/api/data', async (req, res) => {
    console.log('📤 POST /api/data called');
    
    if (!req.isAdmin) {
        return res.status(403).json({ error: 'Admin only' });
    }
    
    try {
        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': API_KEY
            },
            body: JSON.stringify(req.body)
        });
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'Failed to save' });
    }
});

app.get('/api/ton-address', (req, res) => {
    res.json({ address: TON_ADDRESS });
});

module.exports = app;