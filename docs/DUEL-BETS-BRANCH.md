# Duel Bets (incremental minigame) — branch notes

Branch `claude/incremental-minigame-228fdc`, based on v0.2.45. **Not merged.** Merge into `main` only when the user says the minigame is finished.

## What it is

The main menu has a new **Duel Bets** card. You bet on which of two random CPUs (any character, any tier) wins a duel, earn money, and buy upgrades from a scrollable shop on the right. Money is separate: it buys only Duel Bets upgrades.

- **Board 1** has free bets and pays 1 coin per correct call. The opening shop has payout (Lucky Calls), CPU type (Tier 1 Upsets), action (Summon Fees) and Duel Speed items.
- **The Big Leagues** (100 coins) opens board 2: bet 10, win 100. Each new board brings a pricier set of items and a very expensive item that opens the next board.
- At **9 boards** the boards become a **bracket**: a round-robin league of the same 9 random CPUs (36 pairings, everyone meets everyone once). Its 9 boards never wait for each other: when a duel ends, that board takes the next unplayed pairing, so a CPU can be in several duels at once. When all 36 are played, the most wins is champion, with damage dealt breaking ties. A bracket waits for your champion bet (a big button in its middle) before it starts. Auto Champion Bet places that bet for you; "Start without a bet" appears when you can't pay. Champion bets pay 10×. Single duels can be bet on from a board's header during the first quarter of the duel. Brackets are named, rising in prestige and stakes (Card Shop Cup → Millennium Cup), up to 9 (81 boards).
- Bracket tiles show a 9×9 crosstable: 18 portraits on the two axes, W/L per matchup, and live duels as both portraits in their board's colour. An open bracket shows its 9 boards, plus a live standings table behind a burger button.
- **Automation:** Auto Bet backs a random duelist on one waiting board every 5 s, 20% faster per level, down to 0.5 s. Scouting Report (bought once) makes it back the higher-tier CPU, at random when the tiers are equal.
- **Duel Speed** adds +0.1× per purchase, up to 8×.
- **Exodia** and **Destiny Board** wins pay jackpots, with upgrades for each. Other jackpots are deck-out and other alternate wins.
- Prices: items that lift every board (Duel Speed, High Roller, the jackpots) grow ×3–×40 per purchase. Per-event and per-board items grow ×1.15–×1.25.

## How duels are produced

A Web Worker plays each whole duel (no turn limit) in the real core ahead of time and posts a compact timeline (about 85 frames, about 16 KB). The board replays that timeline slowly. Timelines are kept in IndexedDB (`ygo-duel-bets`, up to 300), so a phone that can't record as fast as the boards play reuses older duels, never one already on another board. Per-deck results feed the stats that settle bracket duels nobody is watching. Opening a bracket records its duels for real and joins them at the matching point.

Each board is a scaled-down duel field: card thumbnails (`assets/cards-thumb`, full art as fallback) in every zone, set cards as backs, ATK/DEF labels, Deck/GY/Extra piles, hands as card backs and LP bars, updated in place. Each CPU's portrait fills its half of the board (full while you bet, dimmed during the duel), and each board slot has its own background colour. One timer runs 10×/s while boards are on screen and 4×/s otherwise, and it stops while the page is hidden or the screen is closed. Measured with 9 boards open: about 0.13 ms per tick, no long tasks.

## Files

Own files (all new):

- `android/web/idle-bets.js` — the screen, boards, brackets, shop, coin effects and sounds
- `android/web/idle-bets.css` — styles, themed from the Cosmetics Duel Look (`html[data-duel-theme]`)
- `android/web/idle-bets-model.js` — rules with no DOM: items, prices, payouts, pacing, brackets, saves, number format
- `android/web/idle-bets-sim.js` — records one CPU vs CPU duel into a timeline
- `android/web/idle-bets-worker.js` — the worker that records duels
- `android/web/idle-bets-library.js` — worker client, IndexedDB library, per-deck stats
- `android/test_idle_bets.mjs` — tests (`runtime\ai\node.exe android\test_idle_bets.mjs`)
- `docs/DUEL-BETS-BRANCH.md` — this note

**Files touched outside the minigame (the merge surface):**

- `android/web/mobile.js` — seven small hooks, all named "Duel Bets"/`duelBets`:
  1. a `['Duel Bets',37313786,'spell',…,'duel-bets']` entry in `baseMenu`
  2. `if(a==='duel-bets'){await openDuelBets();return}` in the action handler, next to `a==='cpu'`
  3. `openDuelBets()` plus `let duelBets`, placed after `openCPU()`; it lazy-imports `idle-bets.js`
  4. Android back: `else if(duelBets){duelBets.back()}`
  5. Gamepad/keyboard back (`screenBack`): `if(screen==='duel-bets'&&duelBets){…}`
  6. `startStats(()=>!cpuViewer&&!duelBets&&…)` so Duel Bets time isn't counted as a run
  7. Music: `screenMusic()` returns `'draft'` while `screen==='duel-bets'`, and `openDuelBets()` calls `track('draft')`, so Duel Bets plays the draft music

Nothing else outside these files changed. The saved data is a new localStorage key, `ygo-duel-bets-v1`, plus the IndexedDB database above. `saves/` and `storage.py` are untouched.

## Before merging (checklist)

- [ ] Set `DEV_TOOLS=false` in `idle-bets-model.js` to remove the "Infinite money" test switch.
- [ ] Translate every player-facing string into all 8 languages (shop names and text, board and bracket labels, settings). Strings are English-only while the design is still changing.
- [ ] Decide whether Duel Bets progress should go into cloud save and backups. It currently lives only in localStorage on the device.
- [ ] Re-check the merge against `main`'s `mobile.js` (the hooks are one-liners next to the Watch CPU duel code).
- [ ] Patch notes line.
- [ ] Verify in the Android build and the web build. The web build splits `scripts.json`; the worker gets scripts from the page's `loadDuelResources()`, so this should work, but it hasn't been checked in a built bundle.

## Local test setup (not committed)

- The worktree's `android/web/assets`, `sound` and `textures` are directory junctions to the main checkout. `content.json`, `campaign-files.json`, `build.json` and `system-strings.js` are copies. All of these are ignored by Git. Remove a junction with `cmd /c rmdir`, **never** a recursive delete, which would follow it into the main checkout.
- `.claude/launch.json` defines the `duel-bets` preview server on port 4241.
