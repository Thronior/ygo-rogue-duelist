"""Adds the texts of 2026-11-13 to every language: the reworked Good Spirits, Disturbed Sleep, the three Gadget relics
(Gadget Gadget is the fusion of the other two) and the Rain of Mercy boss curse with its amplified text.

Card names follow each language's card texts in android/web/i18n (Stronghold the Moving Fortress, the "Gadget"
archetype, Rain of Mercy). Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text  # a plain write fails while a scanner maps the file (Errno 22)
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
RELIC = {
    'Spirit monsters you control do not have to return to the hand during the End Phase. You choose for each one.': (
        'Spirit-Monster, die du kontrollierst, müssen während der End Phase nicht auf die Hand zurückkehren. Du entscheidest für jedes einzeln.',
        'Los monstruos Spirit que controles no tienen que regresar a la mano durante la End Phase. Tú eliges para cada uno.',
        'Les monstres Spirit que vous contrôlez ne sont pas obligés de retourner dans la main durant la End Phase. Vous choisissez pour chacun.',
        'I mostri Spirit che controlli non devono per forza ritornare nella mano durante la End Phase. Scegli tu per ognuno.',
        'Os monstros Espírito que você controla não precisam retornar para a mão durante a Fase Final. Você escolhe para cada um.',
        '自分フィールドのスピリットモンスターはエンドフェイズに手札に戻らなくてもよい。1体ごとに選択できる。',
        '자신 필드의 스피릿 몬스터는 엔드 페이즈에 패로 되돌아가지 않아도 된다. 1장씩 선택할 수 있다.',
        '自己场上的灵魂怪兽在结束阶段可以不回到手卡。每只分别选择。'),
    'Disturbed Sleep': ('Gestörter Schlaf', 'Sueño Perturbado', 'Sommeil Troublé', 'Sonno Disturbato', 'Sono Perturbado', '妨げられた眠り', '방해받은 잠', '被扰之眠'),
    "During each player's End Phase, flip all face-down Defense Position monsters to face-up Attack Position.": (
        'Während der End Phase jedes Spielers werden alle verdeckten Monster in Verteidigungsposition in offene Angriffsposition geändert.',
        'Durante la End Phase de cada jugador, cambia todos los monstruos boca abajo en Posición de Defensa a Posición de Ataque boca arriba.',
        "Durant la End Phase de chaque joueur, changez tous les monstres en Position de Défense face verso en Position d'Attaque face recto.",
        'Durante la End Phase di ogni giocatore, cambia tutti i mostri coperti in Posizione di Difesa in Posizione di Attacco scoperta.',
        'Durante a Fase Final de cada jogador, mude todos os monstros com a face para baixo em Posição de Defesa para Posição de Ataque com a face para cima.',
        '各プレイヤーのエンドフェイズに、裏側守備表示のモンスターを全て表側攻撃表示にする。',
        '각 플레이어의 엔드 페이즈에, 뒷면 수비 표시 몬스터를 전부 앞면 공격 표시로 한다.',
        '每个玩家的结束阶段，把里侧守备表示的怪兽全部变成表侧攻击表示。'),
    'Gadget Call': ('Apparat-Ruf', 'Llamada de Artilugios', 'Appel des Gadgets', 'Richiamo dei Congegni', 'Chamado dos Dispositivos', 'ガジェット・コール', '가제트 콜', '零件召集'),
    'Whenever a "Gadget" monster\'s effect would add another "Gadget" monster to your hand, Special Summon it instead, if you can.': (
        'Immer wenn der Effekt eines „Apparat“-Monsters ein anderes „Apparat“-Monster deiner Hand hinzufügen würde, beschwöre es stattdessen als Spezialbeschwörung, falls möglich.',
        'Cada vez que el efecto de un monstruo "Artilugio" fuera a añadir otro monstruo "Artilugio" a tu mano, Invócalo de Modo Especial en su lugar, si puedes.',
        "Chaque fois que l'effet d'un monstre « Gadget » ajouterait un autre monstre « Gadget » à votre main, Invoquez-le Spécialement à la place, si possible.",
        'Ogni volta che l\'effetto di un mostro "Congegno" aggiungerebbe un altro mostro "Congegno" alla tua mano, invece Evocalo Specialmente, se puoi.',
        'Sempre que o efeito de um monstro "Dispositivo" for adicionar outro monstro "Dispositivo" à sua mão, em vez disso, Invoque-o por Invocação-Especial, se puder.',
        '「ガジェット」モンスターの効果で別の「ガジェット」モンスターが手札に加わる場合、可能なら代わりにそのモンスターを特殊召喚する。',
        '"가제트" 몬스터의 효과로 다른 "가제트" 몬스터가 패에 넣어질 경우, 가능하면 대신에 그 몬스터를 특수 소환한다.',
        '「零件」怪兽的效果让其他「零件」怪兽加入手卡的场合，可能的话，作为代替把那只怪兽特殊召唤。'),
    'Gadget Stronghold': ('Apparat-Festung', 'Fortaleza de Artilugios', 'Fortin des Gadgets', 'Roccaforte dei Congegni', 'Fortaleza dos Dispositivos', 'ガジェット・ストロングホールド', '가제트 스트롱 홀드', '零件堡垒'),
    'Add 1 "Stronghold the Moving Fortress" to your starting hand.': (
        'Füge deiner Starthand 1 „Stronghold, die mobile Festung“ hinzu.',
        'Añade 1 "Bastión, la Fortaleza Móvil" a tu mano inicial.',
        'Ajoutez 1 "Fortin, la Forteresse Ambulante" à votre main de départ.',
        'Aggiungi 1 "Roccaforte della Fortezza Movente" alla tua mano iniziale.',
        'Adicione 1 "Bastião, a Fortaleza Móvel" à sua mão inicial.',
        '「機動砦 ストロング・ホールド」1枚を初期手札に加える。',
        '「기동요새 스트롱 홀드」 1장을 자신의 첫 패에 넣는다.',
        '把1张「机动城 堡垒」加入自己的起手手卡。'),
    'Gadget Gadget': ('Apparat-Apparat', 'Artilugio Artilugio', 'Gadget Gadget', 'Congegno Congegno', 'Dispositivo Dispositivo', 'ガジェット・ガジェット', '가제트 가제트', '零件零件'),
    '"Gadget" monsters you control gain 500 ATK. Each time you Normal Summon a "Gadget" monster, Special Summon 2 "Gadget" monsters with different names from your Deck, then add 1 "Stronghold the Moving Fortress" from your Deck to your hand.': (
        '„Apparat“-Monster, die du kontrollierst, erhalten 500 ATK. Jedes Mal, wenn du ein „Apparat“-Monster als Normalbeschwörung beschwörst, beschwöre 2 „Apparat“-Monster mit unterschiedlichen Namen als Spezialbeschwörung aus deinem Deck, füge danach 1 „Stronghold, die mobile Festung“ von deinem Deck deiner Hand hinzu.',
        'Los monstruos "Artilugio" que controles ganan 500 ATK. Cada vez que Invoques de Modo Normal un monstruo "Artilugio", Invoca de Modo Especial 2 monstruos "Artilugio" con nombres diferentes desde tu Deck, y después añade 1 "Bastión, la Fortaleza Móvil" desde tu Deck a tu mano.',
        'Les monstres « Gadget » que vous contrôlez gagnent 500 ATK. Chaque fois que vous Invoquez Normalement un monstre « Gadget », Invoquez Spécialement 2 monstres « Gadget » avec des noms différents depuis votre Deck, puis ajoutez 1 « Fortin, la Forteresse Ambulante » depuis votre Deck à votre main.',
        'I mostri "Congegno" che controlli guadagnano 500 ATK. Ogni volta che Evochi Normalmente un mostro "Congegno", Evoca Specialmente 2 mostri "Congegno" con nomi diversi dal tuo Deck, poi aggiungi 1 "Roccaforte della Fortezza Movente" dal tuo Deck alla tua mano.',
        'Monstros "Dispositivo" que você controla ganham 500 de ATK. Sempre que você fizer a Invocação-Normal de um monstro "Dispositivo", Invoque por Invocação-Especial 2 monstros "Dispositivo" com nomes diferentes do seu Deck, depois adicione 1 "Bastião, a Fortaleza Móvel" do seu Deck à sua mão.',
        '自分フィールドの「ガジェット」モンスターの攻撃力は500アップする。自分が「ガジェット」モンスターを通常召喚する度に、カード名が異なる「ガジェット」モンスター2体をデッキから特殊召喚し、その後デッキから「機動砦 ストロング・ホールド」1枚を手札に加える。',
        '자신 필드의 "가제트" 몬스터의 공격력은 500 올린다. 자신이 "가제트" 몬스터를 일반 소환할 때마다, 카드명이 다른 "가제트" 몬스터 2장을 덱에서 특수 소환하고, 그 후 덱에서 「기동요새 스트롱 홀드」 1장을 패에 넣는다.',
        '自己场上的「零件」怪兽攻击力上升500。每次自己把「零件」怪兽通常召唤，从卡组把卡名不同的2只「零件」怪兽特殊召唤，那之后从卡组把1张「机动城 堡垒」加入手卡。'),
}
CURSE = {
    'Rain of Mercy': ('Regen der Gnade', 'Lluvia de Piedad', 'Pluie de Compassion', 'Pioggia Misericordiosa', 'Chuva da Misericórdia', '恵みの雨', '은혜의 단비', '恩惠之雨'),
}
# The base and the amplified (challenge level 2+) curse text differ only in the amount.
HEAL = ("At the start of your opponent's Standby Phase, they gain {} LP.", (
    'Zu Beginn der Standby Phase deines Gegners erhält er {} LP.',
    'Al principio de la Standby Phase de tu adversario, gana {} LP.',
    'Au début de la Standby Phase de votre adversaire, il gagne {} LP.',
    "All'inizio della Standby Phase del tuo avversario, guadagna {} LP.",
    'No começo da Fase de Apoio do seu oponente, ele ganha {} PV.',
    '相手スタンバイフェイズ開始時に、相手は{}LP回復する。',
    '상대 스탠바이 페이즈 개시시에, 상대는 {} LP 회복한다.',
    '对方准备阶段开始时，对方回复{}基本分。'))


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(catalog_path.read_text(encoding='utf8'))
    known = {r['en'] for r in rows}
    groups = {}
    for key in RELIC: groups[key] = 'relic'
    for key in CURSE: groups[key] = 'curse'
    for amount in (400, 800): groups[HEAL[0].format(amount)] = 'curse'
    added = {}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        new = {key: values[index] for key, values in {**RELIC, **CURSE}.items()}
        for amount in (400, 800): new[HEAL[0].format(amount)] = HEAL[1][index].format(amount)
        count = 0
        for key, text in new.items():
            if key not in table: table[key] = text; count += 1
        write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    fresh = 0
    for key, group in groups.items():
        if key not in known:
            rows.append({'group': group, 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-13'}); fresh += 1
    write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh)


if __name__ == '__main__':
    main()
