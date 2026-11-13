"""Typhoon now works in the opponent's End Phase (user, 2026-11-12). Builds the new text from the existing translations,
changing only "your End Phase" in each language. Never overwrites an existing translation; renames the catalog row."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OLD = 'Once per turn, during your End Phase, you can destroy 1 Spell or Trap Card on your side of the field. If you do, destroy 1 Spell or Trap Card your opponent controls.'
NEW = OLD.replace('during your End Phase', "during your opponent's End Phase")
SWAP = {'de': ('während deiner End Phase', 'während der End Phase deines Gegners'),
        'es': ('durante tu End Phase', 'durante la End Phase de tu adversario'),
        'fr': ('durant votre End Phase', 'durant la End Phase de votre adversaire'),
        'it': ('durante la tua End Phase', "durante la End Phase dell'avversario"),
        'ja': ('自分エンドフェイズに', '相手エンドフェイズに'),
        'ko': ('자신 엔드 페이즈에', '상대 엔드 페이즈에'),
        'pt': ('durante sua Fase Final', 'durante a Fase Final do seu oponente'),
        'zh': ('自己结束阶段', '对方结束阶段')}

def main():
    for lang, (old, new) in SWAP.items():
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        text = table[OLD]
        assert old in text, (lang, text)
        table.setdefault(NEW, text.replace(old, new, 1))
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        print(lang, '|', table[NEW])
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    for row in catalog:
        if row.get('en') == OLD: row['en'] = NEW
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')

if __name__ == '__main__':
    main()
