// ===================================
// СТРАНИЦА ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// ===================================

import { MANGA_DATA, Utils, generateChapters } from './data.js';
import { initAuth, isAuthenticated, getCurrentUser, showToast } from './auth.js';
import { getBookmarks, getReadingProgress, getUserReviews, getSettings, setSettings, updateReview, deleteReview } from './storage.js';

let currentTab = 'bookmarks';

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация авторизации
    await initAuth();

    // Проверяем авторизацию
    if (!isAuthenticated()) {
        renderGuestMessage();
        return;
    }

    // Рендерим профиль
    renderProfileHeader();
    initTabs();
    renderCurrentTab();
});

// ===================================
// ГОСТЕВОЕ СООБЩЕНИЕ
// ===================================

function renderGuestMessage() {
    const container = document.querySelector('.profile-page .container');
    if (!container) return;

    container.innerHTML = `
        <div class="guest-message">
            <h2>👤 Профиль пользователя</h2>
            <p>
                Войдите через Google, чтобы получить доступ к вашему профилю,
                закладкам, истории чтения и персональным рекомендациям.
            </p>
            <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                💡 Все ваши данные из гостевого режима будут автоматически
                перенесены в ваш аккаунт при первом входе.
            </p>
        </div>
    `;
}

// ===================================
// ШАПКА ПРОФИЛЯ
// ===================================

function renderProfileHeader() {
    const container = document.getElementById('profileHeader');
    if (!container) return;

    const user = getCurrentUser();
    if (!user) return;

    container.innerHTML = `
        <img src="${user.photoURL || 'https://via.placeholder.com/100'}"
             alt="Аватар"
             class="profile-avatar-large">
        <div class="profile-info">
            <h1 class="profile-name">${Utils.escapeHtml(user.displayName || 'Пользователь')}</h1>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">${Utils.escapeHtml(user.email || '')}</p>
            <div class="profile-stats" id="profileStats">
                <span><strong>0</strong> в закладках</span>
                <span><strong>0</strong> читаю</span>
                <span><strong>0</strong> отзывов</span>
            </div>
        </div>
    `;

    updateProfileStats();
}

async function updateProfileStats() {
    const statsContainer = document.getElementById('profileStats');
    if (!statsContainer) return;

    const bookmarks = await getBookmarks();
    const progress = await getReadingProgress();
    const reviews = await getUserReviews();

    const progressCount = Array.isArray(progress) ? progress.length : Object.keys(progress).length;

    statsContainer.innerHTML = `
        <span><strong>${bookmarks.length}</strong> в закладках</span>
        <span><strong>${progressCount}</strong> читаю</span>
        <span><strong>${reviews.length}</strong> отзывов</span>
    `;
}

// ===================================
// ВКЛАДКИ
// ===================================

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            updateTabs();
            renderCurrentTab();
        });
    });
}

function updateTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${currentTab}Tab`);
    });
}

async function renderCurrentTab() {
    switch (currentTab) {
        case 'bookmarks':
            await renderBookmarks();
            break;
        case 'reading':
            await renderReadingProgress();
            break;
        case 'reviews':
            await renderUserReviews();
            break;
        case 'settings':
            await renderSettings();
            break;
    }
}

// ===================================
// ЗАКЛАДКИ
// ===================================

async function renderBookmarks() {
    const container = document.getElementById('bookmarksGrid');
    if (!container) return;

    const bookmarkIds = await getBookmarks();

    if (bookmarkIds.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <h3>📚 Закладки пусты</h3>
                <p style="color: var(--text-secondary); margin-top: 1rem;">
                    Добавляйте понравившуюся мангу в закладки, чтобы не потерять
                </p>
                <a href="./catalog.html" class="btn btn-primary" style="margin-top: 1.5rem;">
                    Перейти в каталог
                </a>
            </div>
        `;
        return;
    }

    const bookmarkedManga = MANGA_DATA.manga.filter(m => bookmarkIds.includes(m.id));

    container.innerHTML = bookmarkedManga.map(manga => createMangaCard(manga)).join('');
}

function createMangaCard(manga) {
    return `
        <div class="manga-card" onclick="window.location.href='./manga-detail.html?id=${manga.id}'">
            <div class="manga-card-cover" style="background: ${manga.gradient}"></div>
            <div class="manga-card-content">
                <h3 class="manga-card-title">${Utils.escapeHtml(manga.title)}</h3>
                <div class="manga-card-meta">
                    <span class="manga-card-rating">⭐ ${manga.rating}</span>
                    <span>${manga.chapters} глав</span>
                </div>
            </div>
        </div>
    `;
}

// ===================================
// ИСТОРИЯ ЧТЕНИЯ
// ===================================

