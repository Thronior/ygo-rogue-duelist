"""Duke Devlin's unlock (user, 2026-11-13): "Roll 10 dice and toss 10 coins" replaces "Buy four different booster packs
in one run". Adds the new requirement to the catalog and all 8 languages; old keys stay."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
NEW = 'Roll 10 dice and toss 10 coins'
TEXT = {'de': 'Würfle 10 Würfel und wirf 10 Münzen.',
        'es': 'Lanza 10 dados y 10 monedas.',
        'fr': 'Lancez 10 dés et 10 pièces.',
        'it': 'Lancia 10 dadi e 10 monete.',
        'ja': 'サイコロを10回振り、コイントスを10回行う',
        'ko': '주사위를 10번 굴리고 코인 토스를 10번 하기',
        'pt': 'Role 10 dados e lance 10 moedas.',
        'zh': '掷10次骰子并投掷10次硬币'}

def main():
    for lang, text in TEXT.items():
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        table[NEW] = text
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    if not any(r.get('en') == NEW for r in catalog):
        catalog.append({'group': 'ui', 'en': NEW, 'kind': 'exact', 'ctx': 'achievement unlock requirement'})
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')

if __name__ == '__main__':
    main()
