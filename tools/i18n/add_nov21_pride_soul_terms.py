"""My Pride and Soul (2026-11-21), the fused relic of the four Blue-Eyes relics, in all 8 languages.
Never overwrites an existing translation.

"Blue-Eyes White Dragon" is the official card name in each language, read from the card bundles
(android/web/i18n/<lang>.json, built by tools/i18n/build_bundles.py), so the text quotes exactly what the card shows.
The "Blue-Eyes" archetype and the Type, Attribute and phase words follow Twin Eyes', Dragon's Claws' and the other relics'
existing translations."""
import json,runpy,sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
BEWD = '89631139'
NAME = 'My Pride and Soul'
TEXT = ('Dragon monsters you control gain 800 ATK/DEF. Your opponent cannot activate Trap Cards during your Battle Phase. At the '
        'start of the Duel: Special Summon 1 "Blue-Eyes" monster from your Deck in Attack Position, then add 1 card that mentions '
        '"Blue-Eyes White Dragon" from your Deck to your hand. Once per turn, when a "Blue-Eyes" monster you control is destroyed: '
        'You can Special Summon 1 LIGHT Dragon monster from your hand, Deck or Extra Deck, ignoring its Summoning conditions.')
NAMES = ('Mein Stolz und meine Seele', 'Mi Orgullo y Mi Alma', 'Ma Fierté et Mon Âme', 'Il Mio Orgoglio e la Mia Anima',
         '我が誇りと魂', '나의 긍지와 영혼', 'Meu Orgulho e Minha Alma', '我的骄傲与灵魂')
