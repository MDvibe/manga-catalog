// ===================================
// СЛОЙ ХРАНЕНИЯ ДАННЫХ
// Работает с localStorage (гость) или Firestore (авторизован)
// ===================================

import { isFirebaseConfigured } from './firebase-config.js';

// Глобальные переменные для Firebase
let firestore = null;
let auth = null;
let isFirebaseInitialized = false;

/**
 * Инициализация Firebase (вызывается из auth.js)
 */
export function initializeFirebase(firestoreInstance, authInstance) {
    firestore = firestoreInstance;
    auth = authInstance;
    isFirebaseInitialized = true;
}

/**
 * Проверка доступности Firestore
 */
function isFirestoreAvailable() {
    return isFirebaseInitialized && firestore && auth && auth.currentUser;
}

/**
 * Показ тост-уведомления
 */
function showToast(message, type = 'info') {
    // Удаляем существующие тосты
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const colors = {
        error: '#f44336',
        success: '#4caf50',
        info: '#2196f3',
        warning: '#ff9800'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
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
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// ===================================
// МАНГА И НОВОСТИ (FIRESTORE C ФОЛБЭКОМ НА ДАННЫЕ ПО УМОЛЧАНИЮ)
// ===================================

import { MANGA_DATA as DEFAULT_MANGA_DATA, generateGradientFromTitle } from './data.js';

/**
 * Получить весь список манги (из Firestore с фолбэком на локальные данные)
 */
export async function getAllManga() {
    if (isFirebaseInitialized && firestore) {
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const mangaRef = collection(firestore, 'manga');
            const snapshot = await getDocs(mangaRef);

            if (!snapshot.empty) {
                const list = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const manga = {
                        id: parseInt(data.id || doc.id),
                        ...data
                    };
                    // Гарантируем наличие градиента
                    if (!manga.gradient && manga.title) {
                        manga.gradient = generateGradientFromTitle(manga.title);
                    }
                    return manga;
                });
                // Сортируем по id по умолчанию
                return list.sort((a, b) => a.id - b.id);
            }
        } catch (error) {
            console.warn('Не удалось загрузить мангу из Firestore, используем локальные данные:', error);
        }
    }
    return [...DEFAULT_MANGA_DATA.manga];
}

/**
 * Получить мангу по ID (из Firestore с фолбэком на локальные данные)
 */
export async function getMangaById(mangaId) {
    const idNum = parseInt(mangaId);
    if (!idNum) return null;

    if (isFirebaseInitialized && firestore) {
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const mangaRef = doc(firestore, 'manga', idNum.toString());
            const snap = await getDoc(mangaRef);

            if (snap.exists()) {
                const data = snap.data();
                const manga = {
                    id: parseInt(data.id || snap.id),
                    ...data
                };
                // Гарантируем наличие градиента
                if (!manga.gradient && manga.title) {
                    manga.gradient = generateGradientFromTitle(manga.title);
                }
                return manga;
            }
        } catch (error) {
            console.warn(`Не удалось загрузить мангу #${mangaId} из Firestore:`, error);
        }
    }

    return DEFAULT_MANGA_DATA.manga.find(m => m.id === idNum) || null;
}

/**
 * Получить список новостей (из Firestore с фолбэком на локальные данные)
 */
export async function getAllNews() {
    if (isFirebaseInitialized && firestore) {
        try {
            const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const newsRef = collection(firestore, 'news');
            const snapshot = await getDocs(newsRef);

            if (!snapshot.empty) {
                const list = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: parseInt(data.id || doc.id),
                        ...data
                    };
                });
                return list.sort((a, b) => (b.id || 0) - (a.id || 0));
            }
        } catch (error) {
            console.warn('Не удалось загрузить новости из Firestore, используем локальные данные:', error);
        }
    }
    return [...DEFAULT_MANGA_DATA.news];
}

// ===================================
// ЗАКЛАДКИ
// ===================================

/**
 * Получить все закладки
 */
