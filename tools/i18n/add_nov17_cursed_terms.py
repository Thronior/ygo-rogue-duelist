"""Cursed relics approved on Discord (2026-11-17): Mulligan's Offer and Graceful & Skull Dice, names, texts and the
two halves the cursed relic screen shows, all 8 languages. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
MUL = 'Once per Duel, at the start of your first Standby Phase: you can return any number of cards from your hand to the Deck, shuffle it, then draw that many cards.'
MUL_D = 'You cannot add cards from your Deck to your hand except by drawing them.'
DICE = 'The first time you roll a die each turn: gain LP equal to the result x100.'
DICE_D = 'Your face-up monsters lose ATK equal to the result x100 until the end of this turn.'
T = {
 "Mulligan's Offer": ('Mulligan-Angebot', 'Oferta de mulligan', 'Offre de mulligan', 'Offerta di mulligan',
  'マリガンの申し出', '멀리건의 제안', 'Oferta de Mulligan', '调度之约'),
 'Graceful & Skull Dice': ('Anmutige Würfel & Schädelwürfel', 'Dados Elegantes y Dados Calavera', 'Dés Gracieux et Dés Crâne',
  'Dadi Aggraziati e Dadi Teschio', 'グレイスフル・ダイス＆スカル・ダイス', '그레이스풀 다이스 & 스컬 다이스', 'Dados Graciosos e Dados Caveira', '天使的骰子与恶魔的骰子'),
 MUL: ('Einmal pro Duell, zu Beginn deiner ersten Standby Phase: Du kannst beliebig viele Karten aus deiner Hand ins Deck zurücklegen, es mischen und dann genauso viele Karten ziehen.',
  'Una vez por Duelo, al comienzo de tu primera Standby Phase: puedes devolver cualquier número de cartas de tu mano al Deck, barajarlo y robar esa misma cantidad de cartas.',
  "Une fois par Duel, au début de votre première Standby Phase : vous pouvez remettre n'importe quel nombre de cartes de votre main dans le Deck, le mélanger, puis piocher autant de cartes.",
  'Una volta per Duello, all\'inizio della tua prima Standby Phase: puoi rimettere nel Deck un qualsiasi numero di carte dalla tua mano, mescolarlo e poi pescare lo stesso numero di carte.',
  'デュエル中1度、自分の最初のスタンバイフェイズ開始時：手札を任意の枚数デッキに戻してシャッフルし、その後戻した枚数分ドローできる。',
  '듀얼 중 1번, 자신의 첫 스탠바이 페이즈 시작 시: 패를 원하는 수만큼 덱으로 되돌리고 셔플한 뒤, 되돌린 수만큼 드로우할 수 있다.',
  'Uma vez por Duelo, no início da sua primeira Standby Phase: você pode devolver qualquer número de cards da sua mão ao Deck, embaralhá-lo e depois comprar a mesma quantidade de cards.',
  '决斗中1次，自己的第一个准备阶段开始时：可以把任意数量的手卡回到卡组洗切，之后抽出回去的数量。'),
 MUL_D: ('Du kannst keine Karten von deinem Deck zu deiner Hand hinzufügen, außer durch Ziehen.',
  'No puedes añadir cartas de tu Deck a tu mano, excepto robándolas.',
  "Vous ne pouvez pas ajouter de cartes de votre Deck à votre main, sauf en les piochant.",
  'Non puoi aggiungere carte dal tuo Deck alla tua mano, se non pescandole.',
  '自分はドロー以外の方法でデッキからカードを手札に加えられない。',
  '자신은 드로우 이외의 방법으로 덱에서 카드를 패에 넣을 수 없다.',
  'Você não pode adicionar cards do seu Deck à sua mão, exceto comprando-os.',
  '自己不能用抽卡以外的方法从卡组把卡加入手卡。'),
 DICE: ('Wenn du in einem Spielzug zum ersten Mal würfelst: Du erhältst LP in Höhe des Ergebnisses x100.',
  'La primera vez que tires un dado cada turno: ganas LP equivalentes al resultado x100.',
  'La première fois que vous lancez un dé à chaque tour : gagnez des LP égaux au résultat x100.',
  'La prima volta che lanci un dado in ogni turno: guadagni LP pari al risultato x100.',
  '各ターン、自分が最初にサイコロを振った時：その結果x100LP回復する。',
  '각 턴에 자신이 처음 주사위를 굴렸을 때: 그 결과 x100만큼 LP를 회복한다.',
  'A primeira vez que você rolar um dado a cada turno: ganhe LP igual ao resultado x100.',
  '每回合自己第一次掷骰子时：回复结果x100的基本分。'),
 DICE_D: ('Deine offenen Monster verlieren bis zum Ende dieses Spielzugs ATK in Höhe des Ergebnisses x100.',
  'Tus monstruos boca arriba pierden ATK equivalente al resultado x100 hasta el final de este turno.',
  "Vos monstres face recto perdent un montant d'ATK égal au résultat x100 jusqu'à la fin de ce tour.",
  'I tuoi mostri scoperti perdono ATK pari al risultato x100 fino alla fine di questo turno.',
  '自分フィールドの表側表示モンスターの攻撃力は、このターン終了時までその結果x100ダウンする。',
  '자신 필드의 앞면 표시 몬스터의 공격력은 이 턴 종료시까지 그 결과 x100만큼 내려간다.',
  'Seus monstros com a face para cima perdem ATK igual ao resultado x100 até o final deste turno.',
  '自己场上的表侧表示怪兽的攻击力直到这个回合结束时下降结果x100。'),
}
T[MUL + ' ' + MUL_D] = tuple(a + ' ' + b if lang not in ('ja', 'zh') else a + b for lang, a, b in zip(LANGS, T[MUL], T[MUL_D]))
T[DICE + ' ' + DICE_D] = tuple(a + ' ' + b if lang not in ('ja', 'zh') else a + b for lang, a, b in zip(LANGS, T[DICE], T[DICE_D]))


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in T.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in T:
        if en not in known: catalog.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': 'Cursed relics approved on Discord (2026-11-17)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(T))


if __name__ == '__main__':
    main()
