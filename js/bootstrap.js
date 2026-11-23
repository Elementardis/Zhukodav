import { t, language } from './i18n.js';
document.documentElement.lang = language;
document.title = t('game.title');
for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
await import('./preloader.js');
try { await import('../game.js'); }
catch (error) { console.error('Game bootstrap failed:', error); window.gamePreloader.error(t('loading.failure')); }
