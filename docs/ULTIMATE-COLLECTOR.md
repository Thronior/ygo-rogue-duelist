# Ultimate Collector implementation

Supported clients: shared Android/web interface only.

- Nine imported duelists, stable 3×3 slots. Moving an existing solo save is journaled and clears both solo storage copies. Copycat cannot import.
- Shared collapsible introduction in the empty roster, tutorial and Help.
- Main 40–60, Side 0–15, Fusion 0–15; April 19 2004 TCG restrictions across all decks and owned copies. No card-release-date cutoff.
- Best of three, MR2, 8000 LP, no campaign modifiers. Coin-toss first game; previous loser chooses subsequent first player. Siding preserves the match card pool and Main Deck size.
- Match loser is eliminated; winner gains a rank up to God and five copies chosen from the defeated starting Main/Side/Fusion decks. Prize receipt is idempotent.
- Only surviving winners appear in the public top 10. Histories include individual game outcomes and earned cards.
- Each participant has a cumulative five-minute disconnect budget per match. Gaps below 15 seconds are free; longer gaps count in full. Reconnecting never refills it. Connected opponents see a countdown after 20 seconds.
- Decision clocks are 180 seconds per participant per turn, charged to the player currently asked to act. They pause when a disconnect is detected. Timer expiry forfeits the match.
- Both clients reconstruct the same engine from the durable action journal and agree on the game outcome. Invalid local selections are checked before submission; the server enforces seat ownership, stale-action checks, decks, timers and awards.

## Validation

- `tools/test_collector.mjs`: restrictions, progression, siding, prizes, timer budgets, durable restoration.
- `tools/test_collector_storage.py`: transactional save movement, Copycat exclusion, removal from backups, interrupted-move handling.
- `tools/test_collector_browser.cjs`: isolated two-client full MR2 match, engine reconstruction, prizes and elimination.
- `tools/test_collector_main.cjs`: actual app boot, nine-slot roster, collapsible guide, save import, disabled actions and responsive editor.
- Existing multiplayer registry tests and solo/tag CPU parity check remain passing.

## Service

`multiplayer/cloudflare/collector.mjs` adds a separate Collector durable object and `/collector/*` routes to the existing room worker. Collector records and action journals are chunked below the storage value limit. The service card catalog is generated from the actual campaign card IDs by `tools/generate_collector_catalog.py` during Android/web sync.

This is the existing game's cooperative client-engine trust model, not an anti-cheat-certified competitive service. Clients receive match decks and reconstruct locally; a modified client can inspect hidden information. Service credentials remain local to each imported collector. Never print them in diagnostics.

Do not publish an Android/web game release merely because a local preview builds. Native Windows remains deprecated.
