"""Shop reward categories (user, 2026-11-14): "Hole Traps" is now "Staple Traps"; new "Monster Removal" and
"Spell & Trap Removal". 8 languages."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Staple Traps': {'de': 'Standard-Fallen', 'es': 'Trampas básicas', 'fr': 'Pièges incontournables', 'it': 'Trappole fondamentali',
                  'ja': '定番の罠カード', 'ko': '필수 함정 카드', 'pt': 'Armadilhas essenciais', 'zh': '常用陷阱卡'},
 'Monster Removal': {'de': 'Monster-Entfernung', 'es': 'Eliminación de monstruos', 'fr': 'Élimination de monstres', 'it': 'Rimozione mostri',
                     'ja': 'モンスター除去', 'ko': '몬스터 제거', 'pt': 'Remoção de monstros', 'zh': '怪兽去除'},
 'Spell & Trap Removal': {'de': 'Zauber- & Fallen-Entfernung', 'es': 'Eliminación de Magias y Trampas', 'fr': 'Élimination de Magies et Pièges',
                          'it': 'Rimozione Magie e Trappole', 'ja': '魔法・罠除去', 'ko': '마법·함정 제거', 'pt': 'Remoção de Magias e Armadilhas', 'zh': '魔法·陷阱去除'},
}
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key, text in TERMS.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'python', 'en': k, 'kind': 'exact', 'ctx': 'shop_rewards.py'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()
