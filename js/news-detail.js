// ===================================
// СТРАНИЦА ДЕТАЛЬНОЙ ИНФОРМАЦИИ О НОВОСТИ
// ===================================

import { Utils } from './data.js';
import { initAuth } from './auth.js';
import { getNewsById, getAllNews } from './storage.js';

let currentNews = null;

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация авторизации
    await initAuth();

    // Получение ID из URL
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('id');

    if (!newsId) {
        showNotFoundMessage('ID новости не указан');
        return;
    }

    // Загрузка новости
    currentNews = await getNewsById(newsId);

    if (!currentNews) {
        showNotFoundMessage('Новость не найдена');
        return;
    }

    // Рендеринг страницы
    renderBreadcrumbs();
    renderNewsHeader();
    renderNewsContent();
    await renderRelatedNews();
});

// ===================================
// РЕНДЕРИНГ ХЛЕБНЫХ КРОШЕК
// ===================================

function renderBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (!container || !currentNews) return;

    container.innerHTML = `
        <a href="./index.html" class="breadcrumb-link">Главная</a>
        <span class="breadcrumb-separator">→</span>
        <a href="./news.html" class="breadcrumb-link">Новости</a>
        <span class="breadcrumb-separator">→</span>
        <span class="breadcrumb-current">${Utils.escapeHtml(currentNews.title)}</span>
    `;
}

// ===================================
// РЕНДЕРИНГ ЗАГОЛОВКА НОВОСТИ
// ===================================

function renderNewsHeader() {
    const container = document.getElementById('newsHeader');
    if (!container || !currentNews) return;

    const categoryName = getCategoryName(currentNews.category);

    container.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <span class="news-category" style="font-size: 0.95rem; padding: 0.4rem 0.8rem;">
                    ${categoryName}
                </span>
                <span style="color: var(--text-muted); font-size: 0.9rem;">
                    ${Utils.escapeHtml(currentNews.date)}
                </span>
            </div>
            <h1 style="font-size: 2.5rem; font-weight: 700; line-height: 1.2; margin: 0; color: var(--text-primary);">
                ${Utils.escapeHtml(currentNews.title)}
            </h1>
        </div>
    `;
}

// ===================================
// РЕНДЕРИНГ СОДЕРЖАНИЯ НОВОСТИ
// ===================================

function renderNewsContent() {
    const container = document.getElementById('newsContent');
    if (!container || !currentNews) return;

    // БЕЗОПАСНЫЙ вывод через textContent — НЕ innerHTML!
    container.textContent = currentNews.content || currentNews.excerpt || 'Содержание недоступно';
}

// ===================================
// РЕНДЕРИНГ ПОХОЖИХ НОВОСТЕЙ
// ===================================

async function renderRelatedNews() {
    if (!currentNews) return;

    const allNews = await getAllNews();

    // Фильтруем: та же категория, но не текущая новость
    const related = allNews
        .filter(item => item.category === currentNews.category && item.id !== currentNews.id)
        .slice(0, 3);

    if (related.length === 0) return;

    const section = document.getElementById('relatedNewsSection');
    const container = document.getElementById('relatedNews');

    if (!section || !container) return;

    section.style.display = 'block';

    container.innerHTML = related.map(item => `
        <a href="news-detail.html?id=${item.id}" class="news-card" style="text-decoration: none; cursor: pointer;">
            <div class="news-meta">
                <span class="news-category">${getCategoryName(item.category)}</span>
                <span>${Utils.escapeHtml(item.date)}</span>
            </div>
            <h3 class="news-title" style="font-size: 1.1rem;">
                ${Utils.escapeHtml(item.title)}
            </h3>
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 0.5rem; font-size: 0.9rem;">
                ${Utils.escapeHtml(item.excerpt)}
            </p>
        </a>
    `).join('');
}

// ===================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ===================================

function getCategoryName(categoryId) {
    const names = {
        'announcements': '📣 Анонсы',
        'releases': '🚀 Релизы',
        'industry': '🏢 Индустрия',
        'events': '🎉 События'
    };
    return names[categoryId] || '📰 Новости';
}

function showNotFoundMessage(message) {
    const container = document.getElementById('newsHeader');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-primary);">
                ${Utils.escapeHtml(message)}
            </h1>
            <p style="color: var(--text-muted); margin-bottom: 2rem;">
                Новость могла быть удалена или перемещена
            </p>
            <a href="./news.html" class="btn btn-primary" style="display: inline-block; padding: 0.75rem 1.5rem; text-decoration: none;">
                ← Вернуться к новостям
            </a>
        </div>
    `;

    // Скрываем остальные секции
    const breadcrumbs = document.getElementById('breadcrumbs');
    const content = document.getElementById('newsContent');
    const relatedSection = document.getElementById('relatedNewsSection');

    if (breadcrumbs) breadcrumbs.style.display = 'none';
    if (content) content.style.display = 'none';
    if (relatedSection) relatedSection.style.display = 'none';
}
