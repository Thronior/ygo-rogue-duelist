"""Randomized cards (2026-11-15): the Absolute Random relic, the Random Pack, the hat loading screen and Copycat's
Randomizer loadout. All 8 languages. Existing translations are never overwritten. Card texts of randomized cards
stay in English for now (their templates are not translated yet)."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_bytes

LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
# (group, context, English, [translations in LANGS order])
ROWS = [
 ('relic', 'relic name (absolute_random)', 'Absolute Random',
  ['Absoluter Zufall', 'Azar Absoluto', 'Hasard Absolu', 'Caso Assoluto', 'アブソリュート・ランダム', '절대 무작위', 'Acaso Absoluto', '绝对随机']),
 ('relic', 'relic effect (absolute_random)', 'After each victory, open a free Random Pack of 9 randomized cards. Randomized cards last for this run only.',
  ['Öffne nach jedem Sieg kostenlos einen Zufallsbooster mit 9 zufällig erzeugten Karten. Zufällig erzeugte Karten gelten nur für diesen Durchlauf.',
   'Tras cada victoria, abre gratis un Sobre aleatorio con 9 cartas aleatorizadas. Las cartas aleatorizadas solo duran esta partida.',
   'Après chaque victoire, ouvrez gratuitement un Booster aléatoire de 9 cartes aléatoires. Les cartes aléatoires ne durent que pour cette partie.',
   'Dopo ogni vittoria, apri gratis una Busta casuale con 9 carte generate a caso. Le carte generate a caso valgono solo per questa partita.',
   '勝利するたびに、ランダム生成カード9枚入りのランダムパックを無料で1つ開封する。ランダム生成カードはこのランの間だけ有効。',
   '승리할 때마다 무작위로 생성된 카드 9장이 든 무작위 팩 1개를 무료로 개봉합니다. 무작위로 생성된 카드는 이번 런에서만 유지됩니다.',
   'Após cada vitória, abra de graça um Pacote aleatório com 9 cartas aleatorizadas. As cartas aleatorizadas valem apenas nesta jornada.',
   '每次胜利后，免费开启1个装有9张随机生成卡的随机补充包。随机生成卡只在本次冒险中有效。']),
 ('ui', 'random-cards.js pack name', 'Random Pack',
  ['Zufallsbooster', 'Sobre aleatorio', 'Booster aléatoire', 'Busta casuale', 'ランダムパック', '무작위 팩', 'Pacote aleatório', '随机补充包']),
 ('ui', 'random-cards.js pack description', 'Nine randomized cards: new names, art, stats and effects, made for you when you open it. Randomized cards last for this run only.',
  ['Neun zufällig erzeugte Karten: neue Namen, Bilder, Werte und Effekte, erst beim Öffnen für dich gemacht. Zufällig erzeugte Karten gelten nur für diesen Durchlauf.',
   'Nueve cartas aleatorizadas: nombres, ilustraciones, estadísticas y efectos nuevos, creados para ti al abrirlo. Las cartas aleatorizadas solo duran esta partida.',
   'Neuf cartes aléatoires : noms, illustrations, statistiques et effets nouveaux, créés pour vous à l’ouverture. Les cartes aléatoires ne durent que pour cette partie.',
   'Nove carte generate a caso: nomi, illustrazioni, statistiche ed effetti nuovi, creati per te quando la apri. Le carte generate a caso valgono solo per questa partita.',
   'ランダム生成カード9枚。開封した時に、新しい名前・イラスト・ステータス・効果で作られる。ランダム生成カードはこのランの間だけ有効。',
   '무작위로 생성된 카드 9장: 개봉할 때 새로운 이름, 그림, 능력치, 효과로 만들어집니다. 무작위로 생성된 카드는 이번 런에서만 유지됩니다.',
   'Nove cartas aleatorizadas: nomes, artes, atributos e efeitos novos, criados para você ao abrir. As cartas aleatorizadas valem apenas nesta jornada.',
   '9张随机生成卡：开启时为你生成全新的名称、卡图、数值和效果。随机生成卡只在本次冒险中有效。']),
 ('ui', 'random-cards.js loading title', 'RANDOMIZING CARDS',
  ['KARTEN WERDEN ERZEUGT', 'ALEATORIZANDO CARTAS', 'CRÉATION DES CARTES', 'GENERAZIONE CARTE', 'カードをランダム生成中', '카드 무작위 생성 중', 'ALEATORIZANDO CARTAS', '正在随机生成卡片']),
 ('character', 'variant title of Copycat', 'Randomizer',
  ['Randomisierer', 'Aleatorizador', 'Randomiseur', 'Randomizzatore', 'ランダマイザー', '랜더마이저', 'Aleatorizador', '随机化者']),
 ('character', 'variant theme of Copycat', 'Start with Absolute Random and 4 Random Packs. When the run starts, 1,000 randomized cards are made for it, and every pack and single in your shop comes from them. Build your own deck: randomized cards last for this run only.',
  ['Beginne mit Absoluter Zufall und 4 Zufallsboostern. Zu Beginn des Durchlaufs werden 1.000 zufällig erzeugte Karten gemacht, und alle Booster und Einzelkarten im Laden stammen daraus. Baue dein eigenes Deck: Zufällig erzeugte Karten gelten nur für diesen Durchlauf.',
   'Empieza con Azar Absoluto y 4 Sobres aleatorios. Al empezar la partida se crean 1.000 cartas aleatorizadas, y todos los sobres y cartas sueltas de tu tienda salen de ellas. Construye tu propio Deck: las cartas aleatorizadas solo duran esta partida.',
   'Commencez avec Hasard Absolu et 4 Boosters aléatoires. Au début de la partie, 1 000 cartes aléatoires sont créées, et tous les boosters et cartes à l’unité de votre boutique en proviennent. Construisez votre propre Deck : les cartes aléatoires ne durent que pour cette partie.',
   'Inizia con Caso Assoluto e 4 Buste casuali. All’inizio della partita vengono create 1.000 carte generate a caso, e tutte le buste e le carte singole del negozio vengono da lì. Costruisci il tuo Deck: le carte generate a caso valgono solo per questa partita.',
   'アブソリュート・ランダムとランダムパック4つで開始。ラン開始時にランダム生成カードが1,000枚作られ、ショップのパックと単品カードはすべてその中から並ぶ。自分でデッキを組もう。ランダム生成カードはこのランの間だけ有効。',
   '절대 무작위와 무작위 팩 4개로 시작합니다. 런이 시작될 때 무작위로 생성된 카드 1,000장이 만들어지고, 상점의 팩과 낱장 카드는 모두 그중에서 나옵니다. 직접 덱을 짜세요. 무작위로 생성된 카드는 이번 런에서만 유지됩니다.',
   'Comece com Acaso Absoluto e 4 Pacotes aleatórios. No início da jornada, 1.000 cartas aleatorizadas são criadas, e todos os pacotes e cartas avulsas da loja vêm delas. Monte seu próprio Deck: as cartas aleatorizadas valem apenas nesta jornada.',
   '以绝对随机和4个随机补充包开始。冒险开始时会生成1,000张随机生成卡，商店里的补充包和单卡都来自其中。自行组建卡组：随机生成卡只在本次冒险中有效。']),
]

def dump(path, data):
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=1) + '\n').encode('utf8'))

def main():
    for n, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        added = 0
        for group, ctx, en, text in ROWS:
            if en not in table: table[en] = text[n]; added += 1
        if added: dump(path, table)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    new = [{'group': group, 'en': en, 'kind': 'exact', 'ctx': ctx} for group, ctx, en, text in ROWS if en not in known]
    if new: dump(path, catalog + new)
    print(f'{len(new)} new catalog rows')

if __name__ == '__main__':
    main()
