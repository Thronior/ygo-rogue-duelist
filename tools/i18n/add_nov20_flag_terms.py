"""Discord and flag fixes of 2026-11-20, in all 8 languages. Never overwrites an existing translation.
Magician's Bond also adds "Dark Magician" monsters (user on Discord, 2026-11-20: Dark Magician does not mention itself,
so 2 in the Deck were never listed). The wording is Deds's suggestion; the translations build on the relic's old ones."""
import json,runpy,sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
BOND = ('Once per turn, if you Normal or Special Summon a "Dark Magician" monster: You can add 1 "Dark Magician" monster or '
        'card that mentions it in its card text from your Deck to your hand.')
TERMS = {
 BOND: (
  'Einmal pro Spielzug, falls du ein „Dunkler Magier“-Monster als Normal- oder Spezialbeschwörung beschwörst: Du kannst 1 '
  '„Dunkler Magier“-Monster oder 1 Karte, die es in ihrem Kartentext nennt, von deinem Deck deiner Hand hinzufügen.',
  'Una vez por turno, si Invocas de Modo Normal o Especial un monstruo "Mago Oscuro": puedes añadir a tu mano 1 monstruo '
  '"Mago Oscuro" o 1 carta que lo mencione en su texto de carta desde tu Deck.',
  'Une fois par tour, si vous Invoquez Normalement ou Spécialement un monstre « Magicien Sombre » : vous pouvez ajouter 1 '
  'monstre « Magicien Sombre » ou 1 carte qui le mentionne dans son texte depuis votre Deck à votre main.',
  'Una volta per turno, se Evochi Normalmente o Specialmente un mostro "Mago Nero": puoi aggiungere alla tua mano 1 mostro '
  '"Mago Nero" o 1 carta che lo menziona nel suo testo dal tuo Deck.',
  '1ターンに1度、「ブラック・マジシャン」モンスターを通常召喚または特殊召喚した場合に発動できる。「ブラック・マジシャン」モンスター'
  'またはそのカード名がテキストに記されたカード1枚をデッキから手札に加える。',
  '1턴에 1번, "블랙 매지션" 몬스터를 일반 소환 또는 특수 소환했을 경우에 발동할 수 있다. "블랙 매지션" 몬스터 또는 그 카드명이 '
  '카드의 텍스트에 쓰여진 카드 1장을 덱에서 패에 넣는다.',
  'Uma vez por turno, se você fizer a Invocação-Normal ou a Invocação-Especial de um monstro "Mago Negro": você pode adicionar '
  '1 monstro "Mago Negro" ou 1 card que o mencione no texto do card do seu Deck à sua mão.',
  '1回合1次，「黑魔术师」怪兽通常召唤或特殊召唤的场合才能发动。从卡组把1只「黑魔术师」怪兽或1张卡的文本中有其卡名记述的卡加入手卡。'),
}


def main():
    sys.path.insert(0, str(ROOT))
    import content
    # The key must be exactly the game's English text.
    assert content.ARTIFACTS['magicians_bond'][2] == BOND, content.ARTIFACTS['magicians_bond'][2]
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': "Magician's Bond text, 2026-11-20"})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
