# Duel fix and deck rebalance — 29 September 2026

Updated 34 decks with 115 one-for-one changes, based on the supplied 37,950-attempt v2 benchmark. Changes are saved in the project at `D:\big boy games\Shadow Run Desktop`. Web/campaign deck resources are synchronized.

## Crash fixed

The reported Pegasus–Odion tier-3 failure, seed **30715010**, actually occurred on turn 7 at decision 130. Dust Tornado destroyed Snatch Steal, then set Monster Reborn into Odion’s last Spell/Trap zone. Embodiment of Apophis was still on Pegasus’s field; the bundled core repeatedly attempted its now-impossible return. The old benchmark assigned turn/decision totals only after successful completion, which explains the misleading 0-turn report.

A narrowly scoped WASM compatibility effect resolves a trap monster’s expired-control return by rule when its owner has no Spell/Trap space. It leaves valid control effects and ordinary returns intact. The original decks are locked into a regression fixture, independent of the balance changes. The fix preserves the trap-monster and control-card mechanics; no card was removed just to conceal the crash, and no winner or timeout was substituted.

- Original decks, original seed: **completed in 18 turns / 312 decisions / 741 ms**, with no core errors.
- Revised decks, same seed: **completed in 29 turns / 645 decisions**, with no core errors.
- Real-core regression covers the blocked return, a normal return with space, and a permanent control effect. A child-process timeout prevents a broken regression from hanging indefinitely.
- Benchmark exceptions now retain the last turn/decision count and core error details.

## Paired balance validation

**6,740 completed validation duels across the initial pilot and targeted refinements. Zero failed, unfinished, or core-error duels.** The final matched comparison contains 2,772 before and 2,772 final-deck outcomes. Unchanged matchups reuse the initial pilot result; every matchup touched by a refinement was rerun. Each retained result was checked against the exact final deck versions. Both runs use the same current CPU policy and the engine fix, with identical seeds and balanced seats. Each of 66 character/tier combinations has 84 non-mirror games: four against each of the other 21 characters. Draws count as half a win.

This is a smaller validation pilot, not a repeat of the full 37,950-duel benchmark. Individual rates have substantial sampling uncertainty (roughly ±11 percentage points near 50%); they describe this CPU and this pool, not universal deck strength.

| Tier | Before pilot range | After pilot range | Mean distance from 50%, before → after |
|---|---:|---:|---:|
| 1 | 25.00–67.86% | 32.14–66.67% | 7.90 → 6.28 pp |
| 2 | 32.14–75.00% | 38.10–59.52% | 8.87 → 5.63 pp |
| 3 | 27.38–64.29% | 33.33–63.10% | 7.58 → 5.84 pp |

## Distinct identities

The revisions strengthen character-specific engines rather than giving every weak deck the same removal/draw package. Examples: Tea converts healing into pressure; Pegasus finds Toons and ritual pieces; Mai uses Harpie variants, Birdface and Hunting Ground; Mako gains Ocean/WATER consistency; Tristan keeps his warrior/robot-fusion package; Noah keeps spirit returns and Shinato. Strong decks retain their defining aces and combos while losing some generic power or redundant damage.

Average pairwise card overlap (multiset intersection/union) decreased in every tier:

- Tier 1: 4.65% → 4.53%.
- Tier 2: 5.01% → 4.43%.
- Tier 3: 8.26% → 8.05%.

All 96 lists passed legal-pool, alias-aware three-copy, script and artwork checks. Main-deck sizes remain 40–60, including existing larger lists. Extra/side decks are preserved. The other 62 lists are unchanged byte-for-byte, including tutorial and tier-4/champion lists relative to the start of this pass.

Additional checks passed: 73 deck scenarios / 14,248 decisions / no failures; rituals and effect prompts; replay determinism; CPU viewer shuffling/replay; existing chain compatibility; shared solo/tag CPU policy. The viewer test’s fetch mock was corrected to include the successful HTTP status required by the resource loader.

