"""Immortal Dark Magic (2026-11-19), the fused relic of the four Dark Magician relics, in all 8 languages.
Never overwrites an existing translation.

Dark Sage's new line, "(This card is always treated as a "Dark Magician" card.)", is card text, not interface text:
its 8 translations live in data/card-archetype-rules.json, and tools/i18n/build_bundles.py adds them after the card's
translated text in android/web/i18n/<lang>.json. Nothing for it here."""
import json,runpy,sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
NAME = 'Immortal Dark Magic'
TEXT = ('Spellcaster monsters you control gain 600 ATK. When you Normal Summon a Spellcaster monster: You can Special Summon 1 '
        '"Dark Magician" monster from your Deck, and add 1 card that mentions "Dark Magician" from your Deck to your hand. When a '
        '"Dark Magician" monster you control is destroyed and sent to the GY: Special Summon 1 monster that mentions "Dark Magician" '
        'from your Deck or Extra Deck, ignoring its Summoning conditions.')
TERMS = {
 NAME: ('Unsterbliche Dunkle Magie', 'Magia Oscura Inmortal', 'Magie Sombre Immortelle', 'Magia Nera Immortale',
        '不滅の黒魔術', '불멸의 흑마술', 'Magia Negra Imortal', '不灭的黑魔术'),
 TEXT: (
  'Alle Hexer-Monster, die du kontrollierst, erhalten 600 ATK. Wenn du ein Hexer-Monster als Normalbeschwörung beschwörst: '
  'Du kannst 1 „Dunkler Magier“-Monster als Spezialbeschwörung von deinem Deck beschwören und 1 Karte, die „Dunkler Magier“ '
  'nennt, von deinem Deck deiner Hand hinzufügen. Wenn ein „Dunkler Magier“-Monster, das du kontrollierst, zerstört und auf den '
  'Friedhof gelegt wird: Beschwöre 1 Monster, das „Dunkler Magier“ nennt, als Spezialbeschwörung von deinem Deck oder Extra Deck, '
  'wobei du seine Beschwörungsbedingungen ignorierst.',
  'Los monstruos Lanzador de Conjuros que controles ganan 600 ATK. Cuando Invoques de Modo Normal un monstruo Lanzador de '
  'Conjuros: puedes Invocar de Modo Especial 1 monstruo "Mago Oscuro" desde tu Deck y añadir a tu mano 1 carta de tu Deck que '
  'mencione "Mago Oscuro". Cuando un monstruo "Mago Oscuro" que controlas sea destruido y enviado al Cementerio: Invoca de Modo '
  'Especial 1 monstruo que mencione "Mago Oscuro" desde tu Deck o Deck Extra, ignorando sus condiciones de Invocación.',
  'Les monstres Magicien que vous contrôlez gagnent 600 ATK. Lorsque vous Invoquez Normalement un monstre Magicien : vous pouvez '
  'Invoquer Spécialement 1 monstre « Magicien Sombre » depuis votre Deck, et ajouter 1 carte qui mentionne « Magicien Sombre » '
  "depuis votre Deck à votre main. Lorsqu'un monstre « Magicien Sombre » que vous contrôlez est détruit et envoyé au Cimetière : "
  "Invoquez Spécialement 1 monstre qui mentionne « Magicien Sombre » depuis votre Deck ou Extra Deck, en ignorant ses conditions "
  "d'Invocation.",
  'I mostri Incantatore che controlli guadagnano 600 ATK. Quando Evochi Normalmente un mostro Incantatore: puoi Evocare '
  'Specialmente 1 mostro "Mago Nero" dal tuo Deck e aggiungere alla tua mano 1 carta dal tuo Deck che menziona "Mago Nero". '
  'Quando un mostro "Mago Nero" che controlli viene distrutto e mandato al Cimitero: Evoca Specialmente 1 mostro che menziona '
  '"Mago Nero" dal tuo Deck o Extra Deck, ignorando le sue condizioni di Evocazione.',
  '自分フィールドの魔法使い族モンスターの攻撃力は600アップする。魔法使い族モンスターを通常召喚した場合に発動できる。デッキから'
  '「ブラック・マジシャン」モンスター1体を特殊召喚し、「ブラック・マジシャン」のカード名が記されたカード1枚をデッキから手札に加える。'
  '自分フィールドの「ブラック・マジシャン」モンスターが破壊され墓地へ送られた場合に発動する。「ブラック・マジシャン」のカード名が記された'
  'モンスター1体をデッキまたはエクストラデッキから召喚条件を無視して特殊召喚する。',
  '자신 필드의 마법사족 몬스터의 공격력은 600 올린다. 마법사족 몬스터를 일반 소환했을 경우에 발동할 수 있다. 덱에서 "블랙 매지션" '
  '몬스터 1장을 특수 소환하고, "블랙 매지션"의 카드명이 쓰여진 카드 1장을 덱에서 패에 넣는다. 자신 필드의 "블랙 매지션" 몬스터가 '
  '파괴되어 묘지로 보내졌을 경우에 발동한다. "블랙 매지션"의 카드명이 쓰여진 몬스터 1장을 덱 또는 엑스트라 덱에서 소환 조건을 '
  '무시하고 특수 소환한다.',
  'Os monstros Mago que você controla ganham 600 de ATK. Quando você fizer a Invocação-Normal de um monstro Mago: você pode fazer '
  'a Invocação-Especial de 1 monstro "Mago Negro" do seu Deck e adicionar 1 card que mencione "Mago Negro" do seu Deck à sua mão. '
  'Quando um monstro "Mago Negro" que você controla for destruído e enviado para o Cemitério: faça a Invocação-Especial de 1 monstro '
  'que mencione "Mago Negro" do seu Deck ou Deck Adicional, ignorando as condições de Invocação dele.',
  '自己场上的魔法师族怪兽的攻击力上升600。魔法师族怪兽通常召唤的场合才能发动。从卡组把1只「黑魔术师」怪兽特殊召唤，'
  '从卡组把1张有「黑魔术师」的卡名记述的卡加入手卡。自己场上的「黑魔术师」怪兽被破坏送去墓地的场合发动。'
  '从卡组或额外卡组把1只有「黑魔术师」的卡名记述的怪兽无视召唤条件特殊召唤。'),
}


def main():
    sys.path.insert(0, str(ROOT))
    import content
    # The keys must be exactly the game's English texts.
    assert content.ARTIFACTS['immortal_dark_magic'][0] == NAME and content.ARTIFACTS['immortal_dark_magic'][2] == TEXT
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': 'text added 2026-11-19 (Immortal Dark Magic)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
