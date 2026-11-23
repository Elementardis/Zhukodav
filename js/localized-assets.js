import { language } from './i18n.js';

export const LOCALIZED_IMAGES = {
    'images/home/03_banner.png': { en: 'images/home/en/03_banner.png' },
    'images/home/08_button_dishes.png': { en: 'images/home/en/08_button_dishes.png' },
    'images/home/09_button_play.png': { en: 'images/home/en/09_button_play.png' },
    'images/ui/loading/assets/loading_label.png': { en: 'images/ui/loading/assets/en/loading_label.png' }
};

// Russian uses the untouched original; only translated artwork changes its path.
export function localizedImagePath(path, locale = language) {
    return LOCALIZED_IMAGES[path]?.[locale] || path;
}
