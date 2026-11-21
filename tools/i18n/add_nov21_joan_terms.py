"""Adds the theme text of the Guardian Angel Joan Tier 3 opponent (2026-11-21) to every language. Her name is a card name,
which i18n.js already translates from the card catalogue. Existing translations are never overwritten. Run once;
re-running changes nothing."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
THEME = 'A LIGHT Fairy deck that heals whenever its angels win a battle.'
TERMS = {THEME: (
    'Ein LICHT Feen-Deck, das sich heilt, wann immer seine Engel einen Kampf gewinnen.',
    'Un deck de Hadas de LUZ que se cura cada vez que sus ángeles ganan una batalla.',
    'Un deck Elfe LUMIÈRE qui se soigne chaque fois que ses anges remportent un combat.',
    'Un Deck di Fate LUCE che si cura ogni volta che i suoi angeli vincono una battaglia.',
    'Um deck de Fadas de LUZ que se cura sempre que seus anjos vencem uma batalha.',
    '天使が戦闘に勝つたびにライフを回復する光属性の天使族デッキ。',
    '천사가 전투에서 이길 때마다 회복하는 빛 속성 천사족 덱입니다.',
    '每当天使赢得战斗就会回复基本分的光属性天使族卡组。')}


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    rows = catalog if isinstance(catalog, list) else catalog.get('strings', catalog.get('entries'))
    known = {r['en'] for r in rows}
    added = {}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        count = 0
        for key, values in TERMS.items():
            if key not in table: table[key] = values[index]; count += 1
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    fresh = [key for key in TERMS if key not in known]
    for key in fresh: rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'opponent theme added 2026-11-21'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', len(fresh))


if __name__ == '__main__':
    main()
