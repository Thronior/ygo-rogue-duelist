# Yu-Gi-Oh: Rogue Duelist

Launch `Shadow Run.exe` in this folder. Keep it alongside `python`, `runtime`, `data`, and `assets`; it is a portable folder application, not a standalone binary. All game files and saves stay on D:.

## Play

Choose New Game, Yugi or Kaiba, open four character boosters and draft a minimum 20-card main deck. Each character has two guaranteed cards. Press Duel to enter the native EDOPro duel immediately; finishing returns to the campaign with your actual remaining LP and earned coins. Edit Deck returns to the shop. Three opponent choices influence the next shop's cards and artifacts.

A run lasts 9 duels. Duels 3, 6 and 9 are visibly marked boss encounters. Each has an escalating number of debuffs (one, then two, then three) lasting only that duel. Winning restores up to 2,000 LP, capped at 8,000 (existing higher LP is not reduced); the debuff is removed on both victory and defeat. The first encounter always uses a deliberately weak practice deck and starts with 2,000 opponent LP.

Later opponents use 21 published World Championship Tournament 2004 deck lists, including listed Fusion Decks. Card quantities are preserved; obsolete names and obvious guide typos are normalized. Joey's source heading says 40 but its entries total 41; all 41 listed cards are retained. The unknown Fusion Deck entry in the guide is not invented. These are the historical lists using EDOPro's current card scripts, not an emulation of the original game's bugs, errata or AI.

There are 36 English/Japanese booster choices through March 2004, 33 playable duelists and 69 artifacts. Japanese draft boosters are expanded to nine cards so four packs can supply a legal 20-card draft. Some later-series characters use era-legal signature substitutes. The shop uses the supplied anime interior background, two shelves of five singles, two booster packs and a three-artifact counter beside Solomon. All sections stay visible together. Character-specific actions earn additional duel coins; achievements unlock the rest of the roster. For testing, type `heartofthecards` on the title screen to unlock all characters.

Mokuba receives one each of Tournament Packs 1–4; the other tournament-pack slots are consolidated. Shops favor varied categories such as attributes, Flip monsters, Ritual cards, Quick-Play Spells and Counter Traps. One of the two boosters is always tied to the defeated opponent. Bought packs reveal their contents immediately. Deck editing enforces three copies per card, including alternate printings; both decks shuffle before every duel. The end screen lists run statistics and newly earned unlocks.

After the first boss, opponents use six complete published World Championship 2005 decks, escalating to late-game Yugi, Kaiba and Marik lists in the final act. The AI prioritizes board-clearing spells before summoning, sets weak Flip monsters, and distinguishes friendly buffs from hostile targeting.

## Settings and assets

Settings control window size, fullscreen, music and sound volume. Volume sliders apply immediately. Routine selection/navigation use soft clicks, purchases use a quieter coin cue, and New Game, Begin Draft and Duel use the stronger confirmation sound. Assets are cached locally; the first boot verifies and downloads all era-card previews before enabling duels. Subsequent boots verify the cache. Character, booster and artifact previews use existing artwork, never generated images. Music uses Forbidden Memories title and preliminaries tracks. Sources are in `assets/CREDITS.md`.

## Saves

Versioned JSON saves use checksums, atomic replacement and validated backup recovery in `saves`. Continue resumes the campaign. Closing an unfinished native duel does not grant a victory. Keep the entire folder when moving or backing up the game.

## Development

The modified EDOPro source is in `edopro-source`; upstream license notices are retained. The campaign starts native single-player duels with public-card filtering, automatic AI choices and signed-by-session result matching. No online account or server is required.

Regression checks: `python/python.exe -B tools/test_expansion.py`, `tools/test_frontend.py`, `tools/test_shop.py`, `tools/test_game_decks.py`, `tools/test_privacy.py`, `tools/test_native_launch.py boss`, and `tools/test_ui_flow.py`, `tools/test_revision.py`, and `tools/test_ai_tactics.py`. The native checks require the built `runtime/core_check.exe` or `runtime/ShadowDuel.exe`. Run native GUI tests sequentially while no real duel is open. Developer build paths are machine-specific; see `tools/build_native.ps1` and `tools/build_core_check.ps1`.

This is a private experimental fan project. The AI uses legal engine moves and basic tactical rules; it is not a competitive deck-specific AI.

## Relics and late collection unlocks

Twelve additional relics include Last Word (empty-hand ATK), Lone Champion (one-monster ATK), Prismatic Menagerie (different Types), Commoner's Epitaph (Normal Monsters in the Graveyard), Eclipse Locket (LIGHT/DARK Graveyard synergy), Sun and Moon Dial (ATK on your turn/DEF on theirs), Underdog's Banner (behind on LP and monster count), and Bottomless Inkwell (empty-hand End Phase draw). Golden Receipt, Razor Ledger, Phoenix IOU and Collector's Stamp change purchasing and victory rewards. A newer batch adds Faulty Printer (misprinted stats), Golden Card Sleeve (name a golden summon for coins), Magic Mirror (copies another relic each duel), The Underdog Clause (weak-Normal coin bonus), Traps/Spells No More (rare full negates), Legendary Shackles / Toon World / Ritual Dagger / Fusion Chamber (shop likelihood), Phoenix Rebirth (one-time survival), Champion Trophy (boss coin bonus), Glass Shard (2000 LP starts, doubled coins), Deck Spyglass (enemy decklists), Broke Man's Rulebook (1-card openers) and Blank Relic (becomes your most common attribute orb). Their full descriptions and existing card illustrations are in Artifact collection.

Collection unlocks on the title screen lists four late boosters and six 2003 cards with their achievement requirements. Earlier releases stay available. Unlocks persist across runs, appear in the run summary, and filter singles, booster pulls and free-card rewards. Unlocking a booster does not bypass its separately locked cards. Unlocking its character or beating its owner also grants the booster, keeping starting drafts and opponent-tied shop rewards available. Previously owned cards stay usable. The testing cheat also unlocks this collection.

Additional verification: `python/python.exe -B tools/test_relic_unlocks.py` checks collection gates, purchasing bonuses, and all eight new duel relic effects in the real core.


## Android build

Install `releases/YGO-Rogue-Android.apk` on Android 10 or newer with a current Android System WebView. It includes the offline EDOPro core and classic touch field. The native EDOPro Android GUI is not embedded in this build. Use `Build Desktop and Android.cmd` to rebuild both from the shared campaign. See `android/README.md` for controls, update/save behavior and build details.

## Current encounter and UI update

The desktop EDOPro duel surface is hosted inside the campaign window. The opening encounter chooses among seven saved beginner variants (3,000 LP); the next NPC fight uses adapted user-supplied weak game decks at 4,000 LP. The first boss has 4,500 LP. Powerful generic spells/traps are replaced by narrower alternatives, with a limited number restored in later acts. These are difficulty adaptations, not claims of verbatim published deck lists.

Each character starts with one relic. Ryou chooses a random relic; Copycat gets Echo Glass, which copies the first monster the opponent Normal Summons into your hand once per duel. Victory opens an earned-only coin receipt.
