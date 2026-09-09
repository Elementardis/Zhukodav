# Image assets

Images are grouped by purpose:

- `bugs/`: bug sprites, including the bomb and its explosion animation.
- `buttons/`: colored buttons. `custom_button_*.png` contains the custom artwork;
  `button_*.png` contains the fallback artwork.
- `backgrounds/`: full-screen backgrounds.
- `ui/`: other interface elements, including hearts, panels, level tiles and the play button.

Paths are registered in `UI_ASSET_SLOTS` and `SPRITE_PATHS` in `game.js`.
Missing optional custom assets use the existing Pixi-drawn UI or fallback textures.

Recommended source sizes:

- `backgrounds/bg_levels.png` - `1280x590`
  Background for the level select screen.
- `backgrounds/bg_game.png` - `1280x590`
  Background for the in-level game screen.
- `ui/level_entry_icon.png` - `128x128`
  Icon shown in the level entry popup.
- `ui/level_tile_completed.png` - `128x128`
  Completed level tile background.
- `ui/level_tile_locked.png` - `128x128`
  Not-yet-completed level tile background.
- `ui/game_hud_panel.png` - `1180x112`
  Top in-level HUD panel.
- `ui/game_goal_badge.png` - `220x72`
  Goal counter badge inside the HUD.
- `ui/game_playfield_frame.png` - `900x520`
  Main in-level playfield frame.
- `ui/game_side_panel.png` - `128x360`
  Left/right color-button side panel.
- `ui/game_settings_button.png` - `96x96`
  Settings button background.
- `buttons/custom_button_red.png` - `107x112`
  Red color button.
- `buttons/custom_button_blue.png` - `107x112`
  Blue/cyan color button.
- `buttons/custom_button_purple.png` - `107x112`
  Purple color button.
- `buttons/custom_button_green.png` - `107x112`
  Green color button.

- `ui/play.png` - `120x120`
  Play button for the progress screen.

Keep transparent padding inside the PNG if the art needs glow, shadow, or soft edges.
