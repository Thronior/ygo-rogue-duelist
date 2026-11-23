"""Dev notes for cards Discord keeps reporting as bugs although they follow the real rules (user, 2026-11-23): Harpie Lady
names in the Deck, the mandatory Harpies' Hunting Ground and Man-Eater Bug, Ritual Monsters that were never properly Ritual
Summoned not coming back from the GY, and the first-print Spiritual Energy Settle Machine. Adds rows to
data/card-dev-notes.json in all 8 languages, with each language's official "Harpie Lady" name; never overwrites a note."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ('en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
HARPIE = (
 '(Dev note: this card is "Harpie Lady" in your Deck too, so it shares one 3-copy limit with "Harpie Lady" and every card treated as it)',
 '(Entwickler-Hinweis: Diese Karte ist auch in deinem Deck „Harpyie“, daher teilt sie sich ein Limit von 3 Kopien mit „Harpyie“ und jeder Karte, die als diese behandelt wird.)',
 '(Nota del desarrollador: esta carta también es "Dama Arpía" en tu Deck, así que comparte un único límite de 3 copias con "Dama Arpía" y con cada carta tratada como ella.)',
 '(Note du développeur : cette carte est aussi "Dame Harpie" dans votre Deck, elle partage donc une seule limite de 3 exemplaires avec "Dame Harpie" et chaque carte traitée comme elle.)',
 '(Nota dello sviluppatore: questa carta è "Lady Arpia" anche nel tuo Deck, quindi condivide un unico limite di 3 copie con "Lady Arpia" e ogni carta considerata come lei.)',
 '(Nota do desenvolvedor: este card também é "Lady Harpia" no seu Deck, então divide um único limite de 3 cópias com "Lady Harpia" e todo card considerado como ela.)',
 '（開発者メモ：このカードはデッキの中でも「ハーピィ・レディ」として扱うため、「ハーピィ・レディ」とそれとして扱うカード全体で3枚までしか入れられません）',
 '(개발자 노트: 이 카드는 덱 안에서도 "해피 레이디"로 취급하므로, "해피 레이디" 및 그것으로 취급하는 모든 카드와 합쳐서 3장까지만 넣을 수 있습니다.)',
 '（开发者注：这张卡在卡组中也当作「鹰身女郎」，所以和「鹰身女郎」以及所有当作它使用的卡合计只能放入3张）')
RITUAL = (
 '(Dev note: this card can only be Special Summoned from the GY if it was properly Ritual Summoned first)',
 '(Entwickler-Hinweis: Diese Karte kann nur dann aus dem Friedhof als Spezialbeschwörung beschworen werden, wenn sie zuvor ordnungsgemäß als Ritualbeschwörung beschworen wurde.)',
 '(Nota del desarrollador: esta carta solo puede ser Invocada de Modo Especial desde el Cementerio si antes fue Invocada por Ritual correctamente.)',
 "(Note du développeur : cette carte ne peut être Invoquée Spécialement depuis le Cimetière que si elle a d'abord été Invoquée Rituellement correctement.)",
 '(Nota dello sviluppatore: questa carta può essere Evocata Specialmente dal Cimitero solo se prima è stata Evocata tramite Rituale correttamente.)',
 '(Nota do desenvolvedor: este card só pode ser Invocado por Invocação-Especial do Cemitério se tiver sido Invocado por Ritual corretamente antes.)',
 '（開発者メモ：このカードは、先に正規の方法で儀式召喚されていなければ墓地から特殊召喚できません）',
 '(개발자 노트: 이 카드는 먼저 정규 방법으로 의식 소환된 적이 없으면 묘지에서 특수 소환할 수 없습니다.)',
 '（开发者注：这张卡必须先用正规方法仪式召唤过，才能从墓地特殊召唤）')
# Every Ritual Monster in the game (user, 2026-11-23: the note goes on the Ritual Monsters, not on the revival cards).
RITUALS = {
 '5405694': 'Black Luster Soldier', '65393205': 'Chakra', '91782219': 'Crab Turtle', '97642679': 'Dark Master - Zorc',
 '99721536': 'Dokurorider', '31890399': "Fiend's Mirror", '62337487': 'Fortress Whale', '90844184': 'Garma Sword',
 '30243636': 'Hungry Burger', '26932788': 'Javelin Beetle', '60258960': 'Legendary Flame Lord',
 '30208479': 'Magician of Black Chaos', '73398797': 'Paladin of White Dragon', '4849037': 'Performance of Sword',
 '64631466': 'Relinquished', '86327225': 'Shinato, King of a Higher Plane', '3627449': 'Skull Guardian',
 '33951077': 'Super War-Lion', '49064413': 'The Masked Beast', '69123138': 'Zera the Mant'}
# Notes this script added earlier and the user took back (2026-11-23): Sangan, and the revival cards.
DROPPED = {'26202165': '(Dev note: this is not a FLIP effect', '83764718': '(Dev note: a Ritual or Fusion Monster',
 '70828912': '(Dev note: a Ritual or Fusion Monster', '97077563': '(Dev note: a Ritual or Fusion Monster'}
NOTES = {
 '91932350': ('Harpie Lady 1', HARPIE), '27927359': ('Harpie Lady 2', HARPIE), '54415063': ('Harpie Lady 3', HARPIE),
 '80316585': ('Cyber Harpie Lady', HARPIE),
 '75782277': ("Harpies' Hunting Ground", (
  '(Dev note: this effect is not optional: if any Spell or Trap is on the field, the player who Summoned must destroy one, even their own)',
  '(Entwickler-Hinweis: Dieser Effekt ist nicht optional: Liegt eine Zauber- oder Fallenkarte auf dem Spielfeld, muss der beschwörende Spieler eine zerstören, auch eine eigene.)',
  '(Nota del desarrollador: este efecto no es opcional: si hay alguna Carta Mágica o de Trampa en el Campo, el jugador que Invocó debe destruir una, aunque sea suya.)',
  "(Note du développeur : cet effet n'est pas optionnel : s'il y a une Carte Magie ou Piège sur le Terrain, le joueur qui a Invoqué doit en détruire une, même la sienne.)",
  "(Nota dello sviluppatore: questo effetto non è facoltativo: se sul Terreno c'è una Carta Magia o Trappola, il giocatore che ha Evocato deve distruggerne una, anche una propria.)",
  '(Nota do desenvolvedor: este efeito não é opcional: se houver algum Card de Magia ou Armadilha no campo, o jogador que Invocou deve destruir um, mesmo que seja seu.)',
  '（開発者メモ：この効果は任意ではありません。フィールドに魔法・罠カードがあれば、召喚したプレイヤーは自分のカードであっても1枚破壊しなければなりません）',
  '(개발자 노트: 이 효과는 임의가 아닙니다. 필드에 마법 / 함정 카드가 있으면, 소환한 플레이어는 자신의 카드라도 1장 파괴해야 합니다.)',
  '（开发者注：这个效果不是可选的：场上有魔法·陷阱卡的场合，进行召唤的玩家即使是自己的卡也必须破坏1张）')),
 '54652250': ('Man-Eater Bug', (
  '(Dev note: this effect is not optional: if your opponent controls no monster, it must destroy one of yours, even itself)',
  '(Entwickler-Hinweis: Dieser Effekt ist nicht optional: Kontrolliert dein Gegner kein Monster, muss er eines deiner Monster zerstören, auch diese Karte selbst.)',
  '(Nota del desarrollador: este efecto no es opcional: si tu adversario no controla ningún monstruo, debe destruir uno de los tuyos, incluso esta misma carta.)',
  "(Note du développeur : cet effet n'est pas optionnel : si votre adversaire ne contrôle aucun monstre, il doit détruire l'un des vôtres, même cette carte.)",
  '(Nota dello sviluppatore: questo effetto non è facoltativo: se il tuo avversario non controlla mostri, deve distruggerne uno dei tuoi, anche questa carta stessa.)',
  '(Nota do desenvolvedor: este efeito não é opcional: se o seu oponente não controlar nenhum monstro, ele deve destruir um dos seus, até este próprio card.)',
  '（開発者メモ：この効果は任意ではありません。相手がモンスターをコントロールしていなければ、このカード自身を含め、自分のモンスターを1体破壊しなければなりません）',
  '(개발자 노트: 이 효과는 임의가 아닙니다. 상대가 몬스터를 컨트롤하고 있지 않으면, 이 카드 자신을 포함해 자신의 몬스터를 1장 파괴해야 합니다.)',
  '（开发者注：这个效果不是可选的：对方场上没有怪兽的场合，必须破坏自己的1只怪兽，包括这张卡自身）')),
 '99173029': ('Spiritual Energy Settle Machine', (
  '(Dev note: this is the first print: Spirit monsters that stayed do not return to the hand once this card is gone)',
  '(Entwickler-Hinweis: Dies ist der Erstdruck: Geistermonster, die geblieben sind, kehren nicht auf die Hand zurück, wenn diese Karte das Spielfeld verlässt.)',
  '(Nota del desarrollador: esta es la primera impresión: los monstruos Espíritu que se quedaron no regresan a la mano cuando esta carta deja el Campo.)',
  "(Note du développeur : il s'agit de la première impression : les monstres Spirit restés sur le Terrain ne retournent pas dans la main quand cette carte quitte le Terrain.)",
  '(Nota dello sviluppatore: questa è la prima stampa: i mostri Spirito rimasti non ritornano nella mano quando questa carta lascia il Terreno.)',
  '(Nota do desenvolvedor: esta é a primeira impressão: os monstros Espírito que ficaram não voltam para a mão quando este card deixa o campo.)',
  '（開発者メモ：これは初版です。残ったスピリットモンスターは、このカードがフィールドを離れても手札に戻りません）',
  '(개발자 노트: 이것은 초판입니다. 남아 있던 스피릿 몬스터는 이 카드가 필드를 벗어나도 패로 되돌아가지 않습니다.)',
  '（开发者注：这是初版：留在场上的灵魂怪兽在这张卡离场后也不会回到手卡）')),
}
NOTES.update({cid: (name, RITUAL) for cid, name in RITUALS.items()})


def main():
    path = ROOT / 'data/card-dev-notes.json'
    raw = path.read_bytes().decode('utf-8-sig')
    data = json.loads(raw)
    for cid, start in DROPPED.items():
        if data['cards'].get(cid, {}).get('en', '').startswith(start): del data['cards'][cid]
    for cid, (name, texts) in NOTES.items():
        data['cards'].setdefault(cid, {'name': name, **dict(zip(LANGS, texts))})
    out = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if '\r\n' in raw: out = out.replace('\n', '\r\n')
    path.write_bytes(out.encode('utf-8'))


if __name__ == '__main__':
    main()
