"""Sphinx relics (user, 2026-11-23): Pyramid of Lightning, Bond of Egypt, Shadow of Anubis and their fused relic Chimera
Sphinx, name and rules text in all 8 languages. Card names are each language's official ones (data/i18n/cards: Pyramid of Light
53569894, Andro Sphinx 15013468, Sphinx Teleia 51402177); the "Sphinx" archetype follows Exxod's official text. Never
overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
PYRAMID = {
 'en': 'At the start of each Duel, place 1 "Pyramid of Light" face-up in your Spell & Trap Zone.',
 'de': 'Lege zu Beginn jedes Duells 1 „Lichtpyramide“ offen in deine Zauber- & Fallenzone.',
 'es': 'Al inicio de cada Duelo, coloca boca arriba en tu Zona de Mágicas y Trampas 1 "Pirámide de Luz".',
 'fr': 'Au début de chaque Duel, placez face recto 1 « Pyramide de Lumière » dans votre Zone Magie & Piège.',
 'it': 'All\'inizio di ogni Duello, posiziona scoperta 1 "Piramide di Luce" nella tua Zona Magie & Trappole.',
 'ja': 'デュエル開始時、「光のピラミッド」1枚を自分の魔法＆罠ゾーンに表側表示で置く。',
 'ko': '듀얼 개시시, "빛의 피라미드" 1장을 자신의 마법 & 함정 존에 앞면 표시로 놓는다.',
 'pt': 'No início de cada Duelo, coloque 1 "Pirâmide de Luz" em sua Zona de Magias & Armadilhas em posição de face para cima.',
 'zh': '每场决斗开始时，把1张「光之金字塔」表侧表示放置在自己的魔法与陷阱区域。',
}
CHIMERA_REST = {
 'en': ' "Pyramid of Light" you control cannot be destroyed by card effects. If you Normal or Tribute Summon a "Sphinx" monster: Special Summon 1 "Sphinx" monster, or 1 monster that mentions "Sphinx" in its text, from your Deck, ignoring its Summoning conditions. "Sphinx" monsters in your hand become Level 4.',
 'de': ' „Lichtpyramide“, die du kontrollierst, kann nicht durch Karteneffekte zerstört werden. Falls du ein „Sphinx“-Monster als Normal- oder Tributbeschwörung beschwörst: Beschwöre 1 „Sphinx“-Monster oder 1 Monster, dessen Text „Sphinx“ nennt, als Spezialbeschwörung aus deinem Deck, wobei du seine Beschwörungsbedingungen ignorierst. „Sphinx“-Monster in deiner Hand werden zu Stufe 4.',
 'es': ' La "Pirámide de Luz" que controlas no puede ser destruida por efectos de cartas. Si Invocas de Modo Normal o por Sacrificio un monstruo "Esfinge": Invoca de Modo Especial desde tu Deck 1 monstruo "Esfinge", o 1 monstruo que mencione "Esfinge" en su texto, ignorando sus condiciones de Invocación. Los monstruos "Esfinge" en tu mano se vuelven de Nivel 4.',
 'fr': ' La « Pyramide de Lumière » que vous contrôlez ne peut pas être détruite par des effets de carte. Si vous Invoquez Normalement ou par Sacrifice un monstre « Sphinx » : Invoquez Spécialement 1 monstre « Sphinx », ou 1 monstre qui mentionne « Sphinx » dans son texte, depuis votre Deck, en ignorant ses conditions d\'Invocation. Les monstres « Sphinx » dans votre main deviennent Niveau 4.',
 'it': ' La "Piramide di Luce" che controlli non può essere distrutta dagli effetti delle carte. Se Evochi Normalmente o tramite Tributo un mostro "Sfinge": Evoca Specialmente dal tuo Deck 1 mostro "Sfinge", o 1 mostro che menziona "Sfinge" nel suo testo, ignorando le sue condizioni di Evocazione. I mostri "Sfinge" nella tua mano diventano di Livello 4.',
 'ja': '自分フィールドの「光のピラミッド」はカードの効果では破壊されない。「スフィンクス」モンスターを通常召喚またはアドバンス召喚した場合に発動する。「スフィンクス」モンスター1体、またはテキストに「スフィンクス」が記されたモンスター1体を、召喚条件を無視してデッキから特殊召喚する。自分の手札の「スフィンクス」モンスターのレベルは4になる。',
 'ko': ' 자신 필드의 "빛의 피라미드"는 카드의 효과로는 파괴되지 않는다. "스핑크스" 몬스터를 일반 소환 또는 어드밴스 소환했을 경우에 발동한다. "스핑크스" 몬스터 1장, 또는 텍스트에 "스핑크스"가 쓰여진 몬스터 1장을 소환 조건을 무시하고 덱에서 특수 소환한다. 자신의 패의 "스핑크스" 몬스터의 레벨은 4가 된다.',
 'pt': ' A "Pirâmide de Luz" que você controla não pode ser destruída por efeitos de card. Se você fizer a Invocação-Normal ou a Invocação-Tributo de um monstro "Esfinge": Invoque por Invocação-Especial 1 monstro "Esfinge", ou 1 monstro que mencione "Esfinge" em seu texto, do seu Deck, ignorando suas condições de Invocação. Os monstros "Esfinge" na sua mão se tornam Nível 4.',
 'zh': '自己场上的「光之金字塔」不会被卡的效果破坏。「斯芬克斯」怪兽通常召唤或上级召唤的场合发动。从卡组把1只「斯芬克斯」怪兽，或者1只文字中记述「斯芬克斯」的怪兽无视召唤条件特殊召唤。自己手卡的「斯芬克斯」怪兽等级变成4。',
}
TERMS = {
 'Pyramid of Lightning': ('Blitzpyramide', 'Pirámide del Relámpago', 'Pyramide de la Foudre', 'Piramide del Fulmine', '雷光のピラミッド', '번개의 피라미드', 'Pirâmide do Relâmpago', '雷光金字塔'),
 PYRAMID['en']: tuple(PYRAMID[l] for l in LANGS),
 'Bond of Egypt': ('Band Ägyptens', 'Vínculo de Egipto', "Lien d'Égypte", "Legame d'Egitto", 'エジプトの絆', '이집트의 유대', 'Laço do Egito', '埃及之绊'),
 'If you Normal or Tribute Summon a "Sphinx" monster: Add 1 "Sphinx" card, or 1 card that mentions "Sphinx" in its text, from your Deck to your hand.': (
  'Falls du ein „Sphinx“-Monster als Normal- oder Tributbeschwörung beschwörst: Füge 1 „Sphinx“-Karte oder 1 Karte, deren Text „Sphinx“ nennt, von deinem Deck deiner Hand hinzu.',
  'Si Invocas de Modo Normal o por Sacrificio un monstruo "Esfinge": añade a tu mano 1 carta "Esfinge", o 1 carta que mencione "Esfinge" en su texto, desde tu Deck.',
  'Si vous Invoquez Normalement ou par Sacrifice un monstre « Sphinx » : ajoutez 1 carte « Sphinx », ou 1 carte qui mentionne « Sphinx » dans son texte, depuis votre Deck à votre main.',
  'Se Evochi Normalmente o tramite Tributo un mostro "Sfinge": aggiungi alla tua mano 1 carta "Sfinge", o 1 carta che menziona "Sfinge" nel suo testo, dal tuo Deck.',
  '「スフィンクス」モンスターを通常召喚またはアドバンス召喚した場合に発動する。「スフィンクス」カード1枚、またはテキストに「スフィンクス」が記されたカード1枚をデッキから手札に加える。',
  '"스핑크스" 몬스터를 일반 소환 또는 어드밴스 소환했을 경우에 발동한다. "스핑크스" 카드 1장, 또는 텍스트에 "스핑크스"가 쓰여진 카드 1장을 덱에서 패에 넣는다.',
  'Se você fizer a Invocação-Normal ou a Invocação-Tributo de um monstro "Esfinge": adicione 1 card "Esfinge", ou 1 card que mencione "Esfinge" em seu texto, do seu Deck à sua mão.',
  '「斯芬克斯」怪兽通常召唤或上级召唤的场合发动。从卡组把1张「斯芬克斯」卡，或者1张文字中记述「斯芬克斯」的卡加入手卡。'),
 'Shadow of Anubis': ('Schatten des Anubis', 'Sombra de Anubis', "Ombre d'Anubis", 'Ombra di Anubi', 'アヌビスの影', '아누비스의 그림자', 'Sombra de Anúbis', '阿努比斯之影'),
 'While you control "Andro Sphinx" or "Sphinx Teleia", "Sphinx" monsters in your hand become Level 4.': (
  'Solange du „Androsphinx“ oder „Teleia die Sphinx“ kontrollierst, werden „Sphinx“-Monster in deiner Hand zu Stufe 4.',
  'Mientras controles "Andro Esfinge" o "Esfinge Teleia", los monstruos "Esfinge" en tu mano se vuelven de Nivel 4.',
  'Tant que vous contrôlez « Andro Sphinx » ou « Sphinx Teleia », les monstres « Sphinx » dans votre main deviennent Niveau 4.',
  'Finché controlli "Andro-Sfinge" o "Sfinge Teleia", i mostri "Sfinge" nella tua mano diventano di Livello 4.',
  '自分フィールドに「アンドロ・スフィンクス」または「スフィンクス・テーレイア」が存在する限り、自分の手札の「スフィンクス」モンスターのレベルは4になる。',
  '자신 필드에 "안드로 스핑크스" 또는 "스핑크스 테레이아"가 존재하는 한, 자신의 패의 "스핑크스" 몬스터의 레벨은 4가 된다.',
  'Enquanto você controlar "Androesfinge" ou "Esfinge Teleia", os monstros "Esfinge" na sua mão se tornam Nível 4.',
  '只要自己场上有「斯芬克斯·安德鲁」或「斯芬克斯·迪蕾雅」存在，自己手卡的「斯芬克斯」怪兽等级变成4。'),
 'Chimera Sphinx': ('Chimären-Sphinx', 'Esfinge Quimera', 'Sphinx Chimère', 'Sfinge Chimera', 'キメラ・スフィンクス', '키메라 스핑크스', 'Esfinge Quimera', '奇美拉斯芬克斯'),
 PYRAMID['en'] + CHIMERA_REST['en']: tuple(PYRAMID[l] + CHIMERA_REST[l] for l in LANGS),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