No native Windows build, APK export, deployment, or save changes were performed. Existing unrelated project edits were preserved.

## Exact deck changes

The columns list equal totals removed and added; rows are an inventory comparison, not a claim that each individual substitution alone caused the measured result.

### Tea Gardner — tier 1

Healing now has a payoff: Fire Princess converts recovery into pressure; fairies remain the backbone.

| Removed | Added |
|---|---|
| The Forgiving Maiden | Asura Priest |
| Goblin's Secret Remedy | Fire Princess |
| Goblin's Secret Remedy | Fire Princess |
| Goblin's Secret Remedy | Fire Princess |
| Soul of the Pure | UFO Turtle |
| Soul of the Pure | UFO Turtle |

### Tea Gardner — tier 2

Find and protect the healing/burn engine, with a fairy combat fallback.

| Removed | Added |
|---|---|
| Kiseitai | UFO Turtle |
| Nightmare's Steelcage | UFO Turtle |
| Nightmare's Steelcage | Messenger of Peace |
| Reload | Gravity Bind |
| The Shallow Grave | Gift of The Mystical Elf |
| Enchanted Javelin | Cestus of Dagla |
| Dancing Fairy | Asura Priest |

### Tea Gardner — tier 3

Healing/burn consistency instead of unrelated tribute attackers; preserve Mars, sanctuary and Marie.

| Removed | Added |
|---|---|
| Cestus of Dagla | White Magician Pikeru |
| Waboku | Poison of the Old Man |
| Guardian Angel Joan | Gravity Bind |
| Airknight Parshath | UFO Turtle |
| Cure Mermaid | UFO Turtle |
| Dancing Fairy | UFO Turtle |

### Tristan Taylor — tier 3

Reinforce Tristan warrior/equipment combat while retaining the Roboyarou/Robolady fusion package.

| Removed | Added |
|---|---|
| Warrior Dai Grepher | Mataza the Zapper |
| Acrobat Monkey | Marauding Captain |
| Polymerization | The A. Forces |
| Limiter Removal | United We Stand |

### Yugi Muto — tier 3

Keep all Exodia pieces, tutors and recovery; weaken redundant draw/stall density.

| Removed | Added |
|---|---|
| Upstart Goblin | Aqua Madoor |
| Messenger of Peace | Enchanted Javelin |
| Jar of Greed | Mystical Elf |
| Reckless Greed | Spirit of the Harp |

### Rex Raptor — tier 2

Dinosaur combat and bounce replace weak unrelated dragons; keep fusion materials.

| Removed | Added |
|---|---|
| Fairy Dragon | Hyper Hammerhead |
| Petit Dragon | Hyper Hammerhead |
| Sky Dragon | Dark Driceratops |
| Wicked Dragon with the Ersatz Head | Gilasaurus |
| Yormungarde | Raise Body Heat |

### Espa Roba — tier 1

Preserve Jinzo as the ace, reduce one efficient generic attacker.

| Removed | Added |
|---|---|
| Mechanicalchaser | Patrol Robo |

### Espa Roba — tier 3

More Jinzo access and machines; fewer off-plan tribute bodies and low-impact hand peeks.

| Removed | Added |
|---|---|
| Giant Mech-Soldier | Jinzo |
| Cyber Soldier of Darkworld | Mechanicalchaser |
| Mesmeric Control | Soul Exchange |
| Seal of the Ancients | Enemy Controller |

### Bonz — tier 2

Keep zombie recruitment/revival; reduce removal density and immediate big-body access.

| Removed | Added |
|---|---|
| Ryu Kokki | Dragon Zombie |
| Tribute to the Doomed | Poison Mummy |
| Trap Hole | Castle of Dark Illusions |

### Mako Tsunami — tier 3

Ocean access and WATER bounce become reliable without generic board wipes.

| Removed | Added |
|---|---|
| Skull Mariner | Star Boy |
| Kairyu-Shin | Abyss Soldier |
| Umi | A Legendary Ocean |
| Power of Kaishin | A Legendary Ocean |

