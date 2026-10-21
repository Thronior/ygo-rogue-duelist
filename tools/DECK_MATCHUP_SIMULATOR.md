# Deck matchup simulator

`simulate_deck_matchups.mjs` runs an input deck against every T1, T2, and T3 CPU deck in the current packaged Watch CPU Duel catalog, including standalone opponent characters. Each matchup runs 10 duels by default. Both sides use the game's CPU decision policy, with neutral conditions: 8,000 LP, five-card starting hands, and no run relics or curses. The input deck alternates seats between games to reduce seat-order bias.

## Run it

From the repository root:

```powershell
node tools/simulate_deck_matchups.mjs --deck "D:\decks\My Deck.ydk"
```

The input can be a `.ydk`, a JSON object with `main` and optional `extra` arrays, or a text deck list. Text lists accept names or card IDs, optional counts, and bracketed IDs, for example `3x Dark Magician [46986414]`. Headings such as `MAIN DECK (40)` and `EXTRA DECK` are supported. Extra Deck cards are checked and placed in the Extra Deck; side deck sections are ignored.

By default each run gets a unique directory under `D:\big boy games\Shadow Run Desktop\simulations\deck-matchups`. Use `--out "D:\results\my-run"` to select an exact output directory. Existing nonempty directories are protected from overwrite.

Useful options:

```powershell
node tools/simulate_deck_matchups.mjs --deck "D:\decks\My Deck.ydk" --games 10 --seed 12345
node tools/simulate_deck_matchups.mjs --deck "D:\decks\My Deck.ydk" --limit-matchups 1 --games 1
```

The second command is a quick smoke run. `--help` lists all options.

## Output

- `replays/tier-N/<opponent>/game-NN.json`: individual native `ygo-replay` files, loadable by the game's replay viewer.
- `results.jsonl`: one outcome record per duel, including the replay path and any engine errors.
- `overview.md` and `overview.json`: aggregate T1/T2/T3 win rates plus a result for every opposing deck.
- `matchups.csv`: spreadsheet-friendly per-opponent results.
- `run.json`: input deck, seed, game build, and opponent catalog used for the run.

Win rate is `(wins + draws / 2) / completed duels`; unfinished or failed duels are reported separately and excluded from the denominator.
