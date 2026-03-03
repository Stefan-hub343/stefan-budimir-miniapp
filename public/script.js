// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ===== ПОЛУЧАЕМ INITDATA =====
const initData = tg.initData;
const initDataUnsafe = tg.initDataUnsafe;

// Определяем окружение
const isTelegram = !!initData;
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isVercel = !isLocalhost && !isTelegram && window.location.hostname.includes('vercel.app');

console.log('📦 initData available:', !!initData);
console.log('👤 initDataUnsafe user:', initDataUnsafe?.user);
console.log('📱 Версия Telegram:', tg.version);
console.log('🌐 Окружение:', isTelegram ? 'Telegram' : (isVercel ? 'Vercel Dev' : 'Браузер'));

// URL API
const API_URL = isLocalhost 
    ? 'http://localhost:3001/api'
    : 'https://stefan-budimir-miniapp.vercel.app/api';

console.log('🔗 API URL:', API_URL);

// Состояние приложения
let currentTab = 'feed';
let currentPostId = null;
let posts = [];
let reviews = [];
let adminMode = false;
let isAdmin = false;

// === РЕЖИМ РАЗРАБОТКИ ===
const DEV_USER = {
    id: 800391069,
    first_name: 'Стефан',
    last_name: 'Будимир',
    username: 'stefan_budimir_dev'
};

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Получить заголовки для запроса
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Если есть initData, отправляем его
    if (initData) {
        headers['Authorization'] = 'Bearer ' + initData;
    } else if (isLocalhost || isVercel) {
        // Для разработки используем тестовый режим
        console.log('⚠️ Режим разработки: запрос без initData');
        headers['X-Dev-Mode'] = 'true';
    }
    
    return headers;
}

