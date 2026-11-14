"""Adds the relics of the 2026-11-14 Discord review to every language: Guardian's Call, Soul Fusion, Gate Calling,
Dark Lotus and Ring of Defense (names and rules text). Card names use each language's official card name.
Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text  # a plain write fails while a scanner maps the file (Errno 22)

LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    "Guardian's Call": ('Ruf des Wächters', 'Llamada del Guardián', 'Appel du Gardien', 'Richiamo del Guardiano', 'Chamado do Guardião', 'ガーディアンの呼び声', '가디언의 부름', '守护者的呼唤'),
    'Once per turn, you can Special Summon a "Guardian" monster from your hand while you control a face-up Equip Spell that lists its name.': (
        'Einmal pro Spielzug kannst du ein „Wächter“-Monster als Spezialbeschwörung von deiner Hand beschwören, solange du eine offene Ausrüstungszauberkarte kontrollierst, die seinen Namen nennt.',
        'Una vez por turno, puedes Invocar de Modo Especial un monstruo "Guardián" desde tu mano mientras controles una Carta Mágica de Equipo boca arriba que mencione su nombre.',
        'Une fois par tour, vous pouvez Invoquer Spécialement un monstre « Gardien » depuis votre main tant que vous contrôlez face recto une Carte Magie d\'Équipement qui mentionne son nom.',
        'Una volta per turno, puoi Evocare Specialmente un mostro "Guardiano" dalla tua mano mentre controlli una Carta Magia Equipaggiamento scoperta che cita il suo nome.',
        'Uma vez por turno, você pode fazer a Invocação-Especial de um monstro "Guardião" da sua mão enquanto controlar um Card de Magia de Equipamento com a face para cima que mencione o nome dele.',
        '1ターンに1度、そのカード名が記された装備魔法カードを自分が表側表示でコントロールしている間、手札から「ガーディアン」モンスターを特殊召喚できる。',
        '1턴에 1번, 그 카드명이 쓰여진 장착 마법 카드를 자신이 앞면 표시로 컨트롤하고 있는 동안, 패에서 "가디언" 몬스터를 특수 소환할 수 있다.',
        '1回合1次，自己场上有记述其卡名的装备魔法卡表侧表示存在的期间，可以从手卡把「守护者」怪兽特殊召唤。'),
    'Soul Fusion': ('Seelenfusion', 'Fusión de Almas', 'Fusion des Âmes', 'Fusione delle Anime', 'Fusão de Almas', '魂の融合', '영혼의 융합', '灵魂融合'),
    'Once per Duel, you can Fusion Summon a monster from your Extra Deck by banishing its materials from your GY. It cannot attack the turn it is Summoned.': (
        'Einmal pro Duell kannst du ein Monster als Fusionsbeschwörung von deinem Extra Deck beschwören, indem du seine Materialien aus deinem Friedhof verbannst. Es kann in dem Spielzug, in dem es beschworen wird, nicht angreifen.',
        'Una vez por Duelo, puedes Invocar por Fusión un monstruo desde tu Deck Extra desterrando sus materiales de tu Cementerio. No puede atacar en el turno en que es Invocado.',
        'Une fois par Duel, vous pouvez Invoquer par Fusion un monstre depuis votre Extra Deck en bannissant ses matériels depuis votre Cimetière. Il ne peut pas attaquer durant le tour de son Invocation.',
        'Una volta per Duello, puoi Evocare tramite Fusione un mostro dal tuo Extra Deck bandendo i suoi materiali dal tuo Cimitero. Non può attaccare nel turno in cui viene Evocato.',
        'Uma vez por Duelo, você pode fazer a Invocação-Fusão de um monstro do seu Deck Adicional banindo as matérias dele do seu Cemitério. Ele não pode atacar no turno em que for Invocado.',
        '1デュエルに1度、自分の墓地から融合素材を除外して、エクストラデッキからモンスターを融合召喚できる。そのモンスターは召喚されたターンには攻撃できない。',
        '1듀얼에 1번, 자신 묘지에서 융합 소재를 제외하고, 엑스트라 덱에서 몬스터를 융합 소환할 수 있다. 그 몬스터는 소환된 턴에는 공격할 수 없다.',
        '1场决斗1次，可以把自己墓地的融合素材除外，从额外卡组把怪兽融合召唤。那只怪兽在召唤的回合不能攻击。'),
    'Gate Calling': ('Ruf des Tores', 'Llamada de la Puerta', 'Appel de la Porte', 'Richiamo del Cancello', 'Chamado do Portão', 'ゲートの呼び声', '게이트의 부름', '门之呼唤'),
    'Once per turn, when you Tribute Summon "Sanga of the Thunder", "Kazejin" or "Suijin", you can Special Summon one of the other two from your hand.': (
        'Einmal pro Spielzug, wenn du „Sanga des Donners“, „Kazejin“ oder „Suijin“ als Tributbeschwörung beschwörst, kannst du eines der anderen beiden als Spezialbeschwörung von deiner Hand beschwören.',
        'Una vez por turno, cuando Invoques por Sacrificio "Sanga del Trueno", "Kazejin" o "Suijin", puedes Invocar de Modo Especial uno de los otros dos desde tu mano.',
        'Une fois par tour, lorsque vous Invoquez par Sacrifice « Sanga du Tonnerre », « Kazejin » ou « Suijin », vous pouvez Invoquer Spécialement l\'un des deux autres depuis votre main.',
        'Una volta per turno, quando Evochi tramite Tributo "Sanga del Tuono", "Kazejin" o "Suijin", puoi Evocare Specialmente uno degli altri due dalla tua mano.',
        'Uma vez por turno, quando você fizer a Invocação-Tributo de "Sanga do Trovão", "Kazejin" ou "Suijin", você pode fazer a Invocação-Especial de um dos outros dois da sua mão.',
        '1ターンに1度、「雷魔神－サンガ」「風魔神－ヒューガ」「水魔神－スーガ」のいずれかをアドバンス召喚した時、残り2体のうち1体を手札から特殊召喚できる。',
        '1턴에 1번, "번개 마신－썬가", "풍 마신－휴가", "수 마신－스가" 중 하나를 어드밴스 소환했을 때, 나머지 2장 중 1장을 패에서 특수 소환할 수 있다.',
        '1回合1次，把「雷魔神-桑迦」「风魔神-修迦」「水魔神-斯迦」的其中1只上级召唤时，可以从手卡把剩下2只的其中1只特殊召唤。'),
    'Dark Lotus': ('Dunkler Lotus', 'Loto Oscuro', 'Lotus Sombre', 'Loto Oscuro', 'Lótus Sombria', 'ダーク・ロータス', '다크 로터스', '暗黑莲花'),
    'Once per Duel, at the start of your first Standby Phase, you can Special Summon 1 monster from your Deck or Extra Deck, ignoring its Summoning conditions.': (
        'Einmal pro Duell, zu Beginn deiner ersten Standby Phase, kannst du 1 Monster von deinem Deck oder Extra Deck als Spezialbeschwörung beschwören, wobei du seine Beschwörungsbedingungen ignorierst.',
        'Una vez por Duelo, al principio de tu primera Standby Phase, puedes Invocar de Modo Especial 1 monstruo desde tu Deck o Deck Extra, ignorando sus condiciones de Invocación.',
        'Une fois par Duel, au début de votre première Standby Phase, vous pouvez Invoquer Spécialement 1 monstre depuis votre Deck ou Extra Deck, en ignorant ses conditions d\'Invocation.',
        'Una volta per Duello, all\'inizio della tua prima Standby Phase, puoi Evocare Specialmente 1 mostro dal tuo Deck o Extra Deck, ignorando le sue condizioni di Evocazione.',
        'Uma vez por Duelo, no começo da sua primeira Fase de Apoio, você pode fazer a Invocação-Especial de 1 monstro do seu Deck ou Deck Adicional, ignorando as condições de Invocação dele.',
        '1デュエルに1度、自分の最初のスタンバイフェイズ開始時に、デッキまたはエクストラデッキからモンスター1体を召喚条件を無視して特殊召喚できる。',
        '1듀얼에 1번, 자신의 첫 스탠바이 페이즈 개시시에, 덱 또는 엑스트라 덱에서 몬스터 1장을 소환 조건을 무시하고 특수 소환할 수 있다.',
        '1场决斗1次，自己的最初的准备阶段开始时，可以从卡组或额外卡组把1只怪兽无视召唤条件特殊召唤。'),
    'Ring of Defense': ('Ring der Verteidigung', 'Anillo de Defensa', 'Anneau de Défense', 'Anello di Difesa', 'Anel de Defesa', '防御輪', '방어륜', '防御轮'),
    'After each Duel, recover the LP you lost to your own card effects and costs during it (up to your LP limit).': (
        'Erhalte nach jedem Duell die LP zurück, die du darin durch die Effekte und Kosten deiner eigenen Karten verloren hast (bis zu deinem LP-Limit).',
        'Después de cada Duelo, recupera los LP que perdiste en él por los efectos y costes de tus propias cartas (hasta tu límite de LP).',
        'Après chaque Duel, récupérez les LP perdus durant celui-ci à cause des effets et coûts de vos propres cartes (jusqu\'à votre limite de LP).',
        'Dopo ogni Duello, recupera i LP che hai perso durante il Duello a causa degli effetti e dei costi delle tue carte (fino al tuo limite di LP).',
        'Após cada Duelo, recupere os PV que você perdeu nele pelos efeitos e custos dos seus próprios cards (até o seu limite de PV).',
        '各デュエルの後、そのデュエル中に自分のカードの効果やコストで失ったLPを回復する（LPの上限まで）。',
        '각 듀얼 후, 그 듀얼 중에 자신 카드의 효과나 코스트로 잃은 LP를 회복한다 (LP 상한까지).',
        '每场决斗后，回复那场决斗中因自己的卡的效果和代价而失去的基本分（直到基本分上限）。'),
    'Ultimate Armory': ('Ultimative Waffenkammer', 'Arsenal Supremo', 'Arsenal Ultime', 'Armeria Suprema', 'Arsenal Supremo', '究極の武器庫', '궁극의 무기고', '究极武器库'),
    'While a monster you control is equipped with 3 or more Equip Spells, it cannot be destroyed by card effects.': (
        'Solange ein Monster, das du kontrollierst, mit 3 oder mehr Ausrüstungszauberkarten ausgerüstet ist, kann es nicht durch Karteneffekte zerstört werden.',
        'Mientras un monstruo que controlas esté equipado con 3 o más Cartas Mágicas de Equipo, no puede ser destruido por efectos de cartas.',
        "Tant qu'un monstre que vous contrôlez est équipé d'au moins 3 Cartes Magie d'Équipement, il ne peut pas être détruit par des effets de carte.",
        'Finché un mostro che controlli è equipaggiato con 3 o più Carte Magia Equipaggiamento, non può essere distrutto da effetti di carte.',
        'Enquanto um monstro que você controla estiver equipado com 3 ou mais Cards de Magia de Equipamento, ele não pode ser destruído por efeitos de card.',
        '自分フィールドのモンスターが装備魔法カードを3枚以上装備している間、そのモンスターはカードの効果では破壊されない。',
        '자신 필드의 몬스터가 장착 마법 카드를 3장 이상 장착하고 있는 동안, 그 몬스터는 카드의 효과로는 파괴되지 않는다.',
        '自己场上的怪兽装备有3张以上的装备魔法卡的期间，那只怪兽不会被卡的效果破坏。'),
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
        for key, values in TERMS.items():
            if key not in table: table[key] = values[index]; count += 1
        write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    fresh = 0
    for key in TERMS:
        if key not in known:
            rows.append({'group': 'relic', 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-14 (Discord relic suggestions)'}); fresh += 1
    write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh)


if __name__ == '__main__':
    main()
