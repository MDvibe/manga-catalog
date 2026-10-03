// ===================================
// ГЛАВНОЕ ПРИЛОЖЕНИЕ
// ===================================

import { Utils, sortManga, getRecommendations, generateGradientFromTitle } from './data.js';
import { initAuth } from './auth.js';
import { getAllManga } from './storage.js';

let appMangaList = [];

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация темы
    initTheme();

    // Инициализация мобильного меню
    initMobileMenu();

    // Инициализация поиска
    initSearch();

    // Инициализация авторизации (асинхронно)
    await initAuth();

    // Загрузка манги из Firestore (или фолбэк)
    appMangaList = await getAllManga();

    // Рендеринг контента главной страницы (если мы на главной)
    if (document.getElementById('popularManga')) {
        renderHomePage();
    }

    // Инициализация анимаций при скролле
    initScrollAnimations();
});

// ===================================
// ТЕМА ОФОРМЛЕНИЯ
// ===================================

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');

    // Получаем сохранённую тему или системные предпочтения
    const savedTheme = localStorage.getItem('manga_theme');
    let currentTheme = savedTheme;

    if (!currentTheme) {
        // Проверяем системную тему
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            currentTheme = 'dark';
        } else {
            currentTheme = 'light';
        }
    }

    // Применяем тему
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    // Слушатель системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('manga_theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });

    // Переключатель темы
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const activeTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = activeTheme === 'light' ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('manga_theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

// ===================================
// МОБИЛЬНОЕ МЕНЮ
// ===================================

function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.querySelector('.nav-menu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            toggle.classList.toggle('active');
        });
    }
}

// ===================================
// ПОИСК
// ===================================

function initSearch() {
    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        // Поиск по Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `./catalog.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `./catalog.html?search=${encodeURIComponent(query)}`;
            }
        });
    }
}

// ===================================
// РЕНДЕРИНГ ГЛАВНОЙ СТРАНИЦЫ
// ===================================

function renderHomePage() {
    renderPopularManga();
    renderLatestManga();
    renderRecommendations();
    renderGenres();
}

function renderPopularManga() {
    const container = document.getElementById('popularManga');
    if (!container) return;

    const popularManga = sortManga(appMangaList, 'popular').slice(0, 8);
    container.innerHTML = popularManga.map(manga => createMangaCard(manga)).join('');
    addMangaCardListeners();
}

function renderLatestManga() {
    const container = document.getElementById('latestManga');
    if (!container) return;

    const latestManga = sortManga(appMangaList, 'latest').slice(0, 6);
    container.innerHTML = latestManga.map(manga => createMangaCard(manga)).join('');
    addMangaCardListeners();
}

function renderRecommendations() {
    const container = document.getElementById('recommendedManga');
    if (!container) return;

    const recommended = getRecommendations(null, 4, appMangaList);
    container.innerHTML = recommended.map(manga => createMangaCard(manga)).join('');
    addMangaCardListeners();
}

function renderGenres() {
    const container = document.getElementById('genreGrid');
    if (!container) return;

    // Собираем жанры из загруженных данных манги (Firestore или фолбэк)
    const genreCounts = {};
    appMangaList.forEach(manga => {
        (manga.genres || []).forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
    });
    const genres = Object.entries(genreCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    container.innerHTML = genres.map(genre => `
        <div class="genre-card"
             style="background: linear-gradient(135deg, var(--primary-color), var(--secondary-color))"
             onclick="window.location.href='./catalog.html?genre=${encodeURIComponent(genre.name)}'">
            ${Utils.escapeHtml(genre.name)}
        </div>
    `).join('');
}

// ===================================
// СОЗДАНИЕ КАРТОЧЕК МАНГИ
// ===================================

export function createMangaCard(manga) {
    return `
        <div class="manga-card" data-manga-id="${manga.id}">
            <div class="manga-card-cover" style="background: ${manga.gradient}">
                ${manga.status === 'ongoing' ? '<span class="manga-card-badge">Онгоинг</span>' : ''}
            </div>
            <div class="manga-card-content">
                <h3 class="manga-card-title">${Utils.escapeHtml(manga.title)}</h3>
                <div class="manga-card-meta">
                    <span class="manga-card-rating">
                        ⭐ ${manga.rating}
                    </span>
                    <span>${manga.year}</span>
                </div>
                <div class="manga-card-genres">
                    ${manga.genres.slice(0, 2).map(genre => `
                        <span class="genre-tag">${Utils.escapeHtml(genre)}</span>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ===================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ===================================

export function addMangaCardListeners() {
    document.querySelectorAll('.manga-card').forEach(card => {
        card.addEventListener('click', () => {
            const mangaId = card.dataset.mangaId;
            window.location.href = `./manga-detail.html?id=${mangaId}`;
        });
    });
}

// ===================================
// АНИМАЦИИ ПРИ СКРОЛЛЕ
// ===================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.manga-card, .genre-card, .section-title').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}