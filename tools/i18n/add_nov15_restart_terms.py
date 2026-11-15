"""Hidden hold-R restart messages (user, 2026-11-15), all 8 languages. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
DONE = 'Run restarted.'
LATE = 'The run can only be restarted before the end of its first duel.'
TERMS = {
 DONE: ('Durchlauf neu gestartet.', 'Partida reiniciada.', 'Partie recommencée.', 'Partita ricominciata.', 'ランをやり直しました。', '런을 다시 시작했습니다.', 'Jornada reiniciada.', '已重新开始冒险。'),
 LATE: ('Ein Durchlauf kann nur vor dem Ende seines ersten Duells neu gestartet werden.', 'La partida solo se puede reiniciar antes de que termine su primer Duelo.',
        "La partie ne peut être recommencée qu'avant la fin de son premier Duel.", 'La partita può essere ricominciata solo prima della fine del suo primo Duello.',
        'ランをやり直せるのは最初のデュエルが終わるまでです。', '런은 첫 듀얼이 끝나기 전까지만 다시 시작할 수 있습니다.',
        'A jornada só pode ser reiniciada antes do fim do seu primeiro Duelo.', '只能在第一场决斗结束前重新开始冒险。'),
}

def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, local in TERMS.items(): table.setdefault(en, local[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en, group in ((DONE, 'ui'), (LATE, 'python')):
        if en not in known: catalog.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': 'hold-R restart (2026-11-15)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__': main()
