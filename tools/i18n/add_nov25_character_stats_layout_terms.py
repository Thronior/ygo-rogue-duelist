"""Character Stats layout F (user, 2026-11-25): sort buttons, run counts and the detail's headings in all 8 languages.
Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Best win rate': ('Beste Siegquote', 'Mejor tasa de victorias', 'Meilleur taux de victoire', 'Miglior percentuale di vittorie', '勝率が高い順', '승률 높은 순', 'Maior taxa de vitórias', '胜率最高'),
 'Lowest win rate': ('Niedrigste Siegquote', 'Peor tasa de victorias', 'Plus faible taux de victoire', 'Peggior percentuale di vittorie', '勝率が低い順', '승률 낮은 순', 'Menor taxa de vitórias', '胜率最低'),
 'Run win rate': ('Siegquote der Durchläufe', 'Tasa de victorias de partidas', 'Taux de victoire des parties', 'Percentuale di vittorie delle partite', 'ラン勝率', '런 승률', 'Taxa de vitórias das jornadas', '冒险胜率'),
 'By Challenge Level': ('Nach Herausforderungsstufe', 'Por nivel de desafío', 'Par niveau de défi', 'Per livello di sfida', 'チャレンジレベル別', '챌린지 레벨별', 'Por nível de desafio', '按挑战等级'),
 'Toughest CPUs': ('Stärkste CPUs', 'CPUs más difíciles', 'CPU les plus coriaces', 'CPU più difficili', '手強いCPU', '강한 CPU', 'CPUs mais difíceis', '最难的CPU'),
 'All CPU records': ('Alle CPU-Ergebnisse', 'Todos los registros contra la CPU', 'Tous les résultats contre la CPU', 'Tutti i risultati contro la CPU', 'CPU戦績をすべて見る', '모든 CPU 전적', 'Todos os registros contra a CPU', '全部CPU战绩'),
 '{0} runs': ('{0} Durchläufe', '{0} partidas', '{0} parties', '{0} partite', '{0}ラン', '{0}런', '{0} jornadas', '{0}次冒险'),
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
