# Новый жук и палитра результатов

Реализовано по `CODEX_PROMPT_RU.md` из `Zhukodav_New_Bug_Popup.zip`.

## Изменённые файлы

- `js/intro-popup.js` — карточка 1140×850, названия типов, игровая иконка через
  contain, исходное `descryption`, прокрутка длинных описаний мышью и пальцем,
  однократное подтверждение, очистка обработчика прокрутки, Graphics fallback.
- `game.js` — подключение интро, блокирующий фон, очистка при выходе/перезапуске,
  общая тема для трёх попапов, растрирование SVG в двойном разрешении.
- `js/result-popup.js` — сливовые заголовки без обводки, текст в разрешении 2,
  общие подложки и fallback при отсутствии графики.
- `images/ui/results/intro-layout.json` — геометрия и `popupTheme` из архива.
- `images/ui/results/layout.json` — обновлены цвет и обводка заголовков.
- `images/ui/results/assets/{panel,button_primary,button_menu,home,next,retry}.svg`
  — общие файлы из архива с сохранением URL. `panel.svg` по содержимому прежний.
- `tests/browser-gameplay.cjs` — сценарий `--intro` для типов, описаний,
  блокировки игры, двойного подтверждения, длинного текста и очистки.
- `tests/artifacts/popup-*.png` — снимки попапов для проверки геометрии.

## Шрифт и данные

Сохранён набор `Arial Rounded MT Bold`, `Arial`, `sans-serif`. Собственного
подключённого округлого кириллического шрифта в проекте нет: кириллица может
отображаться Arial и отличаться от концепта. Текст остаётся текстом Pixi.

Описания уровней сохранены дословно, включая опечатки. Например, описание
`fatColoredBug_green` просит нажать на красного жука — это существующее
несоответствие данных уровня, не подмена текста новым попапом.

## Проверки

Команды: `node --check game.js`, `node --check js/intro-popup.js`,
`node --check js/result-popup.js`, `node tests/browser-gameplay.cjs --intro`,
`node tests/browser-gameplay.cjs --popups`, `node tests/browser-gameplay.cjs --results`,
`node tests/browser-gameplay.cjs`.

Браузерные тесты используют локальную заглушку Firebase: проверяется игровое
поведение и локальный прогресс, реальные сетевые сохранения не вызываются.
