// ===================================
// ДЕТАЛЬНАЯ СТРАНИЦА МАНГИ
// ===================================

import { MANGA_DATA, Utils, generateChapters, getRecommendations } from './data.js';
import {
    getBookmarks,
    toggleBookmark,
    isBookmarked,
    getPublicReviews,
    getUserReviewForManga,
    addReview,
    updateReview,
    deleteReview
} from './storage.js';
import { initAuth, isAuthenticated, getCurrentUser, showToast, onAuthStateChange } from './auth.js';

let currentManga = null;
let currentChapters = [];
let selectedRating = 0;
let isEditingMyReview = false;

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация авторизации
    await initAuth();

    // Загрузка данных манги
    loadMangaDetails();
});

function loadMangaDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = parseInt(urlParams.get('id'));

    if (!mangaId) {
        window.location.href = './catalog.html';
        return;
    }

    currentManga = MANGA_DATA.manga.find(m => m.id === mangaId);

    if (!currentManga) {
        window.location.href = './catalog.html';
        return;
    }

    renderMangaHeader();
    renderMangaDescription();
    renderChapters();
    renderReviews();
    renderRelatedManga();
    initButtons();
}

// ===================================
// РЕНДЕРИНГ
// ===================================

function renderMangaHeader() {
    const container = document.getElementById('mangaHeader');
    if (!container) return;

    container.innerHTML = `
        <div class="manga-cover-large" style="background: ${currentManga.gradient}"></div>
        <div class="manga-header-info">
            <h1 class="manga-title-main">${Utils.escapeHtml(currentManga.title)}</h1>
            <p class="manga-title-alt">${Utils.escapeHtml(currentManga.titleAlt)}</p>
            <div class="manga-rating-block">
                <div class="rating-stars">
                    ${Utils.renderStars(currentManga.rating)}
                </div>
                <span class="rating-number">${currentManga.rating}</span>
                <span class="rating-votes">(${Utils.formatNumber(currentManga.votes)} голосов)</span>
            </div>
            <div class="manga-card-genres">
                ${currentManga.genres.map(genre => `
                    <span class="genre-tag">${Utils.escapeHtml(genre)}</span>
                `).join('')}
            </div>
        </div>
    `;
}

function renderMangaDescription() {
    const container = document.getElementById('mangaDescription');
    if (!container) return;
    container.innerHTML = `<p>${Utils.escapeHtml(currentManga.description)}</p>`;
}

function renderChapters() {
    currentChapters = generateChapters(currentManga.id, currentManga.chapters);
    const container = document.getElementById('chaptersList');
    if (!container) return;

    container.innerHTML = currentChapters.map(chapter => `
        <div class="chapter-item" onclick="alert('Чтение главы ${chapter.id}')">
            <div class="chapter-title">${Utils.escapeHtml(chapter.title)}</div>
            <div class="chapter-meta">${chapter.date}</div>
        </div>
    `).join('');
}

