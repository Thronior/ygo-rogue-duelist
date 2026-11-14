"""Guardian's Armory (fused relic) in every language, with its 2026-11-14 wording: the Guardian is only protected from
the opponent's card effects, so your own Equip Spells can still target it (Discord report, Guardian Ceal).

The relic had no translations before. Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text  # a plain write fails while a scanner maps the file (Errno 22)
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
RELIC = {
    'Guardian’s Armory': ('Rüstkammer der Wächter', 'Armería del Guardián', 'Armurerie des Gardiens', 'Armeria del Guardiano',
                          'Armaria do Guardião', 'ガーディアンの武具庫', '가디언의 병기고', '守护者军械库'),
    "Start each Duel with a random Guardian monster and its corresponding Equip Spell in your hand. Equipped monsters you control gain 500 ATK. A Guardian monster you control cannot be targeted or destroyed by your opponent's card effects while its corresponding Equip Spell is face-up on the field.": (
        'Beginne jedes Duell mit einem zufälligen Wächter-Monster und seiner zugehörigen Ausrüstungszauberkarte auf deiner Hand. Alle ausgerüsteten Monster, die du kontrollierst, erhalten 500 ATK. Ein Wächter-Monster, das du kontrollierst, kann nicht als Ziel für Karteneffekte deines Gegners gewählt und nicht durch sie zerstört werden, solange seine zugehörige Ausrüstungszauberkarte offen auf dem Spielfeld liegt.',
        'Empieza cada Duelo con un monstruo Guardián aleatorio y su Carta Mágica de Equipo correspondiente en tu mano. Los monstruos equipados que controles ganan 500 ATK. Un monstruo Guardián que controles no puede ser seleccionado como objetivo ni destruido por efectos de cartas de tu adversario mientras su Carta Mágica de Equipo correspondiente esté boca arriba en el Campo.',
        "Commencez chaque Duel avec un monstre Gardien aléatoire et sa Carte Magie d'Équipement correspondante dans votre main. Les monstres équipés que vous contrôlez gagnent 500 ATK. Un monstre Gardien que vous contrôlez ne peut pas être ciblé ni détruit par les effets de carte de votre adversaire tant que sa Carte Magie d'Équipement correspondante est face recto sur le Terrain.",
        'Inizia ogni Duello con un mostro Guardiano casuale e la sua Carta Magia Equipaggiamento corrispondente nella tua mano. I mostri equipaggiati che controlli guadagnano 500 ATK. Un mostro Guardiano che controlli non può essere scelto come bersaglio né distrutto dagli effetti delle carte del tuo avversario finché la sua Carta Magia Equipaggiamento corrispondente è scoperta sul Terreno.',
        'Comece cada Duelo com um monstro Guardião aleatório e seu Card de Magia de Equipamento correspondente na sua mão. Os monstros equipados que você controla ganham 500 de ATK. Um monstro Guardião que você controla não pode ser alvo nem ser destruído pelos efeitos de card do seu oponente enquanto seu Card de Magia de Equipamento correspondente estiver com a face para cima no campo.',
        '各デュエルの開始時に、ランダムな「ガーディアン」モンスター1体とそれに対応する装備魔法カード1枚を手札に加える。自分フィールドの装備カードを装備したモンスターの攻撃力は500アップする。対応する装備魔法カードがフィールドに表側表示で存在する限り、自分フィールドの「ガーディアン」モンスターは相手の効果の対象にならず、相手の効果では破壊されない。',
        '각 듀얼 개시시에, 무작위 "가디언" 몬스터 1장과 그에 대응하는 장착 마법 카드 1장을 패에 넣는다. 자신 필드의 장착 카드를 장착한 몬스터의 공격력은 500 올린다. 대응하는 장착 마법 카드가 필드에 앞면 표시로 존재하는 한, 자신 필드의 "가디언" 몬스터는 상대의 효과의 대상이 되지 않고, 상대의 효과로는 파괴되지 않는다.',
        '每场决斗开始时，把随机1只「守护者」怪兽和其对应的1张装备魔法卡加入手卡。自己场上的有装备卡装备的怪兽的攻击力上升500。只要对应的装备魔法卡在场上表侧表示存在，自己场上的「守护者」怪兽不会成为对方的效果的对象，不会被对方的效果破坏。'),
}


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(catalog_path.read_text(encoding='utf8'))
    known = {r['en'] for r in rows}
    added = {}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        count = 0
        for key, values in RELIC.items():
            if key not in table: table[key] = values[index]; count += 1
        if count: write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    fresh = 0
    for key in RELIC:
        if key not in known:
            rows.append({'group': 'relic', 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-14'}); fresh += 1
    if fresh: write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh)


if __name__ == '__main__':
    main()
