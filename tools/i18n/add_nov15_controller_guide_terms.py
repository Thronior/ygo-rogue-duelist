"""Settings toggle for the controller button guide (Discord, 2026-11-15: it covered card text in duels), all 8
languages. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TITLE = 'Controller Button Guide'
DESC = 'Show which controller button does what in the bottom-left corner while you play with a controller.'
TERMS = {
 TITLE: ('Controller-Tastenhilfe', 'Guía de botones del mando', 'Guide des boutons de la manette', 'Guida ai tasti del controller',
         'コントローラーのボタンガイド', '컨트롤러 버튼 안내', 'Guia de botões do controle', '手柄按键说明'),
 DESC: ('Zeigt unten links, was jede Controller-Taste macht, während du mit einem Controller spielst.',
        'Muestra abajo a la izquierda qué hace cada botón del mando mientras juegas con un mando.',
        'Affiche en bas à gauche ce que fait chaque bouton de la manette quand vous jouez avec une manette.',
        'Mostra in basso a sinistra cosa fa ogni tasto del controller mentre giochi con un controller.',
        'コントローラーで遊んでいる間、左下に各ボタンの役割を表示します。',
        '컨트롤러로 플레이하는 동안 왼쪽 아래에 각 버튼의 기능을 표시합니다.',
        'Mostra no canto inferior esquerdo o que cada botão do controle faz enquanto você joga com um controle.',
        '使用手柄游玩时，在左下角显示每个按键的作用。'),
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
    for en in TERMS:
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'mobile.js gameplay settings (2026-11-15)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__': main()
