// ===================================
// ДАННЫЕ МАНГИ И УТИЛИТЫ
// ===================================

// Генерация градиента из названия тайтла
function generateGradientFromTitle(title) {
    // Простой хеш из названия для генерации согласованных цветов
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Генерируем два цвета из хеша
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 60) % 360;

    const color1 = `hsl(${hue1}, 70%, 60%)`;
    const color2 = `hsl(${hue2}, 70%, 45%)`;

    return `linear-gradient(135deg, ${color1}, ${color2})`;
}

// Базовые данные манги
const MANGA_DATA = {
    manga: [
        {
            id: 1,
            title: "Атака титанов",
            titleAlt: "Shingeki no Kyojin / Attack on Titan",
            author: "Хадзиме Исаяма",
            year: 2009,
            status: "completed",
            genres: ["Экшн", "Драма", "Фэнтези"],
            rating: 9.2,
            votes: 15234,
            description: "Сотни лет назад человечество было почти полностью уничтожено титанами. Титаны — это несколько метров в высоту, на вид как люди, но пропорции нарушены. Их единственная цель — пожирать людей. Остатки человечества построили огромные стены и зажили в мире. Главный герой, Эрен Йегер, клянётся уничтожить всех титанов после того, как они разрушают стену и убивают его мать.",
            chapters: 139,
            views: 1250000,
            bookmarks: 89000
        },
        {
            id: 2,
            title: "Ван-Пис",
            titleAlt: "One Piece",
            author: "Эйитиро Ода",
            year: 1997,
            status: "ongoing",
            genres: ["Приключения", "Экшн", "Комедия"],
            rating: 9.1,
            votes: 21890,
            description: "История о парне по имени Монки Д. Луффи, который хочет стать Королем Пиратов. Он съел Гому Гому но Ми (дьявольский фрукт), после чего его тело приобрело свойства резины. Луффи собирает команду и отправляется в путешествие по Гранд Лайн в поисках легендарного сокровища Ван-Пис.",
            chapters: 1100,
            views: 3500000,
            bookmarks: 156000
        },
        {
            id: 3,
            title: "Токийский гуль",
            titleAlt: "Tokyo Ghoul",
            author: "Суи Исида",
            year: 2011,
            status: "completed",
            genres: ["Хоррор", "Экшн", "Драма"],
            rating: 8.9,
            votes: 18765,
            description: "Кэн Канеки — обычный студент, до тех пор, пока встреча с девушкой не изменяет его жизнь навсегда. Он просыпается в больнице и обнаруживает, что стал наполовину гулем — существом, которое может выжить только поедая людей. Теперь он должен научиться балансировать между двумя мирами.",
            chapters: 143,
            views: 890000,
            bookmarks: 67000
        },
        {
            id: 4,
            title: "Моя геройская академия",
            titleAlt: "Boku no Hero Academia / My Hero Academia",
            author: "Кохэй Хорикоси",
            year: 2014,
            status: "ongoing",
            genres: ["Экшн", "Школа", "Фэнтези"],
            rating: 8.7,
            votes: 16543,
            description: "Это история о том, как я стал величайшим героем. Когда-то давно появился светящийся младенец, и с тех пор в мире начали рождаться люди со сверхспособностями — 'причудами'. Мидория Изуку родился без суперсилы, но это не мешает ему мечтать стать героем и поступить в престижную академию героев.",
            chapters: 410,
            views: 1100000,
            bookmarks: 92000
        },
        {
            id: 5,
            title: "Тетрадь смерти",
            titleAlt: "Death Note",
            author: "Цугуми Оба",
            year: 2003,
            status: "completed",
            genres: ["Психологическое", "Драма", "Фэнтези"],
            rating: 9.3,
            votes: 25678,
            description: "Старшеклассник Ягами Лайт находит тетрадь, способную убивать людей. Для этого достаточно лишь написать имя жертвы и представить её лицо. Лайт решает изменить мир, избавив его от преступников. Но на его след выходит легендарный детектив L, и начинается интеллектуальная битва двух гениев.",
            chapters: 108,
            views: 2100000,
            bookmarks: 145000
        },
        {
            id: 6,
            title: "Наруто",
            titleAlt: "Naruto",
            author: "Масаси Кисимото",
            year: 1999,
            status: "completed",
            genres: ["Экшн", "Приключения", "Драма"],
            rating: 8.8,
            votes: 19234,
            description: "История об Узумаки Наруто — гиперактивном ниндзя-подростке, который постоянно ищет одобрения и признания, а также мечтает стать Хокаге — признанным лидером и сильнейшим ниндзя своей деревни. Внутри Наруто запечатан Девятихвостый Лис, что делает его изгоем в деревне.",
            chapters: 700,
            views: 2800000,
            bookmarks: 178000
        },
        {
            id: 7,
            title: "Охотник х Охотник",
            titleAlt: "Hunter x Hunter",
            author: "Ёсихиро Тогаси",
            year: 1998,
            status: "hiatus",
            genres: ["Приключения", "Экшн", "Фэнтези"],
            rating: 9.4,
            votes: 14567,
            description: "Гон Фрикс живёт на маленьком острове. Его отец оставил его когда он был совсем маленьким. Однажды Гон узнаёт, что его отец — великий Охотник, профессионал, способный выполнить любую задачу. Гон решает пойти по его стопам, найти отца и стать Охотником.",
            chapters: 390,
            views: 780000,
            bookmarks: 58000
        },
        {
            id: 8,
            title: "Стальной алхимик",
            titleAlt: "Fullmetal Alchemist",
            author: "Хирому Аракава",
            year: 2001,
            status: "completed",
            genres: ["Приключения", "Экшн", "Драма"],
            rating: 9.1,
            votes: 17890,
            description: "Братья Элрик — Эдвард и Альфонс — пытаются вернуть к жизни свою мать с помощью алхимии, но эксперимент идёт не так. Эдвард теряет руку и ногу, а Альфонс — всё тело, его душа оказывается привязана к доспехам. Теперь они ищут философский камень, чтобы вернуть всё назад.",
            chapters: 108,
            views: 1450000,
            bookmarks: 98000
        }
    ],

    genres: [
        { name: "Экшн", count: 450 },
        { name: "Приключения", count: 380 },
        { name: "Комедия", count: 320 },
        { name: "Драма", count: 290 },
        { name: "Фэнтези", count: 270 },
        { name: "Романтика", count: 250 },
        { name: "Психологическое", count: 180 },
        { name: "Школа", count: 160 }
    ],

    news: [
        {
            id: 1,
            title: "Анонсирована новая манга от автора 'Атаки титанов'",
            category: "announcements",
            date: "2026-09-18",
            excerpt: "Хадзиме Исаяма работает над новым проектом. Ожидается релиз в начале 2027 года. Автор легендарной 'Атаки титанов' возвращается с новой историей.",
            content: "Подробности пока держатся в секрете, но издательство обещает нечто неожиданное."
        },
        {
            id: 2,
            title: "Ван-Пис достигла 1100 глав!",
            category: "releases",
            date: "2026-09-15",
            excerpt: "Легендарная манга Эйитиро Оды продолжает радовать читателей новыми главами. 1100-я глава стала настоящим событием для фанатов.",
            content: "Ода продолжает удивлять фанатов после 25+ лет публикации."
        },
        {
            id: 3,
            title: "Объявлено аниме-адаптация популярной манги",
            category: "announcements",
            date: "2026-09-10",
            excerpt: "Студия MAPPA взялась за экранизацию одной из самых ожидаемых манг года. Релиз запланирован на весну 2027.",
            content: "Фанаты с нетерпением ждут анонса состава актёров озвучки."
        }
    ]
};

