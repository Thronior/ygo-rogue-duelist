"""Adds TRUANT's three relics of 2026-11-13 to every language: Armory Aid, Spiritual Retribution and the cursed relic
Vampiric Contact (its two halves, which the cursed relic screen shows apart, and the joined text).
Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text  # a plain write fails while a scanner maps the file (Errno 22)

LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    'Armory Aid': ('Waffenkammer-Hilfe', 'Ayuda del Arsenal', "Aide de l'Arsenal", "Aiuto dell'Armeria", 'Auxílio do Arsenal', '武器庫の援助', '무기고의 원조', '武器库援助'),
    'At the start of each Duel, add 1 random Equip Spell from your Deck to your hand.': (
        'Zu Beginn jedes Duells füge 1 zufällige Ausrüstungszauberkarte von deinem Deck deiner Hand hinzu.',
        'Al principio de cada Duelo, añade 1 Carta Mágica de Equipo aleatoria desde tu Deck a tu mano.',
        "Au début de chaque Duel, ajoutez 1 Carte Magie d'Équipement aléatoire depuis votre Deck à votre main.",
        "All'inizio di ogni Duello, aggiungi 1 Carta Magia Equipaggiamento casuale dal tuo Deck alla tua mano.",
        'No começo de cada Duelo, adicione 1 Card de Magia de Equipamento aleatório do seu Deck à sua mão.',
        '各デュエルの開始時に、自分のデッキからランダムな装備魔法カード1枚を手札に加える。',
        '각 듀얼 개시시에, 자신의 덱에서 무작위 장착 마법 카드 1장을 패에 넣는다.',
        '每场决斗开始时，从自己卡组把随机1张装备魔法卡加入手卡。'),
    'Spiritual Retribution': ('Spirituelle Vergeltung', 'Retribución Espiritual', 'Rétribution Spirituelle', 'Retribuzione Spirituale', 'Retribuição Espiritual', '霊魂の報い', '영혼의 응보', '灵魂报应'),
    'Once per Duel, you can Tribute Summon a Spirit monster by banishing monsters from your GY as the Tributes.': (
        'Einmal pro Duell kannst du ein Spirit-Monster als Tributbeschwörung beschwören, indem du Monster aus deinem Friedhof als Tribute verbannst.',
        'Una vez por Duelo, puedes Invocar por Sacrificio un monstruo Spirit desterrando monstruos de tu Cementerio como los Sacrificios.',
        'Une fois par Duel, vous pouvez Invoquer par Sacrifice un monstre Spirit en bannissant des monstres de votre Cimetière comme Sacrifices.',
        'Una volta per Duello, puoi Evocare tramite Tributo un mostro Spirit bandendo mostri dal tuo Cimitero come Tributi.',
        'Uma vez por Duelo, você pode fazer a Invocação-Tributo de um monstro Espírito banindo monstros do seu Cemitério como os Tributos.',
        '1デュエルに1度、自分の墓地のモンスターをリリースの代わりに除外して、スピリットモンスターをアドバンス召喚できる。',
        '1듀얼에 1번, 자신 묘지의 몬스터를 릴리스 대신 제외하고, 스피릿 몬스터를 어드밴스 소환할 수 있다.',
        '1场决斗1次，可以把自己墓地的怪兽作为解放除外，把灵魂怪兽上级召唤。'),
    'Vampiric Contact': ('Vampirische Berührung', 'Contacto Vampírico', 'Contact Vampirique', 'Contatto Vampirico', 'Contato Vampírico', '吸血の接触', '흡혈의 접촉', '吸血接触'),
    'Each time you destroy a monster by battle, gain 500 LP.': (
        'Jedes Mal, wenn du ein Monster durch Kampf zerstörst, erhältst du 500 LP.',
        'Cada vez que destruyas un monstruo en batalla, ganas 500 LP.',
        'Chaque fois que vous détruisez un monstre au combat, gagnez 500 LP.',
        'Ogni volta che distruggi un mostro in battaglia, guadagni 500 LP.',
        'Sempre que você destruir um monstro em batalha, ganhe 500 PV.',
        '自分が戦闘でモンスターを破壊する度に、自分は500LP回復する。',
        '자신이 전투로 몬스터를 파괴할 때마다, 자신은 500 LP 회복한다.',
        '每次自己战斗破坏怪兽，自己回复500基本分。'),
    'Each time a monster you control is destroyed by battle, you lose LP equal to its ATK.': (
        'Jedes Mal, wenn ein Monster, das du kontrollierst, durch Kampf zerstört wird, verlierst du LP in Höhe seiner ATK.',
        'Cada vez que un monstruo que controlas sea destruido en batalla, pierdes LP iguales a su ATK.',
        "Chaque fois qu'un monstre que vous contrôlez est détruit au combat, vous perdez des LP égaux à son ATK.",
        'Ogni volta che un mostro che controlli viene distrutto in battaglia, perdi LP pari al suo ATK.',
        'Sempre que um monstro que você controla for destruído em batalha, você perde PV iguais ao ATK dele.',
        '自分フィールドのモンスターが戦闘で破壊される度に、自分はその攻撃力分のLPを失う。',
        '자신 필드의 몬스터가 전투로 파괴될 때마다, 자신은 그 공격력만큼 LP를 잃는다.',
        '每次自己场上的怪兽被战斗破坏，自己失去那个攻击力数值的基本分。'),
}
JOINED = [('Each time you destroy a monster by battle, gain 500 LP. Each time a monster you control is destroyed by battle, you lose LP equal to its ATK.',
           'Each time you destroy a monster by battle, gain 500 LP.', 'Each time a monster you control is destroyed by battle, you lose LP equal to its ATK.')]


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(catalog_path.read_text(encoding='utf8'))
    known = {r['en'] for r in rows}
    english = list(TERMS) + [whole for whole, _, _ in JOINED]
    added = {}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        new = {key: values[index] for key, values in TERMS.items()}
        join = '' if lang in ('ja', 'zh') else ' '
        for whole, first, second in JOINED: new[whole] = new[first] + join + new[second]
        count = 0
        for key, text in new.items():
            if key not in table: table[key] = text; count += 1
        write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    fresh = 0
    for key in english:
        if key not in known:
            rows.append({'group': 'relic', 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-13 (TRUANT)'}); fresh += 1
    write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh)


if __name__ == '__main__':
    main()
