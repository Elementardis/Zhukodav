import { t } from './i18n.js';
// Пример: bug.text — реплика при первой встрече с обычным жуком.
// Для нового вида добавь запись под его ключом из bug-config.js.
// bomb.afterClick показывается после нажатия, пока игрок не нажмёт «Продолжить».
export const BUG_TUTORIALS = {
    bug: { text: t('bug_tutorial_config.001') },
    fat: { text: t('bug_tutorial_config.002') },
    healer: { text: t('bug_tutorial_config.003') },
    frozen: { text: t('bug_tutorial_config.004') },
    chameleon: { text: t('bug_tutorial_config.005') },
    neat: { text: t('bug_tutorial_config.006') },
    bomb: { text: t('bug_tutorial_config.007'), afterClick: t('bug_tutorial_config.008') },
    ...Object.fromEntries(['red','purple','green','yellow'].flatMap(color=>[
        [`coloredBug_${color}`, { text: t('bug_tutorial_config.009') }],
        [`fatColoredBug_${color}`, { text: t('bug_tutorial_config.010') }]
    ]))
};
