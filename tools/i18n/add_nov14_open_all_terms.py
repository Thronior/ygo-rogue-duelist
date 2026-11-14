"""Open all packs (2026-11-14): the "Open all (N)" button under OPEN PACK and the one-grid summary of every remaining
pack (pack-opening.js). All 8 languages. Existing translations are never overwritten."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_bytes

LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'All your pulls': ['Alle deine Karten', 'Todas tus cartas', 'Toutes vos cartes', 'Tutte le tue carte', '引いたカードすべて', '뽑은 카드 전체', 'Todas as suas cartas', '你抽到的所有卡'],
}
PATTERNS = {
 'Open all ({0})': ['Alle öffnen ({0})', 'Abrir todos ({0})', 'Tout ouvrir ({0})', 'Apri tutti ({0})', 'すべて開封（{0}）', '모두 개봉 ({0})', 'Abrir todos ({0})', '全部开启（{0}）'],
 'ALL {0} PACKS': ['ALLE {0} BOOSTER', 'LOS {0} SOBRES', 'LES {0} BOOSTERS', 'TUTTE LE {0} BUSTINE', '全{0}パック', '팩 {0}개 전체', 'TODOS OS {0} PACOTES', '全部 {0} 包'],
 '{0} cards · {1} new': ['{0} Karten · {1} neu', '{0} cartas · {1} nuevas', '{0} cartes · {1} nouvelles', '{0} carte · {1} nuove', '{0}枚 · 新規{1}枚', '카드 {0}장 · 새 카드 {1}장', '{0} cartas · {1} novas', '{0} 张卡 · {1} 张新卡'],
 '{0} cards': ['{0} Karten', '{0} cartas', '{0} cartes', '{0} carte', '{0}枚', '카드 {0}장', '{0} cartas', '{0} 张卡'],
}

def dump(path, data):
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=1) + '\n').encode('utf8'))

def main():
    rows = {**TERMS, **PATTERNS}
    for n, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        added = 0
        for key, text in rows.items():
            if key not in table: table[key] = text[n]; added += 1
        if added: dump(path, table)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    new = [{'group': 'ui', 'en': k, 'kind': 'pattern' if k in PATTERNS else 'exact', 'ctx': 'pack-opening.js'} for k in rows if k not in known]
    if new: dump(path, catalog + new)

if __name__ == '__main__':
    main()
