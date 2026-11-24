"""Destiny Board relics (user, 2026-11-24): Destiny Hourglass now offers missing pieces first (its old text keeps its
translations; the new one adds a sentence), and the fused Final Message (Destiny Hourglass + Sealed Fate). Name and text
in all 8 languages, plus the catalog rows. Never overwrites an existing translation."""
import json, re, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
OLD_HOURGLASS = ('Every shop and reroll offers one additional random card from this pool: Destiny Board, Spirit Messages, or Final '
                 'Countdown. When acquired, add 1 random card from this pool to your card pool.')
MISSING = '"Destiny Board" and "Spirit Message" cards your card pool is missing come first.'
HOURGLASS = OLD_HOURGLASS + ' ' + MISSING
NAME = 'Final Message'
TEXT = ('At the start of each Duel, place 1 "Destiny Board" from your Deck face-up in your Spell & Trap Zone. "Destiny Board" '
        'and "Spirit Message" cards you control cannot be targeted or destroyed by card effects.')
TERMS = {
 MISSING: (
  '„Schicksalstafel“- und „Geisternachricht“-Karten, die deinem Kartenvorrat noch fehlen, kommen zuerst.',
  'Las cartas "Tablero del Destino" y "Mensaje Espiritual" que le falten a tu reserva de cartas salen primero.',
  'Les cartes « Tableau de la Destinée » et « Message Spirituel » absentes de votre réserve de cartes viennent en premier.',
  'Le carte "Tavola del Destino" e "Messaggio dello Spirito" che mancano alla tua riserva di carte vengono offerte per prime.',
  '自分のカードプールにない「ウィジャ盤」と「死のメッセージ」カードが優先される。',
  '자신의 카드 풀에 없는 "위저 보드"와 "죽음의 메시지" 카드가 우선된다.',
  'Os cards "Tábua do Destino" e "Mensagem do Espírito" que faltam na sua reserva de cards vêm primeiro.',
  '自己的卡池中缺少的「通灵盘」和「死之信息」卡优先出现。'),
 NAME: ('Letzte Nachricht', 'Mensaje Final', 'Message Final', 'Messaggio Finale', 'ファイナル・メッセージ', '파이널 메시지', 'Mensagem Final', '最终信息'),
 TEXT: (
  'Lege zu Beginn jedes Duells 1 „Schicksalstafel“ offen von deinem Deck in deine Zauber- & Fallenzone. „Schicksalstafel“- und „Geisternachricht“-Karten, die du kontrollierst, können nicht als Ziel für Karteneffekte gewählt und nicht durch Karteneffekte zerstört werden.',
  'Al inicio de cada Duelo, coloca boca arriba en tu Zona de Mágicas y Trampas 1 "Tablero del Destino" de tu Deck. Las cartas "Tablero del Destino" y "Mensaje Espiritual" que controlas no pueden ser seleccionadas como objetivo ni destruidas por efectos de cartas.',
  'Au début de chaque Duel, placez face recto 1 « Tableau de la Destinée » depuis votre Deck dans votre Zone Magie & Piège. Les cartes « Tableau de la Destinée » et « Message Spirituel » que vous contrôlez ne peuvent pas être ciblées ni détruites par des effets de carte.',
  'All\'inizio di ogni Duello, posiziona scoperta 1 "Tavola del Destino" dal tuo Deck nella tua Zona Magie & Trappole. Le carte "Tavola del Destino" e "Messaggio dello Spirito" che controlli non possono essere scelte come bersaglio né distrutte dagli effetti delle carte.',
  'デュエル開始時、自分のデッキから「ウィジャ盤」1枚を自分の魔法＆罠ゾーンに表側表示で置く。自分フィールドの「ウィジャ盤」と「死のメッセージ」カードは、カードの効果の対象にならず、カードの効果では破壊されない。',
  '듀얼 개시시, 자신의 덱에서 "위저 보드" 1장을 자신의 마법 & 함정 존에 앞면 표시로 놓는다. 자신 필드의 "위저 보드"와 "죽음의 메시지" 카드는 카드의 효과의 대상이 되지 않으며, 카드의 효과로는 파괴되지 않는다.',
  'No início de cada Duelo, coloque 1 "Tábua do Destino" do seu Deck em sua Zona de Magias & Armadilhas em posição de face para cima. Os cards "Tábua do Destino" e "Mensagem do Espírito" que você controla não podem ser alvo nem destruídos por efeitos de card.',
  '每场决斗开始时，从自己卡组把1张「通灵盘」表侧表示放置在自己的魔法与陷阱区域。自己场上的「通灵盘」和「死之信息」卡不会成为卡的效果的对象，不会被卡的效果破坏。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        old = table.get(OLD_HOURGLASS)
        assert old, lang
        sep = '' if lang in ('ja', 'zh') else ' '
        table.setdefault(HOURGLASS, old + sep + table[MISSING])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(path.read_text(encoding='utf-8-sig'))
    have = {(r['group'], r['en']) for r in rows}
    for en, ctx in ((HOURGLASS, 'relic effect (destiny_hourglass)'), (NAME, 'relic name (final_message)'), (TEXT, 'relic effect (final_message)')):
        en = re.sub(r'\s+', ' ', en).strip()
        if ('relic', en) not in have:
            rows.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': ctx})
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
