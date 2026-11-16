"""Level range options in the deck editor / Collection Level filter (user, 2026-11-16), all 8 languages.
Single Levels use the existing "Level {0}" pattern. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
WORD = ('Stufen {0}-{1}', 'Niveles {0}-{1}', 'Niveaux {0}-{1}', 'Livelli {0}-{1}', 'レベル{0}～{1}', '레벨 {0}-{1}', 'Níveis {0}-{1}', '等级{0}~{1}')
RANGES = ((1, 4), (5, 6), (7, 8), (9, 12))  # android/web/card-search.js LEVEL_RANGES
TERMS = {f'Levels {a}-{b}': tuple(w.format(a, b) for w in WORD) for a, b in RANGES}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, local in TERMS.items(): table.setdefault(en, local[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        # The client bundle (tools/i18n/build_bundles.py writes it in full at build time).
        bundle_path = ROOT / f'android/web/i18n/{lang}.json'
        bundle = json.loads(bundle_path.read_text(encoding='utf8'))
        for en, local in TERMS.items(): bundle['ui'].setdefault(en, table[en])
        bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'Level range filter (2026-11-16)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')


if __name__ == '__main__': main()
