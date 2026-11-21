"""Adds the 74 card sleeves Deds drew that had no sleeve yet (user's unlock choices, 2026-11-20) to data/card-sleeves.json,
before Rainbow, and copies their art (his frame trimmed off) to tools/sleeve-art/cards/<id>.webp for
tools/generate_card_sleeves.cjs. Source: Deds' folder on the user's Desktop. Rows that already exist are skipped, so it
is safe to run again. Then: runtime/ai/node.exe tools/generate_card_sleeves.cjs --only <ids>."""
import json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FOLDER = Path(r'C:/Users/Win/Desktop/various ygo rogue files/sleeves/cards')


def L(key, n):
    return {'kind': 'lifetime', 'key': key, 'min': n}


# (sleeve id, Deds' file, name shown, condition, rule). Alternate arts of one monster share a condition with rising counts.
ROWS = [
 ('dark-magician', 'dark-magician', 'Dark Magician', 'Summon Dark Magician.', L('dmSummons', 1)),
 ('dark-magician-2', 'dark-magician2', 'Dark Magician', 'Summon Dark Magician 10 times (across runs).', L('dmSummons', 10)),
 ('dark-magician-3', 'dark-magician3', 'Dark Magician', 'Summon Dark Magician 25 times (across runs).', L('dmSummons', 25)),
 ('dark-magician-girl-2', 'dark-magician-girl', 'Dark Magician Girl', 'Deal the final blow with Dark Magician Girl.', {'kind': 'win', 'key': 'dmgFinish', 'min': 1}),
 ('blue-eyes-white-dragon', 'blue-eyes-white-dragon', 'Blue-Eyes White Dragon', 'Deal the final blow with a monster that has 3,000 or more ATK.', L('wins:bigFinish', 1)),
 ('blue-eyes-white-dragon-2', 'blue-eyes-white-dragon2', 'Blue-Eyes White Dragon', 'Deal the final blow with a monster that has 3,000 or more ATK in 10 duels (across runs).', L('wins:bigFinish', 10)),
 ('red-eyes-black-dragon', 'red-eyes-b-dragon', 'Red-Eyes Black Dragon', 'Win a duel while you control Red-Eyes Black Dragon.', L('wins:name:Red-Eyes Black Dragon', 1)),
 ('red-eyes-black-dragon-2', 'red-eyes-b-dragon2', 'Red-Eyes Black Dragon', 'Win 10 duels while you control Red-Eyes Black Dragon (across runs).', L('wins:name:Red-Eyes Black Dragon', 10)),
 ('black-luster-soldier', 'bls', 'Black Luster Soldier', 'Ritual Summon 10 times (across runs).', L('ritual', 10)),
 ('black-luster-soldier-2', 'bls2', 'Black Luster Soldier', 'Ritual Summon 25 times (across runs).', L('ritual', 25)),
 ('black-luster-soldier-3', 'bls3', 'Black Luster Soldier', 'Ritual Summon 100 times (across runs).', L('ritual', 100)),
 ('celtic-guardian', 'celtic-guardian', 'Celtic Guardian', 'Win 10 duels while you control a Warrior monster (across runs).', L('wins:race:Warrior', 10)),
 ('celtic-guardian-2', 'celtic-guardian3', 'Celtic Guardian', 'Win 25 duels while you control a Warrior monster (across runs).', L('wins:race:Warrior', 25)),
 ('celtic-guardian-3', 'celtic-guardian4', 'Celtic Guardian', 'Win 50 duels while you control a Warrior monster (across runs).', L('wins:race:Warrior', 50)),
 ('obnoxious-celtic-guard', 'celtic-guardian2', 'Obnoxious Celtic Guard', 'Win 100 duels while you control a Warrior monster (across runs).', L('wins:race:Warrior', 100)),
 ('thousand-dragon', 'hundred-dragon', 'Thousand Dragon', 'Win a duel that lasts 20 turns or more.', L('wins:turns20', 1)),
 ('thousand-dragon-2', 'thousand-dragon', 'Thousand Dragon', 'Win 5 duels that last 20 turns or more (across runs).', L('wins:turns20', 5)),
 ('thousand-dragon-3', 'thousand-dragon2', 'Thousand Dragon', 'Win 10 duels that last 20 turns or more (across runs).', L('wins:turns20', 10)),
 ('thousand-dragon-4', 'thousand-dragon3', 'Thousand Dragon', 'Win 25 duels that last 20 turns or more (across runs).', L('wins:turns20', 25)),
 ('ancient-golem', 'ancient-golem', 'Ancient Golem', 'Win 10 duels while you control a Machine monster (across runs).', L('wins:race:Machine', 10)),
 ('ancient-golem-2', 'ancient-golem2', 'Ancient Golem', 'Win 25 duels while you control a Machine monster (across runs).', L('wins:race:Machine', 25)),
 ('harpie-lady-1', 'harpie-lady1', 'Harpie Lady 1', 'Win a duel while you control a "Harpie" monster.', L('wins:nameHas:Harpie', 1)),
 ('harpie-lady-2', 'harpie-lady2', 'Harpie Lady 2', 'Win 10 duels while you control a "Harpie" monster (across runs).', L('wins:nameHas:Harpie', 10)),
 ('harpie-lady-3', 'harpie-lady3', 'Harpie Lady 3', 'Win 25 duels while you control a "Harpie" monster (across runs).', L('wins:nameHas:Harpie', 25)),
 ('super-robolady', 'super-robolady', 'Super Robolady', 'Return 5 of your monsters to the Extra Deck (across runs).', L('toExtra', 5)),
 ('super-roboyarou', 'super-roboyarou', 'Super Roboyarou', 'Return 10 of your monsters to the Extra Deck (across runs).', L('toExtra', 10)),
 ('dark-paladin-2', 'dark-paladdin', 'Dark Paladin', 'Win runs on Challenge Level 2 or higher with 5 different duelists.', {'kind': 'duelists_level', 'level': 2, 'min': 5}),
 ('gemini-elf-2', 'gemini-elf', 'Gemini Elf', 'Win 5 Tag runs.', L('tagWins', 5)),
 ('polymerization-2', 'poly2', 'Polymerization', 'Fusion Summon 3 times in one duel.', {'kind': 'duel', 'key': 'fusionDuel', 'min': 3}),
 ('polymerization-3', 'poly3', 'Polymerization', 'Fusion Summon 5 times in one duel.', {'kind': 'duel', 'key': 'fusionDuel', 'min': 5}),
 ('pot-of-greed-2', 'pot-of-greed2', 'Pot of Greed', 'Draw 1,000 cards (across runs).', L('draws', 1000)),
 ('time-wizard-2', 'time-wizard2', 'Time Wizard', 'Win the Time Wizard toss 3 times in one duel.', {'kind': 'duel', 'key': 'timeWizardWins', 'min': 3}),
 ('mokey-mokey-2', 'mokey-mokey2', 'Mokey Mokey', 'Deal the final blow with a monster that has 500 or less ATK in 10 duels (across runs).', L('wins:weakFinish', 10)),
 ('sasuke-samurai-2', 'sasuke-samurai2', 'Sasuke Samurai #2', 'Pay 10,000 LP for card costs (across runs).', L('lpPaid', 10000)),
 ('sasuke-samurai-4', 'sasuke-samurai4', 'Sasuke Samurai #4', 'Destroy 25 monsters with coin-toss effects (across runs).', L('coinKills', 25)),
 ('nightmare-penguin', 'nightmare-penguin', 'Nightmare Penguin', "Return 100 of your opponent's monsters to the hand (across runs).", L('bounced', 100)),
 ('slate-warrior', 'slate-warrior', 'Slate Warrior', 'Flip Summon 50 monsters (across runs).', L('flipSummons', 50)),
 ('perfectly-ultimate-great-moth', 'perfectly-ultimate-great-moth', 'Perfectly Ultimate Great Moth', 'Win a duel that lasts 60 turns or more.', {'kind': 'win', 'key': 'turn', 'min': 60}),
 ('xyz-dragon-cannon-2', 'xyz-dragon-cannon2', 'XYZ-Dragon Cannon', 'Make 25 relic fusions (across runs).', L('relicFusions', 25)),
 ('xyz-dragon-cannon-3', 'xyz-dragon-cannon3', 'XYZ-Dragon Cannon', 'Make 50 relic fusions (across runs).', L('relicFusions', 50)),
 ('xyz-dragon-cannon-4', 'xyz-combine', 'XYZ-Dragon Cannon', 'Make 75 relic fusions (across runs).', L('relicFusions', 75)),
 ('vw-tiger-catapult', 'vw-tiger-catapult', 'VW-Tiger Catapult', 'Make 100 relic fusions (across runs).', L('relicFusions', 100)),
 ('vwxyz-dragon-catapult-cannon', 'vwxyz-dragon-catapult-cannon', 'VWXYZ-Dragon Catapult Cannon', 'Make 150 relic fusions (across runs).', L('relicFusions', 150)),
 ('allure-of-darkness', 'allure-of-darkness', 'Allure of Darkness', 'Banish 100 DARK monsters (across runs).', L('darkBanished', 100)),
 ('book-of-moon', 'book-of-moon', 'Book of Moon', 'Change 50 monsters to face-down Defense Position with card effects (across runs).', L('flippedDown', 50)),
 ('castle-of-dark-illusions', 'castle-of-illusions', 'Castle of Dark Illusions', 'Defeat PaniK as an opponent 5 times (across runs).', L('beat:PaniK', 5)),
 ('dark-necrofear', 'dark-necrofear', 'Dark Necrofear', 'Win a duel while you control Dark Necrofear.', {'kind': 'win_control', 'cards': ['Dark Necrofear']}),
 ('delinquent-duo', 'delinquent-duo', 'Delinquent Duo', 'Make your opponent discard 30 cards (across runs).', L('oppDiscards', 30)),
 ('masked-beast-des-gardius', 'des-gardius', 'Masked Beast Des Gardius', 'Defeat Lumis and Umbra as an opponent 5 times (across runs).', L('beat:Lumis and Umbra', 5)),
 ('divine-serpent-geh', 'divine-serpent-geh', 'Divine Serpent Geh', 'Win a duel after taking 10,000 or more damage.', {'kind': 'win', 'key': 'damageTaken', 'min': 10000}),
 ('embodiment-of-apophis', 'embodiment-of-apophis', 'Embodiment of Apophis', 'Activate 100 Trap Cards (across runs).', L('trapsActivated', 100)),
 ('flame-swordsman', 'flame-swordsman', 'Flame Swordsman', 'Win a duel while you control Flame Swordsman.', {'kind': 'win_control', 'cards': ['Flame Swordsman']}),
 ('fortress-whale', 'fortress-whale', 'Fortress Whale', 'Win a duel while you control Fortress Whale.', {'kind': 'win_control', 'cards': ['Fortress Whale']}),
 ('gandora-the-dragon-of-destruction', 'gandora', 'Gandora the Dragon of Destruction', 'Win a duel while you control Gandora the Dragon of Destruction.', {'kind': 'win_control', 'cards': ['Gandora the Dragon of Destruction']}),
 ('gearfried-the-iron-knight', 'gearfried', 'Gearfried the Iron Knight', 'Win a run without activating an Equip Spell.', {'kind': 'run', 'key': 'no_equips'}),
 ('gogiga-gagagigo', 'gogiga-gagagigo', 'Gogiga Gagagigo', 'Win 10 duels while you control a Reptile monster (across runs).', L('wins:race:Reptile', 10)),
 ('gravekeepers-visionary', 'gravekeeper-visionary', "Gravekeeper's Visionary", 'Win 5 duels with an empty Graveyard (across runs).', L('wins:emptyGrave', 5)),
 ('guardian-angel-joan', 'guardian-angel-joan', 'Guardian Angel Joan', 'Gain 10,000 or more LP in one duel.', {'kind': 'duel', 'key': 'lpGained', 'min': 10000}),
 ('the-inexperienced-spy', 'inexperienced-spy', 'The Inexperienced Spy', "Look at your opponent's hand with card effects 25 times (across runs).", L('handLooks', 25)),
 ('insect-queen', 'insect-queen', 'Insect Queen', 'Defeat Weevil Underwood as an opponent 5 times (across runs).', L('beat:Weevil Underwood', 5)),
 ('jerry-beans-man', 'jerry-beans-man', 'Jerry Beans Man', 'Win a duel with a Main Deck whose monsters are all Normal Monsters.', {'kind': 'win', 'key': 'normalDeck', 'min': 1}),
 ('la-jinn', 'la-jinn', 'La Jinn the Mystical Genie of the Lamp', 'Defeat the World Champion 3 times (across runs).', L('beat:World Champion', 3)),
 ('lava-golem', 'lava-golem', 'Lava Golem', 'Defeat Yami Marik as an opponent 5 times (across runs).', L('beat:Yami Marik', 5)),
 ('mask-of-dispel', 'mask-of-dispel', 'Mask of Dispel', 'Deal 25,000 effect damage (across runs).', L('effectDamage', 25000)),
 ('millennium-golem', 'millennium-golem', 'Millennium Golem', 'Defeat Aknadin as an opponent 5 times (across runs).', L('beat:Aknadin', 5)),
 ('mobius-the-frost-monarch', 'mobius', 'Mobius the Frost Monarch', 'Tribute Summon 50 monsters (across runs).', L('tributeSummons', 50)),
 ('mudora', 'mudora', 'Mudora', 'Win a duel with 20 or more cards in your Graveyard.', {'kind': 'win', 'key': 'grave', 'min': 20}),
 ('orgoth-the-relentless', 'orgoth-the-relentless', 'Orgoth the Relentless', 'Defeat Duke Devlin as an opponent 5 times (across runs).', L('beat:Duke Devlin', 5)),
 ('pumpking-the-king-of-ghosts', 'pumpking-king-of-ghosts', 'Pumpking the King of Ghosts', 'Win 10 duels while you control a Zombie monster (across runs).', L('wins:race:Zombie', 10)),
 ('saggi-the-dark-clown', 'saggi', 'Saggi the Dark Clown', 'Deal the final blow with a monster that has 1,000 or less ATK in 25 duels (across runs).', L('wins:lowFinish', 25)),
 ('the-seal-of-orichalcos', 'seal-of-orichalcos', 'The Seal of Orichalcos', 'Defeat Dartz as an opponent 5 times (across runs).', L('beat:Dartz', 5)),
 ('shinato-king-of-a-higher-plane', 'shinato', 'Shinato, King of a Higher Plane', 'Defeat Noah Kaiba as an opponent 5 times (across runs).', L('beat:Noah Kaiba', 5)),
 ('thunder-dragon', 'thunder-dragon', 'Thunder Dragon', 'Win 10 duels while you control a Thunder monster (across runs).', L('wins:race:Thunder', 10)),
 ('vampire-genesis', 'vampire-genesis', 'Vampire Genesis', 'Win a duel while you control Vampire Genesis.', {'kind': 'win_control', 'cards': ['Vampire Genesis']}),
]


