# Yu-Gi-Oh! Rogue Duelist

A single-player roguelike deckbuilder built on Yu-Gi-Oh! duels: pick a duelist, draft from era-accurate booster packs, collect relics and fight through a campaign of CPU opponents.

- **Webapp:** [itch.io](https://thronior.itch.io/ygo-rogue). It also runs in desktop browsers.
- **Android:** install `YGO-Rogue-Android.apk` from the latest [GitHub release](https://github.com/Thronior/ygo-rogue-duelist/releases) on Android 10 or newer. See [android/README.md](android/README.md) for controls and save behavior.

The game is an unofficial fan project. Yu-Gi-Oh! cards, characters, artwork and music belong to their respective owners. See [assets/CREDITS.md](assets/CREDITS.md).

> The native Windows desktop edition is retired and its source has been removed. The webapp and Android app are the only supported versions. Saves from the old desktop app can be imported in the webapp's Settings.

## Use the Dueling AI in your own project

The game's CPU opponent is a standalone JavaScript AI that plays full duels on the EDOPro rules engine, in the browser or in Node.js. It can also answer for one player in a duel your own EDOPro-based project runs, through a small adapter and a stdin/stdout bridge for C++ hosts. [docs/DUELING-AI.md](docs/DUELING-AI.md) lists the files to copy and shows both ways, with JavaScript and C++ examples. To watch it play itself:

```powershell
runtime/ai/node.exe tools/dueling_ai_demo.mjs
```

## How it fits together

The Android app and the webapp share one client. The duel runs on the Project Ignis/EDOPro core compiled to WebAssembly (`ocgcore-wasm`). The campaign rules are Python, run in the browser by Pyodide. Android wraps the same web client in a small WebView app.

## Project layout

| Path | What it holds |
|---|---|
| `*.py` (root) | Campaign rules shared by both builds. `tools/build_android.py` lists exactly which modules are bundled. |
| `android/web/` | The web/Android client: duel UI, CPU policy (`duel.js`, `smart_policy.js`), menus, shop and the vendored engine and Pyodide. |
| `android/src/`, `android/res/` | The Android WebView shell and in-app updater. |
| `data/` | Game data in JSON: packs, characters, relics (`tuning.json`), opponents. CPU deck lists are in `data/decks/*.ydk`. See [data/EDITING.md](data/EDITING.md). `data/sources/` keeps reference material that the game doesn't read. |
| `assets/` | Card images, portraits, packs, relic icons, music and sound. Everything here is packaged, so keep source/working files elsewhere. |
| `runtime/` | Card effect Lua scripts, the card database (`expansions/cards.cdb`), strings and textures used by the duel engine. |
| `multiplayer/` | Cloudflare Workers for tag-duel rooms, replays and global stats, plus an optional self-hosted signaling server. See [multiplayer/README.md](multiplayer/README.md). |
| `tools/` | Build, release and data scripts, plus tests (`tools/test_*`, `tools/tests/`). |
| `android/test_*` | Tests for the web client and the CPU duel policy. |
| `docs/` | Feature notes, release notes and historical reviews. See [docs/README.md](docs/README.md). |

The campaign modules in the root fall into three groups:

- **Campaign flow:** `campaign.py`, `campaign_expansion.py`, `content.py`, `campaign_catalog.py`, `encounters.py`, `endless.py`, `tag_campaign.py`, `boss_selection.py`, `secret_challenge.py`, `challenge_levels.py`, `character_progression.py`, `character_variants.py`, `unlocks.py`, `achievement_model.py`, `loss_reason.py`, `feedback_update.py`, `storage.py`, `progress_sync.py`
- **Cards, packs and decks:** `card_rarity.py`, `golden_cards.py`, `custom_cards.py`, `deck_files.py`, `pack_odds.py`, `pack_merges.py`, `collector.py`, `fallen_collectors.py`
- **Relics and rewards:** `passives.py`, `approved_relics.py`, `approved_relic_effects.py`, `archetype_relics.py`, `variant_relics.py`, `cursed_relics.py`, `artifact_effects.py`, `artifact_expansion.py`, `artifact_text.py`, `shop_rewards.py`, `duel_rewards.py`, `reward_slots.py`

## Building

What the build needs:

- **Python 3 with Pillow** (`pip install pillow`). The build script uses `python/python.exe` if the project has its own copy there, and otherwise the Python installed on the PC (`py` or `python`).
- **Node.js:** `runtime/ai/node.exe`, or a recent Node on the PATH.
- **For the APK only:** the Android SDK and JDK under `dependencies/android/`.

None of these are in Git. In the commands below, use `python` instead of `python/python.exe` if you're using an installed Python.

- `Build Android and Web.cmd` builds the APK into `releases/` and the webapp into `releases/web-<VERSION>`.
- `python/python.exe -B tools/build_android.py --sync-only` refreshes the client's data and assets without packaging an APK.

Publishing is a separate step. See [tools/BUILDING.md](tools/BUILDING.md), [tools/pwa/README.md](tools/pwa/README.md) and [docs/ANDROID-DELTA-UPDATES.md](docs/ANDROID-DELTA-UPDATES.md).

## Tests

Tests are standalone scripts. Run any one from the project root:

```powershell
python/python.exe -B tools/test_pack_odds.py
runtime/ai/node.exe android/test_cpu_parity.mjs
```

The build itself runs `android/test_cpu_parity.mjs`.

The browser tests (`*.cjs`) and the pack-art tools also need Playwright, and the art tools need sharp. Install them with `npm install playwright sharp` and `npx playwright install chromium`, or set `PLAYWRIGHT_MODULE` / `SHARP_MODULE` to an existing copy. [tools/require-module.cjs](tools/require-module.cjs) explains where they're looked for. Many browser tests also expect a local copy of the game to be served on a fixed port; check the URL near the top of each test.

## What is not in Git

Saves (`saves/`), signing keys, service credentials, toolchains (`python/`, `dependencies/`), build output (`releases/`, `temp/`, `android/build/`) and caches are ignored on purpose. They stay on disk, so Git is not a backup of them. Keep saves and the Android signing key (`android/signing/`) backed up separately: replacing the key stops in-place app updates.

Some generated client files (`android/web/assets/`, `content.json`, `campaign-files.json` and others listed in `.gitignore`) are recreated by the build. The vendored engine and Pyodide files under `android/web/` are tracked because builds rely on them.

The EDOPro source tree (`edopro-source/`) and `tools/core/` are separate repositories and are not part of this one. `local/` holds ignored personal experiments and source artwork.

## License

The game's own code and data are dedicated to the public domain under [CC0 1.0](LICENSE). That includes the Dueling AI, the campaign rules, tools, tests and data files. Use them however you like; no credit or permission needed.

CC0 doesn't cover third-party material in this repository. That material keeps its own terms:

- **The rules engine:** the Project Ignis (EDOPro) engine inside `android/web/vendor/` is AGPL-3.0, and the ocgcore-wasm wrapper around it is MIT. `runtime/notices/` holds the bundled third-party notices.
- **Card scripts and EDOPro resources:** the Lua scripts in `runtime/script/` and `android/web/scripts.json`, and the card database, textures and sounds in `runtime/`, come from Project Ignis/EDOPro and keep their own licenses. The game's own scripts (`runtime/script/custom/` and `runtime/script/rogue-rng.lua`) are CC0.
- **Reference AI sources:** the WindBot executor files in `data/ai-source/` keep their original terms.
- **Pyodide** (`android/web/pyodide/`) is under the Mozilla Public License 2.0.
- **Konami and other rights holders:** Yu-Gi-Oh! card names, text, artwork, characters and music belong to their respective owners. See [assets/CREDITS.md](assets/CREDITS.md).
