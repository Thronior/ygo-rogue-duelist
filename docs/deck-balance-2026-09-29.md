# Deck balance pass — 2026-09-29

Prepared for the user's next simulation, not published. Based on the supplied 1,050-match results per character in tiers 1–3. This is a candidate balance pass; improved win-rate distribution has not yet been measured.

- Changed 50 tier decks: 18 in tier 1, 17 in tier 2, 15 in tier 3.
- Also expanded all seven tutorial decks using their existing low-power cards.
- All 96 authoritative YDK files have 40–60 main-deck cards. Larger decks were retained as requested. Tier 4 and World Champion lists were unchanged. Extra and side decks were preserved.
- Reduced dominant tier-1 Yugi/Marik/Ishizu; tier-2 Bonz/Joey/Yugi/Marik; tier-3 Kaiba/Exodia/Joey/Bonz/Rex/Marik. Adjustments target duplicate premium removal, recursion, efficient attackers and persistent burn locks.
- Improved struggling Tristan, Odion, Espa Roba, Mako, Noah, Tea, Marik and Weevil lists. Replaced unsupported or overly narrow cards with themed summonable monsters, recruiters and practical interaction. Removed Weevil tier-2's nonfunctional Moth package without Petit Moth.
- Filled undersized lists with curated themed monsters and tier-appropriate spells/traps. No CPU policy changes.

Full per-deck additions, removals and reasons are in `deck-balance-2026-09-29.json`.

## Validation and simulation handoff

- All YDKs passed the authoritative reader: valid pool IDs and at most three copies across main/extra/side.
- All referenced artwork and effect scripts are present.
- The existing fixed-tier/champion native-core regression passed.
- Refreshed `android/web/content.json` (88 CPU tier records) and `android/web/campaign-files.json` from the edited YDKs. The existing benchmark worker reads the refreshed content file.
- Exported content SHA256: `be6c90e90043a7e93fd5e08a0ff708aa0b489ed74b58c2ce05831c967e220204`.
- Run the next benchmark with the same seed schedule but NEW output paths. The worker resumes existing result files by job ID, so reusing old outputs would silently retain the prior deck results.
- No APK build, deployment, GitHub push or announcement performed for this pass.
