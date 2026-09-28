# Asset and data sources

Existing artwork is used. Anubis’s background removal and square portrait crop were prepared with an image-editing tool at the user’s request. Yu-Gi-Oh! artwork, characters and music belong to their respective rights holders. This folder is for a private experimental fan project.

- Existing browser-version cached assets were reused.
- Card images and booster packaging: YGOPRODeck, https://ygoprodeck.com/api-guide/ . Some booster packaging URLs come from the YGOJSON set metadata.
- English/Japanese card and set metadata: YGOJSON, https://github.com/iconmaster5326/YGOJSON . Four incomplete Japanese set tables are supplemented from YGOPRODeck set checklists.
- Character portraits: Konami Duel Links official character assets, https://www.konami.com/yugioh/duel_links/en/ .
- Artifact icons are crops of existing card illustrations.
- Opponent card quantities: World Championship Tournament 2004 opponent FAQ, https://gamefaqs.gamespot.com/gba/919562-yu-gi-oh-world-championship-tournament-2004/faqs/28716 . Factual card/count records are stored in data/opponents.json with per-deck provenance. Typographical errors and historic card names are normalized; Joey's 41 listed cards are retained despite the guide's 40-card heading. Early opponents after the practice duel use those records directly.
- Music: Yu-Gi-Oh! Forbidden Memories (1999), Title and Preliminaries tracks, from the game soundtrack archive at https://downloads.khinsider.com/game-soundtracks/album/yu-gi-oh-forbidden-memories-1999-gamerip . Files are cached in assets/music and copied to the native client's BGM folders. Original bundled BGM is preserved under runtime/sound/original-bgm.
- Native UI, icon, textures and sound effects: EDOPro, https://github.com/edo9300/edopro . Existing upstream notices, including runtime/textures/CREDITS.md.txt and licenses, are retained. Modified source is included in edopro-source.

- Shop background: the anime interior frame supplied directly by the user (shop-background.png), used unchanged as the scene background.

- Character selection background: the Seal of Orichalcos image supplied directly by the user (character-select-background.png). Locked portraits are grayscaled only at render time.

- Advanced opponent deck quantities: World Championship 2005 (7 Trials to Glory) FAQ, https://gamefaqs.gamespot.com/gba/925904-yu-gi-oh-7-trials-to-glory-world-championship-tournament/faqs/46689 . Six factual card/count lists with source provenance are stored in data/expert-opponents.json; listed quantities are preserved, including documented deck oddities.


Additional original-series character portraits: Aigami, Sera, Scud and Ryou from the official Konami Duel Links gallery (`https://www.konami.com/yugioh/duel_links/en/series/images/character/dsod06.png`, `dsod07.png`, `dsod09.png`, `dsod15.png`). Dartz: `https://www.pngfind.com/pngs/m/675-6751212_villains-wiki-yu-gi-oh-duel-monsters-dartz.png`; Rafael: `https://image.pngaaa.com/212/2801212-middle.png`. Menu artwork and all token variants reuse card database artwork (YGOPRODeck). Copyright remains with the original owners. No AI-generated images.

Transparent replacement portraits: Dartz original download https://www.pngfind.com/pngs/b/675-6751212_duel-disk-png.png ; Rafael https://static.zerochan.net/Rafael.full.2503090.png (https://www.zerochan.net/2503090). Original alpha channels retained, no generated imagery.
Opponent difficulty adaptations: data/opponent-tiers.json retains each NPC list source. Optional champion: Masatoshi Togawa 2004 main and Fusion Deck, Jason Grabher-Meyer event report, http://kperovic.com/metagame/yugiohb707.html?ArticleId=288 . Modern EDOPro scripts/errata apply.

September 2026 replacements: PaniK and Shadi portraits from official yugioh.com character profiles (uploads1.yugioh.com/character/145/detail/detail/panik-lrg.png; uploads4.yugioh.com/character/15/detail/detail/shadi-l.png). Anubis movie still: https://i.pinimg.com/originals/d4/f9/ed/d4f9ed042c13355da60349248c9efb69.png . Copyright Konami / respective movie rights holders.
