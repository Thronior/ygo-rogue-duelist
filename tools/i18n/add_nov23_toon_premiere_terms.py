"""Toon Premiere relic and its fused relic Toon Kingdom (user, 2026-11-23): name and rules text in all 8 languages, with each language's official
"Toon World" name (data/i18n/cards 15259703). Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Toon Kingdom': ('Toon-Königreich', 'Reino Toon', 'Royaume Toon', 'Regno Toon', 'トゥーン・キングダム', '툰 킹덤', 'Reino Toon', '卡通王国'),
 'At the start of each Duel, place 1 "Toon World" from your Deck face-up in your Spell & Trap Zone. "Toon World" you control cannot be destroyed by card effects. Toon monsters you control gain 500 ATK and can attack the turn they are Summoned.': (
  'Lege zu Beginn jedes Duells 1 „Toon-Welt“ offen von deinem Deck in deine Zauber- & Fallenzone. „Toon-Welt“, die du kontrollierst, kann nicht durch Karteneffekte zerstört werden. Toon-Monster, die du kontrollierst, erhalten 500 ATK und können in dem Spielzug angreifen, in dem sie beschworen werden.',
  'Al inicio de cada Duelo, coloca boca arriba en tu Zona de Mágicas y Trampas 1 "Mundo Toon" de tu Deck. El "Mundo Toon" que controlas no puede ser destruido por efectos de cartas. Los monstruos Toon que controlas ganan 500 ATK y pueden atacar en el turno en que son Invocados.',
  'Au début de chaque Duel, placez face recto 1 « Monde des Toons » depuis votre Deck dans votre Zone Magie & Piège. Le « Monde des Toons » que vous contrôlez ne peut pas être détruit par des effets de carte. Les monstres Toon que vous contrôlez gagnent 500 ATK et peuvent attaquer durant le tour où ils sont Invoqués.',
  "All'inizio di ogni Duello, posiziona scoperta 1 \"Mondo Toon\" dal tuo Deck nella tua Zona Magie & Trappole. Il \"Mondo Toon\" che controlli non può essere distrutto dagli effetti delle carte. I mostri Toon che controlli guadagnano 500 ATK e possono attaccare nel turno in cui vengono Evocati.",
  'デュエル開始時、自分のデッキから「トゥーン・ワールド」1枚を自分の魔法＆罠ゾーンに表側表示で置く。自分フィールドの「トゥーン・ワールド」はカードの効果では破壊されない。自分フィールドのトゥーンモンスターの攻撃力は500アップし、召喚されたターンでも攻撃できる。',
  '듀얼 개시시, 자신의 덱에서 "툰 월드" 1장을 자신의 마법 & 함정 존에 앞면 표시로 놓는다. 자신 필드의 "툰 월드"는 카드의 효과로는 파괴되지 않는다. 자신 필드의 툰 몬스터는 공격력이 500 올라가며, 소환된 턴에도 공격할 수 있다.',
  'No início de cada Duelo, coloque 1 "Mundo Toon" do seu Deck em sua Zona de Magias & Armadilhas em posição de face para cima. O "Mundo Toon" que você controla não pode ser destruído por efeitos de card. Os monstros Toon que você controla ganham 500 de ATK e podem atacar no turno em que são Invocados.',
  '每场决斗开始时，从自己卡组把1张「卡通世界」表侧表示放置在自己的魔法与陷阱区域。自己场上的「卡通世界」不会被卡的效果破坏。自己场上的卡通怪兽攻击力上升500，召唤的回合也能攻击。'),
 'Toon Premiere': ('Toon-Premiere', 'Estreno Toon', 'Première Toon', 'Prima Toon', 'トゥーン・プレミア', '툰 프리미어', 'Estreia Toon', '卡通首映'),
 'At the start of each Duel, place 1 "Toon World" from your Deck face-up in your Spell & Trap Zone.': (
  'Lege zu Beginn jedes Duells 1 „Toon-Welt“ offen von deinem Deck in deine Zauber- & Fallenzone.',
  'Al inicio de cada Duelo, coloca boca arriba en tu Zona de Mágicas y Trampas 1 "Mundo Toon" de tu Deck.',
  'Au début de chaque Duel, placez face recto 1 « Monde des Toons » depuis votre Deck dans votre Zone Magie & Piège.',
  'All\'inizio di ogni Duello, posiziona scoperta 1 "Mondo Toon" dal tuo Deck nella tua Zona Magie & Trappole.',
  'デュエル開始時、自分のデッキから「トゥーン・ワールド」1枚を自分の魔法＆罠ゾーンに表側表示で置く。',
  '듀얼 개시시, 자신의 덱에서 "툰 월드" 1장을 자신의 마법 & 함정 존에 앞면 표시로 놓는다.',
  'No início de cada Duelo, coloque 1 "Mundo Toon" do seu Deck em sua Zona de Magias & Armadilhas em posição de face para cima.',
  '每场决斗开始时，从自己卡组把1张「卡通世界」表侧表示放置在自己的魔法与陷阱区域。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
