// ===================================
// ПАНЕЛЬ АДМИНИСТРАТОРА
// Управление мангой и новостями в Firestore
// Служебная страница: доступ только по прямому URL
// ===================================

import { initAuth, signInWithGoogle, signOutUser, showToast } from './auth.js';
import { getAllManga, getAllNews, getDb, getAuthInstance } from './storage.js';
import { Utils, generateGradientFromTitle } from './data.js';

const FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
const AUTH_URL = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// 8 канонических жанров из data.js (плюс подмешиваем жанры из реальных данных)
const CANONICAL_GENRES = ['Экшн', 'Приключения', 'Комедия', 'Драма', 'Фэнтези', 'Романтика', 'Психологическое', 'Школа'];
const MANGA_STATUSES = ['ongoing', 'completed', 'hiatus'];
const NEWS_CATEGORIES = [
    { id: 'announcements', label: 'Анонсы' },
    { id: 'releases', label: 'Релизы' },
    { id: 'industry', label: 'Индустрия' },
    { id: 'events', label: 'События' }
];

let adminMangaList = [];
let adminNewsList = [];
let editingMangaId = null; // null = добавление нового тайтла
let editingNewsId = null;  // null = добавление новой новости

// ===================================
// ИНИЦИАЛИЗАЦИЯ И КОНТРОЛЬ ДОСТУПА
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    bindStaticUI();

    // Firebase не настроен — админка работать не может
    if (!(await initAuth())) {
        showScreen('login');
        document.getElementById('loginHint').textContent = 'Firebase не настроен — админ-панель недоступна.';
        return;
    }

    // Подписываемся на сырой onAuthStateChanged из SDK, а не на обёртку onAuthStateChange
    // из auth.js: обёртка делает немедленный синхронный вызов с currentUser, значение которого
    // на момент подписки уже может быть реальным состоянием (SDK успевает разрешить состояние
    // до нашего продолжения после await initAuth()) — фильтр «пропустить первый вызов с null»
    // тогда съедал единственный реальный сигнал, и страница висела на «Проверка доступа…».
    // Гарантия SDK: сырой слушатель ВСЕГДА получает текущее состояние после регистрации.
    const { onAuthStateChanged } = await import(AUTH_URL);
    onAuthStateChanged(getAuthInstance(), (user) => {
        console.log('[admin] ВРЕМЕННЫЙ ЛОГ onAuthStateChanged →', user ? `user: ${user.uid}` : 'null'); // ВРЕМЕННЫЙ ЛОГ (убрать после отладки)
        handleAuthState(user);
    });
});

async function handleAuthState(user) {
    if (!user) {
        console.log('[admin] ВРЕМЕННЫЙ ЛОГ handleAuthState: пользователь не залогинен'); // ВРЕМЕННЫЙ ЛОГ (убрать после отладки)
        showScreen('login');
        return;
    }

    // Пользователь вошёл — проверяем права администратора
    const allowed = await checkAdmin(user.uid); // true | false | null (ошибка проверки)
    console.log('[admin] ВРЕМЕННЫЙ ЛОГ checkAdmin →', allowed); // ВРЕМЕННЫЙ ЛОГ (убрать после отладки)

    if (allowed === true) {
        document.getElementById('adminUserLine').textContent =
            `${user.displayName || user.email || 'Администратор'}`;
        showScreen('panel');
        await refreshMangaTable();
        await refreshNewsTable();
    } else if (allowed === false) {
        showScreen('denied');
    }
    // allowed === null: ошибка проверки — остаёмся на экране загрузки с текстом ошибки
}

/**
 * Проверка наличия документа admins/{uid} в Firestore.
 * Возвращает true (админ), false (не админ) или null (ошибка проверки).
 */
async function checkAdmin(uid) {
    try {
        const db = getDb();
        if (!db) throw new Error('Firestore не инициализирован');

        const { doc, getDoc } = await import(FIRESTORE_URL);
        const snap = await getDoc(doc(db, 'admins', uid));
        return snap.exists();
    } catch (error) {
        console.error('Ошибка проверки прав администратора:', error);
        showToast('Не удалось проверить права администратора', 'error');
        document.getElementById('adminLoadingText').textContent =
            'Ошибка проверки доступа. Обновите страницу и попробуйте ещё раз.';
        return null;
    }
}

/**
 * Переключение экранов доступа
 */
function showScreen(name) {
    console.log('[admin] ВРЕМЕННЫЙ ЛОГ showScreen →', name); // ВРЕМЕННЫЙ ЛОГ (убрать после отладки)
    document.getElementById('adminLoading').hidden = name !== 'loading';
    document.getElementById('loginScreen').hidden = name !== 'login';
    document.getElementById('accessDenied').hidden = name !== 'denied';
    document.getElementById('adminPanel').hidden = name !== 'panel';
}