async function renderReviews() {
    const formContainer = document.getElementById('reviewFormContainer');
    const listContainer = document.getElementById('reviewsList');
    if (!listContainer) return;

    // Загружаем публичные отзывы
    const reviews = await getPublicReviews(currentManga.id);
    const user = getCurrentUser();

    // Проверяем, оставлял ли текущий пользователь отзыв на этот тайтл
    let myReview = null;
    if (user) {
        myReview = reviews.find(r => r.uid === user.uid);
        if (!myReview && isAuthenticated()) {
            myReview = await getUserReviewForManga(currentManga.id);
        }
    }

    // 1. РЕНДЕРИНГ БЛОКА ФОРМЫ / СВОЕГО ОТЗЫВА
    if (formContainer) {
        if (myReview && !isEditingMyReview) {
            // Пользователь уже оставил отзыв -> показываем карточку "Ваш отзыв" с кнопками Редактировать / Удалить
            formContainer.innerHTML = `
                <div class="my-review-card">
                    <div class="review-header">
                        <div>
                            <h3 style="font-size: 1.1rem; margin-bottom: 0.25rem;">Ваш отзыв <span class="my-review-badge">Вы</span></h3>
                            <div class="review-rating">${'★'.repeat(myReview.rating)}${'☆'.repeat(5 - myReview.rating)}</div>
                        </div>
                        <div class="review-actions">
                            <button id="editMyReviewBtn" class="btn btn-secondary btn-sm">
                                ✏️ Редактировать
                            </button>
                            <button id="deleteMyReviewBtn" class="btn btn-danger btn-sm">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                    <p class="review-text">${Utils.escapeHtml(myReview.text)}</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">
                        ${formatReviewDate(myReview)}
                    </p>
                </div>
            `;

            document.getElementById('editMyReviewBtn')?.addEventListener('click', () => {
                isEditingMyReview = true;
                selectedRating = myReview.rating;
                renderReviews();
            });

            document.getElementById('deleteMyReviewBtn')?.addEventListener('click', async () => {
                const confirmed = confirm('Вы уверены, что хотите удалить свой отзыв?');
                if (!confirmed) return;

                await deleteReview(currentManga.id);
                isEditingMyReview = false;
                selectedRating = 0;
                renderReviews();
            });

        } else if (myReview && isEditingMyReview) {
            // Режим редактирования существующего отзыва
            formContainer.innerHTML = `
                <div class="review-form" style="margin-top: 1.5rem;">
                    <h3 style="margin-bottom: 0.75rem; font-size: 1.1rem;">✏️ Редактировать отзыв</h3>
                    <div class="star-rating" id="reviewStarRating">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <span class="star ${star <= selectedRating ? 'active' : ''}" data-value="${star}">
                                ${star <= selectedRating ? '★' : '☆'}
                            </span>
                        `).join('')}
                    </div>
                    <textarea id="reviewText" class="review-textarea" placeholder="Поделитесь вашими впечатлениями о произведении...">${Utils.escapeHtml(myReview.text)}</textarea>
                    <div style="display: flex; gap: 0.75rem;">
                        <button id="saveEditReviewBtn" class="btn btn-primary">💾 Сохранить изменения</button>
                        <button id="cancelEditReviewBtn" class="btn btn-secondary">✖ Отмена</button>
                    </div>
                </div>
            `;

            initStarRating();

            document.getElementById('saveEditReviewBtn')?.addEventListener('click', async () => {
                if (!isAuthenticated()) {
                    showToast('Войдите через Google, чтобы сохранить отзыв', 'warning');
                    return;
                }

                const text = document.getElementById('reviewText')?.value.trim();

                if (selectedRating === 0) {
                    showToast('Пожалуйста, поставьте оценку', 'warning');
                    return;
                }

                if (!text) {
                    showToast('Пожалуйста, напишите отзыв', 'warning');
                    return;
                }

                await updateReview(currentManga.id, selectedRating, text);
                isEditingMyReview = false;
                selectedRating = 0;
                renderReviews();
            });

            document.getElementById('cancelEditReviewBtn')?.addEventListener('click', () => {
                isEditingMyReview = false;
                selectedRating = 0;
                renderReviews();
            });

        } else {
            // Форма для нового отзыва
            formContainer.innerHTML = `
                <div class="review-form" style="margin-top: 1.5rem;">
                    <h3 style="margin-bottom: 0.75rem; font-size: 1.1rem;">Оставить отзыв</h3>
                    <div class="star-rating" id="reviewStarRating">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <span class="star ${star <= selectedRating ? 'active' : ''}" data-value="${star}">
                                ${star <= selectedRating ? '★' : '☆'}
                            </span>
                        `).join('')}
                    </div>
                    <textarea id="reviewText" class="review-textarea" placeholder="Поделитесь вашими впечатлениями о произведении..."></textarea>
                    <button id="submitReview" class="btn btn-primary">Отправить отзыв</button>
                </div>
            `;

            initStarRating();

            document.getElementById('submitReview')?.addEventListener('click', async () => {
                if (!isAuthenticated()) {
                    showToast('Войдите через Google, чтобы оставить отзыв', 'warning');
                    return;
                }

                const text = document.getElementById('reviewText')?.value.trim();

                if (selectedRating === 0) {
                    showToast('Пожалуйста, поставьте оценку', 'warning');
                    return;
                }

                if (!text) {
                    showToast('Пожалуйста, напишите отзыв', 'warning');
                    return;
                }

                await addReview(currentManga.id, selectedRating, text);
                selectedRating = 0;
                renderReviews();
            });
        }
    }

    // 2. РЕНДЕРИНГ СПИСКА ВСЕХ ПУБЛИЧНЫХ ОТЗЫВОВ (исключаем свой отзыв, т.к. он уже показан сверху)
    const otherReviews = reviews.filter(review => !(user && review.uid === user.uid));

    if (otherReviews.length === 0) {
        if (myReview) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem 0;">Других отзывов пока нет.</p>';
        } else {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem 0;">Пока нет отзывов. Будьте первым!</p>';
        }
        return;
    }

    listContainer.innerHTML = otherReviews.map(review => `
        <div class="review-item" id="review-${review.uid}">
            <div class="review-header">
                <span class="review-author"><strong>${Utils.escapeHtml(review.authorName || 'Аноним')}</strong></span>
                <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            </div>
            <p class="review-text">${Utils.escapeHtml(review.text)}</p>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.5rem;">
                ${formatReviewDate(review)}
            </p>
        </div>
    `).join('');
}