async function renderReadingProgress() {
    const container = document.getElementById('readingList');
    if (!container) return;

    const progressList = await getReadingProgress();

    if (progressList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h3>📖 История чтения пуста</h3>
                <p style="color: var(--text-secondary); margin-top: 1rem;">
                    Начните читать мангу, чтобы отслеживать прогресс
                </p>
                <a href="./catalog.html" class="btn btn-primary" style="margin-top: 1.5rem;">
                    Перейти в каталог
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = progressList.map(item => {
        const manga = MANGA_DATA.manga.find(m => m.id === item.mangaId);
        if (!manga) return '';

        const progressPercent = Math.round((item.currentChapter / manga.chapters) * 100);

        return `
            <div class="manga-card" style="cursor: pointer;"
                 onclick="window.location.href='./manga-detail.html?id=${manga.id}'">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="width: 80px; height: 110px; background: ${manga.gradient}; border-radius: 8px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">
                            ${Utils.escapeHtml(manga.title)}
                        </h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;">
                            Глава ${item.currentChapter} из ${manga.chapters}
                        </p>
                        <div style="background: var(--bg-tertiary); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: var(--primary-color); height: 100%; width: ${progressPercent}%;"></div>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">
                            ${progressPercent}% завершено
                        </p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===================================
// ОТЗЫВЫ ПОЛЬЗОВАТЕЛЯ
// ===================================

async function renderUserReviews() {
    const container = document.getElementById('userReviewsList');
    if (!container) return;

    const reviews = await getUserReviews();

    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h3>✍️ Вы еще не оставили ни одного отзыва</h3>
                <p style="color: var(--text-secondary); margin-top: 1rem;">
                    Делитесь впечатлениями о прочитанной манге
                </p>
                <a href="./catalog.html" class="btn btn-primary" style="margin-top: 1.5rem;">
                    Перейти в каталог
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => {
        const manga = MANGA_DATA.manga.find(m => m.id === review.mangaId);
        if (!manga) return '';

        return `
            <div class="review-item" id="user-review-card-${review.mangaId}">
                <!-- Режим просмотра -->
                <div class="review-view-box">
                    <div class="review-header">
                        <div style="display: flex; gap: 1rem; align-items: center; cursor: pointer;"
                             onclick="window.location.href='./manga-detail.html?id=${manga.id}'">
                            <div style="width: 50px; height: 70px; background: ${manga.gradient}; border-radius: 6px; flex-shrink: 0;"></div>
                            <div>
                                <h4 style="font-weight: 600; margin-bottom: 0.25rem;">
                                    ${Utils.escapeHtml(manga.title)}
                                </h4>
                                <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                            </div>
                        </div>
                        <div class="review-actions">
                            <button class="btn btn-secondary btn-sm edit-review-btn" data-manga-id="${review.mangaId}">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-danger btn-sm delete-review-btn" data-manga-id="${review.mangaId}" data-manga-title="${Utils.escapeHtml(manga.title)}">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                    <p class="review-text">${Utils.escapeHtml(review.text)}</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">
                        ${formatReviewDate(review)}
                    </p>
                </div>

                <!-- Режим редактирования (скрыт по умолчанию) -->
                <div class="review-edit-box" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <h4 style="font-weight: 600; margin-bottom: 0.75rem;">Редактировать отзыв на «${Utils.escapeHtml(manga.title)}»</h4>
                    <div class="star-rating profile-edit-stars" data-manga-id="${review.mangaId}" data-rating="${review.rating}">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <span class="star ${star <= review.rating ? 'active' : ''}" data-value="${star}">
                                ${star <= review.rating ? '★' : '☆'}
                            </span>
                        `).join('')}
                    </div>
                    <textarea class="review-textarea edit-review-textarea" rows="4">${Utils.escapeHtml(review.text)}</textarea>
                    <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
                        <button class="btn btn-primary btn-sm save-review-btn" data-manga-id="${review.mangaId}">
                            💾 Сохранить
                        </button>
                        <button class="btn btn-secondary btn-sm cancel-review-btn" data-manga-id="${review.mangaId}">
                            ✖ Отмена
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    attachReviewItemListeners(reviews);
}

function attachReviewItemListeners(reviews) {
    // Обработчик кнопки "Редактировать"
    document.querySelectorAll('.edit-review-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mangaId = parseInt(btn.dataset.mangaId);
            const card = document.getElementById(`user-review-card-${mangaId}`);
            if (!card) return;

            const viewBox = card.querySelector('.review-view-box');
            const editBox = card.querySelector('.review-edit-box');

            viewBox.style.display = 'none';
            editBox.style.display = 'block';

            initProfileStarRating(editBox, mangaId);
        });
    });

    // Обработчик кнопки "Отмена"
    document.querySelectorAll('.cancel-review-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const mangaId = parseInt(btn.dataset.mangaId);
            const card = document.getElementById(`user-review-card-${mangaId}`);
            if (!card) return;

            const viewBox = card.querySelector('.review-view-box');
            const editBox = card.querySelector('.review-edit-box');

            viewBox.style.display = 'block';
            editBox.style.display = 'none';
        });
    });

    // Обработчик кнопки "Сохранить"
    document.querySelectorAll('.save-review-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const mangaId = parseInt(btn.dataset.mangaId);
            const card = document.getElementById(`user-review-card-${mangaId}`);
            if (!card) return;

            const starContainer = card.querySelector('.profile-edit-stars');
            const rating = parseInt(starContainer.dataset.rating) || 0;
            const text = card.querySelector('.edit-review-textarea')?.value.trim();

            if (rating === 0) {
                showToast('Пожалуйста, поставьте оценку', 'warning');
                return;
            }

            if (!text) {
                showToast('Пожалуйста, напишите отзыв', 'warning');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Сохранение...';

            await updateReview(mangaId, rating, text);
            await updateProfileStats();
            await renderUserReviews();
        });
    });

    // Обработчик кнопки "Удалить"
    document.querySelectorAll('.delete-review-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const mangaId = parseInt(btn.dataset.mangaId);
            const title = btn.dataset.mangaTitle || 'этот тайтл';

            const confirmed = confirm(`Вы уверены, что хотите удалить отзыв на "${title}"?`);
            if (!confirmed) return;

            btn.disabled = true;
            btn.textContent = 'Удаление...';

            await deleteReview(mangaId);
            await updateProfileStats();
            await renderUserReviews();
        });
    });
}

function initProfileStarRating(editBox, mangaId) {
    const starContainer = editBox.querySelector('.profile-edit-stars');
    const stars = starContainer.querySelectorAll('.star');

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = parseInt(star.dataset.value);
            starContainer.dataset.rating = val;
            updateStarDisplay(stars, val);
        });

        star.addEventListener('mouseenter', (e) => {
            e.stopPropagation();
            const val = parseInt(star.dataset.value);
            stars.forEach(s => {
                const sVal = parseInt(s.dataset.value);
                s.textContent = sVal <= val ? '★' : '☆';
            });
        });
    });

    starContainer.addEventListener('mouseleave', () => {
        const curRating = parseInt(starContainer.dataset.rating) || 0;
        updateStarDisplay(stars, curRating);
    });
}

function updateStarDisplay(stars, rating) {
    stars.forEach(s => {
        const sVal = parseInt(s.dataset.value);
        s.textContent = sVal <= rating ? '★' : '☆';
        s.classList.toggle('active', sVal <= rating);
    });
}

function formatReviewDate(review) {
    if (review.updatedAt) {
        if (typeof review.updatedAt.toDate === 'function') {
            return `Изменено: ${review.updatedAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        }
    }
    if (review.createdAt) {
        if (typeof review.createdAt.toDate === 'function') {
            return review.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    }
    if (review.date) {
        return new Date(review.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return 'Недавно';
}

// ===================================
// НАСТРОЙКИ
// ===================================

async function renderSettings() {
    const container = document.getElementById('settingsForm');
    if (!container) return;

    const settings = await getSettings();

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2rem;">
            <div>
                <h3 style="margin-bottom: 1rem;">⚙️ Уведомления</h3>
                <label class="filter-checkbox" style="margin-bottom: 0.75rem;">
                    <input type="checkbox" id="notifyNewChapters" ${settings.notifications?.newChapters ? 'checked' : ''}>
                    <span>Уведомлять о новых главах</span>
                </label>
                <label class="filter-checkbox">
                    <input type="checkbox" id="notifyNews" ${settings.notifications?.news ? 'checked' : ''}>
                    <span>Уведомлять о новостях</span>
                </label>
            </div>

            <div>
                <h3 style="margin-bottom: 1rem;">🎨 Интерфейс</h3>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                    Тема оформления
                </label>
                <select id="themePreference" class="sort-select" style="width: 100%; max-width: 300px;">
                    <option value="auto" ${!settings.theme || settings.theme === 'auto' ? 'selected' : ''}>Автоматически</option>
                    <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Светлая</option>
                    <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Темная</option>
                </select>
            </div>

            <button id="saveSettings" class="btn btn-primary" style="max-width: 200px;">
                Сохранить настройки
            </button>
        </div>
    `;

    // Обработчик сохранения
    document.getElementById('saveSettings')?.addEventListener('click', async () => {
        const newSettings = {
            notifications: {
                newChapters: document.getElementById('notifyNewChapters')?.checked || false,
                news: document.getElementById('notifyNews')?.checked || false
            },
            theme: document.getElementById('themePreference')?.value || 'auto'
        };

        await setSettings(newSettings);

        // Показываем уведомление
        showToast('✅ Настройки сохранены');
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--primary-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideInUp 0.3s ease-out;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