// === ПРОВЕРКА ПРАВ ===
async function checkAdminStatus() {
    if (isLocalhost) {
        // Только локально считаем себя админом для разработки
        isAdmin = true;
        console.log('👑 Режим локальной разработки: Админ');
        if (currentTab === 'feed' || currentTab === 'reviews') {
            renderCurrentTab();
        }
        return;
    }
    
    if (isVercel) {
        // На Vercel в браузере - НЕ админ
        isAdmin = false;
        console.log('👑 Браузерный режим: не админ');
        if (currentTab === 'feed' || currentTab === 'reviews') {
            renderCurrentTab();
        }
        return;
    }
    
    if (!initData) {
        console.log('❌ Нет initData (не в Telegram)');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/check-admin`, {
            headers: getHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            isAdmin = data.isAdmin || false;
            console.log('👑 Админ:', isAdmin ? 'ДА' : 'НЕТ');
            
            if (currentTab === 'feed' || currentTab === 'reviews') {
                renderCurrentTab();
            }
        } else {
            console.log('⚠️ Не удалось проверить права');
        }
    } catch (error) {
        console.error('❌ Ошибка проверки прав:', error);
    }
}

// === ЗАГРУЗКА ДАННЫХ ===
async function loadData() {
    console.log('📥 Загрузка данных с сервера...');
    
    try {
        const response = await fetch(`${API_URL}/data`, {
            headers: getHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Данные загружены');
        
        posts = data.posts || [];
        reviews = data.reviews || [];
        
        renderCurrentTab();
    } catch (error) {
        console.error('❌ Ошибка:', error);
        
        // Если не в Telegram, показываем тестовые данные
        if (!isTelegram) {
            console.log('📦 Загружаем тестовые данные для браузера');
            posts = [
                {
                    id: 1,
                    author: {
                        id: 1,
                        name: 'Стефан Будимир',
                        username: 'stefan_budimir'
                    },
                    date: new Date().toISOString(),
                    text: 'Тестовый пост для браузера',
                    likes: 5,
                    likedBy: [],
                    comments: [
                        {
                            id: 101,
                            author: {
                                id: 2,
                                name: 'Тестовый пользователь',
                                username: 'test_user'
                            },
                            date: new Date().toISOString(),
                            text: 'Тестовый комментарий'
                        }
                    ]
                },
                {
                    id: 2,
                    author: {
                        id: 1,
                        name: 'Стефан Будимир',
                        username: 'stefan_budimir'
                    },
                    date: new Date().toISOString(),
                    text: 'Еще один тестовый пост',
                    likes: 3,
                    likedBy: [],
                    comments: []
                }
            ];
            reviews = [
                {
                    id: 1,
                    author: {
                        id: 2,
                        name: 'Анна Петрова',
                        username: 'anna_p'
                    },
                    date: new Date().toISOString(),
                    text: 'Отличное приложение!',
                    rating: 5
                },
                {
                    id: 2,
                    author: {
                        id: 3,
                        name: 'Михаил Сидоров',
                        username: 'mikhail_s'
                    },
                    date: new Date().toISOString(),
                    text: 'Очень удобно и красиво',
                    rating: 5
                }
            ];
        }
        
        renderCurrentTab();
    }
}

// === СОХРАНЕНИЕ ДАННЫХ ===
async function saveData() {
    // В браузере сохраняем, но без initData
    if (!isTelegram && !isLocalhost && !isVercel) {
        console.log('⚠️ Сохранение только в Telegram или режиме разработки');
        return false;
    }
    
    try {
        const data = { posts, reviews };
        const response = await fetch(`${API_URL}/data`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            console.log('💾 Данные сохранены');
            return true;
        } else {
            console.error('❌ Ошибка сохранения:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        return false;
    }
}

// === TON CONNECT ===
let tonConnectUI = null;
let connectedWallet = null;

// Инициализация TON Connect
function initTonConnect() {
    const buttonElement = document.getElementById('ton-connect-button');
    if (!buttonElement) {
        console.log('⏳ Элемент ton-connect-button еще не создан');
        return false;
    }
    
    if (window.TON_CONNECT_UI && !tonConnectUI) {
        try {
            const APP_URL = 'https://stefan-budimir-miniapp.vercel.app';
            
            const manifestUrl = 'https://gist.githubusercontent.com/Stefan-hub343/40b366445e2118263733988bae7782a7/raw/88006b868a9be7c72ab41ffd6f61e014d7b51711/tonconnect-manifest.json';
            
            tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
                manifestUrl: manifestUrl,
                buttonRootId: 'ton-connect-button',
                actionsConfiguration: {
                    twaReturnUrl: APP_URL
                }
            });
            
            if (tonConnectUI.wallet) {
                connectedWallet = tonConnectUI.wallet;
                updateWalletUI();
            }
            
            tonConnectUI.onStatusChange(wallet => {
                connectedWallet = wallet;
                updateWalletUI();
                if (wallet) {
                    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                }
            });
            
            console.log('✅ TON Connect инициализирован');
            return true;
        } catch (error) {
            console.error('❌ Ошибка TON Connect:', error);
            return false;
        }
    }
    return false;
}

// Обновление UI после подключения кошелька
function updateWalletUI() {
    const statusEl = document.getElementById('ton-wallet-status');
    const amountButtons = document.querySelectorAll('.ton-amount');
    
    if (!statusEl) return;
    
    if (connectedWallet) {
        const address = connectedWallet.account.address;
        const shortAddress = address.slice(0, 6) + '...' + address.slice(-4);
        
        statusEl.innerHTML = `
            <div class="connected-wallet">
                <span>✅ Подключен: ${shortAddress}</span>
                <button class="disconnect-btn" onclick="disconnectWallet()">❌ Отключить</button>
            </div>
        `;
        
        amountButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    } else {
        statusEl.innerHTML = '';
        amountButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
    }
}

// Отключить кошелек
window.disconnectWallet = async function() {
    if (tonConnectUI) {
        await tonConnectUI.disconnect();
        connectedWallet = null;
        updateWalletUI();
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        tg.showAlert('Кошелек отключен');
    }
};

// Подключить кошелек и отправить донат
window.connectWalletAndDonate = async function(amount) {
    const currentUser = isTelegram ? initDataUnsafe?.user : DEV_USER;
    if (!currentUser) {
        tg.showAlert('Войдите в Telegram, чтобы отправить донат');
        return;
    }
    
    const statusEl = document.getElementById('ton-wallet-status');
    if (statusEl) statusEl.innerHTML = '<div class="wallet-status">⏳ Подключение к кошельку...</div>';
    
    try {
        initTonConnect();
        
        if (!tonConnectUI) {
            throw new Error('TON Connect не инициализирован');
        }
        
        if (!tonConnectUI.wallet) {
            if (statusEl) statusEl.innerHTML = '<div class="wallet-status">⏳ Выберите кошелек...</div>';
            await tonConnectUI.openModal();
            
            let attempts = 0;
            while (!tonConnectUI.wallet && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
        }
        
        if (!tonConnectUI.wallet) {
            throw new Error('Кошелек не подключен');
        }
        
        // Получаем адрес для доната с сервера
        const tonAddressResponse = await fetch(`${API_URL}/ton-address`, {
            headers: getHeaders()
        });
        const { address } = await tonAddressResponse.json();
        
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                {
                    address: address,
                    amount: (amount * 1000000000).toString(),
                    payload: ''
                }
            ]
        };
        
        if (statusEl) statusEl.innerHTML = '<div class="wallet-status">⏳ Подтвердите транзакцию в кошельке...</div>';
        
        const result = await tonConnectUI.sendTransaction(transaction);
        
        if (result) {
            if (statusEl) statusEl.innerHTML = '';
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert(`✅ Спасибо за донат ${amount} TON!`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка TON Connect:', error);
        
        let errorMessage = 'Не удалось отправить донат';
        if (error.message?.includes('rejected')) {
            errorMessage = 'Транзакция отклонена в кошельке';
        } else if (error.message?.includes('timeout')) {
            errorMessage = 'Превышено время ожидания';
        }
        
        if (statusEl) statusEl.innerHTML = `<div class="wallet-status">❌ Ошибка: ${errorMessage}</div>`;
        tg.showAlert(errorMessage);
    }
};

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (diff < oneDay) {
        return `Сегодня в ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diff < 2 * oneDay) {
        return 'Вчера';
    } else {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    }
}

