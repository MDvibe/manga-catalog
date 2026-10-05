// ===================================
// СТРАНИЦА НОВОСТЕЙ
// ===================================

import { Utils } from './data.js';
import { initAuth } from './auth.js';
import { getAllNews } from './storage.js';

let currentCategory = 'all';
let newsDataList = [];

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация авторизации
    await initAuth();

    // Загрузка новостей из Firestore (или фолбэк)
    newsDataList = await getAllNews();

    // Инициализация элементов страницы
    initCategoryFilters();
    renderNews();
});

// ===================================
// ФИЛЬТРЫ ПО КАТЕГОРИЯМ
// ===================================

function initCategoryFilters() {
    const categories = [
        { id: 'all', name: 'Все новости', icon: '📰' },
        { id: 'announcements', name: 'Анонсы', icon: '📣' },
        { id: 'releases', name: 'Релизы', icon: '🚀' },
        { id: 'industry', name: 'Индустрия', icon: '🏢' },
        { id: 'events', name: 'События', icon: '🎉' }
    ];

    const container = document.getElementById('categoryFilters');
    if (!container) return;

    container.innerHTML = categories.map(cat => `
        <button class="category-btn ${cat.id === currentCategory ? 'active' : ''}"
                data-category="${cat.id}">
            <span style="margin-right: 0.5rem;">${cat.icon}</span>
            ${Utils.escapeHtml(cat.name)}
        </button>
    `).join('');

    // Обработчики кликов
    container.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            updateCategoryButtons();
            renderNews();
        });
    });
}

function updateCategoryButtons() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentCategory);
    });
}

// ===================================
// РЕНДЕРИНГ НОВОСТЕЙ
// ===================================

function renderNews() {
    const container = document.getElementById('newsGrid');
    if (!container) return;

    let news = [...newsDataList];

    // Фильтрация по категории
    if (currentCategory !== 'all') {
        news = news.filter(item => item.category === currentCategory);
    }

    if (news.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <h3>Новостей в этой категории пока нет</h3>
                <p style="margin-top: 1rem;">Попробуйте выбрать другую категорию</p>
            </div>
        `;
        return;
    }

    container.innerHTML = news.map(item => `
        <a href="news-detail.html?id=${item.id}" class="news-card" style="text-decoration: none; display: block; cursor: pointer;">
            <div class="news-meta">
                <span class="news-category">${getCategoryName(item.category)}</span>
                <span>${Utils.escapeHtml(item.date)}</span>
            </div>
            <h2 class="news-title">${Utils.escapeHtml(item.title)}</h2>
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
                ${Utils.escapeHtml(item.excerpt)}
            </p>
            <div style="display: flex; justify-content: flex-end; align-items: center; font-size: 0.85rem;">
                <span style="color: var(--primary-color); font-weight: 600;">
                    Читать далее →
                </span>
            </div>
        </a>
    `).join('');
}

function getCategoryName(categoryId) {
    const names = {
        'announcements': '📣 Анонсы',
        'releases': '🚀 Релизы',
        'industry': '🏢 Индустрия',
        'events': '🎉 События'
    };
    return names[categoryId] || '📰 Новости';
}