function renderRelatedManga() {
    const container = document.getElementById('relatedManga');
    if (!container) return;

    const related = getRecommendations(currentManga, 4);
    container.innerHTML = related.map(manga => `
        <div class="related-item" onclick="window.location.href='./manga-detail.html?id=${manga.id}'"
             style="cursor: pointer; padding: 0.5rem; display: flex; gap: 1rem; align-items: center;">
            <div style="width: 50px; height: 70px; background: ${manga.gradient}; border-radius: 4px;"></div>
            <div>
                <div style="font-weight: 600;">${Utils.escapeHtml(manga.title)}</div>
                <div style="color: var(--text-muted); font-size: 0.85rem;">⭐ ${manga.rating}</div>
            </div>
        </div>
    `).join('');
}

// ===================================
// КНОПКИ И ДЕЙСТВИЯ
// ===================================

function initButtons() {
    // Закладки
    const bookmarkBtn = document.getElementById('addToBookmarks');
    if (bookmarkBtn) {
        updateBookmarkButton();
        bookmarkBtn.addEventListener('click', async () => {
            if (!isAuthenticated()) {
                showToast('Войдите через Google, чтобы добавить в закладки', 'warning');
                return;
            }
            await toggleBookmark(currentManga.id);
            updateBookmarkButton();
        });
    }

    // Подписка на изменение авторизации для актуализации закладок и отзывов
    onAuthStateChange(() => {
        updateBookmarkButton();
        renderReviews();
    });
}

async function updateBookmarkButton() {
    const btn = document.getElementById('addToBookmarks');
    if (!btn) return;

    if (!isAuthenticated()) {
        btn.innerHTML = `<span class="btn-icon">🤍</span> Добавить в закладки`;
        return;
    }

    const bookmarked = await isBookmarked(currentManga.id);
    btn.innerHTML = `<span class="btn-icon">${bookmarked ? '❤️' : '🤍'}</span> ${bookmarked ? 'В закладках' : 'Добавить в закладки'}`;
}

function initStarRating() {
    const stars = document.querySelectorAll('#reviewStarRating .star');

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const val = parseInt(star.dataset.value);
            selectedRating = val;
            updateStars();
        });

        star.addEventListener('mouseenter', (e) => {
            const val = parseInt(star.dataset.value);
            stars.forEach(s => {
                const sVal = parseInt(s.dataset.value);
                s.textContent = sVal <= val ? '★' : '☆';
            });
        });
    });

    document.getElementById('reviewStarRating')?.addEventListener('mouseleave', updateStars);
}

function updateStars() {
    const stars = document.querySelectorAll('#reviewStarRating .star');
    stars.forEach(star => {
        const sVal = parseInt(star.dataset.value);
        star.textContent = sVal <= selectedRating ? '★' : '☆';
        star.classList.toggle('active', sVal <= selectedRating);
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