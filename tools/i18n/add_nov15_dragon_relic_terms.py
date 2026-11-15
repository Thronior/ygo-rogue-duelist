"""Adds the relics of the 2026-11-15 Discord review to every language: Magician's Bond, Blue-Eyes Radiance, Master and
Apprentice, Black Chaos Rite, Dragon Lord's Decree, Twin Eyes, Dragon Blood Fusion, Titan's Charge and the cursed relic
Poison of the Old Man (its two halves, which the cursed relic screen shows apart, and the joined text). Card names use the
game's own card translations (data/i18n/cards). Every file is read fresh; existing translations are never overwritten, so
re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text  # a plain write fails while a scanner maps the file (Errno 22)

LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    "Magician's Bond": ('Band des Magiers', 'Vínculo del Mago', 'Lien du Magicien', 'Legame del Mago', 'Laço do Mago', '魔術師の絆', '마술사의 인연', '魔术师之绊'),
    'Once per turn, if you Normal Summon a "Dark Magician" monster: You can add 1 card that mentions "Dark Magician" from your Deck to your hand.': (
        'Einmal pro Spielzug, falls du ein „Dunkler Magier“-Monster als Normalbeschwörung beschwörst: Du kannst 1 Karte, die „Dunkler Magier“ nennt, von deinem Deck deiner Hand hinzufügen.',
        'Una vez por turno, si Invocas de Modo Normal un monstruo "Mago Oscuro": puedes añadir a tu mano 1 carta de tu Deck que mencione "Mago Oscuro".',
        'Une fois par tour, si vous Invoquez Normalement un monstre « Magicien Sombre » : vous pouvez ajouter 1 carte qui mentionne « Magicien Sombre » depuis votre Deck à votre main.',
        'Una volta per turno, se Evochi Normalmente un mostro "Mago Nero": puoi aggiungere alla tua mano 1 carta dal tuo Deck che menziona "Mago Nero".',
        'Uma vez por turno, se você fizer a Invocação-Normal de um monstro "Mago Negro": você pode adicionar 1 card que mencione "Mago Negro" do seu Deck à sua mão.',
        '1ターンに1度、「ブラック・マジシャン」モンスターを通常召喚した場合に発動できる。「ブラック・マジシャン」のカード名が記されたカード1枚をデッキから手札に加える。',
        '1턴에 1번, "블랙 매지션" 몬스터를 일반 소환했을 경우에 발동할 수 있다. "블랙 매지션"의 카드명이 쓰여진 카드 1장을 덱에서 패에 넣는다.',
        '1回合1次，「黑魔术师」怪兽通常召唤的场合才能发动。从卡组把1张有「黑魔术师」的卡名记述的卡加入手卡。'),
    'Blue-Eyes Radiance': ('Blauäugiges Strahlen', 'Resplandor de Ojos Azules', 'Éclat aux Yeux Bleus', 'Splendore Occhi Blu', 'Radiância de Olhos Azuis', 'ブルーアイズの輝き', '블루아이즈의 광휘', '青眼的光辉'),
    'Once per turn: You can send 3 "Blue-Eyes White Dragon" from your hand and/or field to the GY; Special Summon 1 "Blue-Eyes Shining Dragon" from your hand or Deck, ignoring its Summoning conditions. It is unaffected by other card effects until the end of your opponent\'s next turn.': (
        'Einmal pro Spielzug: Du kannst 3 „Blauäugiger w. Drache“ von deiner Hand und/oder deiner Spielfeldseite auf den Friedhof legen; beschwöre 1 „Leuchtender blauäugiger Drache“ als Spezialbeschwörung von deiner Hand oder deinem Deck, wobei du seine Beschwörungsbedingungen ignorierst. Bis zum Ende des nächsten Spielzugs deines Gegners ist er von den Effekten anderer Karten nicht betroffen.',
        'Una vez por turno: puedes mandar al Cementerio 3 "Dragón Blanco de Ojos Azules" de tu mano y/o Campo; Invoca de Modo Especial 1 "Dragón Brillante de Ojos Azules" desde tu mano o Deck, ignorando sus condiciones de Invocación. No es afectado por los efectos de otras cartas hasta el final del próximo turno de tu adversario.',
        "Une fois par tour : vous pouvez envoyer au Cimetière 3 « Dragon Blanc aux Yeux Bleus » depuis votre main et/ou votre Terrain ; Invoquez Spécialement 1 « Dragon aux Yeux Bleus Rayonnants » depuis votre main ou Deck, en ignorant ses conditions d'Invocation. Il n'est pas affecté par les effets des autres cartes jusqu'à la fin du prochain tour de votre adversaire.",
        'Una volta per turno: puoi mandare al Cimitero 3 "Drago Bianco Occhi Blu" dalla tua mano e/o dal tuo Terreno; Evoca Specialmente 1 "Drago Lucente Occhi Blu" dalla tua mano o dal tuo Deck, ignorando le sue condizioni di Evocazione. Non è influenzato dagli effetti di altre carte fino alla fine del prossimo turno del tuo avversario.',
        'Uma vez por turno: você pode enviar 3 "Dragão Branco de Olhos Azuis" da sua mão e/ou do seu campo para o Cemitério; Invoque por Invocação-Especial 1 "Dragão Brilhante de Olhos Azuis" da sua mão ou Deck, ignorando as condições de Invocação dele. Ele não é afetado pelos efeitos de outros cards até o final do próximo turno do seu oponente.',
        '1ターンに1度、自分の手札・フィールドから「青眼の白龍」3体を墓地へ送って発動できる。手札・デッキから「青眼の光龍」1体を召喚条件を無視して特殊召喚する。そのモンスターは相手の次のターンの終了時まで、他のカードの効果を受けない。',
        '1턴에 1번, 자신의 패 / 필드에서 "푸른 눈의 백룡" 3장을 묘지로 보내고 발동할 수 있다. 패 / 덱에서 "푸른 눈의 빛룡" 1장을 소환 조건을 무시하고 특수 소환한다. 그 몬스터는 상대의 다음 턴 종료시까지, 다른 카드의 효과를 받지 않는다.',
        '1回合1次，把自己的手卡·场上3只「青眼白龙」送去墓地才能发动。从手卡·卡组把1只「青眼光龙」无视召唤条件特殊召唤。那只怪兽直到对方的下个回合结束时不受其他卡的效果影响。'),
    'Master and Apprentice': ('Meister und Lehrling', 'Maestro y Aprendiz', 'Maître et Apprenti', 'Maestro e Apprendista', 'Mestre e Aprendiz', '師匠と弟子', '스승과 제자', '师父与徒弟'),
    'Once per turn, if a "Dark Magician" monster you control is destroyed: You can Special Summon 1 "Dark Magician" monster from your hand, ignoring its Summoning conditions.': (
        'Einmal pro Spielzug, falls ein „Dunkler Magier“-Monster, das du kontrollierst, zerstört wird: Du kannst 1 „Dunkler Magier“-Monster als Spezialbeschwörung von deiner Hand beschwören, wobei du seine Beschwörungsbedingungen ignorierst.',
        'Una vez por turno, si un monstruo "Mago Oscuro" que controlas es destruido: puedes Invocar de Modo Especial 1 monstruo "Mago Oscuro" desde tu mano, ignorando sus condiciones de Invocación.',
        "Une fois par tour, si un monstre « Magicien Sombre » que vous contrôlez est détruit : vous pouvez Invoquer Spécialement 1 monstre « Magicien Sombre » depuis votre main, en ignorant ses conditions d'Invocation.",
        'Una volta per turno, se un mostro "Mago Nero" che controlli viene distrutto: puoi Evocare Specialmente 1 mostro "Mago Nero" dalla tua mano, ignorando le sue condizioni di Evocazione.',
        'Uma vez por turno, se um monstro "Mago Negro" que você controla for destruído: você pode fazer a Invocação-Especial de 1 monstro "Mago Negro" da sua mão, ignorando as condições de Invocação dele.',
        '1ターンに1度、自分フィールドの「ブラック・マジシャン」モンスターが破壊された場合に発動できる。手札から「ブラック・マジシャン」モンスター1体を召喚条件を無視して特殊召喚する。',
        '1턴에 1번, 자신 필드의 "블랙 매지션" 몬스터가 파괴되었을 경우에 발동할 수 있다. 패에서 "블랙 매지션" 몬스터 1장을 소환 조건을 무시하고 특수 소환한다.',
        '1回合1次，自己场上的「黑魔术师」怪兽被破坏的场合才能发动。从手卡把1只「黑魔术师」怪兽无视召唤条件特殊召唤。'),
    'Black Chaos Rite': ('Ritus des Schwarzen Chaos', 'Rito del Caos Negro', 'Rite du Chaos Noir', 'Rito del Chaos Nero', 'Rito do Caos Negro', '黒き混沌の儀', '검은 혼돈의 의식', '黑色混沌之仪'),
    'Once per Duel: You can Tribute 1 "Dark Magician" you control; Special Summon 1 "Dark Magician of Chaos" from your hand or Deck, ignoring its Summoning conditions.': (
        'Einmal pro Duell: Du kannst 1 „Dunkler Magier“, den du kontrollierst, als Tribut anbieten; beschwöre 1 „Dunkler Magier des Chaos“ als Spezialbeschwörung von deiner Hand oder deinem Deck, wobei du seine Beschwörungsbedingungen ignorierst.',
        'Una vez por Duelo: puedes Sacrificar 1 "Mago Oscuro" que controles; Invoca de Modo Especial 1 "Mago Oscuro del Caos" desde tu mano o Deck, ignorando sus condiciones de Invocación.',
        "Une fois par Duel : vous pouvez Sacrifier 1 « Magicien Sombre » que vous contrôlez ; Invoquez Spécialement 1 « Magicien Sombre du Chaos » depuis votre main ou Deck, en ignorant ses conditions d'Invocation.",
        'Una volta per Duello: puoi offrire come Tributo 1 "Mago Nero" che controlli; Evoca Specialmente 1 "Mago Nero del Chaos" dalla tua mano o dal tuo Deck, ignorando le sue condizioni di Evocazione.',
        'Uma vez por Duelo: você pode oferecer como Tributo 1 "Mago Negro" que você controla; Invoque por Invocação-Especial 1 "Mago Negro do Caos" da sua mão ou Deck, ignorando as condições de Invocação dele.',
        '1デュエルに1度、自分フィールドの「ブラック・マジシャン」1体をリリースして発動できる。手札・デッキから「混沌の黒魔術師」1体を召喚条件を無視して特殊召喚する。',
        '1듀얼에 1번, 자신 필드의 "블랙 매지션" 1장을 릴리스하고 발동할 수 있다. 패 / 덱에서 "혼돈의 흑마술사" 1장을 소환 조건을 무시하고 특수 소환한다.',
        '1场决斗1次，把自己场上1只「黑魔术师」解放才能发动。从手卡·卡组把1只「混沌之黑魔术师」无视召唤条件特殊召唤。'),
    "Dragon Lord's Decree": ('Erlass des Drachenherrn', 'Decreto del Señor de los Dragones', 'Décret du Seigneur des Dragons', 'Decreto del Signore dei Draghi', 'Decreto do Senhor dos Dragões', '竜の支配者の勅令', '드래곤 지배자의 칙령', '龙之支配者的敕令'),
    'Once per Duel: You can discard 2 Dragon monsters; Special Summon 1 Level 7 or higher Dragon monster from your hand.': (
        'Einmal pro Duell: Du kannst 2 Drache-Monster abwerfen; beschwöre 1 Drache-Monster der Stufe 7 oder höher als Spezialbeschwörung von deiner Hand.',
        'Una vez por Duelo: puedes descartar 2 monstruos Dragón; Invoca de Modo Especial 1 monstruo Dragón de Nivel 7 o mayor desde tu mano.',
        'Une fois par Duel : vous pouvez défausser 2 monstres Dragon ; Invoquez Spécialement 1 monstre Dragon de Niveau 7 ou plus depuis votre main.',
        'Una volta per Duello: puoi scartare 2 mostri Drago; Evoca Specialmente 1 mostro Drago di Livello 7 o superiore dalla tua mano.',
        'Uma vez por Duelo: você pode descartar 2 monstros Dragão; Invoque por Invocação-Especial 1 monstro Dragão de Nível 7 ou mais da sua mão.',
        '1デュエルに1度、手札からドラゴン族モンスター2体を捨てて発動できる。手札からレベル7以上のドラゴン族モンスター1体を特殊召喚する。',
        '1듀얼에 1번, 패에서 드래곤족 몬스터 2장을 버리고 발동할 수 있다. 패에서 레벨 7 이상의 드래곤족 몬스터 1장을 특수 소환한다.',
        '1场决斗1次，从手卡丢弃2只龙族怪兽才能发动。从手卡把1只7星以上的龙族怪兽特殊召唤。'),
    'Twin Eyes': ('Zwillingsaugen', 'Ojos Gemelos', 'Yeux Jumeaux', 'Occhi Gemelli', 'Olhos Gêmeos', 'ツイン・アイズ', '트윈 아이즈', '双眼'),
    'Once per Duel, during your first Standby Phase: Special Summon 1 "Blue-Eyes" or "Red-Eyes" monster from your Deck in Attack Position.': (
        'Einmal pro Duell, während deiner ersten Standby Phase: Beschwöre 1 „Blauäugiger“- oder „Rotäugiger“-Monster als Spezialbeschwörung in Angriffsposition von deinem Deck.',
        'Una vez por Duelo, durante tu primera Standby Phase: Invoca de Modo Especial 1 monstruo "Ojos Azules" u "Ojos Rojos" desde tu Deck en Posición de Ataque.',
        "Une fois par Duel, durant votre première Standby Phase : Invoquez Spécialement 1 monstre « aux Yeux Bleus » ou « aux Yeux Rouges » depuis votre Deck en Position d'Attaque.",
        'Una volta per Duello, durante la tua prima Standby Phase: Evoca Specialmente 1 mostro "Occhi Blu" o "Occhi Rossi" dal tuo Deck in Posizione di Attacco.',
        'Uma vez por Duelo, durante a sua primeira Fase de Apoio: Invoque por Invocação-Especial 1 monstro "Olhos Azuis" ou "Olhos Vermelhos" do seu Deck em Posição de Ataque.',
        '1デュエルに1度、自分の最初のスタンバイフェイズに、デッキから「ブルーアイズ」または「レッドアイズ」モンスター1体を攻撃表示で特殊召喚する。',
        '1듀얼에 1번, 자신의 첫 스탠바이 페이즈에, 덱에서 "블루아이즈" 또는 "레드아이즈" 몬스터 1장을 공격 표시로 특수 소환한다.',
        '1场决斗1次，自己的最初的准备阶段，从卡组把1只「青眼」或「真红眼」怪兽以攻击表示特殊召唤。'),
    'Dragon Blood Fusion': ('Drachenblut-Fusion', 'Fusión de Sangre de Dragón', 'Fusion du Sang de Dragon', 'Fusione del Sangue di Drago', 'Fusão de Sangue de Dragão', '竜血融合', '용혈 융합', '龙血融合'),
    'Once per turn: You can banish 1 "Blue-Eyes" or "Red-Eyes" monster you control; Special Summon 1 Fusion Monster from your Extra Deck that lists the banished monster as Fusion Material, ignoring its Summoning conditions.': (
        'Einmal pro Spielzug: Du kannst 1 „Blauäugiger“- oder „Rotäugiger“-Monster, das du kontrollierst, verbannen; beschwöre 1 Fusionsmonster, das das verbannte Monster als Fusionsmaterial nennt, als Spezialbeschwörung von deinem Extra Deck, wobei du seine Beschwörungsbedingungen ignorierst.',
        'Una vez por turno: puedes desterrar 1 monstruo "Ojos Azules" u "Ojos Rojos" que controles; Invoca de Modo Especial desde tu Deck Extra 1 Monstruo de Fusión que mencione al monstruo desterrado como Material de Fusión, ignorando sus condiciones de Invocación.',
        'Une fois par tour : vous pouvez bannir 1 monstre « aux Yeux Bleus » ou « aux Yeux Rouges » que vous contrôlez ; Invoquez Spécialement depuis votre Extra Deck 1 Monstre Fusion qui mentionne le monstre banni comme Matériel de Fusion, en ignorant ses conditions d’Invocation.',
        'Una volta per turno: puoi bandire 1 mostro "Occhi Blu" o "Occhi Rossi" che controlli; Evoca Specialmente dal tuo Extra Deck 1 Mostro Fusione che elenca il mostro bandito come Materiale da Fusione, ignorando le sue condizioni di Evocazione.',
        'Uma vez por turno: você pode banir 1 monstro "Olhos Azuis" ou "Olhos Vermelhos" que você controla; Invoque por Invocação-Especial do seu Deck Adicional 1 Monstro de Fusão que liste o monstro banido como Matéria de Fusão, ignorando as condições de Invocação dele.',
        '1ターンに1度、自分フィールドの「ブルーアイズ」または「レッドアイズ」モンスター1体を除外して発動できる。除外したモンスターが融合素材として記された融合モンスター1体を、召喚条件を無視してエクストラデッキから特殊召喚する。',
        '1턴에 1번, 자신 필드의 "블루아이즈" 또는 "레드아이즈" 몬스터 1장을 제외하고 발동할 수 있다. 제외한 몬스터가 융합 소재로 쓰여진 융합 몬스터 1장을 소환 조건을 무시하고 엑스트라 덱에서 특수 소환한다.',
        '1回合1次，把自己场上1只「青眼」或「真红眼」怪兽除外才能发动。从额外卡组把1只有除外的怪兽作为融合素材记述的融合怪兽无视召唤条件特殊召唤。'),
    "Titan's Charge": ('Ansturm des Titanen', 'Carga del Titán', 'Charge du Titan', 'Carica del Titano', 'Investida do Titã', '巨人の突撃', '거인의 돌격', '泰坦冲锋'),
    "Once per turn, when a Level 7 or higher monster you control destroys an opponent's monster by battle: It can make a second attack in a row.": (
        'Einmal pro Spielzug, wenn ein Monster der Stufe 7 oder höher, das du kontrollierst, ein Monster deines Gegners durch Kampf zerstört: Es kann direkt danach ein zweites Mal angreifen.',
        'Una vez por turno, cuando un monstruo de Nivel 7 o mayor que controlas destruye en batalla un monstruo de tu adversario: puede realizar un segundo ataque seguido.',
        "Une fois par tour, lorsqu'un monstre de Niveau 7 ou plus que vous contrôlez détruit au combat un monstre de votre adversaire : il peut attaquer une seconde fois d'affilée.",
        'Una volta per turno, quando un mostro di Livello 7 o superiore che controlli distrugge in battaglia un mostro del tuo avversario: può effettuare un secondo attacco consecutivo.',
        'Uma vez por turno, quando um monstro de Nível 7 ou mais que você controla destruir em batalha um monstro do seu oponente: ele pode realizar um segundo ataque seguido.',
        '1ターンに1度、自分フィールドのレベル7以上のモンスターが戦闘で相手モンスターを破壊した時、そのモンスターは続けてもう1度だけ攻撃できる。',
        '1턴에 1번, 자신 필드의 레벨 7 이상의 몬스터가 전투로 상대 몬스터를 파괴했을 때, 그 몬스터는 한 번 더 연속으로 공격할 수 있다.',
        '1回合1次，自己场上的7星以上的怪兽战斗破坏对方怪兽时，那只怪兽可以再1次继续攻击。'),
    'Poison of the Old Man': ('Gift des Alten Mannes', 'Veneno del Hombre Viejo', 'Poison du Vieillard', "Intruglio dell'Anziano", 'Poção do Homem Velho', 'ご隠居の猛毒薬', '노인의 맹독약', '隐居者的猛毒药'),
    'Once per turn, during your End Phase: Toss a coin. Heads: Gain 500 LP.': (
        'Einmal pro Spielzug, während deiner End Phase: Wirf eine Münze. Kopf: Du erhältst 500 LP.',
        'Una vez por turno, durante tu End Phase: lanza una moneda. Cara: ganas 500 LP.',
        'Une fois par tour, durant votre End Phase : lancez une pièce. Face : gagnez 500 LP.',
        'Una volta per turno, durante la tua End Phase: lancia una moneta. Testa: guadagni 500 LP.',
        'Uma vez por turno, durante a sua Fase Final: lance uma moeda. Cara: ganhe 500 PV.',
        '1ターンに1度、自分のエンドフェイズに、コイントスを1回行う。表：自分は500LP回復する。',
        '1턴에 1번, 자신의 엔드 페이즈에, 코인 토스를 1회 실행한다. 앞면: 자신은 500 LP를 회복한다.',
        '1回合1次，自己的结束阶段，进行1次投掷硬币。正面：自己回复500基本分。'),
    'Tails: Lose 500 LP.': ('Zahl: Du verlierst 500 LP.', 'Cruz: pierdes 500 LP.', 'Pile : perdez 500 LP.', 'Croce: perdi 500 LP.', 'Coroa: perca 500 PV.', '裏：自分は500LP失う。', '뒷면: 자신은 500 LP를 잃는다.', '反面：自己失去500基本分。'),
}
# The cursed relic's full text is its two halves joined.
JOINED = [('Once per turn, during your End Phase: Toss a coin. Heads: Gain 500 LP. Tails: Lose 500 LP.',
           'Once per turn, during your End Phase: Toss a coin. Heads: Gain 500 LP.', 'Tails: Lose 500 LP.')]


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
        missing = {key: text for key, text in new.items() if key not in table}
        if missing:
            table.update(missing)
            write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = len(missing)
    fresh = [key for key in english if key not in known]
    if fresh:
        rows.extend({'group': 'relic', 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-15 (Discord relic suggestions)'} for key in fresh)
        write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', len(fresh))


if __name__ == '__main__':
    main()
