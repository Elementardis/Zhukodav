import { messages } from './messages.js';

export const LANGUAGE_STORAGE_KEY = 'bugClicker.language';
export const SUPPORTED_LANGUAGES = ['ru', 'en'];
export function resolveLanguage(query, saved) {
    return SUPPORTED_LANGUAGES.includes(query) ? query : SUPPORTED_LANGUAGES.includes(saved) ? saved : 'ru';
}
function initialLanguage() {
    let saved;
    try { if (typeof window !== 'undefined') saved = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY); } catch {}
    return resolveLanguage(new URLSearchParams(globalThis.location?.search || '').get('lang'), saved);
}
export const language = initialLanguage();
export function t(key, parameters = {}) {
    const message = messages[language]?.[key] ?? messages.ru[key];
    if (message === undefined) throw new Error(`Unknown localization key: ${key}`);
    return message.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(parameters, name) ? String(parameters[name]) : match);
}
export function formatNumber(value) { return new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(value); }
export function localizeResource(value) {
    if (typeof value === 'string') return value.startsWith('@i18n:') ? t(value.slice(6)) : value;
    if (Array.isArray(value)) return value.map(localizeResource);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeResource(item)]));
    return value;
}
// Language changes are offered on the home screen. Reload rebuilds all static configs
// in one language; gameplay progress and narrative IDs keep their existing storage keys.
export function changeLanguage(next) {
    if (!SUPPORTED_LANGUAGES.includes(next) || next === language) return;
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch {}
    const url = new URL(location.href); url.searchParams.set('lang', next);
    location.replace(url.href);
}