export async function getBookmarks() {
    if (isFirestoreAvailable()) {
        try {
            const { collection, query, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const bookmarksRef = collection(firestore, 'users', uid, 'bookmarks');
            const snapshot = await getDocs(bookmarksRef);
            return snapshot.docs.map(doc => parseInt(doc.id));
        } catch (error) {
            console.error('Ошибка загрузки закладок из Firestore:', error);
            // Фолбэк на localStorage
            return getBookmarksFromLocalStorage();
        }
    }
    return getBookmarksFromLocalStorage();
}

function getBookmarksFromLocalStorage() {
    const data = localStorage.getItem('manga_bookmarks');
    return data ? JSON.parse(data) : [];
}

/**
 * Добавить/удалить закладку
 */
export async function toggleBookmark(mangaId) {
    const bookmarks = await getBookmarks();
    const isBookmarked = bookmarks.includes(mangaId);

    if (isFirestoreAvailable()) {
        try {
            const { doc, setDoc, deleteDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const bookmarkRef = doc(firestore, 'users', uid, 'bookmarks', mangaId.toString());

            if (isBookmarked) {
                await deleteDoc(bookmarkRef);
            } else {
                await setDoc(bookmarkRef, { addedAt: serverTimestamp() });
            }
            return !isBookmarked;
        } catch (error) {
            console.error('Ошибка сохранения закладки в Firestore:', error);
            showToast('Не удалось сохранить закладку', 'error');
            // Фолбэк на localStorage
            return toggleBookmarkInLocalStorage(mangaId, bookmarks, isBookmarked);
        }
    }
    return toggleBookmarkInLocalStorage(mangaId, bookmarks, isBookmarked);
}

function toggleBookmarkInLocalStorage(mangaId, bookmarks, isBookmarked) {
    if (isBookmarked) {
        bookmarks = bookmarks.filter(id => id !== mangaId);
    } else {
        bookmarks.push(mangaId);
    }
    localStorage.setItem('manga_bookmarks', JSON.stringify(bookmarks));
    return !isBookmarked;
}

/**
 * Проверить, в закладках ли манга
 */
export async function isBookmarked(mangaId) {
    const bookmarks = await getBookmarks();
    return bookmarks.includes(mangaId);
}

// ===================================
// ПРОГРЕСС ЧТЕНИЯ
// ===================================

/**
 * Получить весь прогресс чтения
 */
export async function getReadingProgress() {
    if (isFirestoreAvailable()) {
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const readingRef = collection(firestore, 'users', uid, 'reading');
            const snapshot = await getDocs(readingRef);

            const progress = {};
            snapshot.docs.forEach(doc => {
                progress[doc.id] = doc.data();
            });
            return progress;
        } catch (error) {
            console.error('Ошибка загрузки прогресса из Firestore:', error);
            return getReadingProgressFromLocalStorage();
        }
    }
    return getReadingProgressFromLocalStorage();
}

function getReadingProgressFromLocalStorage() {
    const data = localStorage.getItem('manga_reading_progress');
    return data ? JSON.parse(data) : {};
}

/**
 * Получить прогресс для конкретной манги
 */
export async function getProgress(mangaId) {
    const allProgress = await getReadingProgress();
    return allProgress[mangaId] || null;
}

/**
 * Установить прогресс чтения
 */
export async function setProgress(mangaId, chapter) {
    if (isFirestoreAvailable()) {
        try {
            const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const progressRef = doc(firestore, 'users', uid, 'reading', mangaId.toString());

            await setDoc(progressRef, {
                chapter: chapter,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Ошибка сохранения прогресса в Firestore:', error);
            showToast('Не удалось сохранить прогресс', 'error');
            return setProgressInLocalStorage(mangaId, chapter);
        }
    }
    return setProgressInLocalStorage(mangaId, chapter);
}

function setProgressInLocalStorage(mangaId, chapter) {
    const progress = getReadingProgressFromLocalStorage();
    progress[mangaId] = { chapter, date: new Date().toISOString() };
    localStorage.setItem('manga_reading_progress', JSON.stringify(progress));
    return true;
}

// ===================================
// ОТЗЫВЫ
// ===================================

/**
 * Получить отзывы пользователя
 */
export async function getUserReviews() {
    if (isFirestoreAvailable()) {
        try {
            const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const reviewsRef = collection(firestore, 'users', uid, 'reviews');
            const q = query(reviewsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                mangaId: parseInt(doc.id),
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ошибка загрузки отзывов из Firestore:', error);
            return getUserReviewsFromLocalStorage();
        }
    }
    return getUserReviewsFromLocalStorage();
}

function getUserReviewsFromLocalStorage() {
    const data = localStorage.getItem('manga_user_reviews');
    return data ? JSON.parse(data) : [];
}

/**
 * Получить публичные отзывы для манги
 */
export async function getPublicReviews(mangaId) {
    if (isFirebaseInitialized && firestore) {
        try {
            const { collection, getDocs, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const reviewsRef = collection(firestore, 'reviews', mangaId.toString(), 'items');
            const q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Ошибка загрузки публичных отзывов из Firestore:', error);
            // Если ошибка orderBy (например, нет индекса или поле не у всех), пробуем без orderBy
            try {
                const { collection, getDocs, limit } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                const reviewsRef = collection(firestore, 'reviews', mangaId.toString(), 'items');
                const q = query(reviewsRef, limit(50));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                }));
            } catch (err2) {
                console.error('Ошибка повторной загрузки публичных отзывов:', err2);
                return [];
            }
        }
    }
    return [];
}

/**
 * Получить отзыв текущего пользователя для конкретной манги
 */
export async function getUserReviewForManga(mangaId) {
    if (isFirestoreAvailable()) {
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const userReviewRef = doc(firestore, 'users', uid, 'reviews', mangaId.toString());
            const snap = await getDoc(userReviewRef);
            if (snap.exists()) {
                return {
                    mangaId: parseInt(mangaId),
                    ...snap.data()
                };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения отзыва пользователя:', error);
            const reviews = getUserReviewsFromLocalStorage();
            return reviews.find(r => r.mangaId === parseInt(mangaId)) || null;
        }
    }
    const reviews = getUserReviewsFromLocalStorage();
    return reviews.find(r => r.mangaId === parseInt(mangaId)) || null;
}

/**
 * Добавить отзыв
 */
export async function addReview(mangaId, rating, text) {
    if (isFirestoreAvailable()) {
        try {
            const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const user = auth.currentUser;

            const reviewData = {
                rating: parseInt(rating),
                text: text.trim(),
                createdAt: serverTimestamp()
            };

            // Сохраняем в личные отзывы пользователя
            const userReviewRef = doc(firestore, 'users', uid, 'reviews', mangaId.toString());
            await setDoc(userReviewRef, reviewData);

            // Сохраняем в публичные отзывы
            const publicReviewRef = doc(firestore, 'reviews', mangaId.toString(), 'items', uid);
            await setDoc(publicReviewRef, {
                ...reviewData,
                authorName: user.displayName || 'Пользователь',
                photoURL: user.photoURL || null
            });

            showToast('Отзыв опубликован!', 'success');
            return true;
        } catch (error) {
            console.error('Ошибка сохранения отзыва в Firestore:', error);
            showToast('Не удалось опубликовать отзыв', 'error');
            return addReviewToLocalStorage(mangaId, rating, text);
        }
    }
    return addReviewToLocalStorage(mangaId, rating, text);
}

/**
 * Редактировать отзыв
 */
export async function updateReview(mangaId, rating, text) {
    if (isFirestoreAvailable()) {
        try {
            const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const user = auth.currentUser;

            const reviewData = {
                rating: parseInt(rating),
                text: text.trim(),
                updatedAt: serverTimestamp()
            };

            // Обновляем в личных отзывах пользователя (merge: true сохраняет createdAt)
            const userReviewRef = doc(firestore, 'users', uid, 'reviews', mangaId.toString());
            await setDoc(userReviewRef, reviewData, { merge: true });

            // Обновляем в публичных отзывах
            const publicReviewRef = doc(firestore, 'reviews', mangaId.toString(), 'items', uid);
            await setDoc(publicReviewRef, {
                ...reviewData,
                authorName: user.displayName || 'Пользователь',
                photoURL: user.photoURL || null
            }, { merge: true });

            showToast('Отзыв обновлён!', 'success');
            return true;
        } catch (error) {
            console.error('Ошибка обновления отзыва в Firestore:', error);
            showToast('Не удалось обновить отзыв', 'error');
            return updateReviewInLocalStorage(mangaId, rating, text);
        }
    }
    return updateReviewInLocalStorage(mangaId, rating, text);
}

/**
 * Удалить отзыв
 */
export async function deleteReview(mangaId) {
    if (isFirestoreAvailable()) {
        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;

            // Удаляем из личных отзывов пользователя
            const userReviewRef = doc(firestore, 'users', uid, 'reviews', mangaId.toString());
            await deleteDoc(userReviewRef);

            // Удаляем из публичных отзывов
            const publicReviewRef = doc(firestore, 'reviews', mangaId.toString(), 'items', uid);
            await deleteDoc(publicReviewRef);

            showToast('Отзыв удалён', 'info');
            return true;
        } catch (error) {
            console.error('Ошибка удаления отзыва из Firestore:', error);
            showToast('Не удалось удалить отзыв', 'error');
            return deleteReviewFromLocalStorage(mangaId);
        }
    }
    return deleteReviewFromLocalStorage(mangaId);
}

function addReviewToLocalStorage(mangaId, rating, text) {
    const reviews = getUserReviewsFromLocalStorage();
    const existingIndex = reviews.findIndex(r => r.mangaId === parseInt(mangaId));
    const newEntry = {
        id: Date.now(),
        mangaId: parseInt(mangaId),
        rating: parseInt(rating),
        text: text.trim(),
        date: new Date().toISOString()
    };

    if (existingIndex !== -1) {
        reviews[existingIndex] = newEntry;
    } else {
        reviews.push(newEntry);
    }

    localStorage.setItem('manga_user_reviews', JSON.stringify(reviews));
    showToast('Отзыв сохранён локально', 'success');
    return true;
}

function updateReviewInLocalStorage(mangaId, rating, text) {
    const reviews = getUserReviewsFromLocalStorage();
    const index = reviews.findIndex(r => r.mangaId === parseInt(mangaId));
    if (index !== -1) {
        reviews[index].rating = parseInt(rating);
        reviews[index].text = text.trim();
        reviews[index].updatedAt = new Date().toISOString();
        localStorage.setItem('manga_user_reviews', JSON.stringify(reviews));
        showToast('Отзыв обновлён локально', 'success');
        return true;
    }
    return addReviewToLocalStorage(mangaId, rating, text);
}

function deleteReviewFromLocalStorage(mangaId) {
    let reviews = getUserReviewsFromLocalStorage();
    reviews = reviews.filter(r => r.mangaId !== parseInt(mangaId));
    localStorage.setItem('manga_user_reviews', JSON.stringify(reviews));
    showToast('Отзыв удалён локально', 'info');
    return true;
}

// ===================================
// НАСТРОЙКИ
// ===================================

/**
 * Получить настройки пользователя
 */
export async function getSettings() {
    if (isFirestoreAvailable()) {
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const userRef = doc(firestore, 'users', uid);
            const snapshot = await getDoc(userRef);

            if (snapshot.exists()) {
                return snapshot.data().settings || getDefaultSettings();
            }
            return getDefaultSettings();
        } catch (error) {
            console.error('Ошибка загрузки настроек из Firestore:', error);
            return getSettingsFromLocalStorage();
        }
    }
    return getSettingsFromLocalStorage();
}

