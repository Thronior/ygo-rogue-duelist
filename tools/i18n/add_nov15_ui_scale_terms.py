"""Settings -> UI Scale (android/web/display-options.js + mobile.js, user 2026-11-15), all 8 languages. Never overwrites an
existing translation, so running it again changes nothing."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
DESC = 'Size of the whole game, for large or high-resolution screens. Auto enlarges it on very wide windows.'
# de, es, fr, it, ja, ko, pt, zh
TERMS = {
 'UI Scale': ('UI-Größe', 'Escala de la interfaz', "Échelle de l'interface", "Scala dell'interfaccia", 'UIスケール', 'UI 크기', 'Escala da interface', '界面缩放'),
 DESC: ('Größe des ganzen Spiels, für große oder hochauflösende Bildschirme. „Auto“ vergrößert es in sehr breiten Fenstern.',
  'Tamaño de todo el juego, para pantallas grandes o de alta resolución. Auto lo agranda en ventanas muy anchas.',
  "Taille de tout le jeu, pour les grands écrans ou les écrans haute résolution. Auto l'agrandit dans les fenêtres très larges.",
  "Dimensione dell'intero gioco, per schermi grandi o ad alta risoluzione. Auto lo ingrandisce nelle finestre molto larghe.",
  'ゲーム全体の大きさです。大きな画面や高解像度の画面向け。オートでは横に非常に広いウィンドウで拡大します。',
  '게임 전체의 크기입니다. 큰 화면이나 고해상도 화면용입니다. 자동은 아주 넓은 창에서 크게 표시합니다.',
  'Tamanho do jogo inteiro, para telas grandes ou de alta resolução. Auto o aumenta em janelas muito largas.',
  '整个游戏的大小，适用于大屏幕或高分辨率屏幕。“自动”会在非常宽的窗口中放大。'),
 'Auto ({0}%)': ('Auto ({0} %)', 'Auto ({0} %)', 'Auto ({0} %)', 'Auto ({0}%)', 'オート（{0}%）', '자동 ({0}%)', 'Auto ({0}%)', '自动（{0}%）'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'mobile.js UI Scale setting (2026-11-15)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))

if __name__ == '__main__':
    main()
