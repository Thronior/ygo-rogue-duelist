"""Adds the theme text of the PaniK Tier 3 / Tier 4 (Endless) opponent (2026-11-18) to every language. The name is
already translated as a playable duelist. Existing translations are never overwritten. Run once; re-running changes nothing."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
THEME = 'A Zombie deck that keeps raising its dead from the Graveyard.'
TERMS = {THEME: (
    'Ein Zombie-Deck, das seine Toten immer wieder aus dem Friedhof erweckt.',
    'Un Deck Zombi que no deja de alzar a sus muertos desde el Cementerio.',
    'Un Deck Zombie qui relève sans cesse ses morts depuis le Cimetière.',
    'Un Deck Zombie che continua a risvegliare i suoi morti dal Cimitero.',
    'Um Deck Zumbi que não para de erguer seus mortos do Cemitério.',
    '墓地から死者を何度も蘇らせるアンデット族デッキ。',
    '묘지에서 죽은 자를 계속 되살리는 언데드족 덱.',
    '不断从墓地复活死者的不死族卡组。')}


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
    for key in fresh: rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'opponent theme added 2026-11-18'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', len(fresh))


if __name__ == '__main__':
    main()
