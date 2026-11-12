"""Adds the theme text of the Duke Devlin Tier 3 opponent (2026-11-12) to every language. The name is already translated
as a playable duelist. Existing translations are never overwritten. Run once; re-running changes nothing."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
THEME = 'A coin-toss gambling deck that redoes its unlucky tosses.'
TERMS = {THEME: (
    'Ein Münzwurf-Glücksspieldeck, das seine Pechwürfe wiederholt.',
    'Un Deck de apuestas a cara o cruz que repite sus lanzamientos desafortunados.',
    'Un Deck de jeu de hasard à pile ou face qui relance ses lancers malchanceux.',
    "Un Deck d'azzardo a testa o croce che ripete i lanci sfortunati.",
    'Um Deck de apostas com cara ou coroa que refaz os lançamentos azarados.',
    '不運なコイントスをやり直すギャンブルデッキ。',
    '불운한 코인 토스를 다시 하는 도박 덱.',
    '会重掷不走运的投掷硬币的赌博卡组。')}


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
    for key in fresh: rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'opponent theme added 2026-11-12'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', len(fresh))


if __name__ == '__main__':
    main()
