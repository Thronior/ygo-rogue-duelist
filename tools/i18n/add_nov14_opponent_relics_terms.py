"""Draft Duels: the opponent's relics show next to the portrait like curses; their window title (user, 2026-11-14)."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {'Opponent relics': {'de': 'Gegnerische Relikte', 'es': 'Reliquias del adversario', 'fr': 'Reliques adverses', 'it': "Reliquie dell'avversario",
                             'ja': '相手のレリック', 'ko': '상대 유물', 'pt': 'Relíquias do oponente', 'zh': '对方遗物'}}
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key, text in TERMS.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'mobile.js'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()