def main():
    assert len(ROWS) == 74 and len({r[0] for r in ROWS}) == 74
    content = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf-8-sig'))
    by_name = {c['name']: c['id'] for c in content['cards']}
    path = ROOT / 'data/card-sleeves.json'
    data = json.loads(path.read_text(encoding='utf8'))
    have = {s['id'] for s in data['sleeves']}
    sources_path = ROOT / 'tools/sleeve-art/sources.json'
    sources = json.loads(sources_path.read_text(encoding='utf8'))
    new = []
    for sid, file, art, text, rule in ROWS:
        if sid in have:
            continue
        row = {'id': sid, 'art': art, 'text': text, 'rule': rule}
        if art in by_name:
            row['card'] = by_name[art]
        new.append(row)
        with Image.open(FOLDER / f'{file}.jpg') as im:
            w, h = im.size
            im.convert('RGB').crop((13, 13, w - 13, h - 13)).save(ROOT / f'tools/sleeve-art/cards/{sid}.webp', quality=85, method=6)
        sources[sid] = f'{file}.jpg'
    at = [s['id'] for s in data['sleeves']].index('rainbow')
    data['sleeves'][at:at] = new
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf8', newline='\n')
    sources_path.write_text(json.dumps(sources, indent=1) + '\n', encoding='utf8')
    print('added', len(new), 'total', len(data['sleeves']))
    print(','.join(r['id'] for r in new))


if __name__ == '__main__':
    sys.exit(main())
