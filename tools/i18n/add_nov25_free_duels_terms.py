"""Sandbox renamed "Free Duels" in the main menu and every screen of the mode (user, 2026-11-25). All 8 languages.
Never overwrites an existing translation; the old "Sandbox" keys stay harmlessly unused."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
SAVED = ('Nichts wurde gespeichert.', 'No se guardó nada.', "Rien n'a été sauvegardé.", 'Non è stato salvato nulla.', '何も保存されていません。', '아무것도 저장되지 않았습니다.', 'Nada foi salvo.', '没有保存任何内容。')
DUEL = ('Freies Duell', 'Duelo libre', 'Duel libre', 'Duello libero', 'フリーデュエル', '프리 듀얼', 'Duelo livre', '自由决斗')
TERMS = {
 'Free Duels': ('Freie Duelle', 'Duelos libres', 'Duels libres', 'Duelli liberi', 'フリーデュエル', '프리 듀얼', 'Duelos livres', '自由决斗'),
 'Free Duel': DUEL,
 'Leave Free Duels': ('Freie Duelle verlassen', 'Salir de Duelos libres', 'Quitter les Duels libres', 'Esci dai Duelli liberi', 'フリーデュエルを終了', '프리 듀얼 나가기', 'Sair dos Duelos livres', '离开自由决斗'),
 'Free Duel · Nothing was saved.': tuple(f'{a} · {b}' for a,b in zip(DUEL,SAVED)),
 'Free Duel could not start: {0}': ('Freies Duell konnte nicht starten: {0}', 'No se pudo iniciar el duelo libre: {0}', "Le duel libre n'a pas pu démarrer : {0}", 'Impossibile avviare il duello libero: {0}', 'フリーデュエルを開始できませんでした：{0}', '프리 듀얼을 시작할 수 없습니다: {0}', 'Não foi possível iniciar o duelo livre: {0}', '无法开始自由决斗：{0}'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
