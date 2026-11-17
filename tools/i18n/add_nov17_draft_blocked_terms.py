"""Draft Duels refuse Copycat's standard loadout and both Dueling Engine loadouts (2026-11-17), all 8 languages.
Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Not available in Draft Duels': (
  'In Draft-Duellen nicht verfügbar', 'No disponible en Duelos de Draft', 'Indisponible en Duels Draft',
  'Non disponibile nei Duelli Draft', 'ドラフトデュエルでは使用できません', '드래프트 듀얼에서는 사용할 수 없습니다',
  'Indisponível em Duelos de Draft', '轮抽决斗中不可用'),
 'This loadout is not available in Draft Duels.': (
  'Diese Variante ist in Draft-Duellen nicht verfügbar.', 'Esta variante no está disponible en Duelos de Draft.',
  "Cette variante n'est pas disponible en Duels Draft.", 'Questa variante non è disponibile nei Duelli Draft.',
  'このバリアントはドラフトデュエルでは使用できません。', '이 변형은 드래프트 듀얼에서 사용할 수 없습니다.',
  'Esta variante não está disponível em Duelos de Draft.', '这套流派在轮抽决斗中不可用。'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'Draft Duels character select (2026-11-17)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