// ===================================
// ПРИВЯЗКА СТАТИЧНОГО UI
// ===================================

function bindStaticUI() {
    document.getElementById('adminLoginBtn')?.addEventListener('click', () => signInWithGoogle());
    document.getElementById('deniedSwitchBtn')?.addEventListener('click', () => signInWithGoogle());
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => signOutUser());

    document.getElementById('addMangaBtn')?.addEventListener('click', () => openMangaModal(null));
    document.getElementById('addNewsBtn')?.addEventListener('click', () => openNewsModal(null));

    document.getElementById('mangaCancelBtn')?.addEventListener('click', () => hideModal('mangaModal'));
    document.getElementById('newsCancelBtn')?.addEventListener('click', () => hideModal('newsModal'));

    // Закрытие по клику на фон (не на карточку)
    document.getElementById('mangaModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'mangaModal') hideModal('mangaModal');
    });
    document.getElementById('newsModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'newsModal') hideModal('newsModal');
    });

    document.getElementById('mangaForm')?.addEventListener('submit', onSaveManga);
    document.getElementById('newsForm')?.addEventListener('submit', onSaveNews);
}

function hideModal(id) {
    document.getElementById(id).hidden = true;
}

// ===================================
// ХЕЛПЕР DOM (XSS-защита: только textContent, без innerHTML)
// ===================================

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') node.className = value;
        else if (key === 'style') node.style.cssText = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
        if (child == null) continue;
        node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
}

function emptyRow(colspan, message) {
    return el('tr', {}, el('td', { colspan: String(colspan), style: 'text-align: center; color: var(--text-muted); padding: 2rem;' }, message));
}

// ===================================
// СПИСОК МАНГИ
// ===================================

async function refreshMangaTable() {
    const tbody = document.getElementById('mangaTableBody');
    tbody.replaceChildren();

    adminMangaList = await getAllManga();
    document.getElementById('mangaCount').textContent = `Всего: ${adminMangaList.length}`;

    if (adminMangaList.length === 0) {
        tbody.append(emptyRow(8, 'Тайтлов пока нет — добавьте первый'));
        return;
    }

    for (const manga of adminMangaList) {
        const titleCell = el('td', {},
            el('div', { class: 'cell-title-strong' }, manga.title || `#${manga.id}`),
            manga.titleAlt ? el('div', { class: 'cell-title-alt' }, manga.titleAlt) : null
        );

        const actionsCell = el('td', {},
            el('div', { class: 'cell-actions' },
                el('button', { class: 'btn btn-secondary', style: 'padding: 6px 10px; font-size: 0.85rem;', onclick: () => openMangaModal(manga) }, 'Редактировать'),
                el('button', { class: 'btn btn-danger', style: 'padding: 6px 10px; font-size: 0.85rem;', onclick: () => deleteManga(manga) }, 'Удалить')
            )
        );

        tbody.append(el('tr', {},
            el('td', {}, el('div', { class: 'admin-cover-swatch', style: `background: ${manga.gradient || generateGradientFromTitle(manga.title || '')};` })),
            titleCell,
            el('td', {}, manga.author || '—'),
            el('td', {}, String(manga.year || '—')),
            el('td', {}, Utils.getStatusText(manga.status)),
            el('td', {}, `⭐ ${manga.rating ?? '—'}`),
            el('td', {}, String(manga.chapters ?? '—')),
            actionsCell
        ));
    }
}

// ===================================
// ФОРМА МАНГИ (ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ)
// ===================================

function openMangaModal(manga) {
    editingMangaId = manga ? manga.id : null;

    document.getElementById('mangaModalTitle').textContent = manga
        ? `Редактировать: ${manga.title || `#${manga.id}`}`
        : 'Добавить тайтл';

    // Поля формы заполняем через .value — без innerHTML
    document.getElementById('mangaTitle').value = manga?.title || '';
    document.getElementById('mangaTitleAlt').value = manga?.titleAlt || '';
    document.getElementById('mangaAuthor').value = manga?.author || '';
    document.getElementById('mangaYear').value = manga?.year ?? '';
    document.getElementById('mangaStatus').value = MANGA_STATUSES.includes(manga?.status) ? manga.status : 'ongoing';
    document.getElementById('mangaRating').value = manga?.rating ?? '';
    document.getElementById('mangaDescription').value = manga?.description || '';
    document.getElementById('mangaChapters').value = manga?.chapters ?? '';
    document.getElementById('mangaVotes').value = manga?.votes ?? 0;
    document.getElementById('mangaViews').value = manga?.views ?? 0;
    document.getElementById('mangaBookmarks').value = manga?.bookmarks ?? 0;
    document.getElementById('mangaGenresExtra').value = '';

    renderGenreCheckboxes(manga?.genres || []);
    document.getElementById('mangaModal').hidden = false;
}