# {bewd} is the card's name from that language's bundle.
TEXTS = (
 'Alle Drache-Monster, die du kontrollierst, erhalten 800 ATK/DEF. Dein Gegner kann während deiner Battle Phase keine '
 'Fallenkarten aktivieren. Zu Beginn des Duells: Beschwöre 1 „Blauäugiger“-Monster als Spezialbeschwörung in Angriffsposition '
 'von deinem Deck, füge danach 1 Karte, die „{bewd}“ nennt, von deinem Deck deiner Hand hinzu. Einmal pro Spielzug, wenn ein '
 '„Blauäugiger“-Monster, das du kontrollierst, zerstört wird: Du kannst 1 LICHT-Drache-Monster als Spezialbeschwörung von deiner '
 'Hand, deinem Deck oder Extra Deck beschwören, wobei du seine Beschwörungsbedingungen ignorierst.',
 'Los monstruos Dragón que controles ganan 800 ATK/DEF. Tu adversario no puede activar Cartas de Trampa durante tu Battle Phase. '
 'Al comienzo del Duelo: Invoca de Modo Especial 1 monstruo "Ojos Azules" desde tu Deck en Posición de Ataque y, después, añade a '
 'tu mano 1 carta de tu Deck que mencione "{bewd}". Una vez por turno, cuando un monstruo "Ojos Azules" que controlas sea '
 'destruido: puedes Invocar de Modo Especial 1 monstruo Dragón de LUZ desde tu mano, Deck o Deck Extra, ignorando sus condiciones '
 'de Invocación.',
 'Les monstres Dragon que vous contrôlez gagnent 800 ATK/DEF. Votre adversaire ne peut pas activer de Cartes Piège durant votre '
 "Battle Phase. Au début du Duel : Invoquez Spécialement 1 monstre « aux Yeux Bleus » depuis votre Deck en Position d'Attaque, "
 "puis ajoutez 1 carte qui mentionne « {bewd} » depuis votre Deck à votre main. Une fois par tour, lorsqu'un monstre « aux Yeux "
 'Bleus » que vous contrôlez est détruit : vous pouvez Invoquer Spécialement 1 monstre Dragon LUMIÈRE depuis votre main, Deck ou '
 "Extra Deck, en ignorant ses conditions d'Invocation.",
 'I mostri Drago che controlli guadagnano 800 ATK/DEF. Il tuo avversario non può attivare Carte Trappola durante la tua Battle '
 "Phase. All'inizio del Duello: Evoca Specialmente 1 mostro \"Occhi Blu\" dal tuo Deck in Posizione di Attacco, poi aggiungi alla "
 'tua mano 1 carta dal tuo Deck che menziona "{bewd}". Una volta per turno, quando un mostro "Occhi Blu" che controlli viene '
 'distrutto: puoi Evocare Specialmente 1 mostro Drago LUCE dalla tua mano, dal tuo Deck o dal tuo Extra Deck, ignorando le sue '
 'condizioni di Evocazione.',
 '自分フィールドのドラゴン族モンスターの攻撃力・守備力は800アップする。自分のバトルフェイズ中、相手は罠カードを発動できない。'
 'デュエル開始時に発動する。デッキから「ブルーアイズ」モンスター1体を攻撃表示で特殊召喚し、その後、「{bewd}」のカード名が'
 '記されたカード1枚をデッキから手札に加える。1ターンに1度、自分フィールドの「ブルーアイズ」モンスターが破壊された場合に発動できる。'
 '手札・デッキ・エクストラデッキから光属性のドラゴン族モンスター1体を召喚条件を無視して特殊召喚する。',
 '자신 필드의 드래곤족 몬스터의 공격력 / 수비력은 800 올린다. 자신 배틀 페이즈 중에, 상대는 함정 카드를 발동할 수 없다. '
 '듀얼 개시시에 발동한다. 덱에서 "블루아이즈" 몬스터 1장을 공격 표시로 특수 소환하고, 그 후 "{bewd}"의 카드명이 쓰여진 카드 '
 '1장을 덱에서 패에 넣는다. 1턴에 1번, 자신 필드의 "블루아이즈" 몬스터가 파괴되었을 경우에 발동할 수 있다. 패 / 덱 / 엑스트라 '
 '덱에서 빛 속성 드래곤족 몬스터 1장을 소환 조건을 무시하고 특수 소환한다.',
 'Os monstros Dragão que você controla ganham 800 de ATK/DEF. Seu oponente não pode ativar Cards de Armadilha durante a sua Fase '
 'de Batalha. No início do Duelo: faça a Invocação-Especial de 1 monstro "Olhos Azuis" do seu Deck em Posição de Ataque e, depois, '
 'adicione 1 card que mencione "{bewd}" do seu Deck à sua mão. Uma vez por turno, quando um monstro "Olhos Azuis" que você controla '
 'for destruído: você pode fazer a Invocação-Especial de 1 monstro Dragão de LUZ da sua mão, Deck ou Deck Adicional, ignorando as '
 'condições de Invocação dele.',
 '自己场上的龙族怪兽的攻击力·守备力上升800。自己的战斗阶段中，对方不能把陷阱卡发动。决斗开始时发动。从卡组把1只「青眼」怪兽'
 '攻击表示特殊召唤，那之后，从卡组把1张有「{bewd}」的卡名记述的卡加入手卡。1回合1次，自己场上的「青眼」怪兽被破坏的场合才能发动。'
 '从手卡·卡组·额外卡组把1只光属性的龙族怪兽无视召唤条件特殊召唤。',
)


def card_name(lang):
    bundle = json.loads((ROOT / f'android/web/i18n/{lang}.json').read_text(encoding='utf-8-sig'))
    name = bundle['cards'][BEWD][0]
    assert name and name != 'Blue-Eyes White Dragon', (lang, name)
    return name


def main():
    sys.path.insert(0, str(ROOT))
    import content
    # The keys must be exactly the game's English texts.
    assert content.ARTIFACTS['my_pride_and_soul'][0] == NAME and content.ARTIFACTS['my_pride_and_soul'][2] == TEXT
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        table.setdefault(NAME, NAMES[i])
        table.setdefault(TEXT, TEXTS[i].replace('{bewd}', card_name(lang)))
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in (NAME, TEXT):
        if en not in known: catalog.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': 'text added 2026-11-21 (My Pride and Soul)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', 2, {lang: card_name(lang) for lang in LANGS})


if __name__ == '__main__':
    main()
