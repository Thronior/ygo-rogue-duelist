# Deck balance simulator

Local dev tool. Not part of the APK or webapp build. It plays CPU-vs-CPU duels in the real duel core (`android/web/duel.js`) with no AI or LLM input. Both seats use the game's CPU policy (`engine.auto()` answers whichever seat the prompt belongs to). The setup matches Watch CPU Duel: 8,000 LP, five-card hands, a seeded CPU shuffle, no relics or curses. Each pairing alternates who goes first.

Start it from the desktop shortcut **YGO Deck Balance Sim**, or run `Deck Balance Sim.cmd` here. That starts `deck_sim_ui.mjs`, a small server on `http://127.0.0.1:47830/` (local only), and opens it in an Edge app window. The page uses the game's own `mobile.css`, logo and menu-card art from `android/web`. The minimized console window is the server: closing it, or the page's **Quit** button, stops the simulator. With no window open and nothing running, it quits by itself after 5 minutes.

- **1: Full list.** Every active T1–T3 deck plays every other deck **in its own tier** `gamesPerMatchup` times (default 50), so each deck gets one win rate against its tier.
- **2: Custom entry.** Drop or choose a `.ydk`, paste a path, use **Browse…**, or paste a decklist with one card per line (`3x Summoned Skull [70781052]`; the ID is the bracketed number or else the line's longest 5+ digit number). A pasted list is saved as `exports/decks/<deck name>.ydk` first. That deck plays every T1–T3 deck `customGamesPerMatchup` times (default 10).

Before a run starts, both screens show an estimated time: the average time for 1 duel, measured over your last 3 runs of 1,000+ duels (about 45 ms on this PC), × the number of duels. It updates as you change the duel count. During a run the page shows progress with an ETA and a Cancel button. Results show per-tier win rates in a sortable table with tier tabs and a filter. **Previous results** reopens any saved run, and **Settings** edits `settings.json`.

There is also a terminal version: `runtime\ai\node.exe tools\deck-sim\deck_sim.mjs` shows a text menu, and `... deck_sim.mjs full` or `... custom <file.ydk>` skips it. Both front ends share `sim_core.mjs`, and `deck_sim_worker.mjs` plays the duels.

Results print to the console and save to a folder per run, `exports/deck-sim/deck-sim-<mode>-<local time>/`, which holds the `.txt`, `.csv` and `.json` (and the images below). Each deck gets win rates against T1, T2, T3 and overall. Win rate is `(wins + draws/2) / finished duels`. A duel still going past `maxTurns` counts as a draw. Failed duels (engine exceptions) are listed separately and left out of the rates.

A full list also saves three images in its run folder: `...-tier1.png`, `-tier2.png` and `-tier3.png`. Each ranks one tier's decks by their win rate against that tier and shows only that number, plus W-L-D. Decks are shown by character portrait on that character's background, without names. Older reports, from when the full list played every tier, still render with their vs-T1/T2/T3 chips. The images are rendered by `tier_images.mjs` with Edge's built-in headless screenshot, so nothing extra needs installing. On the results page, **Make tier images** renders them for older reports, and `runtime\ai\node.exe tools\deck-sim\tier_images.mjs <report.json>` does the same from a shell.

A custom entry saves one image, `...-matchups.png`: the deck name, five of its key cards, a Tier rating and its vs-T1/T2/T3 win rates on top (the rating is the tier whose win rate is closest to 50%, or FAIL when none is within 40-60%), then for each tier its 8 best and 8 worst matchups as ranked rows with a portrait, name and win-rate bar (the dashed line marks 50%). `custom_image.mjs` renders it; on the results page **Make the matchup image** renders it for older custom reports, and `runtime\ai\node.exe tools\deck-sim\custom_image.mjs <report.json>` does the same from a shell.

## settings.json

| Key | Default | Meaning |
|---|---|---|
| `useActiveGameDecks` | `true` | Read the campaign's live opponent list on every run: `list_active_decks.py` calls `content.eligible_opponents()` and `content.opponent_record()` for stages 1/4/7 (T1/T2/T3), which read `data/decks/*.ydk`. When `false`, it uses the packaged catalog in `android/web/content.json`. |
| `gamesPerMatchup` | `50` | Full list: duels per pairing within a tier. |
| `customGamesPerMatchup` | `10` | Custom entry: duels against each opponent deck. |
| `maxTurns` | `80` | Turn cap; a duel still running after this turn is a draw. |
| `maxDecisionsPerDuel` | `10000` | Safety cap on CPU decisions; hitting it also counts as a draw. |
| `workers` | `0` | Worker threads. `0` starts with what free RAM allows (250 MB budgeted each, 1 GB kept free). It adds one worker every 5 s while RAM allows, up to CPU threads − 1. A number fixes the count. |
| `outputFolder` | `exports/deck-sim` | Where result files go (relative to the repo root). |

## Speed and memory

- The main thread parses `scripts.json` once and gives each worker only the shared utility scripts plus the scripts for cards in the decks: 646 of about 13,500 card scripts. A worker loads any other card script from `scripts.json` on first use. On 48 fixed-seed duels, results matched the full script set exactly.
- Each worker's V8 heap is capped at 320 MB, so garbage is collected early. A busy worker stays around 160–200 MB instead of about 450 MB. Its live heap is about 20 MB and does not grow over hundreds of duels.
- If a worker crashes, only its current pairing is lost. That pairing runs once more on a fresh worker, and if it crashes again its games count as failed.
- Measured on the i7-10750H (6 cores / 12 threads): 11 workers play about 20 duels/s with the 80-turn cap. The within-tier full list (3,162 pairings) runs at about 16–17 duels/s: about 30 minutes at 10 duels per pairing, and about 2½ hours at the default 50 (158,100 duels). The old all-tier list (94,530 duels) took 1 h 10 m, and a custom entry (1,380 duels) takes about 1 minute.

T4 (Endless, `data/tier4-decks.json`) is always left out. Card data comes from `android/web/content.json`, so rebuild it if a live deck uses a card the packaged data does not know yet. The tool stops and names the card.
