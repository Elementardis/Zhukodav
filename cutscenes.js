import { t } from './js/i18n.js';
export const cutscenes = [
  {
    id: "intro_before_level_1",
    levelId: 1,
    when: "beforeLevel",
    repeat: "each",

    frames: [
      {
        image: "images/story/mascot_welcome.png",
        text: t('cutscenes.001'),
        buttonText: t('cutscenes.002')
      },
      {
        image: "images/story/mascot_shrug.png",
        text: t('cutscenes.003'),
        buttonText: t('cutscenes.004')
      },
      {
        image: "images/story/mascot_show_pizza.png",
        text: t('cutscenes.005'),
        buttonText: t('cutscenes.006')
      },
      {
        image: "images/story/mascot_loves_pizza.png",
        text: t('cutscenes.007'),
        buttonText: t('cutscenes.008')
      },
      {
        image: "images/story/mascot_hears_signal.png",
        text: t('cutscenes.009'),
        buttonText: t('cutscenes.010')
      },
      {
        image: "images/story/mascot_asks_help.png",
        text: t('cutscenes.011'),
        buttonText: t('cutscenes.012')
      },
      {
        image: "images/story/mascot_leaving.png",
        text: t('cutscenes.013'),
        buttonText: t('cutscenes.014')
      },
      {
        image: "images/story/mascot_leaving.png",    
        text: t('cutscenes.015'),
        buttonText: t('cutscenes.016')
      }
    ]
  }
];