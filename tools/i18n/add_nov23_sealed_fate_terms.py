"""Sealed Fate relic (user, 2026-11-23, Destiny Board support): name and rules text in all 8 languages, with each language's
official "Destiny Board" and "Spirit Message" names (data/i18n/cards 94212438, 31893528). Never overwrites a translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Sealed Fate': ('Besiegeltes Schicksal', 'Destino sellado', 'Destin scellé', 'Destino segnato', '封じられた運命', '봉인된 운명', 'Destino selado', '命运封印'),
 '"Destiny Board" and "Spirit Message" cards you control cannot be targeted by card effects.': (
  '„Schicksalstafel“ und „Geisternachricht“-Karten, die du kontrollierst, können nicht als Ziel für Karteneffekte gewählt werden.',
  'Las cartas "Tablero del Destino" y "Mensaje Espiritual" que controlas no pueden ser seleccionadas como objetivo por efectos de cartas.',
  'Les cartes « Tableau de la Destinée » et « Message Spirituel » que vous contrôlez ne peuvent pas être ciblées par des effets de carte.',
  'Le carte "Tavola del Destino" e "Messaggio dello Spirito" che controlli non possono essere scelte come bersaglio dagli effetti delle carte.',
  '自分フィールドの「ウィジャ盤」と「死のメッセージ」カードは、カードの効果の対象にならない。',
  '자신 필드의 "위저 보드"와 "죽음의 메시지" 카드는 카드의 효과의 대상이 되지 않는다.',
  'Os cards "Tábua do Destino" e "Mensagem do Espírito" que você controla não podem ser alvo de efeitos de card.',
  '自己场上的「通灵盘」和「死之信息」卡不会成为卡的效果的对象。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
