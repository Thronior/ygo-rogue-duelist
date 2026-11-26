# Shadow Betting (incremental minigame, "Duel Bets" in code) — branch notes

Branch `claude/incremental-minigame-228fdc`, based on v0.2.45. **Not merged.** Merge into `main` only when the user says the minigame is finished.

## What it is

The main menu has a new **Shadow Betting** card (Dice Re-Roll art). You bet on which of two random CPUs (any character, any tier) wins a duel, earn money, and buy upgrades from a scrollable shop on the right. Money is separate: it buys only Duel Bets upgrades.

- **Board 1**: bet 1, win 5. A new game starts with 5 coins and Summon Fees at level 1. A board nobody bets on starts by itself after 10 s.
- **The Big Leagues** (100 coins) opens board 2: bet 10, win 100. Each new board brings a pricier set of items and a very expensive item that opens the next board.
- At **9 boards** the boards become a **bracket**: a round-robin league of the same 9 random CPUs (36 pairings, everyone meets everyone once). Its 9 boards never wait for each other: when a duel ends, that board takes the next unplayed pairing, so a CPU can be in several duels at once. When all 36 are played, the most wins is champion, with damage dealt breaking ties. A bracket waits for your champion bet (a big button in its middle) before it starts. Auto Champion Bet places that bet for you; "Start without a bet" appears when you can't pay. Champion bets pay 10×. Single duels can be bet on from a board's header during the first quarter of the duel. Brackets are named, rising in prestige and stakes (Card Shop Cup → Millennium Cup), up to 9 (81 boards).
- Bracket tiles show a 9×9 crosstable: 18 portraits on the two axes, W/L per matchup, and live duels as both portraits in their board's colour. An open bracket shows its 9 boards, plus a live standings table behind a burger button.
- **Automation:** Auto Bet backs a random duelist once a board's betting screen has been up 10 s, 15% sooner per level, down to 0.5 s. Scouting Report (bought once) makes it back the higher-tier CPU, at random when the tiers are equal.
- **Duel Speed** adds +0.1× per purchase, up to 8×.
- **Shop:** category tabs; each tab lists items from the cheapest to the most expensive first-purchase price. An item appears once you have earned half its first price, so a new game starts with only Lucky Calls and Summon Fees. Tooltips: one sentence plus a Now / Next level table.
- **Feedback round (Discord #shadow-betting, 2026-11-26):** Duel Feats removed; money sits at the top of the shop; one board fills the stage; attack beams, summon glows and activation pops, scaled back with more duels on screen (full up to 3, lighter 4-6, attack beams only at 7+); first-time guide with the main game's pointing hand (bet, then buy; Skip tips); the standalone page opens on a Start/Continue screen. Fees still pay on every duel (user's call).
- **Replays:** minigame duels are never saved as game replays (the recorder clears the engine's `replayRecord`).
- **Exodia** wins pay a jackpot, with upgrades. Other jackpots are deck-out and other alternate wins. (No Destiny jackpot: no CPU deck runs Destiny Board.)

## Economy (scaling copied from other incremental games)

- **Income items** (Calls, Card Fees, Duel Feats, Characters, finishes): each level is worth 15% more than the one before and costs ×1.3225 (1.15²), so each next level takes 15% longer to pay back. That is Cookie Clicker's rule (a building costs 15% more per copy for the same income). Lucky Calls follows it too: +1 per correct call at level 1 (it used to grow like Fibonacci and outran everything).
- **Items pay the same on every board.** A new board never multiplies old items, as in Cookie Clicker and AdVenture Capitalist. Only the bets and the Calls items grow with a board's stakes; High Roller multiplies everything.
- **Item strength**: a level earns (first price ÷ 15)^0.75, like Cookie Clicker's buildings (about 12× the price for 6× the income).
- **Boards**: stakes ×10 per board, like Scritchy Scratchy's first tickets ($10, $100, $1,000, $10,000). Openers cost 35× the one before (100, 3,500, 122,500…); each board's item set costs about 1/20 of the next opener. Brackets cost ×1,000 each for ×100 stakes, about the same ratio as two boards.
- **Multipliers** are priced like Cookie Clicker's upgrades: tier bonuses ×2.3 per level, High Roller (×2 everything) ×1,000 per level, Duel Speed's own curve.
- **Rule from the user:** once a Calls item costs as much as the next board's opener, one more level adds less than a quarter of what that board pays (tested for every board).
- **Simulator:** `node android/idle_bets_balance.mjs` (add `--log` or `--why`) plays a new game with best-payback buying, from 288 measured duels. Current result: board 2 at about 1 min, then waits of 10, 15, 23, 38, 65, 62 and 79 min; the first bracket after about 4.9 hours of active play.

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
  1. a `['Shadow Betting',83241722,'spell',…,'duel-bets']` entry in `baseMenu`
  2. `if(a==='duel-bets'){await openDuelBets();return}` in the action handler, next to `a==='cpu'`
  3. `openDuelBets()` plus `let duelBets`, placed after `openCPU()`; it lazy-imports `idle-bets.js`
  4. Android back: `else if(duelBets){duelBets.back()}`
  5. Gamepad/keyboard back (`screenBack`): `if(screen==='duel-bets'&&duelBets){…}`
  6. `startStats(()=>!cpuViewer&&!duelBets&&…)` so Duel Bets time isn't counted as a run
  7. Music: `screenMusic()` returns `'draft'` while `screen==='duel-bets'`, and `openDuelBets()` calls `track('draft')`, so Duel Bets plays the draft music

- `tools/generate_art_crops.py` — `83241722` (Dice Re-Roll) added to its `MENU` list, and `assets/menu/83241722.jpg` — the menu card art it generates.

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

## Standalone site

https://shadow-betting.ygo-rogue.pages.dev — only the minigame (no main menu, no campaign runtime, no Infinite money), its own save. It is a branch deployment (`shadow-betting`) of the web game's Pages project, so production (`main`, ygo-rogue.pages.dev) is untouched. It does not update by itself: after changes, rebuild and redeploy.

```
python/python.exe -B tools/build_shadow_betting.py --output <new empty dir> --cache "<main checkout>/temp/build/packaged-assets"
cd multiplayer/cloudflare
runtime/ai/node.exe node_modules/wrangler/bin/wrangler.js pages deploy <dir> --project-name ygo-rogue --branch shadow-betting
```
(Wrangler needs Node 22+: use the project's `runtime/ai/node.exe`, not the Node 14 on PATH.)

## Phone app

`python/python.exe -B tools/build_shadow_betting_apk.py --install` builds **Shadow Betting** as its own Android app (`com.shadowrun.shadowbetting`, Dice Re-Roll icon): the standalone site in a WebView wrapper (`tools/shadow-betting/android`), fully offline, its own save. It uses the main checkout's Android SDK and signing key and writes `exports/shadow-betting/Shadow-Betting.apk` there. Not part of the game's APK or releases; reinstalling over it keeps the save. Xiaomi phones ask to confirm a USB install on the phone (Install via USB).
