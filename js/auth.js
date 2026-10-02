// ===================================
// АВТОРИЗАЦИЯ ЧЕРЕЗ GOOGLE
// ===================================

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { initializeFirebase, offerDataMigration } from './storage.js';

// Глобальные переменные
let auth = null;
let firestore = null;
let currentUser = null;
let authStateListeners = [];

/**
 * Инициализация Firebase и авторизации
 */
export async function initAuth() {
    // Если Firebase не настроен, работаем в гостевом режиме
    if (!isFirebaseConfigured()) {
        console.info('Firebase не настроен. Работа в гостевом режиме.');
        updateUIForGuest();
        return false;
    }

    try {
        // Динамический импорт Firebase модулей
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
        const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } =
            await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        const { getFirestore, enableIndexedDbPersistence, doc, setDoc, serverTimestamp } =
            await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

        // Инициализация Firebase
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        firestore = getFirestore(app);

        // Включаем офлайн-персистентность
        try {
            await enableIndexedDbPersistence(firestore);
            console.info('Firestore: офлайн-режим включён');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('Персистентность недоступна: несколько вкладок открыто');
            } else if (err.code === 'unimplemented') {
                console.warn('Персистентность недоступна в этом браузере');
            }
        }

        // Инициализируем storage.js с Firebase инстансами
        initializeFirebase(firestore, auth);

        // Проверяем результат редиректа (для мобильных браузеров)
        try {
            const result = await getRedirectResult(auth);
            if (result && result.user) {
                await handleSuccessfulSignIn(result.user);
            }
        } catch (error) {
            handleAuthError(error);
        }

        // Слушаем изменения состояния авторизации
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;

            if (user) {
                // Пользователь вошёл
                await handleSuccessfulSignIn(user);
                updateUIForAuthenticatedUser(user);
            } else {
                // Пользователь вышел или не авторизован
                updateUIForGuest();
            }

            // Уведомляем слушателей
            authStateListeners.forEach(listener => listener(user));
        });

        return true;
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
        updateUIForGuest();
        return false;
    }
}

/**
 * Обработка успешного входа
 */
async function handleSuccessfulSignIn(user) {
    try {
        // Импортируем необходимые функции
        const { doc, setDoc, getDoc, serverTimestamp } =
            await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

        // Создаём/обновляем документ пользователя
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            // Первый вход - создаём профиль
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                settings: {
                    theme: 'auto',
                    notifications: true,
                    viewMode: 'grid'
                }
            });

            // Предлагаем мигрировать локальные данные
            setTimeout(() => offerDataMigration(), 1000);
        } else {
            // Обновляем данные профиля
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp()
            }, { merge: true });
        }
    } catch (error) {
        console.error('Ошибка сохранения данных пользователя:', error);
    }
}

/**
 * Вход через Google
 */
export async function signInWithGoogle() {
    if (!auth) {
        showToast('Авторизация недоступна. Firebase не настроен.', 'error');
        return false;
    }

    try {
        const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
            await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        // Пытаемся использовать popup
        try {
            const result = await signInWithPopup(auth, provider);
            showToast(`Добро пожаловать, ${result.user.displayName}!`, 'success');
            return true;
        } catch (popupError) {
            // Если popup заблокирован или это мобильный браузер, используем redirect
            if (popupError.code === 'auth/popup-blocked' ||
                popupError.code === 'auth/cancelled-popup-request' ||
                isMobileDevice()) {
                console.info('Popup заблокирован, используем redirect');
                await signInWithRedirect(auth, provider);
                return true;
            }
            throw popupError;
        }
    } catch (error) {
        handleAuthError(error);
        return false;
    }
}

/**
 * Выход из аккаунта
 */
export async function signOutUser() {
    if (!auth) {
        return;
    }

    try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        await signOut(auth);
        showToast('Вы вышли из аккаунта', 'info');

        // Перенаправляем на главную, если мы на странице профиля
        if (window.location.pathname.includes('profile.html')) {
            window.location.href = './index.html';
        }
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showToast('Не удалось выйти из аккаунта', 'error');
    }
}

/**
 * Получить текущего пользователя
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Проверка авторизации
 */
export function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Подписка на изменения состояния авторизации
 */
export function onAuthStateChange(callback) {
    authStateListeners.push(callback);
    // Вызываем callback сразу с текущим состоянием
    callback(currentUser);
}

/**
 * Проверка, мобильное ли устройство
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Обработка ошибок авторизации
 */
function handleAuthError(error) {
    console.error('Ошибка авторизации:', error);

    let message = 'Не удалось войти в аккаунт';

    switch (error.code) {
        case 'auth/popup-closed-by-user':
            message = 'Окно входа было закрыто';
            break;
        case 'auth/cancelled-popup-request':
            message = 'Запрос на вход был отменён';
            break;
        case 'auth/popup-blocked':
            message = 'Всплывающее окно заблокировано браузером. Разрешите всплывающие окна для этого сайта.';
            break;
        case 'auth/unauthorized-domain':
            message = 'Этот домен не авторизован для входа через Google. Добавьте домен в Firebase Console.';
            break;
        case 'auth/operation-not-allowed':
            message = 'Вход через Google не включён. Настройте Firebase Authentication.';
            break;
        case 'auth/network-request-failed':
            message = 'Ошибка сети. Проверьте подключение к интернету.';
            break;
        default:
            if (error.message) {
                message = error.message;
            }
    }

    showToast(message, 'error');
}

/**
 * Обновление UI для авторизованного пользователя
 */
function updateUIForAuthenticatedUser(user) {
    // Обновляем шапку сайта
    const authButton = document.getElementById('authButton');
    if (authButton) {
        authButton.innerHTML = `
            <div class="user-profile">
                <img src="${user.photoURL || './assets/default-avatar.png'}"
                     alt="${user.displayName}"
                     class="user-avatar"
                     referrerpolicy="no-referrer">
                <span class="user-name">${user.displayName || 'Пользователь'}</span>
                <span class="dropdown-arrow">▼</span>
            </div>
        `;
        authButton.classList.add('authenticated');

        // Добавляем выпадающее меню
        const dropdown = document.createElement('div');
        dropdown.className = 'auth-dropdown';
        dropdown.innerHTML = `
            <a href="./profile.html" class="dropdown-item">
                <span class="dropdown-icon">👤</span> Профиль
            </a>
            <button id="signOutBtn" class="dropdown-item">
                <span class="dropdown-icon">🚪</span> Выйти
            </button>
        `;

        authButton.appendChild(dropdown);

        // Обработчик выпадающего меню
        authButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // Закрытие меню при клике вне его
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });

        // Обработчик кнопки выхода
        document.getElementById('signOutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            signOutUser();
        });
    }
}

/**
 * Обновление UI для гостя
 */
function updateUIForGuest() {
    const authButton = document.getElementById('authButton');
    if (authButton) {
        authButton.innerHTML = `
            <button class="google-signin-btn" onclick="window.authModule.signInWithGoogle()">
                <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Войти через Google</span>
            </button>
        `;
        authButton.classList.remove('authenticated');
    }
}

/**
 * Показ тост-уведомления
 */
export function showToast(message, type = 'info') {
    // Удаляем существующие тосты
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Стили встроены для независимости от CSS
    const colors = {
        error: '#f44336',
        success: '#4caf50',
        info: '#2196f3',
        warning: '#ff9800'
    };

    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Добавляем анимации в head
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Экспортируем модуль глобально для onclick обработчиков
window.authModule = {
    signInWithGoogle,
    signOutUser
};