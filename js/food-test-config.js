// Тест сборки: открой index.html?foodTest=1 → «Еда» → «Тест: собрать».
// Или поставь enabled: true ниже, чтобы кнопки были видны без параметра URL.
// Пример: enabled: true — включить; enabled: false — обычная игра.
// Тестовая коллекция хранится отдельно от настоящей и сохраняется после обновления.
export const FOOD_TEST_CONFIG = Object.freeze({ enabled: false });
export const FOOD_TEST_MODE = FOOD_TEST_CONFIG.enabled ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('foodTest') === '1');