### Mai Valentine — tier 1

Keep Harpie/Egotist and Mirror Wall; temper generic bird stats and universal removal.

| Removed | Added |
|---|---|
| Skull Red Bird | Kurama |
| Rising Air Current | Tyhone |
| Fissure | Cyber Shield |
| Reinforcements | Mountain |

### Mai Valentine — tier 2

Harpie recruitment replaces unrelated normal monsters; trim one dead double-tribute bird.

| Removed | Added |
|---|---|
| Bottom Dweller | Birdface |
| Humanoid Slime | Birdface |
| Harpie's Pet Dragon | Cyber Shield |

### Mai Valentine — tier 3

Harpie variants and hunting ground give the flock its own combat/backrow engine.

| Removed | Added |
|---|---|
| Bottom Dweller | Harpies' Hunting Ground |
| Gaia The Fierce Knight | Flying Kamakiri #1 |
| Harpie Lady | Harpie Lady 1 |
| Harpie Lady | Birdface |
| Humanoid Slime | Cyber Harpie Lady |

### Bandit Keith — tier 2

Machines and coin-flip aces get accessible tribute bodies instead of off-theme bricks.

| Removed | Added |
|---|---|
| Gaia The Fierce Knight | Fusilier Dragon, the Dual-Mode Beast |
| Living Vase | Mechanicalchaser |
| Zoa | Blowback Dragon |
| Monster Recovery | Time Machine |

### Joey Wheeler — tier 2

More Joey equipment/warriors, less generic removal and piercing.

| Removed | Added |
|---|---|
| Man-Eater Bug | Rocket Warrior |
| Spear Dragon | Little-Winguard |
| Zombyra the Dark | Gearfried the Iron Knight |

### Joey Wheeler — tier 3

Keep Red-Eyes, Jinzo, Time Wizard and fusion; trim generic theft and duplicate tribute pressure.

| Removed | Added |
|---|---|
| Summoned Skull | Baby Dragon |
| Spear Dragon | Little-Winguard |
| Snatch Steal | Skull Dice |

### Maximillion Pegasus — tier 1

Toon/Relinquished setup replaces weak off-theme filler.

| Removed | Added |
|---|---|
| Tao the Chanter | Manju of the Ten Thousand Hands |
| Phantom Dewan | Toon Gemini Elf |

### Maximillion Pegasus — tier 2

Retain the Toon/ritual engine while reducing independent generic reset power.

| Removed | Added |
|---|---|
| Cyber Jar | Thousand-Eyes Idol |
| Morphing Jar | Toon Alligator |

### Maximillion Pegasus — tier 3

Searchable Toons and ritual consistency replace tribute congestion and passive healing.

| Removed | Added |
|---|---|
| Summoned Skull | Toon Table of Contents |
| Summoned Skull | Toon Table of Contents |
| Enchanted Javelin | Toon Table of Contents |
| Enchanted Javelin | Senju of the Thousand Hands |
| Numinous Healer | Toon Gemini Elf |
| Numinous Healer | Manju of the Ten Thousand Hands |

### Arkana — tier 2

Retain all Dark Magicians and the sacrifice/spellcaster plan; slow broad recruiter/removal consistency.

| Removed | Added |
|---|---|
| Mystic Tomato | Sorcerer of the Doomed |
| Fissure | Dark Magic Curtain |
| Trap Hole | Book of Secret Arts |

### Odion — tier 1

Trap recursion and Apophis/Serket remain central; replace weak rocks and narrow counters.

| Removed | Added |
|---|---|
| Prisman | Giant Soldier of Stone |
| Rock Ogre Grotto #2 | Giant Soldier of Stone |
| Gryphon Wing | Statue of the Wicked |

### Odion — tier 2

Keep the tomb/trap engine, trade very narrow protection for usable trap interaction.

| Removed | Added |
|---|---|
| Gryphon Wing | Sakuretsu Armor |
| White Hole | Dust Tornado |

### Ishizu Ishtar — tier 1

