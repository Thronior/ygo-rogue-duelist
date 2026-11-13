"""'Deck-out win' coin line (user, 2026-11-13): a deck-out victory keeps a third of the duel's coins despite the slow
duel penalty. Adds the label to the catalog and all 8 languages."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
KEY = 'Deck-out win'
TEXT = {'de': 'Sieg durch Deck-Out', 'es': 'Victoria por mazo vacío', 'fr': 'Victoire par deck vide',
        'it': 'Vittoria per mazzo esaurito', 'ja': 'デッキ切れ勝利', 'ko': '덱 아웃 승리',
        'pt': 'Vitória por deck vazio', 'zh': '卡组耗尽胜利'}

def main():
    for lang, text in TEXT.items():
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        table[KEY] = text
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    if not any(r.get('en') == KEY for r in catalog):
        catalog.append({'group': 'python', 'en': KEY, 'kind': 'exact', 'ctx': 'campaign_expansion.py'})
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')

if __name__ == '__main__':
    main()