function getSettingsFromLocalStorage() {
    const data = localStorage.getItem('manga_settings');
    return data ? JSON.parse(data) : getDefaultSettings();
}

function getDefaultSettings() {
    return {
        theme: 'auto',
        notifications: true,
        viewMode: 'grid'
    };
}

/**
 * Сохранить настройки
 */
export async function setSettings(settings) {
    if (isFirestoreAvailable()) {
        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const uid = auth.currentUser.uid;
            const userRef = doc(firestore, 'users', uid);

            await updateDoc(userRef, { settings });
            showToast('Настройки сохранены', 'success');
            return true;
        } catch (error) {
            console.error('Ошибка сохранения настроек в Firestore:', error);
            showToast('Не удалось сохранить настройки', 'error');
            return setSettingsInLocalStorage(settings);
        }
    }
    return setSettingsInLocalStorage(settings);
}

function setSettingsInLocalStorage(settings) {
    localStorage.setItem('manga_settings', JSON.stringify(settings));
    return true;
}

// ===================================
// МИГРАЦИЯ ДАННЫХ
// ===================================

/**
 * Проверить наличие локальных данных
 */
export function hasLocalData() {
    const bookmarks = localStorage.getItem('manga_bookmarks');
    const progress = localStorage.getItem('manga_reading_progress');
    const reviews = localStorage.getItem('manga_user_reviews');

    return !!(bookmarks || progress || reviews);
}

