// ===================================
// СКРИПТ РАЗОВОЙ МИГРАЦИИ ДАННЫХ В FIRESTORE
// ===================================

import { MANGA_DATA } from './data.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

let auth = null;
let firestore = null;
let app = null;

/**
 * Инициализация Firebase для страницы миграции
 */
export async function initMigrationFirebase() {
    if (!isFirebaseConfigured()) {
        throw new Error('Firebase конфигурация не заполнена в js/firebase-config.js');
    }

    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } =
        await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const { getFirestore } =
        await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);

    return { auth, firestore, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged };
}

/**
 * Запуск миграции манги и новостей
 * @param {Function} logCallback - функция для логирования шагов миграции
 */
export async function runMigration(logCallback) {
    if (!firestore) {
        throw new Error('Firestore не инициализирован');
    }

    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    logCallback('🚀 Начинаем миграцию данных в Firestore...', 'info');

    // 1. Миграция манги
    logCallback(`📦 Переносим тайтлы манги (${MANGA_DATA.manga.length} шт.)...`, 'info');
    let mangaSuccessCount = 0;

    for (const manga of MANGA_DATA.manga) {
        const mangaDocId = manga.id.toString();
        const mangaDocRef = doc(firestore, 'manga', mangaDocId);

        // Сохраняем все поля без потерь
        const mangaPayload = {
            id: manga.id,
            title: manga.title,
            titleAlt: manga.titleAlt || '',
            author: manga.author || '',
            year: manga.year || 0,
            status: manga.status || 'ongoing',
            genres: manga.genres || [],
            rating: manga.rating || 0,
            votes: manga.votes || 0,
            description: manga.description || '',
            chapters: manga.chapters || 0,
            views: manga.views || 0,
            bookmarks: manga.bookmarks || 0,
            gradient: manga.gradient || ''
        };

        await setDoc(mangaDocRef, mangaPayload);
        mangaSuccessCount++;
        logCallback(`  ✓ Манга #${manga.id} «${manga.title}» успешно записана в manga/${mangaDocId}`, 'success');
    }

    // 2. Миграция новостей
    logCallback(`📰 Переносим новости (${MANGA_DATA.news.length} шт.)...`, 'info');
    let newsSuccessCount = 0;

    for (const news of MANGA_DATA.news) {
        const newsDocId = news.id.toString();
        const newsDocRef = doc(firestore, 'news', newsDocId);

        const newsPayload = {
            id: news.id,
            title: news.title,
            category: news.category || 'announcements',
            date: news.date || new Date().toISOString().split('T')[0],
            excerpt: news.excerpt || '',
            content: news.content || ''
        };

        await setDoc(newsDocRef, newsPayload);
        newsSuccessCount++;
        logCallback(`  ✓ Новость #${news.id} «${news.title}» успешно записана в news/${newsDocId}`, 'success');
    }

    logCallback(`🎉 Миграция успешно завершена! Перенесено тайтлов манги: ${mangaSuccessCount}, новостей: ${newsSuccessCount}.`, 'finish');
}