// Аватар пользователя
function getUserAvatar(author) {
    if (!author || !author.name) return '<div class="avatar-placeholder">👤</div>';
    
    const firstLetter = author.name.charAt(0).toUpperCase();
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#D4A5A5'];
    const colorIndex = (author.id || 0) % colors.length;
    const bgColor = colors[colorIndex];
    
    return `<div class="avatar-placeholder" style="background: ${bgColor}">${firstLetter}</div>`;
}

// === РЕНДЕРИНГ ЛЕНТЫ ===
function renderFeed() {
    const container = document.createElement('div');
    container.className = 'feed-container';

    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Пока нет постов</div>';
        return container;
    }

    posts.forEach(post => {
        const currentUser = isTelegram ? initDataUnsafe?.user : DEV_USER;
        const isLiked = currentUser && post.likedBy && post.likedBy.includes(currentUser.id);
        
        const postDiv = document.createElement('div');
        postDiv.className = 'feed-post';
        
        const commentsHtml = (post.comments || []).map(comment => `
            <div class="comment-item ${isAdmin && adminMode ? 'admin-mode' : ''}" data-comment-id="${comment.id}">
                ${isAdmin && adminMode ? `
                    <div class="admin-comment-controls">
                        <button class="admin-btn delete-comment-btn" onclick="deleteComment(${post.id}, ${comment.id})" title="Удалить комментарий">🗑️</button>
                        <button class="admin-btn edit-comment-btn" onclick="editComment(${post.id}, ${comment.id})" title="Редактировать комментарий">✏️</button>
                        <span class="comment-id">ID: ${comment.id}</span>
                    </div>
                ` : ''}
                <div class="comment-avatar">${getUserAvatar(comment.author)}</div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author.name}</span>
                        <span class="comment-author-username">@${comment.author.username || 'user'}</span>
                        <span class="comment-date">${formatDate(comment.date)}</span>
                    </div>
                    <div class="comment-text" id="comment-text-${comment.id}">${comment.text}</div>
                    ${isAdmin && adminMode ? `
                        <div class="comment-edit-form" id="edit-form-${comment.id}" style="display:none;">
                            <textarea id="edit-text-${comment.id}" class="edit-textarea">${comment.text}</textarea>
                            <div class="edit-actions">
                                <button class="save-edit-btn" onclick="saveCommentEdit(${post.id}, ${comment.id})">💾 Сохранить</button>
                                <button class="cancel-edit-btn" onclick="cancelCommentEdit(${comment.id})">❌ Отмена</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        const adminPostControls = isAdmin && adminMode ? `
            <div class="admin-post-controls">
                <button class="admin-btn delete-post-btn" onclick="deletePost(${post.id})" title="Удалить пост">🗑️ Удалить пост</button>
                <button class="admin-btn edit-post-btn" onclick="editPost(${post.id})" title="Редактировать пост">✏️ Редактировать</button>
                <span class="post-id">ID: ${post.id}</span>
            </div>
        ` : '';
        
        const postEditForm = isAdmin && adminMode ? `
            <div class="post-edit-form" id="post-edit-${post.id}" style="display:none;">
                <textarea id="post-text-${post.id}" class="edit-textarea">${post.text}</textarea>
                <div class="edit-actions">
                    <button class="save-edit-btn" onclick="savePostEdit(${post.id})">💾 Сохранить</button>
                    <button class="cancel-edit-btn" onclick="cancelPostEdit(${post.id})">❌ Отмена</button>
                </div>
            </div>
        ` : '';
        
        const imageHtml = post.image ? `
            <div class="post-image">
                <img src="${post.image}" alt="Фото" 
                     onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22400%22 viewBox=%220 0 600 400%22><rect width=%22600%22 height=%22400%22 fill=%22%23667eea%22/><text x=%22300%22 y=%22200%22 font-family=%22Arial%22 font-size=%2224%22 fill=%22white%22 text-anchor=%22middle%22>Фото проекта</text></svg>';">
            </div>
        ` : '';
        
        postDiv.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">${getUserAvatar(post.author)}</div>
                <div class="post-author">
                    <h4>${post.author.name}</h4>
                    <div class="post-author-username">@${post.author.username || 'user'}</div>
                    <div class="post-date">${formatDate(post.date)}</div>
                </div>
            </div>
            ${adminPostControls}
            ${imageHtml}
            <div class="post-content">
                <div class="post-text" id="post-content-${post.id}">${post.text}</div>
            </div>
            ${postEditForm}
            <div class="post-stats">
                <button class="stat-btn like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <span class="stat-icon">❤️</span>
                    <span class="stat-count" id="likes-${post.id}">${post.likes || 0}</span>
                </button>
                <button class="stat-btn" onclick="toggleComments(${post.id})">
                    <span class="stat-icon">💬</span>
                    <span class="stat-count">${post.comments?.length || 0}</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                <div class="comments-list">
                    ${commentsHtml}
                </div>
                <button class="add-comment-btn" onclick="showCommentModal(${post.id})">
                    ✏️ Добавить комментарий
                </button>
            </div>
        `;
        container.appendChild(postDiv);
    });
    
    return container;
}

// === АДМИН-ФУНКЦИИ ===
window.deleteComment = async function(postId, commentId) {
    if (!isAdmin || !adminMode) {
        tg.showAlert('⛔ Доступ запрещен');
        return;
    }
    
    if (!confirm('Удалить этот комментарий?')) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    post.comments = post.comments.filter(c => c.id !== commentId);
    
    if (await saveData()) {
        renderCurrentTab();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert('✅ Комментарий удален');
    }
};

window.editComment = function(postId, commentId) {
    document.getElementById(`comment-text-${commentId}`).style.display = 'none';
    document.getElementById(`edit-form-${commentId}`).style.display = 'block';
};

window.saveCommentEdit = async function(postId, commentId) {
    if (!isAdmin || !adminMode) {
        tg.showAlert('⛔ Доступ запрещен');
        return;
    }
    
    const newText = document.getElementById(`edit-text-${commentId}`).value;
    if (!newText.trim()) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const comment = post.comments.find(c => c.id === commentId);
    if (comment) {
        comment.text = newText;
        
        if (await saveData()) {
            cancelCommentEdit(commentId);
            renderCurrentTab();
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }
    }
};

window.cancelCommentEdit = function(commentId) {
    document.getElementById(`comment-text-${commentId}`).style.display = 'block';
    document.getElementById(`edit-form-${commentId}`).style.display = 'none';
};

window.deletePost = async function(postId) {
    if (!isAdmin || !adminMode) {
        tg.showAlert('⛔ Доступ запрещен');
        return;
    }
    
    if (!confirm('Удалить этот пост полностью? Все комментарии будут удалены!')) return;
    
    posts = posts.filter(p => p.id !== postId);
    
    if (await saveData()) {
        renderCurrentTab();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert('✅ Пост удален');
    }
};

window.editPost = function(postId) {
    if (!isAdmin || !adminMode) {
        tg.showAlert('⛔ Доступ запрещен');
        return;
    }
    
    document.getElementById(`post-content-${postId}`).style.display = 'none';
    document.getElementById(`post-edit-${postId}`).style.display = 'block';
};

window.savePostEdit = async function(postId) {
    if (!isAdmin || !adminMode) {
        tg.showAlert('⛔ Доступ запрещен');
        return;
    }
    
    const newText = document.getElementById(`post-text-${postId}`).value;
    if (!newText.trim()) return;
    
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.text = newText;
        
        if (await saveData()) {
            cancelPostEdit(postId);
            renderCurrentTab();
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }
    }
};

window.cancelPostEdit = function(postId) {
    document.getElementById(`post-content-${postId}`).style.display = 'block';
    document.getElementById(`post-edit-${postId}`).style.display = 'none';
};

window.deleteReview = async function(reviewId) {
    if (!isAdmin || !adminMode) {
        tg.showAlert('⛔ Доступ запрещен');
        return;
    }
    
    if (!confirm('Удалить этот отзыв?')) return;
    
    reviews = reviews.filter(r => r.id !== reviewId);
    
    if (await saveData()) {
        renderCurrentTab();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert('✅ Отзыв удален');
    }
};

window.toggleAdminMode = function() {
    if (!isAdmin) {
        tg.showAlert('⛔ Доступ запрещен');
        return;
    }
    
    adminMode = !adminMode;
    renderCurrentTab();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    tg.showAlert(adminMode ? '🔧 Админ-режим включен' : '👁️ Админ-режим выключен');
};

// === ОСТАЛЬНЫЕ ФУНКЦИИ ===
window.toggleComments = function(postId) {
    const el = document.getElementById(`comments-${postId}`);
    if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
};

window.toggleLike = async function(postId) {
    const currentUser = isTelegram ? initDataUnsafe?.user : DEV_USER;
    if (!currentUser) {
        tg.showAlert('Войдите в Telegram, чтобы ставить лайки');
        return;
    }
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const likedIndex = post.likedBy.indexOf(currentUser.id);
    if (likedIndex === -1) {
        post.likedBy.push(currentUser.id);
        post.likes++;
    } else {
        post.likedBy.splice(likedIndex, 1);
        post.likes--;
    }
    
    document.getElementById(`likes-${postId}`).textContent = post.likes;
    const likeBtn = document.querySelector(`[onclick="toggleLike(${postId})"]`);
    if (likeBtn) {
        likeBtn.classList.toggle('liked', post.likedBy.includes(currentUser.id));
    }
    
    await saveData();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
};

window.showCommentModal = function(postId) {
    const currentUser = isTelegram ? initDataUnsafe?.user : DEV_USER;
    if (!currentUser) {
        tg.showAlert('Войдите в Telegram, чтобы комментировать');
        return;
    }
    
    currentPostId = postId;
    document.getElementById('commentModal').classList.add('active');
};

window.submitComment = async function() {
    const currentUser = isTelegram ? initDataUnsafe?.user : DEV_USER;
    if (!currentUser) {
        tg.showAlert('Войдите в Telegram, чтобы комментировать');
        return;
    }
    
    const text = document.getElementById('commentText').value.trim();
    if (!text) {
        tg.showAlert('Напишите комментарий');
        return;
    }
    
    const post = posts.find(p => p.id === currentPostId);
    if (!post) return;
    
    const newComment = {
        id: Date.now(),
        author: {
            id: currentUser.id,
            name: currentUser.first_name + (currentUser.last_name ? ' ' + currentUser.last_name : ''),
            username: currentUser.username
        },
        date: new Date().toISOString(),
        text: text
    };
    
    post.comments.push(newComment);
    
    if (await saveData()) {
        closeCommentModal();
        if (currentTab === 'feed') {
            renderCurrentTab();
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert('Комментарий добавлен!');
    }
};

window.closeCommentModal = function() {
    document.getElementById('commentModal').classList.remove('active');
    document.getElementById('commentText').value = '';
};

// === ОТЗЫВЫ ===
function renderReviews() {
    const container = document.createElement('div');
    container.className = 'reviews-container';

    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Пока нет отзывов</div>';
    } else {
        reviews.forEach(review => {
            const reviewDiv = document.createElement('div');
            reviewDiv.className = 'review-card';
            
            const adminReviewControls = isAdmin && adminMode ? `
                <div class="admin-review-controls">
                    <button class="admin-btn delete-review-btn" onclick="deleteReview(${review.id})" title="Удалить отзыв">
                        🗑️ Удалить отзыв
                    </button>
                    <span class="review-id">ID: ${review.id}</span>
                </div>
            ` : '';
            
            reviewDiv.innerHTML = `
                <div class="review-header">
                    <div class="review-author-info">
                        <div class="review-avatar">${getUserAvatar(review.author)}</div>
                        <div class="review-author-details">
                            <span class="review-author-name">${review.author.name}</span>
                            <span class="review-author-username">@${review.author.username || 'user'}</span>
                        </div>
                    </div>
                    <span class="review-date">${formatDate(review.date)}</span>
                </div>
                ${adminReviewControls}
                <div class="review-text">${review.text}</div>
                <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
            `;
            container.appendChild(reviewDiv);
        });
    }
    
    const addBtn = document.createElement('button');
    addBtn.className = 'add-review-btn';
    addBtn.textContent = '✏️ Оставить отзыв';
    addBtn.onclick = showReviewModal;
    container.appendChild(addBtn);
    
    return container;
}

window.showReviewModal = function() {
    const currentUser = isTelegram ? initDataUnsafe?.user : DEV_USER;
    if (!currentUser) {
        tg.showAlert('Войдите в Telegram, чтобы оставить отзыв');
        return;
    }
    
    document.getElementById('reviewModal').classList.add('active');
};

window.submitReview = async function() {
    const currentUser = isTelegram ? initDataUnsafe?.user : DEV_USER;
    if (!currentUser) {
        tg.showAlert('Войдите в Telegram, чтобы оставить отзыв');
        return;
    }
    
    const text = document.getElementById('reviewText').value.trim();
    if (!text) {
        tg.showAlert('Напишите отзыв');
        return;
    }
    
    const newReview = {
        id: Date.now(),
        author: {
            id: currentUser.id,
            name: currentUser.first_name + (currentUser.last_name ? ' ' + currentUser.last_name : ''),
            username: currentUser.username
        },
        date: new Date().toISOString(),
        text: text,
        rating: 5
    };
    
    reviews.unshift(newReview);
    
    if (await saveData()) {
        closeModal();
        if (currentTab === 'reviews') {
            renderCurrentTab();
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.showAlert('Спасибо за отзыв! 🙏');
    }
};

window.closeModal = function() {
    document.getElementById('reviewModal').classList.remove('active');
    document.getElementById('reviewText').value = '';
};

// === DONATE ===
function renderDonate() {
    const container = document.createElement('div');
    container.className = 'donate-container';
    
    const tonAmounts = [1, 5, 10, 25];
    const starsAmounts = [10, 25, 50, 100];
    
    container.innerHTML = `
        <div class="donate-icon">❤️</div>
        <h2 class="donate-title">Поддержать проект</h2>
        <p class="donate-description">
            Если вам нравится то, что я делаю, вы можете поддержать меня
        </p>
        
        <div class="donate-options">
            <div class="donate-option">
                <h3>⭐ Telegram Stars</h3>
                <div class="donation-amounts">
                    ${starsAmounts.map(amount => `
                        <button class="amount-btn stars-amount" onclick="donateWithStars(${amount})">
                            ${amount} ⭐
                        </button>
                    `).join('')}
                </div>
                <p class="option-description">
                    Функция появится в следующем обновлении
                </p>
            </div>
            
            <div class="ton-divider">или</div>
            
            <div class="donate-option">
                <h3>💎 TON Криптовалюта</h3>
                <p class="option-description">
                    Поддерживает Tonkeeper, Wallet в Telegram, MyTonWallet
                </p>
                
                <div style="display: flex; justify-content: center; width: 100%; margin: 20px 0;">
                    <div id="ton-connect-button" style="width: 100%; max-width: 280px;"></div>
                </div>
                
                <div class="donation-amounts">
                    ${tonAmounts.map(amount => `
                        <button class="amount-btn ton-amount" onclick="connectWalletAndDonate(${amount})" disabled>
                            ${amount} TON
                        </button>
                    `).join('')}
                </div>
                <div id="ton-wallet-status" class="wallet-status"></div>
            </div>
        </div>

        <p class="donate-footer">
            Спасибо за вашу поддержку! 🙏
        </p>
    `;

    return container;
}

// === ДОНАТ ЧЕРЕЗ TELEGRAM STARS ===
window.donateWithStars = function(amount) {
    tg.showAlert('⭐ Функция доната через Stars появится в следующем обновлении!');
};

// === РЕНДЕРИНГ ТЕКУЩЕЙ ВКЛАДКИ ===
function renderCurrentTab() {
    const content = document.getElementById('content');
    if (!content) return;
    
    content.innerHTML = '';
    
    if (isAdmin && currentTab === 'feed') {
        const adminToggle = document.createElement('div');
        adminToggle.className = 'admin-toggle';
        adminToggle.innerHTML = `
            <button class="admin-toggle-btn ${adminMode ? 'active' : ''}" onclick="toggleAdminMode()">
                🔧 Админ-режим ${adminMode ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
        `;
        content.appendChild(adminToggle);
    }
    
    switch(currentTab) {
        case 'feed':
            content.appendChild(renderFeed());
            break;
        case 'reviews':
            content.appendChild(renderReviews());
            break;
        case 'donate':
            content.appendChild(renderDonate());
            break;
    }
}

// Переключение вкладок
window.switchTab = function(tabId) {
    currentTab = tabId;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    renderCurrentTab();
    
    if (tabId === 'donate') {
        setTimeout(() => initTonConnect(), 300);
    }
    
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus().then(() => {
        loadData();
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
            closeCommentModal();
        }
    });
});