/**
 * Чекбоксы жанров: канонические 8 + жанры из загруженных данных
 * (чтобы не потерять, например, «Хоррор» у Токийского гуля)
 */
function renderGenreCheckboxes(selectedGenres) {
    const extras = new Set([
        ...adminMangaList.flatMap(m => m.genres || []),
        ...selectedGenres
    ]);
    CANONICAL_GENRES.forEach(g => extras.delete(g));

    const allGenres = [...CANONICAL_GENRES, ...[...extras].sort((a, b) => a.localeCompare(b, 'ru'))];

    const grid = document.getElementById('mangaGenresGrid');
    grid.replaceChildren();

    for (const genre of allGenres) {
        const checkbox = el('input', { type: 'checkbox' });
        checkbox.value = genre;
        checkbox.checked = selectedGenres.includes(genre);
        grid.append(el('label', { class: 'admin-checkbox' }, checkbox, el('span', {}, genre)));
    }
}

function collectGenres() {
    const selected = new Set();
    document.querySelectorAll('#mangaGenresGrid input[type="checkbox"]:checked').forEach(cb => selected.add(cb.value));

    const extraRaw = document.getElementById('mangaGenresExtra').value || '';
    extraRaw.split(',').map(g => g.trim()).filter(Boolean).forEach(g => selected.add(g));

    return [...selected];
}

async function onSaveManga(e) {
    e.preventDefault();

    // Читаем и валидируем значения формы
    const title = document.getElementById('mangaTitle').value.trim();
    const author = document.getElementById('mangaAuthor').value.trim();
    const description = document.getElementById('mangaDescription').value.trim();
    const status = document.getElementById('mangaStatus').value;

    const year = parseInt(document.getElementById('mangaYear').value, 10);
    const rating = parseFloat(document.getElementById('mangaRating').value);
    const chapters = parseInt(document.getElementById('mangaChapters').value, 10);
    const votes = parseInt(document.getElementById('mangaVotes').value, 10) || 0;
    const views = parseInt(document.getElementById('mangaViews').value, 10) || 0;
    const bookmarks = parseInt(document.getElementById('mangaBookmarks').value, 10) || 0;

    if (!title) return showToast('Укажите название', 'warning');
    if (!author) return showToast('Укажите автора', 'warning');
    if (!description) return showToast('Укажите описание', 'warning');
    if (!MANGA_STATUSES.includes(status)) return showToast('Некорректный статус', 'warning');
    if (Number.isNaN(year) || year < 1900 || year > 2100) return showToast('Год: число от 1900 до 2100', 'warning');
    if (Number.isNaN(rating) || rating < 0 || rating > 10) return showToast('Рейтинг: число от 0 до 10', 'warning');
    if (Number.isNaN(chapters) || chapters < 0) return showToast('Глав: неотрицательное число', 'warning');

    const genres = collectGenres();
    if (genres.length === 0) return showToast('Выберите хотя бы один жанр', 'warning');

    const payload = {
        id: editingMangaId,
        title,
        titleAlt: document.getElementById('mangaTitleAlt').value.trim(),
        author,
        year,
        status,
        genres,
        rating,
        votes,
        description,
        chapters,
        views,
        bookmarks,
        gradient: generateGradientFromTitle(title)
    };

    try {
        const { doc, setDoc, updateDoc } = await import(FIRESTORE_URL);
        const db = getDb();

        if (editingMangaId !== null) {
            // Редактирование существующего документа
            await updateDoc(doc(db, 'manga', String(editingMangaId)), payload);
            showToast('Тайтл обновлён', 'success');
        } else {
            // Новый тайтл: числовой id = max(id) + 1 (как у миграции), иначе каталог сломается на parseInt
            const nextId = adminMangaList.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0) + 1;
            payload.id = nextId;
            await setDoc(doc(db, 'manga', String(nextId)), payload);
            showToast(`Тайтл добавлен (id ${nextId})`, 'success');
        }

        hideModal('mangaModal');
        await refreshMangaTable();
    } catch (error) {
        console.error('Ошибка сохранения тайтла:', error);
        showToast('Не удалось сохранить тайтл: ' + error.message, 'error');
    }
}

