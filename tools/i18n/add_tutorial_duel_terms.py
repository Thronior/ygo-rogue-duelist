"""Adds the tutorial duel's texts (2026-11-11, android/web/tutorial-duel.js) to every language.

The translations are in tutorial_duel_terms.json beside this file: {English: {lang: text}}. Existing translations are
never overwritten. Run once; re-running changes nothing. Then run build_bundles.py (tools/build_android.py does).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')


def main():
    terms = json.loads((Path(__file__).with_name('tutorial_duel_terms.json')).read_text(encoding='utf8'))
    added = {}
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        count = 0
        for en, texts in terms.items():
            if en not in table:
                table[en] = texts[lang]; count += 1
        if count:
            path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    rows = catalog if isinstance(catalog, list) else catalog['strings']
    known = {row['en'] for row in rows}
    fresh = 0
    for en in terms:
        if en not in known:
            rows.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'tutorial-duel.js'}); fresh += 1
    if fresh:
        catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh)


if __name__ == '__main__':
    main()
