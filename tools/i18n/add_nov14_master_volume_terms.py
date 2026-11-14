"""Master Volume slider in Settings › Sound (user, 2026-11-14). 8 languages."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Master Volume': {'de': 'Gesamtlautstärke', 'es': 'Volumen general', 'fr': 'Volume général', 'it': 'Volume generale',
                   'ja': 'マスター音量', 'ko': '마스터 볼륨', 'pt': 'Volume geral', 'zh': '主音量'},
 'All game sound. The sliders below balance each kind of sound.': {
  'de': 'Der gesamte Spielton. Die Regler darunter gleichen die einzelnen Tonarten aus.',
  'es': 'Todo el sonido del juego. Los controles de abajo equilibran cada tipo de sonido.',
  'fr': 'Tout le son du jeu. Les curseurs ci-dessous équilibrent chaque type de son.',
  'it': 'Tutto l’audio del gioco. I cursori qui sotto bilanciano ogni tipo di suono.',
  'ja': 'ゲーム全体の音量です。下のスライダーで各サウンドのバランスを調整します。',
  'ko': '게임 전체 소리입니다. 아래 슬라이더로 소리 종류별 균형을 맞춥니다.',
  'pt': 'Todo o som do jogo. Os controles abaixo equilibram cada tipo de som.',
  'zh': '游戏的全部声音。下方的滑块用于调整各类声音的平衡。'},
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
