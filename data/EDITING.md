# Editing game data

Back up your saves and JSON files first. Desktop reloads relic tuning on the title screen and before new runs, duels and shops. Existing shop prices stay fixed until the next shop. Run `Build Desktop and Android.cmd` to update the APK; it bundles the same data.

- `tuning.json`: every relic name, price, description, artwork, category, effect, numeric amount, and filter. `_fields` documents each variable. IDs must stay stable. Numeric effects use amount. Compound options are documented in parameters (caps and defensive bonuses).
- `packs.json`: booster metadata, card pool and themed starting supplements. Preserve IDs and use existing card IDs.
- `character-drafts.json` (if present): starting pack assignments.
- `opponents.json`, `expert-opponents.json`, `early-opponents.json`: game-sourced opponent lists. `main` and `extra` contain card IDs, repeated once per copy; retain provenance fields.
- `tutorial-decks.json`: seven introductory decks.
- `cards.json` (if present): cached card metadata. Card rules themselves execute in EDOPro Lua scripts; editing text does not change effects.

JSON is strict: double quotes, no trailing commas, no comments. Documentation is stored in `_guide` and `_fields`. Do not rename saved character/relic/pack IDs. New scripted effects need code in passives.py or campaign_expansion.py; unsupported names do not automatically implement new mechanics.

- `opponent-tiers.json`: all 21 current opponents, each with three explicitly editable deck lists and source attribution.
- `champion.json`: optional 2004 championship challenge, including the historical Fusion Deck.
- `tuning.json` / `loops`: per-loop enemy ATK, DEF, and LP increases. Defaults: 100/100/2000.

## Active enemy decks

`decks/*.ydk` are now authoritative. Edit these in EDOPro. `<opponent-name>-tier-<tier>.ydk` controls each difficulty; `tutorial-*.ydk` controls the opening encounter; `world-champion-2004.ydk` controls the optional challenge. JSON deck arrays are provenance only. Desktop reloads tier/tutorial decks before each duel. Rebuild the APK to bundle changes on Android. The Side Deck is preserved for editing but not used in single duels.

`decks/index.json` maps stable character IDs to the named files. Do not rename files without updating this index. Invalid card IDs and over-three-copy lists are rejected before starting a duel.
