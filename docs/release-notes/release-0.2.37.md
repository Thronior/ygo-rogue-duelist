**YGO Rogue Duelist v0.2.37**

## Important fixes
- **Tag** said rooms were full once 256 existed. There is no limit now, and rooms nobody is in are cleared after 10 minutes.
- Runs with more than 10,000 cards said "This slot has no valid saved run." They load again.
- **Windows app:** "Local save operation failed" when Documents is synced with OneDrive. Fixed.
- Long heal and burn chains (Fire Princess builds) no longer freeze the duel.

## Two new cursed relics
- **Mulligan's Offer:** once per Duel, at your first Standby Phase, shuffle any number of hand cards into your Deck and draw that many. Drawback: you can't add cards from your Deck to your hand except by drawing.
- **Graceful & Skull Dice:** the first die you roll each turn gains you result ×100 LP. Drawback: your face-up monsters lose result ×100 ATK this turn.

## Relic changes
- **Cheaper:**
  - Omni Banishment 150 → 80, The Third Gate 135 → 100.
  - No Pain No Gain 100 → 70, Master and Apprentice 100 → 70, Guardian's Call 90 → 70.
  - Ojama Gang 90 → 60.
  - Ninja Scroll, Destiny Hourglass, Guardian Arsenal and Scorpion Emblem 85 → 60, and buying one adds 1 card from its pool.
- **Stronger:**
  - Dragon Crest gives 400 ATK and DEF (was 300 ATK).
  - Magician Staff gives "Dark Magician" monsters 300 more.
  - Glass Shard triples coin rewards (was doubled).
  - Gate Calling and Magician's Bond also work on Special Summons.
  - Dark Scorpion Squad also counts your GY.
  - Legendary Shackles offers Exodia pieces you don't own yet, then Exodia support.
  - Fusion Chamber offers the Fusion Monsters you own a Material for.
- **Cursed relics, lighter:**
  - Giant's Oath: Level 4 or lower lose 300 (was 400).
  - Ritual Scar: lose 300 (was 500).
  - Solitary Tyrant: +600 alone (was 400), −400 with more (was 500).
  - Reckless Spear: lose 700 (was 1000).
  - Premature Triumph: 1 fewer opening card (was 2).
- **Packs:**
  - Yami Yugi adds Gemini Elf, Neo the Magic Swordsman, Rogue Doll, Ancient Elf and Magician's Valkyria.
  - Serenity adds Fusions such as Musician King, Kaiser Dragon and Thousand Dragon.

## New
- **Deck editor marks:**
  - The card window has − in deck/owned + under the art, with the card's ☆/★/✕ mark below it.
  - New **Marked first** option in the Deck status menu.
  - ★ now helps cards that aren't in your Deck yet; ✕ only greys out and sorts last.
- **Duels:**
  - Your relic triggers always resolve first, so a forced window no longer makes you use a card instead.
  - The CPU no longer attacks into a loss to trigger Sangan, Witch of the Black Forest, Mystic Tomato and the like. It Sets Sangan and Witch.
- **CPU opponents:**
  - New rules for Order to Charge, Silent Doom, Heart of the Underdog, Dust Barrier, Toon Defense, Toon Tributes, Giant Axe Mummy, Vampire's Curse and Metamorphosis.
  - Aknadin's Tier 3 deck is now a Rock / Earth deck.
- **Draft Duels:**
  - Copycat's first loadout and both Dueling Engine loadouts are greyed out; Copycat plays as the Randomizer.
  - Relics that only work outside duels (coins, shop, deck rules) left the Draft relic pool, and the two new cursed relics joined it.

## Changes
- Randomized cards get a rainbow frame, and stay out of the Card Picker, Collection, Related Cards and Run History.
- Duels with randomized cards stall less, and their names are fully random again.
- Fused relics have their own group in Collection › Relics.
- Owning a relic no longer lowers the odds of related relics.
- The new patch notes come back at each start until you close them.
- The start-up error screen has Details and Copy details for bug reports.

## Fixes
- Wall of Revealing Light works at any LP (over 999 LP the duel got stuck).
- Metalmorph asks in the Damage Step on Chain sometimes.
- The split view's Deck count includes stacked copies.
- "Cloud save is paused" no longer sticks all day after a short outage.
