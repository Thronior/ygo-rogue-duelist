""""Why can't I?" (2026-11-14): the reasons a greyed Activate gives in a card's action menu when your Spell or Trap
cannot be activated (android/web/activation-reasons.js). All 8 languages. Existing translations are never overwritten."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_bytes

LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Traps must be Set before they can be activated.': [
  'Fallen müssen gesetzt werden, bevor sie aktiviert werden können.',
  'Las Trampas deben Colocarse antes de poder activarse.',
  'Les Pièges doivent être Posés avant de pouvoir être activés.',
  'Le Trappole devono essere Posizionate prima di poter essere attivate.',
  '罠はセットしてからでないと発動できません。',
  '함정은 세트한 뒤에만 발동할 수 있습니다.',
  'Armadilhas precisam ser Baixadas antes de poderem ser ativadas.',
  '陷阱必须先盖放才能发动。'],
 'Traps can’t be activated the turn they’re Set.': [
  'Fallen können nicht in dem Spielzug aktiviert werden, in dem sie gesetzt wurden.',
  'Las Trampas no pueden activarse en el turno en que se Colocan.',
  'Les Pièges ne peuvent pas être activés le tour où ils sont Posés.',
  'Le Trappole non possono essere attivate nel turno in cui vengono Posizionate.',
  '罠はセットしたターンには発動できません。',
  '함정은 세트한 턴에는 발동할 수 없습니다.',
  'Armadilhas não podem ser ativadas no turno em que são Baixadas.',
  '陷阱在盖放的回合不能发动。'],
 'Quick-Play Spells can’t be activated the turn they’re Set.': [
  'Schnellzauber können nicht in dem Spielzug aktiviert werden, in dem sie gesetzt wurden.',
  'Las Mágicas de Juego Rápido no pueden activarse en el turno en que se Colocan.',
  'Les Magies Jeu-Rapide ne peuvent pas être activées le tour où elles sont Posées.',
  'Le Magie Rapide non possono essere attivate nel turno in cui vengono Posizionate.',
  '速攻魔法はセットしたターンには発動できません。',
  '속공 마법은 세트한 턴에는 발동할 수 없습니다.',
  'Magias Rápidas não podem ser ativadas no turno em que são Baixadas.',
  '速攻魔法在盖放的回合不能发动。'],
 'It’s your opponent’s turn. This Spell can only be activated in your Main Phase.': [
  'Es ist der Spielzug deines Gegners. Dieser Zauber kann nur in deiner Main Phase aktiviert werden.',
  'Es el turno de tu adversario. Esta Mágica solo puede activarse en tu Main Phase.',
  'C’est le tour de votre adversaire. Cette Magie ne peut être activée que pendant votre Main Phase.',
  'È il turno del tuo avversario. Questa Magia può essere attivata solo nella tua Main Phase.',
  '相手のターンです。この魔法は自分のメインフェイズにしか発動できません。',
  '상대 턴입니다. 이 마법은 자신의 메인 페이즈에만 발동할 수 있습니다.',
  'É o turno do seu oponente. Esta Magia só pode ser ativada na sua Fase Principal.',
  '现在是对手的回合。这张魔法只能在你的主要阶段发动。'],
 'This Spell can only be activated in your Main Phase.': [
  'Dieser Zauber kann nur in deiner Main Phase aktiviert werden.',
  'Esta Mágica solo puede activarse en tu Main Phase.',
  'Cette Magie ne peut être activée que pendant votre Main Phase.',
  'Questa Magia può essere attivata solo nella tua Main Phase.',
  'この魔法は自分のメインフェイズにしか発動できません。',
  '이 마법은 자신의 메인 페이즈에만 발동할 수 있습니다.',
  'Esta Magia só pode ser ativada na sua Fase Principal.',
  '这张魔法只能在你的主要阶段发动。'],
 'Only Quick-Play Spells and Traps can be activated in response to a card or a Summon.': [
  'Nur Schnellzauber und Fallen können als Antwort auf eine Karte oder eine Beschwörung aktiviert werden.',
  'Solo las Mágicas de Juego Rápido y las Trampas pueden activarse en respuesta a una carta o una Invocación.',
  'Seules les Magies Jeu-Rapide et les Pièges peuvent être activés en réponse à une carte ou une Invocation.',
  'Solo le Magie Rapide e le Trappole possono essere attivate in risposta a una carta o a un’Evocazione.',
  'カードや召喚に対して発動できるのは速攻魔法と罠だけです。',
  '카드나 소환에 대응해 발동할 수 있는 것은 속공 마법과 함정뿐입니다.',
  'Só Magias Rápidas e Armadilhas podem ser ativadas em resposta a uma carta ou Invocação.',
  '只有速攻魔法和陷阱可以对应卡片或召唤发动。'],
 'It’s your opponent’s turn. Quick-Play Spells can only be activated from your hand during your turn.': [
  'Es ist der Spielzug deines Gegners. Schnellzauber können nur in deinem Spielzug von deiner Hand aktiviert werden.',
  'Es el turno de tu adversario. Las Mágicas de Juego Rápido solo pueden activarse desde tu mano durante tu turno.',
  'C’est le tour de votre adversaire. Les Magies Jeu-Rapide ne peuvent être activées depuis votre main que pendant votre tour.',
  'È il turno del tuo avversario. Le Magie Rapide possono essere attivate dalla tua mano solo durante il tuo turno.',
  '相手のターンです。速攻魔法を手札から発動できるのは自分のターンだけです。',
  '상대 턴입니다. 속공 마법은 자신의 턴에만 패에서 발동할 수 있습니다.',
  'É o turno do seu oponente. Magias Rápidas só podem ser ativadas da sua mão durante o seu turno.',
  '现在是对手的回合。速攻魔法只能在你的回合从手牌发动。'],
 'Your opponent is acting. Wait until it’s your move.': [
  'Dein Gegner ist am Zug. Warte, bis du handeln kannst.',
  'Tu adversario está actuando. Espera a que te toque.',
  'Votre adversaire agit. Attendez que ce soit à vous.',
  'Il tuo avversario sta agendo. Aspetta che tocchi a te.',
  '相手が行動中です。自分の番になるまでお待ちください。',
  '상대가 행동 중입니다. 내 차례가 될 때까지 기다리세요.',
  'Seu oponente está agindo. Espere a sua vez.',
  '对手正在行动。请等到轮到你。'],
 'Finish the current choice first.': [
  'Schließe zuerst die aktuelle Auswahl ab.',
  'Termina primero la elección actual.',
  'Terminez d’abord le choix en cours.',
  'Completa prima la scelta in corso.',
  '先に今の選択を終えてください。',
  '먼저 현재 선택을 마치세요.',
  'Termine a escolha atual primeiro.',
  '请先完成当前的选择。'],
 'Your Spell & Trap Zones are full.': [
  'Deine Zauber- & Fallenzonen sind voll.',
  'Tus Zonas de Magia y Trampas están llenas.',
  'Vos Zones Magie & Piège sont pleines.',
  'Le tue Zone Magie & Trappole sono piene.',
  '魔法＆罠ゾーンが埋まっています。',
  '마법 & 함정 존이 가득 찼습니다.',
  'Suas Zonas de Magias & Armadilhas estão cheias.',
  '你的魔法与陷阱区域已满。'],
 'Counter Traps can only be activated in response to the specific action they name.': [
  'Konterfallen können nur als Antwort auf die Aktion aktiviert werden, die sie nennen.',
  'Las Trampas de Contraefecto solo pueden activarse en respuesta a la acción concreta que indican.',
  'Les Contre-Pièges ne peuvent être activés qu’en réponse à l’action précise qu’ils mentionnent.',
  'Le Contro-Trappole possono essere attivate solo in risposta all’azione specifica che indicano.',
  'カウンター罠は、そのカードに書かれた行動に対してしか発動できません。',
  '카운터 함정은 카드에 적힌 행동에 대응해서만 발동할 수 있습니다.',
  'Armadilhas de Resposta só podem ser ativadas em resposta à ação específica que elas indicam.',
  '反击陷阱只能对应卡上写明的行动发动。'],
 'This card’s activation conditions aren’t met right now.': [
  'Die Aktivierungsbedingungen dieser Karte sind gerade nicht erfüllt.',
  'Las condiciones de activación de esta carta no se cumplen ahora mismo.',
  'Les conditions d’activation de cette carte ne sont pas remplies pour le moment.',
  'Le condizioni di attivazione di questa carta non sono soddisfatte in questo momento.',
  '今はこのカードの発動条件を満たしていません。',
  '지금은 이 카드의 발동 조건을 충족하지 않습니다.',
  'As condições de ativação desta carta não foram cumpridas agora.',
  '现在不满足这张卡的发动条件。'],
}
PATTERNS = {
 'Can’t pay the cost: {0} makes activating a Spell cost {1} LP, and you have {2} LP.': [
  'Kosten nicht bezahlbar: Durch {0} kostet das Aktivieren eines Zaubers {1} LP, und du hast {2} LP.',
  'No puedes pagar el coste: {0} hace que activar una Mágica cueste {1} LP y tienes {2} LP.',
  'Impossible de payer le coût : {0} fait coûter {1} LP l’activation d’une Magie, et vous avez {2} LP.',
  'Non puoi pagare il costo: {0} fa costare {1} LP l’attivazione di una Magia e hai {2} LP.',
  'コストを払えません：{0}により魔法の発動には {1} LP が必要ですが、LP は {2} です。',
  '코스트를 지불할 수 없습니다: {0} 때문에 마법을 발동하려면 {1} LP가 필요하지만 LP가 {2}입니다.',
  'Não é possível pagar o custo: {0} faz ativar uma Magia custar {1} PV, e você tem {2} PV.',
  '无法支付代价：因为{0}，发动魔法卡需要支付 {1} LP，而你只有 {2} LP。'],
 'Can’t pay the cost: {0} makes activating a Trap cost {1} LP, and you have {2} LP.': [
  'Kosten nicht bezahlbar: Durch {0} kostet das Aktivieren einer Falle {1} LP, und du hast {2} LP.',
  'No puedes pagar el coste: {0} hace que activar una Trampa cueste {1} LP y tienes {2} LP.',
  'Impossible de payer le coût : {0} fait coûter {1} LP l’activation d’un Piège, et vous avez {2} LP.',
  'Non puoi pagare il costo: {0} fa costare {1} LP l’attivazione di una Trappola e hai {2} LP.',
  'コストを払えません：{0}により罠の発動には {1} LP が必要ですが、LP は {2} です。',
  '코스트를 지불할 수 없습니다: {0} 때문에 함정을 발동하려면 {1} LP가 필요하지만 LP가 {2}입니다.',
  'Não é possível pagar o custo: {0} faz ativar uma Armadilha custar {1} PV, e você tem {2} PV.',
  '无法支付代价：因为{0}，发动陷阱卡需要支付 {1} LP，而你只有 {2} LP。'],
}

def dump(path, data):
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=1) + '\n').encode('utf8'))

def main():
    rows = {**TERMS, **PATTERNS}
    for n, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        added = 0
        for key, text in rows.items():
            assert len(text) == len(LANGS), key
            if key not in table: table[key] = text[n]; added += 1
        if added: dump(path, table)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    new = [{'group': 'ui', 'en': k, 'kind': 'pattern' if k in PATTERNS else 'exact', 'ctx': 'activation-reasons.js'} for k in rows if k not in known]
    if new: dump(path, catalog + new)

if __name__ == '__main__':
    main()