async function deleteManga(manga) {
    const confirmed = window.confirm(`Удалить тайтл «${manga.title}» безвозвратно?`);
    if (!confirmed) return;

    try {
        const { doc, deleteDoc } = await import(FIRESTORE_URL);
        await deleteDoc(doc(getDb(), 'manga', String(manga.id)));
        showToast('Тайтл удалён', 'info');
        await refreshMangaTable();
    } catch (error) {
        console.error('Ошибка удаления тайтла:', error);
        showToast('Не удалось удалить тайтл: ' + error.message, 'error');
    }
}

// ===================================
// СПИСОК НОВОСТЕЙ
// ===================================

async function refreshNewsTable() {
    const tbody = document.getElementById('newsTableBody');
    tbody.replaceChildren();

    adminNewsList = await getAllNews();
    document.getElementById('newsCount').textContent = `Всего: ${adminNewsList.length}`;

    if (adminNewsList.length === 0) {
        tbody.append(emptyRow(4, 'Новостей пока нет — добавьте первую'));
        return;
    }

    const categoryLabel = (id) => NEWS_CATEGORIES.find(c => c.id === id)?.label || id || '—';

    for (const item of adminNewsList) {
        const actionsCell = el('td', {},
            el('div', { class: 'cell-actions' },
                el('button', { class: 'btn btn-secondary', style: 'padding: 6px 10px; font-size: 0.85rem;', onclick: () => openNewsModal(item) }, 'Редактировать'),
                el('button', { class: 'btn btn-danger', style: 'padding: 6px 10px; font-size: 0.85rem;', onclick: () => deleteNews(item) }, 'Удалить')
            )
        );

        tbody.append(el('tr', {},
            el('td', {}, item.date || '—'),
            el('td', {}, categoryLabel(item.category)),
            el('td', { class: 'cell-title-strong' }, item.title || `#${item.id}`),
            actionsCell
        ));
    }
}

// ===================================
// ФОРМА НОВОСТЕЙ (ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ)
// ===================================

function openNewsModal(item) {
    editingNewsId = item ? item.id : null;

    document.getElementById('newsModalTitle').textContent = item
        ? `Редактировать: ${item.title || `#${item.id}`}`
        : 'Добавить новость';

    document.getElementById('newsTitle').value = item?.title || '';
    const knownCategory = NEWS_CATEGORIES.some(c => c.id === item?.category);
    document.getElementById('newsCategory').value = knownCategory ? item.category : 'announcements';
    document.getElementById('newsDate').value = item?.date || new Date().toISOString().split('T')[0];
    document.getElementById('newsExcerpt').value = item?.excerpt || '';
    document.getElementById('newsContent').value = item?.content || '';

    document.getElementById('newsModal').hidden = false;
}

async function onSaveNews(e) {
    e.preventDefault();

    const title = document.getElementById('newsTitle').value.trim();
    const category = document.getElementById('newsCategory').value;
    const date = document.getElementById('newsDate').value;
    const excerpt = document.getElementById('newsExcerpt').value.trim();
    const content = document.getElementById('newsContent').value.trim();

    if (!title) return showToast('Укажите заголовок', 'warning');
    if (!NEWS_CATEGORIES.some(c => c.id === category)) return showToast('Некорректная категория', 'warning');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return showToast('Укажите дату', 'warning');
    if (!excerpt) return showToast('Укажите краткое описание', 'warning');

    const payload = { id: editingNewsId, title, category, date, excerpt, content };

    try {
        const { doc, setDoc, updateDoc } = await import(FIRESTORE_URL);
        const db = getDb();

        if (editingNewsId !== null) {
            await updateDoc(doc(db, 'news', String(editingNewsId)), payload);
            showToast('Новость обновлена', 'success');
        } else {
            const nextId = adminNewsList.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0) + 1;
            payload.id = nextId;
            await setDoc(doc(db, 'news', String(nextId)), payload);
            showToast(`Новость добавлена (id ${nextId})`, 'success');
        }

        hideModal('newsModal');
        await refreshNewsTable();
    } catch (error) {
        console.error('Ошибка сохранения новости:', error);
        showToast('Не удалось сохранить новость: ' + error.message, 'error');
    }
}

async function deleteNews(item) {
    const confirmed = window.confirm(`Удалить новость «${item.title}» безвозвратно?`);
    if (!confirmed) return;

    try {
        const { doc, deleteDoc } = await import(FIRESTORE_URL);
        await deleteDoc(doc(getDb(), 'news', String(item.id)));
        showToast('Новость удалена', 'info');
        await refreshNewsTable();
    } catch (error) {
        console.error('Ошибка удаления новости:', error);
        showToast('Не удалось удалить новость: ' + error.message, 'error');
    }
}