Keep the fairy sanctuary plan with slightly less raw low-tribute pressure.

| Removed | Added |
|---|---|
| Trap Hole | Keldo |

### Ishizu Ishtar — tier 3

Fairy graveyard pressure and sanctuary remain distinct from Tea healing/burn.

| Removed | Added |
|---|---|
| Airknight Parshath | Kelbek |
| The Agent of Judgment - Saturn | Mudora |
| The Agent of Wisdom - Mercury | Asura Priest |

### Marik Ishtar — tier 2

Reduce generic reset advantage while retaining Newdoria, Jam and torment/control cards.

| Removed | Added |
|---|---|
| Vorse Raider | Revival Jam |
| Cyber Jar | Viser Des |
| Man-Eater Bug | Worm Drake |
| Morphing Jar | Helpoemer |
| Fissure | Jam Defender |

### Seto Kaiba — tier 3

Keep Blue-Eyes and dragon finishers, trim one unrelated removal boss and generic nuke.

| Removed | Added |
|---|---|
| Barrel Dragon | Hyozanryu |
| Dark Hole | Burst Stream of Destruction |

### Yami Bakura — tier 2

Maintain Destiny Board and Necrofear, increasing useful fiend material.

| Removed | Added |
|---|---|
| The Earl of Demise | Giant Germ |
| Earthbound Spirit | Giant Germ |
| Souls of the Forgotten | Newdoria |

### Yami Marik — tier 2

Keep the burn engines and reduce redundant stall protection and mass-damage density.

| Removed | Added |
|---|---|
| Nightmare's Steelcage | Coffin Seller |
| Waboku | Viser Des |
| Secret Barrel | Poison Mummy |

### Yami Marik — tier 3

Preserve Stealth Bird, Solar Flare and Wave-Motion Cannon; remove redundant long-term locks so combat can answer the burn plan.

| Removed | Added |
|---|---|
| Messenger of Peace | Coffin Seller |
| Gravity Bind | Viser Des |
| Just Desserts | Poison Mummy |

### Yami Yugi — tier 1

Keep Dark Magician and themed removal, but reduce generic draw/defense.

| Removed | Added |
|---|---|
| Neo the Magic Swordsman | Ancient Elf |
| Trap Hole | Dark Magic Attack |
| Jar of Greed | Dark Magic Curtain |
| Rogue Doll | Sorcerer of the Doomed |

### Yami Yugi — tier 2

More reliable Dark Magician summoning rather than universal staples.

| Removed | Added |
|---|---|
| Monster Recovery | Skilled Dark Magician |
| Pitch-Black Power Stone | Dark Magic Curtain |

### Noah Kaiba — tier 1

Keep spirit returns and Spring of Rebirth; fewer duplicate upkeep bricks.

| Removed | Added |
|---|---|
| Spring of Rebirth | Asura Priest |
| Spiritual Energy Settle Machine | Book of Moon |

### Noah Kaiba — tier 2

More useful spirit support and return-cycle interaction.

| Removed | Added |
|---|---|
| Spiritual Energy Settle Machine | Susa Soldier |

### Noah Kaiba — tier 3

Spirit/Creature Swap synergy replaces upkeep and an off-theme body; retain the original Shinato package.

| Removed | Added |
|---|---|
| Gilasaurus | Creature Swap |
| Spiritual Energy Settle Machine | Creature Swap |

## Evidence and reproduction

Project evidence: `temp/deck-rebalance-v3/` contains both raw paired runs, job lists, rankings, baseline snapshots and SHA256 manifest. Earlier benchmark directories are preserved.

Run the fixed-seed regression with `node android/test_trap_return.mjs`. The existing benchmark worker accepts `--content` to select the preserved baseline content. Use fresh output paths when validating another revision.

Core diagnosis was checked against the bundled source’s `Processors::Adjust` control-return retry and `Processors::GetControl` zone checks/rule-destruction fallback. The compatibility fix is in `android/web/trap-return-compat.js`; `android/web/engine.js` loads it per duel.
