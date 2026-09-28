# 0.1.31

- Compact activation/chain choices, floating confirmation, and visible selected-card borders.
- Activation prompts show timing; chain prompts identify the previous card. Short numbered chain animations follow engine resolution order.
- Chain toggle stays accessible above duel windows. Reduced unnecessary CPU waits around combat, including tag duels.
- Castle Walls waits for a legal, face-up defender during the Damage Step. Confirmed against the uploaded behaviour replay.
- Center hands through seven cards, scroll larger hands, and separate attack swords from counter badges.
- Short destruction and tribute effects with sounds; ordinary Graveyard sends are unchanged.
- Fixed relic-only single-player shops for Copycat and Dueling Engine.
- Smoother menu dragging and symmetric spacing; removed the navigation bar, lowered the focused landscape card, and enlarged cards at large browser resolutions.
- Six-column character rosters and bottom-anchored character portraits.
- Updated Discord invite and persistent web card-art storage across browser restarts.
- Fixed web CPU spectator startup by sharing the chunk-aware duel resource loader.

Validation: actual uploaded Castle Walls replay; 16 Castle Walls checks; shared solo/tag CPU parity; tag recovery tests; chain ordering/context; source/APK/web file parity; phone and landscape layout checks; full browser restart artwork-cache test; actual menu startup at three viewports; built-web Marik/Rex CPU viewer at all three tiers. Android APK signature verified. No physical-device testing in this release.
