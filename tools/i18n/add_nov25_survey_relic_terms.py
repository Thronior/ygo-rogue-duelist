"""10K survey relics the user picked (2026-11-25): Sanctuary Hymn, Parasite Infestation and the shadow relic Scorching
Strikes. Name and text in all 8 languages, plus the catalog rows. Card names follow data/i18n/cards/<lang>.json.
Never overwrites an existing translation."""
import json, re, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']

HYMN = 'Sanctuary Hymn'
HYMN_TEXT = ('While "The Sanctuary in the Sky" is face-up on the field, each time you gain LP by the effect of a Fairy monster, '
             'inflict damage to your opponent equal to the LP you gained.')
PARASITE = 'Parasite Infestation'
PARASITE_TEXT = 'At the start of each Duel, shuffle 1 "Parasite Paracide" from outside the Duel into your opponent\'s Deck face-up.'
STRIKES = 'Scorching Strikes'
STRIKES_TEXT = 'Battle damage your opponent would take is inflicted as effect damage instead. Halve that damage (rounded down).'
TERMS = {
 HYMN: ('Hymne der Zuflucht', 'Himno del Santuario', 'Hymne du Sanctuaire', 'Inno del Santuario', '聖域の賛歌', '성역의 찬가', 'Hino do Santuário', '圣域赞歌'),
 HYMN_TEXT: (
  'Solange „Die Zuflucht im Himmel“ offen auf dem Spielfeld liegt: Jedes Mal, wenn du durch den Effekt eines Fee-Monsters LP erhältst, füge deinem Gegner Schaden in Höhe der erhaltenen LP zu.',
  'Mientras "El Santuario en el Cielo" esté boca arriba en el Campo, cada vez que ganes LP por el efecto de un monstruo Hada, inflige a tu adversario daño igual a los LP que ganaste.',
  'Tant que "Le Sanctuaire Céleste" est face recto sur le Terrain, chaque fois que vous gagnez des LP par l\'effet d\'un monstre Elfe, infligez à votre adversaire des dommages égaux aux LP gagnés.',
  'Finché "Il Santuario nel Cielo" è scoperto sul Terreno, ogni volta che guadagni LP per l\'effetto di un mostro Fata, infliggi al tuo avversario danni pari ai LP guadagnati.',
  '「天空の聖域」がフィールドに表側表示で存在する限り、天使族モンスターの効果で自分がLPを回復する度に、その回復した数値分のダメージを相手に与える。',
  '「천공의 성역」이 필드에 앞면 표시로 존재하는 한, 천사족 몬스터의 효과로 자신이 LP를 회복할 때마다, 회복한 수치만큼의 데미지를 상대에게 준다.',
  'Enquanto "O Santuário no Céu" estiver com a face para cima no campo, cada vez que você ganhar PV pelo efeito de um monstro Fada, cause ao seu oponente dano igual aos PV ganhos.',
  '只要「天空的圣域」在场上表侧表示存在，每次自己因天使族怪兽的效果回复基本分，给与对方回复数值的伤害。'),
 PARASITE: ('Parasitenbefall', 'Infestación Parásita', 'Infestation Parasite', 'Infestazione Parassita', '寄生虫の侵食', '기생충의 침식', 'Infestação Parasita', '寄生虫侵蚀'),
 PARASITE_TEXT: (
  'Zu Beginn jedes Duells: Mische 1 „Parasiten-Parazid“ von außerhalb des Duells offen in das Deck deines Gegners.',
  'Al principio de cada Duelo, baraja 1 "Parásito Paracida" de fuera del Duelo boca arriba en el Deck de tu adversario.',
  'Au début de chaque Duel, mélangez 1 "Parasite Paracide" depuis l\'extérieur du Duel face recto dans le Deck de votre adversaire.',
  'All\'inizio di ogni Duello, mescola 1 "Insetto Parassita" da fuori dal Duello scoperto nel Deck del tuo avversario.',
  '各デュエルの開始時に、デュエル外から「寄生虫パラサイド」1枚を表側表示で相手のデッキに加えてシャッフルする。',
  '각 듀얼 개시시에, 듀얼 밖에서 「기생충 파라사이드」 1장을 앞면 표시로 상대 덱에 넣고 셔플한다.',
  'No começo de cada Duelo, embaralhe 1 "Parasita Paracide" de fora do Duelo com a face para cima no Deck do seu oponente.',
  '每场决斗开始时，从决斗外把1张「寄生虫 帕拉赛德」表侧表示加入对方卡组洗切。'),
 STRIKES: ('Sengende Schläge', 'Golpes Abrasadores', 'Frappes Brûlantes', 'Colpi Ardenti', '灼熱の連撃', '작열의 연격', 'Golpes Escaldantes', '灼热连击'),
 STRIKES_TEXT: (
  'Kampfschaden, den dein Gegner erhalten würde, wird stattdessen als Effektschaden zugefügt. Halbiere diesen Schaden (abgerundet).',
  'El daño de batalla que recibiría tu adversario se inflige como daño de efecto en su lugar. Reduce ese daño a la mitad (redondeando hacia abajo).',
  'Les dommages de combat que recevrait votre adversaire sont infligés comme dommages d\'effet à la place. Divisez ces dommages par deux (arrondis à l\'inférieur).',
  'Il danno da combattimento che subirebbe il tuo avversario viene invece inflitto come danno da effetto. Dimezza quel danno (arrotondato per difetto).',
  '相手が受ける戦闘ダメージは、代わりに効果ダメージとして与えられる。そのダメージは半分（端数切り捨て）になる。',
  '상대가 받을 전투 데미지는, 대신에 효과 데미지로서 준다. 그 데미지는 절반(소수점 이하 버림)이 된다.',
  'O dano de batalha que seu oponente sofreria é causado como dano de efeito em vez disso. Reduza esse dano à metade (arredondado para baixo).',
  '对方受到的战斗伤害改为作为效果伤害给与。那个伤害变成一半（向下取整）。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(path.read_text(encoding='utf-8-sig'))
    have = {(r['group'], r['en']) for r in rows}
    for en, ctx in ((HYMN, 'relic name (sanctuary_hymn)'), (HYMN_TEXT, 'relic effect (sanctuary_hymn)'),
                    (PARASITE, 'relic name (parasite_infestation)'), (PARASITE_TEXT, 'relic effect (parasite_infestation)'),
                    (STRIKES, 'shadow relic name (cursed_scorching_strikes)'), (STRIKES_TEXT, 'shadow relic effect (cursed_scorching_strikes)')):
        en = re.sub(r'\s+', ' ', en).strip()
        if ('relic', en) not in have:
            rows.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': ctx})
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
