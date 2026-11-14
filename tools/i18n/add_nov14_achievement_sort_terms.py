"""Achievements sort options (user, 2026-11-14). 'Sort', 'Default' and 'Name' already exist. 8 languages."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Closest to completion': {'de': 'Fast geschafft zuerst', 'es': 'Más cerca de completarse', 'fr': 'Les plus proches d’être terminés', 'it': 'Più vicini al completamento',
                           'ja': '達成間近の順', 'ko': '달성에 가까운 순', 'pt': 'Mais perto de concluir', 'zh': '最接近完成'},
 'Completed first': {'de': 'Abgeschlossene zuerst', 'es': 'Completados primero', 'fr': 'Terminés en premier', 'it': 'Completati prima',
                     'ja': '達成済みを先に', 'ko': '달성한 업적 먼저', 'pt': 'Concluídas primeiro', 'zh': '已完成优先'},
 'In progress first': {'de': 'Laufende zuerst', 'es': 'En curso primero', 'fr': 'En cours en premier', 'it': 'In corso prima',
                       'ja': '未達成を先に', 'ko': '진행 중 먼저', 'pt': 'Em andamento primeiro', 'zh': '进行中优先'},
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
    catalog += [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'mobile.js'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()
