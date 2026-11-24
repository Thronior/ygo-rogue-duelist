"""Ultimate Collector feedback (CITYDRIVER, user 2026-11-24): pause requests (collector-clock.js, collector-ui.js), the
turn-timeout notice between duels, View your deck on the prize screen, and the Help section on the turn timer
(collector-introduction.js). All 8 languages; never overwrites an existing translation. Terms follow docs/i18n/TERMS.md
(Set = setzen / Colocar / Poser / Posizionare / Baixar / セット / 세트 / 盖放)."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Your opponent asks for a pause of up to 3 minutes.': (
  'Dein Gegner bittet um eine Pause von bis zu 3 Minuten.',
  'Tu oponente pide una pausa de hasta 3 minutos.',
  "Votre adversaire demande une pause de 3 minutes maximum.",
  "Il tuo avversario chiede una pausa fino a 3 minuti.",
  '相手が最大3分間の一時停止を求めています。',
  '상대가 최대 3분의 일시 정지를 요청했습니다.',
  'Seu oponente pede uma pausa de até 3 minutos.',
  '对手请求暂停，最长 3 分钟。'),
 'Pause requested. Waiting for your opponent…': (
  'Pause angefragt. Warte auf deinen Gegner …',
  'Pausa solicitada. Esperando a tu oponente…',
  "Pause demandée. En attente de votre adversaire…",
  "Pausa richiesta. In attesa del tuo avversario…",
  '一時停止を申請しました。相手を待っています…',
  '일시 정지를 요청했습니다. 상대를 기다리는 중…',
  'Pausa solicitada. Aguardando seu oponente…',
  '已请求暂停。正在等待对手…'),
 'Duel paused': (
  'Duell pausiert',
  'Duelo en pausa',
  'Duel en pause',
  'Duello in pausa',
  'デュエル一時停止中',
  '듀얼 일시 정지됨',
  'Duelo pausado',
  '决斗已暂停'),
 'Your opponent declined the pause.': (
  'Dein Gegner hat die Pause abgelehnt.',
  'Tu oponente rechazó la pausa.',
  "Votre adversaire a refusé la pause.",
  "Il tuo avversario ha rifiutato la pausa.",
  '相手が一時停止を断りました。',
  '상대가 일시 정지를 거절했습니다.',
  'Seu oponente recusou a pausa.',
  '对手拒绝了暂停。'),
 'Accept': ('Annehmen', 'Aceptar', 'Accepter', 'Accetta', '承諾', '수락', 'Aceitar', '接受'),
 'Decline': ('Ablehnen', 'Rechazar', 'Refuser', 'Rifiuta', '断る', '거절', 'Recusar', '拒绝'),
 'Request pause ({0} left)': (
  'Pause anfragen (noch {0})',
  'Pedir pausa (quedan {0})',
  'Demander une pause ({0} restantes)',
  'Chiedi una pausa (ne restano {0})',
  '一時停止を申請（残り{0}回）',
  '일시 정지 요청 ({0}회 남음)',
  'Pedir pausa (restam {0})',
  '请求暂停（剩余 {0} 次）'),
 "Your opponent's turn timer ran out, so you won this duel.": (
  'Die Zugzeit deines Gegners ist abgelaufen, also hast du dieses Duell gewonnen.',
  'El tiempo de turno de tu oponente se agotó, así que ganaste este duelo.',
  "Le temps de tour de votre adversaire est écoulé : vous gagnez ce duel.",
  "Il tempo del turno del tuo avversario è scaduto, quindi hai vinto questo duello.",
  '相手のターンの持ち時間が切れたため、このデュエルはあなたの勝ちです。',
  '상대의 턴 제한 시간이 끝나 이번 듀얼은 당신의 승리입니다.',
  'O tempo de turno do seu oponente acabou, então você venceu este duelo.',
  '对手的回合时间已用完，你赢得了这场决斗。'),
 'Your turn timer ran out, so you lost this duel.': (
  'Deine Zugzeit ist abgelaufen, also hast du dieses Duell verloren.',
  'Tu tiempo de turno se agotó, así que perdiste este duelo.',
  "Votre temps de tour est écoulé : vous perdez ce duel.",
  "Il tempo del tuo turno è scaduto, quindi hai perso questo duello.",
  'ターンの持ち時間が切れたため、このデュエルはあなたの負けです。',
  '턴 제한 시간이 끝나 이번 듀얼은 패배했습니다.',
  'Seu tempo de turno acabou, então você perdeu este duelo.',
  '你的回合时间已用完，你输掉了这场决斗。'),
 'View your deck': (
  'Dein Deck ansehen',
  'Ver tu deck',
  'Voir votre deck',
  'Vedi il tuo Deck',
  '自分のデッキを見る',
  '내 덱 보기',
  'Ver seu deck',
  '查看你的卡组'),
 'Hide your deck': (
  'Dein Deck ausblenden',
  'Ocultar tu deck',
  'Masquer votre deck',
  'Nascondi il tuo Deck',
  '自分のデッキを隠す',
  '내 덱 숨기기',
  'Ocultar seu deck',
  '隐藏你的卡组'),
 'Turn timer and pauses': (
  'Zugzeit und Pausen',
  'Tiempo de turno y pausas',
  'Temps de tour et pauses',
  'Tempo del turno e pause',
  'ターンの持ち時間と一時停止',
  '턴 제한 시간과 일시 정지',
  'Tempo de turno e pausas',
  '回合时间与暂停'),
 'The turn timer turns red in its last minute. Every Summon, Set or activation gives you 15 seconds back, up to 3 minutes. Running out of time loses that duel, not the whole match. Twice per match you can ask for a pause of up to 3 minutes from Options; your opponent has to accept it.': (
  'Die Zugzeit wird in ihrer letzten Minute rot. Jede Beschwörung, jedes Setzen und jede Aktivierung gibt dir 15 Sekunden zurück, bis zu 3 Minuten. Läuft deine Zeit ab, verlierst du dieses Duell, nicht das ganze Match. Zweimal pro Match kannst du unter Optionen um eine Pause von bis zu 3 Minuten bitten; dein Gegner muss sie annehmen.',
  'El tiempo de turno se vuelve rojo en su último minuto. Cada Invocación, Colocación o activación te devuelve 15 segundos, hasta 3 minutos. Si se te acaba el tiempo, pierdes ese duelo, no toda la partida. Dos veces por partida puedes pedir una pausa de hasta 3 minutos desde Opciones; tu oponente tiene que aceptarla.',
  "Le temps de tour devient rouge pendant sa dernière minute. Chaque Invocation, Pose ou activation vous rend 15 secondes, jusqu'à 3 minutes. Si votre temps s'écoule, vous perdez ce duel, pas tout le match. Deux fois par match, vous pouvez demander une pause de 3 minutes maximum depuis Options ; votre adversaire doit l'accepter.",
  "Il tempo del turno diventa rosso nel suo ultimo minuto. Ogni Evocazione, Posizionamento o attivazione ti restituisce 15 secondi, fino a 3 minuti. Se finisci il tempo, perdi quel duello, non l'intera partita. Due volte per partita puoi chiedere una pausa fino a 3 minuti da Opzioni; il tuo avversario deve accettarla.",
  'ターンの持ち時間は残り1分で赤くなります。召喚・セット・発動をするたびに15秒戻ります（最大3分）。時間切れになるとそのデュエルは負けになりますが、マッチ全体は続きます。1マッチに2回まで、オプションから最大3分間の一時停止を申請できます。相手の承諾が必要です。',
  '턴 제한 시간은 마지막 1분에 빨간색으로 바뀝니다. 소환, 세트, 발동을 할 때마다 15초가 돌아옵니다(최대 3분). 시간이 다 되면 그 듀얼은 패배하지만 매치 전체가 끝나지는 않습니다. 매치마다 두 번, 옵션에서 최대 3분의 일시 정지를 요청할 수 있으며 상대가 수락해야 합니다.',
  'O tempo de turno fica vermelho no último minuto. Cada Invocação, Baixada ou ativação devolve 15 segundos, até 3 minutos. Se o seu tempo acabar, você perde esse duelo, não a partida inteira. Duas vezes por partida você pode pedir uma pausa de até 3 minutos em Opções; seu oponente precisa aceitá-la.',
  '回合时间在最后一分钟会变红。每次召唤、盖放或发动都会返还 15 秒，最多 3 分钟。时间用完会输掉这场决斗，而不是整场比赛。每场比赛可以从选项中请求两次暂停，每次最长 3 分钟；需要对手接受。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
