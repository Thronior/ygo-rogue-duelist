"""Adds the texts of 2026-11-12 to every language: six relics and two cursed relics from Discord suggestions, Cursed
Restock's shop lock, and the Coin Reward Pop-ups switch in Settings > Effects.

Cursed relics get their two halves (the cursed relic screen shows them apart) and the joined text. Dimensional Rift
reuses the existing translation of "This relic appears less often than other relics." Existing translations are never
overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
RARE = 'This relic appears less often than other relics.'
CREATOR = 'Once per turn, during your Standby Phase, Special Summon 1 monster from your GY. ' + RARE
RIFT = 'All cards that would be sent to the GY are banished instead.'
TERMS = {
    'Typhoon': ('Taifun', 'Tifón', 'Typhon', 'Tifone', 'Tufão', 'タイフーン', '태풍', '台风'),
    'Machine Duplication': ('Maschinenduplizierung', 'Duplicación de Máquina', 'Machine de Duplication', 'Duplicazione di Macchine', 'Duplicação de Máquinas', '機械複製術', '기계 복제술', '机械复制术'),
    'Ghost Destruction': ('Geistzerstörung', 'Destrucción de Fantasmas', 'Destruction de Fantômes', 'Distruzione degli Spettri', 'Destruição de Fantasmas', '霊滅', '영멸', '灵灭'),
    'Omni Banishment': ('Allverbannung', 'Destierro Total', 'Bannissement Total', 'Bando Totale', 'Banimento Total', '全方位除外', '전방위 제외', '全方位除外'),
    'Dimensional Rift': ('Dimensionsriss', 'Grieta Dimensional', 'Faille Dimensionnelle', 'Squarcio Dimensionale', 'Fenda Dimensional', '次元の裂け目', '차원의 균열', '次元裂缝'),
    'Spell Provider': ('Zaubermarken-Spender', 'Proveedor de Magia', 'Fournisseur de Magie', 'Fornitore di Magia', 'Provedor de Magia', '魔力の供給者', '마력 공급자', '魔力供给者'),
    'Anime Rule #3': ('Anime-Regel #3', 'Regla del Anime #3', "Règle de l'Anime N°3", 'Regola Anime #3', 'Regra do Anime #3', 'アニメルール #3', '애니메이션 룰 #3', '动画规则#3'),
    'Cursed Restock': ('Verfluchter Nachschub', 'Reabastecimiento Maldito', 'Réassort Maudit', 'Rifornimento Maledetto', 'Reabastecimento Amaldiçoado', '呪いの再入荷', '저주받은 재입고', '诅咒补货'),
    'Once per turn, during your End Phase, you can destroy 1 Spell or Trap Card on your side of the field. If you do, destroy 1 Spell or Trap Card your opponent controls.': (
        'Einmal pro Spielzug, während deiner End Phase, kannst du 1 Zauber- oder Fallenkarte auf deiner Spielfeldseite zerstören. Falls du dies tust, zerstöre 1 Zauber- oder Fallenkarte, die dein Gegner kontrolliert.',
        'Una vez por turno, durante tu End Phase, puedes destruir 1 Carta Mágica o de Trampa en tu lado del Campo. Si lo haces, destruye 1 Carta Mágica o de Trampa que controle tu adversario.',
        'Une fois par tour, durant votre End Phase, vous pouvez détruire 1 Carte Magie ou Piège de votre côté du Terrain. Si vous le faites, détruisez 1 Carte Magie ou Piège contrôlée par votre adversaire.',
        'Una volta per turno, durante la tua End Phase, puoi distruggere 1 Carta Magia o Trappola nella tua parte del Terreno. Se lo fai, distruggi 1 Carta Magia o Trappola controllata dal tuo avversario.',
        'Uma vez por turno, durante sua Fase Final, você pode destruir 1 Card de Magia ou Armadilha no seu lado do campo. Se fizer isso, destrua 1 Card de Magia ou Armadilha que seu oponente controla.',
        '1ターンに1度、自分エンドフェイズに、自分フィールドの魔法・罠カード1枚を破壊できる。破壊した場合、相手フィールドの魔法・罠カード1枚を破壊する。',
        '1턴에 1번, 자신 엔드 페이즈에, 자신 필드의 마법 / 함정 카드 1장을 파괴할 수 있다. 파괴했을 경우, 상대 필드의 마법 / 함정 카드 1장을 파괴한다.',
        '1回合1次，自己结束阶段，可以把自己场上1张魔法·陷阱卡破坏。那之后，把对方场上1张魔法·陷阱卡破坏。'),
    "Once per turn, during your End Phase, you can target 1 Machine monster you control: Special Summon 1 Clone Token in Attack Position with half that monster's ATK and DEF (rounded down).": (
        'Einmal pro Spielzug, während deiner End Phase, kannst du 1 Maschinen-Monster wählen, das du kontrollierst: Beschwöre 1 „Klon-Spielmarke“ in Angriffsposition als Spezialbeschwörung, mit der Hälfte der ATK und DEF jenes Monsters (abgerundet).',
        'Una vez por turno, durante tu End Phase, puedes seleccionar 1 monstruo Máquina que controles: Invoca de Modo Especial 1 "Ficha Clon" en Posición de Ataque con la mitad del ATK y DEF de ese monstruo (redondeado hacia abajo).',
        "Une fois par tour, durant votre End Phase, vous pouvez cibler 1 monstre Machine que vous contrôlez : Invoquez Spécialement 1 « Jeton Clone » en Position d'Attaque avec la moitié de l'ATK et de la DEF de ce monstre (arrondie à l'inférieur).",
        'Una volta per turno, durante la tua End Phase, puoi scegliere come bersaglio 1 mostro Macchina che controlli: Evoca Specialmente 1 "Segna-Clone" in Posizione di Attacco con metà dell\'ATK e del DEF di quel mostro (arrotondati per difetto).',
        'Uma vez por turno, durante sua Fase Final, você pode escolher 1 monstro Máquina que você controla como alvo: Invoque por Invocação-Especial 1 "Ficha de Clone" em Posição de Ataque com metade do ATK e DEF daquele monstro (arredondados para baixo).',
        '1ターンに1度、自分エンドフェイズに、自分フィールドの機械族モンスター1体を対象にできる。そのモンスターの攻撃力・守備力の半分（切り捨て）の「クローントークン」1体を攻撃表示で特殊召喚する。',
        '1턴에 1번, 자신 엔드 페이즈에, 자신 필드의 기계족 몬스터 1장을 대상으로 할 수 있다. 그 몬스터의 공격력 / 수비력의 절반(버림)인 "클론 토큰" 1장을 공격 표시로 특수 소환한다.',
        '1回合1次，自己结束阶段，可以以自己场上1只机械族怪兽为对象。把攻击力·守备力为那只怪兽一半（舍去小数）的1只「克隆衍生物」攻击表示特殊召唤。'),
    "If a monster you control inflicts battle damage to your opponent: You can target 1 monster in your or your opponent's GY; banish it.": (
        'Wenn ein Monster, das du kontrollierst, deinem Gegner Kampfschaden zufügt: Du kannst 1 Monster in deinem Friedhof oder im Friedhof deines Gegners wählen; verbanne es.',
        'Si un monstruo que controlas inflige daño de batalla a tu adversario: puedes seleccionar 1 monstruo en tu Cementerio o en el de tu adversario; destiérralo.',
        'Si un monstre que vous contrôlez inflige des dommages de combat à votre adversaire : vous pouvez cibler 1 monstre dans votre Cimetière ou celui de votre adversaire ; bannissez-le.',
        'Se un mostro che controlli infligge danno da combattimento al tuo avversario: puoi scegliere come bersaglio 1 mostro nel tuo Cimitero o in quello del tuo avversario; bandiscilo.',
        'Se um monstro que você controla causar dano de batalha ao seu oponente: você pode escolher 1 monstro no seu Cemitério ou no do seu oponente como alvo; bana-o.',
        '自分フィールドのモンスターが相手に戦闘ダメージを与えた場合、自分または相手の墓地のモンスター1体を対象にできる。そのモンスターを除外する。',
        '자신 필드의 몬스터가 상대에게 전투 데미지를 주었을 경우, 자신 또는 상대 묘지의 몬스터 1장을 대상으로 할 수 있다. 그 몬스터를 제외한다.',
        '自己场上的怪兽给与对方战斗伤害的场合，可以以自己或对方墓地1只怪兽为对象。那只怪兽除外。'),
    'Once per turn, during your Standby Phase, you can banish 1 card from your Deck.': (
        'Einmal pro Spielzug, während deiner Standby Phase, kannst du 1 Karte aus deinem Deck verbannen.',
        'Una vez por turno, durante tu Standby Phase, puedes desterrar 1 carta de tu Deck.',
        'Une fois par tour, durant votre Standby Phase, vous pouvez bannir 1 carte de votre Deck.',
        'Una volta per turno, durante la tua Standby Phase, puoi bandire 1 carta dal tuo Deck.',
        'Uma vez por turno, durante sua Fase de Apoio, você pode banir 1 card do seu Deck.',
        '1ターンに1度、自分スタンバイフェイズに、自分のデッキからカード1枚を除外できる。',
        '1턴에 1번, 자신 스탠바이 페이즈에, 자신의 덱에서 카드 1장을 제외할 수 있다.',
        '1回合1次，自己准备阶段，可以从自己卡组把1张卡除外。'),
    RIFT: (
        'Alle Karten, die auf den Friedhof gelegt würden, werden stattdessen verbannt.',
        'Todas las cartas que fueran a ser mandadas al Cementerio son desterradas en su lugar.',
        'Toutes les cartes qui devraient être envoyées au Cimetière sont bannies à la place.',
        'Tutte le carte che verrebbero mandate al Cimitero vengono invece bandite.',
        'Todos os cards que seriam enviados para o Cemitério são banidos em vez disso.',
        '墓地へ送られるカードは墓地へは行かず除外される。',
        '묘지로 보내지는 카드는 묘지로 가지 않고 제외된다.',
        '送去墓地的卡不去墓地而除外。'),
    'Once per turn, during your Standby Phase, you can place 1 Spell Counter on a card you control that can hold a Spell Counter.': (
        'Einmal pro Spielzug, während deiner Standby Phase, kannst du 1 Zaubermarke auf eine Karte legen, die du kontrollierst und die eine Zaubermarke erhalten kann.',
        'Una vez por turno, durante tu Standby Phase, puedes colocar 1 Contador de Magia en una carta que controles que pueda tener un Contador de Magia.',
        'Une fois par tour, durant votre Standby Phase, vous pouvez placer 1 Compteur Magie sur une carte que vous contrôlez qui peut recevoir un Compteur Magie.',
        'Una volta per turno, durante la tua Standby Phase, puoi mettere 1 Segnalino Magia su una carta che controlli che può avere un Segnalino Magia.',
        'Uma vez por turno, durante sua Fase de Apoio, você pode colocar 1 Marcador Mágico em um card que você controla que possa receber um Marcador Mágico.',
        '1ターンに1度、自分スタンバイフェイズに、魔力カウンターを置く事ができる自分フィールドのカード1枚に魔力カウンターを1つ置く事ができる。',
        '1턴에 1번, 자신 스탠바이 페이즈에, 마력 카운터를 놓을 수 있는 자신 필드의 카드 1장에 마력 카운터를 1개 놓을 수 있다.',
        '1回合1次，自己准备阶段，可以给自己场上1张可以放置魔力指示物的卡放置1个魔力指示物。'),
    # Anime Rule #3, upside then drawback.
    'You can Normal Summon or Set Level 5 or higher monsters without Tributing.': (
        'Du kannst Monster der Stufe 5 oder höher als Normalbeschwörung beschwören oder setzen, ohne Tribut anzubieten.',
        'Puedes Invocar de Modo Normal o Colocar monstruos de Nivel 5 o más sin Sacrificar.',
        'Vous pouvez Invoquer Normalement ou Poser des monstres de Niveau 5 ou plus sans Sacrifice.',
        'Puoi Evocare Normalmente o Posizionare mostri di Livello 5 o superiore senza offrire Tributi.',
        'Você pode Invocar por Invocação-Normal ou Baixar monstros de Nível 5 ou mais sem oferecer Tributos.',
        '自分はレベル５以上のモンスターをリリースなしで召喚・セットできる。',
        '자신은 레벨 5 이상의 몬스터를 릴리스 없이 일반 소환 / 세트할 수 있다.',
        '自己可以不用解放把5星以上的怪兽通常召唤·盖放。'),
    'Monsters you control lose 1000 ATK and DEF unless you control a face-up Field Spell.': (
        'Alle Monster, die du kontrollierst, verlieren 1000 ATK und DEF, außer du kontrollierst einen offenen Spielfeldzauber.',
        'Los monstruos que controles pierden 1000 ATK y DEF, a menos que controles una Magia de Campo boca arriba.',
        'Les monstres que vous contrôlez perdent 1000 ATK et DEF, sauf si vous contrôlez une Magie de Terrain face recto.',
        'I mostri che controlli perdono 1000 ATK e DEF, a meno che tu non controlli una Magia Terreno scoperta.',
        'Os monstros que você controla perdem 1000 de ATK e DEF, a menos que você controle uma Magia de Campo com a face para cima.',
        '自分が表側表示のフィールド魔法カードをコントロールしていない限り、自分フィールドのモンスターの攻撃力・守備力は1000ダウンする。',
        '자신이 앞면 표시의 필드 마법 카드를 컨트롤하고 있지 않는 한, 자신 필드의 몬스터의 공격력 / 수비력은 1000 내려간다.',
        '只要自己没有控制表侧表示的场地魔法卡，自己场上的怪兽的攻击力·守备力下降1000。'),
    # Cursed Restock, upside then drawback.
    'You get 2 free rerolls per shop.': (
        'Du erhältst in jedem Shop 2 kostenlose Aktualisierungen.',
        'Obtén 2 renovaciones gratis en cada tienda.',
        'Obtenez 2 relances gratuites dans chaque boutique.',
        'Ottieni 2 cambi gratuiti in ogni negozio.',
        'Receba 2 atualizações grátis em cada loja.',
        '各ショップでリロールを2回無料で行える。',
        '각 상점에서 무료 리롤을 2회 얻는다.',
        '每个商店获得2次免费刷新。'),
    'You can only buy one item per reroll.': (
        'Du kannst pro Aktualisierung nur einen Artikel kaufen.',
        'Solo puedes comprar un artículo por renovación.',
        "Vous ne pouvez acheter qu'un seul article par relance.",
        'Puoi comprare un solo articolo per cambio.',
        'Você só pode comprar um item por atualização.',
        'リロールごとに1つの商品しか購入できない。',
        '리롤마다 상품을 1개만 구입할 수 있다.',
        '每次刷新只能购买1件商品。'),
    'LOCKED': ('GESPERRT', 'BLOQUEADO', 'VERROUILLÉ', 'BLOCCATO', 'BLOQUEADO', 'ロック', '잠김', '已锁定'),
    # Settings > Effects.
    'Coin Reward Pop-ups': ('Münzbelohnungs-Einblendungen', 'Avisos de recompensas de monedas', 'Textes de récompenses en pièces', 'Popup delle ricompense in monete', 'Pop-ups de recompensas de moedas', 'コイン報酬ポップアップ', '코인 보상 팝업', '金币奖励弹出文字'),
    'The "+15 Tribute Summon" texts for each way you earned coins in a duel. Coin spins and bursts stay.': (
        'Die „+15 …“-Texte für jede Art, wie du in einem Duell Münzen verdient hast. Münzdrehungen und -explosionen bleiben.',
        'Los textos «+15 …» por cada forma en que ganaste monedas en un duelo. Los giros y estallidos de monedas se mantienen.',
        'Les textes « +15 … » pour chaque façon dont vous avez gagné des pièces en duel. Les tours et éclats de pièces restent.',
        'I testi "+15 …" per ogni modo in cui hai guadagnato monete in un duello. Giri ed esplosioni di monete restano.',
        'Os textos "+15 …" para cada forma como você ganhou moedas em um duelo. Giros e explosões de moedas continuam.',
        'デュエルでコインを獲得した方法ごとに出る「+15 …」の文字。コインの回転やバーストは残ります。',
        '듀얼에서 코인을 얻은 방식마다 나오는 "+15 …" 문구. 코인 회전과 폭발 효과는 유지됩니다.',
        '决斗中每种获得金币方式的“+15 …”文字。金币旋转和爆发效果保留。'),
}
# (joined English text, its two halves) for the cursed relics.
JOINED = [
    ('You can Normal Summon or Set Level 5 or higher monsters without Tributing. Monsters you control lose 1000 ATK and DEF unless you control a face-up Field Spell.',
     'You can Normal Summon or Set Level 5 or higher monsters without Tributing.', 'Monsters you control lose 1000 ATK and DEF unless you control a face-up Field Spell.'),
    ('You get 2 free rerolls per shop. You can only buy one item per reroll.', 'You get 2 free rerolls per shop.', 'You can only buy one item per reroll.'),
]
UI = {'LOCKED', 'Coin Reward Pop-ups', 'The "+15 Tribute Summon" texts for each way you earned coins in a duel. Coin spins and bursts stay.', 'Cursed Restock: you can only buy one item per reroll.'}


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    rows = catalog if isinstance(catalog, list) else catalog.get('strings', catalog.get('entries'))
    known = {r['en'] for r in rows}
    added = {}
    english = set()
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        new = {key: values[index] for key, values in TERMS.items()}
        join = '' if lang in ('ja', 'zh') else ' '
        colon = '：' if lang in ('ja', 'zh') else ': '
        for whole, first, second in JOINED: new[whole] = new[first] + join + new[second]
        new['Cursed Restock: you can only buy one item per reroll.'] = new['Cursed Restock'] + colon + new['You can only buy one item per reroll.']
        creator = table[CREATOR]
        # The Creator's translation ends with the rarity sentence; take everything after its first sentence.
        cut = max(creator.find(mark) for mark in ('. ', '。')) + (1 if '。' in creator else 2)
        new[RIFT + ' ' + RARE] = new[RIFT] + join + creator[cut:].strip()
        count = 0
        for key, text in new.items():
            english.add(key)
            if key not in table: table[key] = text; count += 1
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
        if '--show' in sys.argv:
            print(lang, '| Rift =>', table[RIFT + ' ' + RARE])
    fresh_rows = 0
    for key in sorted(english):
        if key not in known:
            rows.append({'group': 'ui' if key in UI else 'relic', 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-12'}); fresh_rows += 1
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh_rows)


if __name__ == '__main__':
    main()
