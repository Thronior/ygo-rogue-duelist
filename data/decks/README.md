# Fixed opponent decks

> **Platform status:** The native Windows desktop edition is deprecated and is no longer maintained or distributed. The supported clients are the webapp and Android app, including play in desktop browsers.

Regular opponents have three named `.ydk` files. The manifest is `../fixed-opponents.json`. Append-only Tier 4-only opponents use a single deck listed in `../tier4-decks.json`.

- Tier 1: duels 1–3.
- Tier 2: duels 4–6.
- Tier 3: duels 7–9 and later loops.

The game loads the named file directly before every duel. There are no filler cards, runtime substitutions, signature additions or random tutorial variants. Only draw order is shuffled. Main and Extra Deck sections are respected on both platforms. Side decks are not used for this single-duel format.

Edit with EDOPro or a text editor. Preserve the filename. Main decks need at least 20 cards and at most three copies of a card across sections. Exact user-supplied lists intentionally retain their specified triples. A Tier 4 record may explicitly set `ignore_limited_list` to bypass the Limited List while keeping the three-copy cap. Rebuild Android and web outputs after edits so their bundled files match the source. The World Champion still has its dedicated fixed list; after completing the second loop, Obelisk the Tormenter is the required loop challenge.

Supplied archetypes: Yugi Muto—Exodia; Yami Marik—burn; Tea—healing; Ishizu—Fairies; Noah—Spirits; Kaiba—Blue-Eyes; Yami Yugi—Dark Magician. Their three lists are used exactly as supplied. Other opponents retain their three character-themed fixed lists.
