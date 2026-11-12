"""Adds the card sleeve texts of 2026-11-12 (Settings › Display picker, run end unlock) to every language.
Existing translations are never overwritten. Run once; re-running changes nothing."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    'Card Sleeve': ('Kartenhülle', 'Funda de cartas', 'Protège-cartes', 'Bustina protettiva', 'Protetor de cards', 'スリーブ', '카드 슬리브', '卡套'),
    'Card sleeve unlocked': ('Kartenhülle freigeschaltet', 'Funda de cartas desbloqueada', 'Protège-cartes débloqué', 'Bustina protettiva sbloccata', 'Protetor de cards desbloqueado', 'スリーブを解放', '카드 슬리브 해금', '卡套已解锁'),
    'Shown on your face-down cards and your Deck. Win a run on Challenge Level 6 with a duelist to unlock their sleeve.': (
        'Auf deinen verdeckten Karten und deinem Deck zu sehen. Gewinne einen Durchlauf auf Schwierigkeitsgrad 6 mit einem Duellanten, um seine Kartenhülle freizuschalten.',
        'Se ve en tus cartas boca abajo y en tu Deck. Gana una partida en el Nivel de desafío 6 con un duelista para desbloquear su funda.',
        'Visible sur vos cartes face verso et votre Deck. Gagnez une partie au Niveau de défi 6 avec un duelliste pour débloquer son protège-cartes.',
        'Visibile sulle tue carte coperte e sul tuo Deck. Vinci una partita al Livello di sfida 6 con un duellante per sbloccare la sua bustina.',
        'Aparece nos seus cards com a face para baixo e no seu Deck. Vença uma Jornada no Nível de Desafio 6 com um duelista para desbloquear o protetor dele.',
        '自分の裏側表示のカードとデッキに表示されます。チャレンジレベル6でランをクリアすると、そのデュエリストのスリーブが解放されます。',
        '자신의 뒷면 카드와 덱에 표시됩니다. 도전 레벨 6에서 런을 완료하면 그 듀얼리스트의 슬리브가 해금됩니다.',
        '显示在你里侧表示的卡和卡组上。用一名决斗者在挑战等级6完成冒险即可解锁其卡套。'),
    'Win a run on Challenge Level 6 with {0} to unlock this sleeve.': (
        'Gewinne einen Durchlauf auf Schwierigkeitsgrad 6 mit {0}, um diese Kartenhülle freizuschalten.',
        'Gana una partida en el Nivel de desafío 6 con {0} para desbloquear esta funda.',
        'Gagnez une partie au Niveau de défi 6 avec {0} pour débloquer ce protège-cartes.',
        'Vinci una partita al Livello di sfida 6 con {0} per sbloccare questa bustina.',
        'Vença uma Jornada no Nível de Desafio 6 com {0} para desbloquear este protetor.',
        '{0}でチャレンジレベル6のランをクリアすると、このスリーブが解放されます。',
        '{0}(으)로 도전 레벨 6 런을 완료하면 이 슬리브가 해금됩니다.',
        '用{0}在挑战等级6完成冒险即可解锁此卡套。'),
    'Choose it in Settings › Display.': (
        'Wähle sie unter Einstellungen › Anzeige.', 'Elígela en Ajustes › Pantalla.', 'Choisissez-le dans Paramètres › Affichage.',
        'Sceglila in Impostazioni › Schermo.', 'Escolha em Configurações › Tela.', '設定 › 表示 で選べます。', '설정 › 화면에서 고를 수 있습니다.', '可在 设置 › 显示 中选择。'),
}
for n, lang in enumerate(LANGS):
    path = ROOT / 'data/i18n/ui' / f'{lang}.json'
    data = json.loads(path.read_text(encoding='utf8'))
    added = 0
    for key, values in TERMS.items():
        if key not in data:
            data[key] = values[n]; added += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print(lang, added)
