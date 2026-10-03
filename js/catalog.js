// ===================================
// КАТАЛОГ МАНГИ
// ===================================

import { Utils, searchManga, filterManga, sortManga } from './data.js';
import { createMangaCard, addMangaCardListeners } from './app.js';
import { initAuth } from './auth.js';
import { getAllManga } from './storage.js';

let catalogMangaList = [];

// Состояние каталога
let currentFilters = {
    genres: [],
    yearFrom: null,
    yearTo: null,
    status: [],
    rating: []
};

let currentSort = 'popular';
let currentPage = 1;
const itemsPerPage = 12;

// ===================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация авторизации
    await initAuth();

    // Загрузка манги из Firestore (или фолбэк)
    catalogMangaList = await getAllManga();

    // Инициализация элементов страницы
    initFilters();
    initSorting();
    loadFromURL();
    renderCatalog();
});

// ===================================
// ЗАГРУЗКА ПАРАМЕТРОВ ИЗ URL
// ===================================

function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('search')) {
        const searchQuery = urlParams.get('search');
        document.getElementById('searchInput').value = searchQuery;
    }

    if (urlParams.has('genre')) {
        currentFilters.genres = [urlParams.get('genre')];
    }

    if (urlParams.has('sort')) {
        currentSort = urlParams.get('sort');
        document.getElementById('sortSelect').value = currentSort;
    }
}

// ===================================
// ФИЛЬТРЫ
// ===================================

function initFilters() {
    renderGenreFilters();

    // Применение фильтров
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);

    // Сброс фильтров
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);

    // Обработчики изменения фильтров
    document.querySelectorAll('input[name="status"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    document.querySelectorAll('input[name="rating"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    document.getElementById('yearFrom')?.addEventListener('change', applyFilters);
    document.getElementById('yearTo')?.addEventListener('change', applyFilters);
}

function renderGenreFilters() {
    const container = document.getElementById('genreFilters');
    if (!container) return;

    // Собираем жанры из загруженных данных манги (Firestore или фолбэк)
    const genreCounts = {};
    catalogMangaList.forEach(manga => {
        (manga.genres || []).forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
    });
    const genres = Object.entries(genreCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    container.innerHTML = genres.map(genre => `
        <label class="filter-checkbox">
            <input type="checkbox" name="genre" value="${Utils.escapeHtml(genre.name)}"
                ${currentFilters.genres.includes(genre.name) ? 'checked' : ''}>
            <span>${Utils.escapeHtml(genre.name)} (${genre.count})</span>
        </label>
    `).join('');

    container.querySelectorAll('input[name="genre"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    // Собираем жанры
    currentFilters.genres = Array.from(
        document.querySelectorAll('input[name="genre"]:checked')
    ).map(cb => cb.value);

    // Собираем статус
    currentFilters.status = Array.from(
        document.querySelectorAll('input[name="status"]:checked')
    ).map(cb => cb.value);

    // Собираем рейтинг
    currentFilters.rating = Array.from(
        document.querySelectorAll('input[name="rating"]:checked')
    ).map(cb => parseInt(cb.value));

    // Собираем годы
    currentFilters.yearFrom = parseInt(document.getElementById('yearFrom')?.value) || null;
    currentFilters.yearTo = parseInt(document.getElementById('yearTo')?.value) || null;

    currentPage = 1;
    renderCatalog();
    updateURL();
}

function resetFilters() {
    currentFilters = {
        genres: [],
        yearFrom: null,
        yearTo: null,
        status: [],
        rating: []
    };

    document.querySelectorAll('.filter-checkbox input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    document.getElementById('yearFrom').value = '';
    document.getElementById('yearTo').value = '';

    currentPage = 1;
    renderCatalog();
    updateURL();
}

// ===================================
// СОРТИРОВКА
// ===================================

function initSorting() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            currentPage = 1;
            renderCatalog();
            updateURL();
        });
    }
}

// ===================================
// РЕНДЕРИНГ КАТАЛОГА
// ===================================

function renderCatalog() {
    const searchQuery = document.getElementById('searchInput')?.value.trim();
    let results = searchQuery ? searchManga(searchQuery, catalogMangaList) : [...catalogMangaList];

    // Применяем фильтры к результатам поиска
    results = filterManga(currentFilters, results);

    // Применяем сортировку
    results = sortManga(results, currentSort);

    // Пагинация
    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageResults = results.slice(startIndex, endIndex);

    // Обновляем счетчик
    const resultCount = document.getElementById('resultCount');
    if (resultCount) {
        resultCount.textContent = results.length;
    }

    // Рендерим результаты
    const container = document.getElementById('catalogResults');
    if (container) {
        if (pageResults.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <h3>Ничего не найдено</h3>
                    <p style="color: var(--text-secondary); margin-top: 1rem;">
                        Попробуйте изменить фильтры или поисковый запрос
                    </p>
                </div>
            `;
        } else {
            container.innerHTML = pageResults.map(manga => createMangaCard(manga)).join('');
            addMangaCardListeners();
        }
    }

    // Рендерим пагинацию
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    let html = `
        <button class="pagination-btn" onclick="window.catalogModule.changePage(${currentPage - 1})"
            ${currentPage === 1 ? 'disabled' : ''}>
            ← Назад
        </button>
    `;

    // Показываем первую страницу
    if (currentPage > 3) {
        html += `<button class="pagination-btn" onclick="window.catalogModule.changePage(1)">1</button>`;
        if (currentPage > 4) {
            html += `<span style="padding: 0 0.5rem;">...</span>`;
        }
    }

    // Показываем страницы вокруг текущей
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                onclick="window.catalogModule.changePage(${i})">
                ${i}
            </button>
        `;
    }

    // Показываем последнюю страницу
    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            html += `<span style="padding: 0 0.5rem;">...</span>`;
        }
        html += `<button class="pagination-btn" onclick="window.catalogModule.changePage(${totalPages})">${totalPages}</button>`;
    }

    html += `
        <button class="pagination-btn" onclick="window.catalogModule.changePage(${currentPage + 1})"
            ${currentPage === totalPages ? 'disabled' : ''}>
            Вперед →
        </button>
    `;

    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================
// ОБНОВЛЕНИЕ URL
// ===================================

function updateURL() {
    const params = new URLSearchParams();

    const searchQuery = document.getElementById('searchInput')?.value.trim();
    if (searchQuery) {
        params.set('search', searchQuery);
    }

    if (currentFilters.genres.length > 0) {
        params.set('genre', currentFilters.genres[0]);
    }

    if (currentSort !== 'popular') {
        params.set('sort', currentSort);
    }

    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
}

// Экспортируем функции для использования в onclick
window.catalogModule = {
    changePage
};