// Challenge level texts and the LVL badge, in one place for the level select (mobile.js levelMenu) and the run's
// level shown in the Relics window (relic-inspect.js, 2026-11-16). i18n.js translates the texts on screen.
export const levelText=['No modifiers','All enemies start with 8000 LP','Amplified Boss Curses','Coin rewards reduced by 25%','Start with 4000 LP; between-duel healing cap 4000 LP','Opponents receive a thematic combat relic','Start with a chosen curse; curses persist and each boss adds one'];
export const relicFreeText='Disable all relics or curses';
export const levelDescription=level=>level===-1?relicFreeText:levelText[level]||'';
// colored: the level's own colour (mobile.css .level-badge[data-challenge-level]), as on completed levels.
export const levelBadge=(level,{colored=false}={})=>`<span class="level-badge challenge-level-badge"${colored?` data-challenge-level="${level}"`:''} aria-label="Level ${level}"><span>LVL</span><strong>${level}</strong></span>`;
