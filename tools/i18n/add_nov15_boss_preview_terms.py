"""Next boss preview window (run progress strip) and the final loop ending (2026-11-15), in every language.
Uses each language's existing words for boss, curse, duel and loop. Existing translations are never overwritten;
re-running changes nothing."""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text

LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    'Next boss': ('Nächster Boss', 'Siguiente jefe', 'Prochain Boss', 'Prossimo Boss', 'Próximo chefe',
                  '次のボス', '다음 보스', '下一个首领'),
    'No curses.': ('Keine Flüche.', 'Sin maldiciones.', 'Aucune malédiction.', 'Nessuna maledizione.', 'Sem maldições.',
                   '呪いはありません。', '저주가 없습니다.', '没有诅咒。'),
    'Depends on the curse you take in Duel 1.': (
        'Hängt vom Fluch ab, den du in Duell 1 nimmst.',
        'Depende de la maldición que aceptes en el Duelo 1.',
        'Dépend de la malédiction que vous prenez au Duel 1.',
        'Dipende dalla maledizione che prendi nel Duello 1.',
        'Depende da maldição que você aceitar no Duelo 1.',
        'デュエル1で受ける呪いによって変わります。',
        '듀얼 1에서 받는 저주에 따라 달라집니다.',
        '取决于你在第1场决斗中承受的诅咒。'),
    'You conquered the final loop.': (
        'Du hast den letzten Zyklus bezwungen.',
        'Has conquistado la última vuelta.',
        'Vous avez conquis la dernière boucle.',
        "Hai conquistato l'ultimo ciclo.",
        'Você conquistou o último ciclo.',
        '最後の周回を制覇しました。',
        '마지막 루프를 정복했습니다.',
        '你征服了最后一个周目。'),
}


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in rows}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        before = dict(table)
        for key, values in TERMS.items():
            table.setdefault(key, values[index])
        if table != before:
            write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    added = [key for key in TERMS if key not in known]
    for key in added:
        rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'run-progress.js, mobile.js, endless.py (2026-11-15)'})
    if added:
        write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS), 'terms,', len(added), 'new catalog rows')


if __name__ == '__main__':
    main()
