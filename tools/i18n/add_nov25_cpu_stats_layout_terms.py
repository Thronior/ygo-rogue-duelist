"""CPU Stats layout C (user, 2026-11-25): the opponent list's sort buttons, duel counts and the detail heading in all
8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Most played': ('Meistgespielt', 'Más jugados', 'Les plus joués', 'Più giocati', 'よく対戦', '많이 플레이', 'Mais jogados', '最常对战'),
 'Toughest': ('Am stärksten', 'Más difíciles', 'Les plus coriaces', 'Più difficili', '手強い順', '강한 순', 'Mais difíceis', '最难'),
 'Easiest': ('Am leichtesten', 'Más fáciles', 'Les plus faciles', 'Più facili', '易しい順', '쉬운 순', 'Mais fáceis', '最容易'),
 'A–Z': ('A–Z', 'A–Z', 'A–Z', 'A–Z', '名前順', '이름순', 'A–Z', '按名称'),
 'Against each duelist': ('Gegen jeden Duellanten', 'Contra cada duelista', 'Contre chaque duelliste', 'Contro ogni duellante', '各デュエリストとの戦績', '각 듀얼리스트 상대 전적', 'Contra cada duelista', '对各决斗者的战绩'),
 '{0} duels': ('{0} Duelle', '{0} duelos', '{0} duels', '{0} duelli', '{0}デュエル', '{0}듀얼', '{0} duelos', '{0}场决斗'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'mobile.js'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
