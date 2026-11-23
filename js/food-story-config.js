import { t } from './i18n.js';
// Сюжет за уникальные кусочки. Порядок массива = порядок получения, не номер сектора.
// Пример: первый новый кусочек cake_04 открывает cake_memory_01, следующий — cake_memory_02.
// id реплик сохраняются в прогрессе: при редактировании текста не меняй id.
// finale: true — финальная реплика. Если получена до остальных комплектов,
// ждёт все пять комплектов; награда и сборка не блокируются.
export const FOOD_STORIES = {
    greek_salad: [
        { id: 'greek_salad_memory_01', image: 'images/story/mascot_mischief.png', text: t('story.greek_salad_memory_01') },
        { id: 'greek_salad_memory_02', image: 'images/story/mascot_warm_memory.png', text: t('story.greek_salad_memory_02') },
        { id: 'greek_salad_memory_03', image: 'images/story/mascot_laughter.png', text: t('story.greek_salad_memory_03') },
        { id: 'greek_salad_memory_04', image: 'images/story/mascot_self_irony.png', text: t('story.greek_salad_memory_04') },
        { id: 'greek_salad_memory_05', image: 'images/story/mascot_longing.png', text: t('story.greek_salad_memory_05') },
    ],
    bundt_cake: [
        { id: 'bundt_cake_memory_01', image: 'images/story/mascot_warm_memory.png', text: t('story.bundt_cake_memory_01') },
        { id: 'bundt_cake_memory_02', image: 'images/story/mascot_mischief.png', text: t('story.bundt_cake_memory_02') },
        { id: 'bundt_cake_memory_03', image: 'images/story/mascot_reflection.png', text: t('story.bundt_cake_memory_03') },
        { id: 'bundt_cake_memory_04', image: 'images/story/mascot_warm_memory.png', text: t('story.bundt_cake_memory_04') },
        { id: 'bundt_cake_memory_05', image: 'images/story/mascot_laughter.png', text: t('story.bundt_cake_memory_05') },
        { id: 'bundt_cake_memory_06', image: 'images/story/mascot_self_irony.png', text: t('story.bundt_cake_memory_06') },
        { id: 'bundt_cake_memory_07', image: 'images/story/mascot_reflection.png', text: t('story.bundt_cake_memory_07') },
        { id: 'bundt_cake_memory_08', image: 'images/story/mascot_mischief.png', text: t('story.bundt_cake_memory_08') },
        { id: 'bundt_cake_memory_09', image: 'images/story/mascot_warm_memory.png', text: t('story.bundt_cake_memory_09') },
        { id: 'bundt_cake_memory_10', image: 'images/story/mascot_longing.png', text: t('story.bundt_cake_memory_10') },
        { id: 'bundt_cake_memory_11', image: 'images/story/mascot_painful_realization.png', text: t('story.bundt_cake_memory_11') },
        { id: 'bundt_cake_memory_12', image: 'images/story/mascot_acceptance_hope.png', text: t('story.bundt_cake_memory_12') },
    ],
    pie: [
        { id: 'pie_memory_01', image: 'images/story/mascot_warm_memory.png', text: t('story.pie_memory_01') },
        { id: 'pie_memory_02', image: 'images/story/mascot_mischief.png', text: t('story.pie_memory_02') },
        { id: 'pie_memory_03', image: 'images/story/mascot_laughter.png', text: t('story.pie_memory_03') },
        { id: 'pie_memory_04', image: 'images/story/mascot_mischief.png', text: t('story.pie_memory_04') },
        { id: 'pie_memory_05', image: 'images/story/mascot_self_irony.png', text: t('story.pie_memory_05') },
        { id: 'pie_memory_06', image: 'images/story/mascot_laughter.png', text: t('story.pie_memory_06') },
        { id: 'pie_memory_07', image: 'images/story/mascot_longing.png', text: t('story.pie_memory_07') },
        { id: 'pie_memory_08', image: 'images/story/mascot_painful_realization.png', text: t('story.pie_memory_08') },
        { id: 'pie_memory_09', image: 'images/story/mascot_longing.png', text: t('story.pie_memory_09') },
        { id: 'pie_memory_10', image: 'images/story/mascot_acceptance_hope.png', text: t('story.pie_memory_10') },
    ],
    dressed_herring: [
        { id: 'dressed_herring_memory_01', image: 'images/story/mascot_warm_memory.png', text: t('story.dressed_herring_memory_01') },
        { id: 'dressed_herring_memory_02', image: 'images/story/mascot_warm_memory.png', text: t('story.dressed_herring_memory_02') },
        { id: 'dressed_herring_memory_03', image: 'images/story/mascot_mischief.png', text: t('story.dressed_herring_memory_03') },
        { id: 'dressed_herring_memory_04', image: 'images/story/mascot_self_irony.png', text: t('story.dressed_herring_memory_04') },
        { id: 'dressed_herring_memory_05', image: 'images/story/mascot_longing.png', text: t('story.dressed_herring_memory_05') },
        { id: 'dressed_herring_memory_06', image: 'images/story/mascot_reflection.png', text: t('story.dressed_herring_memory_06') },
        { id: 'dressed_herring_memory_07', image: 'images/story/mascot_acceptance_hope.png', text: t('story.dressed_herring_memory_07') },
    ],
    cake: [
        { id: 'cake_memory_01', image: 'images/story/mascot_self_irony.png', text: t('story.cake_memory_01') },
        { id: 'cake_memory_02', image: 'images/story/mascot_warm_memory.png', text: t('story.cake_memory_02') },
        { id: 'cake_memory_03', image: 'images/story/mascot_self_irony.png', text: t('story.cake_memory_03') },
        { id: 'cake_memory_04', image: 'images/story/mascot_acceptance_hope.png', text: t('story.cake_memory_04') },
        { id: 'cake_memory_05', image: 'images/story/mascot_gratitude.png', text: t('story.cake_memory_05'), finale: true },
        { id: 'cake_memory_06', image: 'images/story/mascot_offering_cake.png', text: t('story.cake_memory_06'), finale: true },
    ],
};
