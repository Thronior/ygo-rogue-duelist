"""Sleeve picker credit line of 2026-11-20, in all 8 languages. Never overwrites an existing translation.
Deds, a Discord player, drew the reworked Level 6 and card-art sleeves (user, 2026-11-20); his name stays as written."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Sleeve designs by Deds': ('Kartenhüllen-Designs von Deds', 'Diseños de fundas de cartas por Deds', 'Protège-cartes dessinés par Deds',
  'Bustine protettive disegnate da Deds', 'スリーブデザイン：Deds', '카드 슬리브 디자인: Deds', 'Protetores de cards desenhados por Deds', '卡套设计：Deds'),
}
CONTEXT = {
 'Sleeve designs by Deds': ('ui', 'Cosmetics › Card Sleeve: credit for the artist of the sleeve art, a person\'s name, 2026-11-20'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        group, ctx = CONTEXT[en]
        if en not in known: catalog.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': ctx})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