/**
 * Мигрировать данные из localStorage в Firestore
 */
export async function migrateLocalDataToFirestore() {
    if (!isFirestoreAvailable()) {
        console.error('Firestore недоступен для миграции');
        return false;
    }

    try {
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const uid = auth.currentUser.uid;

        // Миграция закладок
        const localBookmarks = getBookmarksFromLocalStorage();
        for (const mangaId of localBookmarks) {
            const bookmarkRef = doc(firestore, 'users', uid, 'bookmarks', mangaId.toString());
            await setDoc(bookmarkRef, { addedAt: serverTimestamp() });
        }

        // Миграция прогресса
        const localProgress = getReadingProgressFromLocalStorage();
        for (const [mangaId, data] of Object.entries(localProgress)) {
            const progressRef = doc(firestore, 'users', uid, 'reading', mangaId);
            await setDoc(progressRef, {
                chapter: data.chapter,
                updatedAt: serverTimestamp()
            });
        }

        // Миграция отзывов
        const localReviews = getUserReviewsFromLocalStorage();
        const user = auth.currentUser;

        for (const review of localReviews) {
            const userReviewRef = doc(firestore, 'users', uid, 'reviews', review.mangaId.toString());
            await setDoc(userReviewRef, {
                rating: review.rating,
                text: review.text,
                createdAt: serverTimestamp()
            });

            const publicReviewRef = doc(firestore, 'reviews', review.mangaId.toString(), 'items', uid);
            await setDoc(publicReviewRef, {
                rating: review.rating,
                text: review.text,
                authorName: user.displayName || 'Аноним',
                photoURL: user.photoURL || null,
                createdAt: serverTimestamp()
            });
        }

        // Очищаем локальные данные после успешной миграции
        localStorage.removeItem('manga_bookmarks');
        localStorage.removeItem('manga_reading_progress');
        localStorage.removeItem('manga_user_reviews');

        showToast('Данные успешно перенесены в ваш аккаунт!', 'success');
        return true;
    } catch (error) {
        console.error('Ошибка миграции данных:', error);
        showToast('Не удалось перенести все данные', 'error');
        return false;
    }
}

/**
 * Предложить миграцию данных при первом входе
 */
export async function offerDataMigration() {
    if (!hasLocalData() || !isFirestoreAvailable()) {
        return;
    }

    // Проверяем, не мигрировали ли мы уже данные
    const migrated = localStorage.getItem('data_migrated');
    if (migrated) return;

    const shouldMigrate = confirm(
        'У вас есть сохранённые данные в гостевом режиме (закладки, прогресс чтения, отзывы). ' +
        'Хотите перенести их в ваш аккаунт Google?'
    );

    if (shouldMigrate) {
        const success = await migrateLocalDataToFirestore();
        if (success) {
            localStorage.setItem('data_migrated', 'true');
        }
    } else {
        localStorage.setItem('data_migrated', 'skipped');
    }
}