// Добавляем градиенты к каждому тайтлу манги
MANGA_DATA.manga.forEach(manga => {
    manga.gradient = generateGradientFromTitle(manga.title);
});

// ===================================
// УТИЛИТЫ
// ===================================

const Utils = {
    // Форматирование чисел
    formatNumber: (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    // Текст статуса на русском
    getStatusText: (status) => {
        const statusMap = {
            'ongoing': 'Онгоинг',
            'completed': 'Завершена',
            'hiatus': 'На паузе'
        };
        return statusMap[status] || status;
    },

    // Цвет статуса
    getStatusColor: (status) => {
        const colorMap = {
            'ongoing': '#4caf50',
            'completed': '#2196f3',
            'hiatus': '#ff9800'
        };
        return colorMap[status] || '#999';
    },

    // Рендер звёзд рейтинга
    renderStars: (rating) => {
        const fullStars = Math.floor(rating / 2);
        const hasHalfStar = (rating / 2) % 1 >= 0.5;
        let stars = '★'.repeat(fullStars);
        if (hasHalfStar) stars += '☆';
        stars += '☆'.repeat(5 - Math.ceil(rating / 2));
        return stars;
    },

    // Debounce для поиска
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Экранирование HTML для защиты от XSS
    escapeHtml: (unsafe) => {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// ===================================
// ФУНКЦИИ РАБОТЫ С ДАННЫМИ
// ===================================

// Генерация глав для манги
function generateChapters(mangaId, totalChapters) {
    const chapters = [];
    const today = new Date();

    for (let i = totalChapters; i >= 1; i--) {
        // Распределяем главы по датам (последние главы — недавние)
        const daysAgo = (totalChapters - i) * 2; // Каждая глава выходила ~2 дня назад
        const chapterDate = new Date(today);
        chapterDate.setDate(today.getDate() - daysAgo);

        chapters.push({
            id: i,
            number: i,
            title: `Глава ${i}`,
            date: chapterDate.toLocaleDateString('ru-RU'),
            isNew: i > totalChapters - 3 // Последние 3 главы считаются новыми
        });
    }
    return chapters;
}

// Поиск манги
function searchManga(query, mangaList = MANGA_DATA.manga) {
    if (!query) return [...mangaList];

    const lowerQuery = query.toLowerCase();
    return mangaList.filter(manga =>
        manga.title.toLowerCase().includes(lowerQuery) ||
        (manga.titleAlt && manga.titleAlt.toLowerCase().includes(lowerQuery)) ||
        (manga.author && manga.author.toLowerCase().includes(lowerQuery)) ||
        (manga.genres && manga.genres.some(genre => genre.toLowerCase().includes(lowerQuery)))
    );
}

// Фильтрация манги
function filterManga(filters, manga = MANGA_DATA.manga) {
    let results = [...manga];

    if (filters.genres && filters.genres.length > 0) {
        results = results.filter(manga =>
            manga.genres && filters.genres.some(genre => manga.genres.includes(genre))
        );
    }

    if (filters.yearFrom) {
        results = results.filter(manga => manga.year >= filters.yearFrom);
    }

    if (filters.yearTo) {
        results = results.filter(manga => manga.year <= filters.yearTo);
    }

    if (filters.status && filters.status.length > 0) {
        results = results.filter(manga => filters.status.includes(manga.status));
    }

    if (filters.rating && filters.rating.length > 0) {
        const minRating = Math.min(...filters.rating);
        results = results.filter(manga => manga.rating >= minRating);
    }

    return results;
}

// Сортировка манги
function sortManga(manga, sortBy) {
    const sorted = [...manga];

    switch(sortBy) {
        case 'popular':
            return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
        case 'rating':
            return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'latest':
            return sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
        case 'newest':
            return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
        case 'title':
            return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        case 'year':
            return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
        default:
            return sorted;
    }
}

// Получение рекомендаций
function getRecommendations(basedOn = null, limit = 4, mangaList = MANGA_DATA.manga) {
    // Простая логика: если есть базовая манга, ищем с похожими жанрами
    if (basedOn && basedOn.genres) {
        const recommendations = mangaList
            .filter(manga => manga.id !== basedOn.id)
            .map(manga => {
                // Считаем количество совпадающих жанров
                const matchingGenres = (manga.genres || []).filter(genre =>
                    basedOn.genres.includes(genre)
                ).length;
                return { manga, score: matchingGenres };
            })
            .sort((a, b) => {
                // Сортируем сначала по количеству совпадений, потом по рейтингу
                if (b.score !== a.score) return b.score - a.score;
                return (b.manga.rating || 0) - (a.manga.rating || 0);
            })
            .slice(0, limit)
            .map(item => item.manga);

        return recommendations;
    }

    // Если нет базовой манги, возвращаем топ по рейтингу
    return [...mangaList]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
}

// Экспорт для ES6 модулей (браузеры)
export {
    MANGA_DATA,
    Utils,
    generateChapters,
    searchManga,
    filterManga,
    sortManga,
    getRecommendations,
    generateGradientFromTitle
};