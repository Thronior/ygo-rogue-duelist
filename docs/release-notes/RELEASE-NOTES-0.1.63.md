## v0.1.63 — Performance & Presentation

**Performance**
- Duel boards now update only the parts that changed, keeping the existing layout and controls.
- Reduced CPU decision overhead without changing its choices: about 59% fewer engine queries in replay testing.
- Improved main-menu background performance while keeping its entrance animation.

**Visuals & Audio**
- Added a smoother animated duel background, preloaded during startup and dimmed to keep cards readable.
- Added card-vortex backgrounds to run victory and defeat screens in Singleplayer and Ultimate Collector, with red tones for defeats.
- Improved the duel defeat animation.
- Kept card stats, zone clearing, and emotes working correctly with the new board renderer.
- Fixed boss-encounter music and improved purchase-sound responsiveness.

**Gameplay & Menus**
- Fixed the CPU wasting multiple Books of Moon on the same monster in one chain.
- Fixed duplicate curse stacking and displayed curse counts, including Tag mode.
- Added a separate Ultimate Collector category to Watch CPU Duel.
- Simplified the Collection by removing the effect filter and extra explanatory text.
- Shortened the title-screen footer to “Fan Experiment”.

