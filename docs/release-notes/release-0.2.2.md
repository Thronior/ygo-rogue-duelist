**YGO Rogue Duelist — Update 0.2.2**

**Duel animations & sound**
- New animations for summons, attacks, destruction, chains, LP changes, card moves and turns/phases, plus a refreshed field and phase timeline. Decks look thick until 10 cards remain.
- Sounds no longer cut each other off, match their animations, and many actions got new ones.
- Your actions now play at the opponent's pace. **Settings → Faster Animations** brings back the quicker pace.

**CPU**
- Checks whether removal can actually hit a target (Pole Position, Spell immunity, protection) and forecasts ATK/DEF from equips, relics, field effects and Sword and Shield before it summons, sets or attacks.
- Smarter with Riryoku, Michizure, Mask of the Accursed (now Main Phase 2), Fairy Box, Enchanted Javelin, Spell Shield Type-8, Kunai with Chain, Frontline Base, Cyber Jar, Spirit Reaper, Drillago and face-down threats like Kelbek.

**Fixes & interface**
- "Chain sometimes" now prompts for Pinch Hopper, Hannibal Necromancer, Cliff the Trap Remover, Hydrogeddon, Kunai with Chain, Fairy Box, Spell Shield Type-8 and Michizure. Dragon's Gunfire has one Activate prompt; Pandemonium and Demonic Pact are fixed.
- Attribute Surgery relics stack, Dulled Edge applies once per opponent, Razor Ledger's text is clearer.
- Exact card subtypes, "<1%" pack odds, View Deck/Relics on the cursed-relic screen, and fixes for the Relics button and shrinking deck view.

**Packs & decks**
- Merged 11 duplicate packs (103 → 92), incl. the Duelist Legacy/Yami Yugi volumes and Yugi's two character packs. Saves keep working.
- Mokuba's pack is reworked to 128 cards around weaker Dragons, Level monsters, staples and equips. Kisara T1 gets 3 Blue-Eyes Ultimate Dragons. Spirit and Toon count as archetypes.

**GitHub & modding**
- Repo cleaned up: retired desktop version removed, docs organized, project now CC0.
- Other projects can now use the CPU opponent: docs/DUELING-AI.md explains running it or plugging it into EDOPro-based games.
