"""2v2 Draft rooms (2026-11-26, hidden until released) in all 8 languages: the host option, the lobby, the Draft Screen,
the coin toss, the reconnect line, the match end and the rooms Worker's 2v2 errors. Never overwrites a translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
L = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
def t(*values): return dict(zip(L, values))
TERMS = {
 'Hosting only: four players, two teams of two, in one tag duel.': t(
  'Nur beim Hosten: vier Spieler, zwei Teams zu zweit, in einem Tag-Duell.',
  'Solo al crear la sala: cuatro jugadores, dos equipos de dos, en un Duelo en Pareja.',
  'Hébergement uniquement : quatre joueurs, deux équipes de deux, dans un Duel Tag.',
  'Solo per chi ospita: quattro giocatori, due squadre da due, in un Duello Tag.',
  'ホスト時のみ：4人のプレイヤーが2人ずつ2チームに分かれてタッグデュエルを行います。',
  '방장 전용: 4명이 2인 2팀으로 나뉘어 태그 듀얼을 합니다.',
  'Só ao hospedar: quatro jogadores, duas equipes de dois, em um Duelo em Dupla.',
  '仅限创建房间：四名玩家分成两队，每队两人，进行一场搭档决斗。'),
 '2v2 (4 players)': t('2 gegen 2 (4 Spieler)', '2 contra 2 (4 jugadores)', '2 contre 2 (4 joueurs)', '2 contro 2 (4 giocatori)', '2対2（4人）', '2대2 (4명)', '2 contra 2 (4 jogadores)', '2对2（4人）'),
 'Change teams': t('Teams ändern', 'Cambiar equipos', 'Changer les équipes', 'Cambia squadre', 'チームを変更', '팀 변경', 'Trocar equipes', '更换队伍'),
 'Open seat': t('Freier Platz', 'Plaza libre', 'Place libre', 'Posto libero', '空席', '빈자리', 'Vaga livre', '空位'),
 'All four players must be ready to open boosters.': t(
  'Alle vier Spieler müssen bereit sein, um Booster zu öffnen.',
  'Los cuatro jugadores deben estar listos para abrir los sobres.',
  'Les quatre joueurs doivent être prêts pour ouvrir les boosters.',
  'Tutti e quattro i giocatori devono essere pronti per aprire le buste.',
  'ブースターを開封するには4人全員の準備完了が必要です。',
  '부스터를 열려면 네 플레이어 모두 준비해야 합니다.',
  'Os quatro jogadores devem estar prontos para abrir os pacotes.',
  '四名玩家都准备好后才能开启补充包。'),
 'Your partner': t('Dein Partner', 'Tu compañero', 'Votre partenaire', 'Il tuo compagno', 'パートナー', '파트너', 'Seu parceiro', '你的搭档'),
 'An opponent': t('Ein Gegner', 'Un adversario', 'Un adversaire', 'Un avversario', '対戦相手', '상대', 'Um oponente', '一名对手'),
 'Partner’s pick': t('Wahl des Partners', 'Elección del compañero', 'Choix du partenaire', 'Scelta del compagno', 'パートナーの選択', '파트너의 선택', 'Escolha do parceiro', '搭档的选择'),
 '{0}’s pick': t('Wahl von {0}', 'Elección de {0}', 'Choix de {0}', 'Scelta di {0}', '{0}の選択', '{0}의 선택', 'Escolha de {0}', '{0}的选择'),
 '{0} is picking…': t('{0} wählt…', '{0} está eligiendo…', '{0} choisit…', '{0} sta scegliendo…', '{0}が選択中…', '{0} 선택하는 중…', '{0} está escolhendo…', '{0}正在选择…'),
 'Everyone has picked': t('Alle haben gewählt', 'Todos han elegido', 'Tout le monde a choisi', 'Tutti hanno scelto', '全員が選択しました', '모두 선택했습니다', 'Todos escolheram', '所有人都已选择'),
 'Your team goes first': t('Dein Team beginnt', 'Empieza tu equipo', 'Votre équipe commence', 'Inizia la tua squadra', 'あなたのチームが先攻', '당신의 팀이 선공', 'Sua equipe começa', '你的队伍先攻'),
 'The other team goes first': t('Das andere Team beginnt', 'Empieza el otro equipo', "L'autre équipe commence", "Inizia l'altra squadra", '相手チームが先攻', '상대 팀이 선공', 'A outra equipe começa', '对方队伍先攻'),
 '{0} disconnected · Reconnect time remaining {1}:{2}': t(
  '{0} getrennt · Verbleibende Zeit zum Wiederverbinden {1}:{2}',
  '{0} desconectado · Tiempo restante para reconectar {1}:{2}',
  '{0} déconnecté · Temps de reconnexion restant {1}:{2}',
  '{0} disconnesso · Tempo rimanente per la riconnessione {1}:{2}',
  '{0}の接続が切れました · 再接続の残り時間 {1}:{2}',
  '{0} 연결 끊김 · 남은 재접속 시간 {1}:{2}',
  '{0} desconectado · Tempo restante para reconectar {1}:{2}',
  '{0}已断开连接 · 剩余重连时间 {1}:{2}'),
 'Your team reached {0} wins first.': t(
  'Dein Team hat zuerst {0} Siege erreicht.', 'Tu equipo llegó primero a {0} victorias.', 'Votre équipe a atteint {0} victoires en premier.', 'La tua squadra ha raggiunto per prima {0} vittorie.',
  'あなたのチームが先に{0}勝しました。', '당신의 팀이 먼저 {0}승에 도달했습니다.', 'Sua equipe chegou primeiro a {0} vitórias.', '你的队伍率先达到{0}胜。'),
 'The other team reached {0} wins first.': t(
  'Das andere Team hat zuerst {0} Siege erreicht.', 'El otro equipo llegó primero a {0} victorias.', "L'autre équipe a atteint {0} victoires en premier.", "L'altra squadra ha raggiunto per prima {0} vittorie.",
  '相手チームが先に{0}勝しました。', '상대 팀이 먼저 {0}승에 도달했습니다.', 'A outra equipe chegou primeiro a {0} vitórias.', '对方队伍率先达到{0}胜。'),
 'Keep playing? If all four agree, the goal becomes {0} wins and the drafts go on.': t(
  'Weiterspielen? Wenn alle vier zustimmen, liegt das Ziel bei {0} Siegen und die Drafts gehen weiter.',
  '¿Seguir jugando? Si los cuatro estáis de acuerdo, el objetivo pasa a {0} victorias y los drafts continúan.',
  "Continuer ? Si les quatre sont d'accord, l'objectif passe à {0} victoires et les drafts continuent.",
  "Continuare? Se tutti e quattro siete d'accordo, l'obiettivo diventa {0} vittorie e i draft proseguono.",
  '続けますか？4人全員が同意すると目標は{0}勝になり、ドラフトが続きます。',
  '계속하시겠습니까? 네 명 모두 동의하면 목표가 {0}승이 되고 드래프트가 이어집니다.',
  'Continuar jogando? Se os quatro concordarem, a meta passa a {0} vitórias e os drafts continuam.',
  '继续吗？如果四人都同意，目标变为{0}胜，轮抽继续。'),
 'You want to continue. Waiting for {0} more…': t(
  'Du willst weiterspielen. Warte auf {0} weitere…', 'Quieres continuar. Esperando a {0} más…', 'Vous voulez continuer. En attente de {0} autre(s)…', 'Vuoi continuare. In attesa di altri {0}…',
  '続行を希望しています。あと{0}人を待っています…', '계속하기를 원합니다. {0}명을 더 기다리는 중…', 'Você quer continuar. Aguardando mais {0}…', '你想继续。正在等待另外{0}人…'),
 'Someone wants to continue!': t('Jemand will weiterspielen!', '¡Alguien quiere continuar!', "Quelqu'un veut continuer !", 'Qualcuno vuole continuare!', '続行を希望している人がいます！', '누군가 계속하기를 원합니다!', 'Alguém quer continuar!', '有人想继续！'),
 'Leaving now gives the other team the match win, for you and your partner.': t(
  'Wenn du jetzt gehst, gewinnt das andere Team das Match – für dich und deinen Partner.',
  'Si sales ahora, el otro equipo gana el enfrentamiento, para ti y tu compañero.',
  "Partir maintenant donne la victoire du match à l'autre équipe, pour vous et votre partenaire.",
  "Se esci ora, l'altra squadra vince il match, per te e il tuo compagno.",
  '今退出すると、あなたとパートナーの負けになり、相手チームの勝利になります。',
  '지금 나가면 당신과 파트너 모두 패배하고 상대 팀이 매치에서 승리합니다.',
  'Se sair agora, a outra equipe vence a partida, para você e seu parceiro.',
  '现在离开将判对方队伍赢得比赛，你和搭档都算落败。'),
 'Only the host can change teams, before the draft starts.': t(
  'Nur der Host kann die Teams ändern, bevor der Draft beginnt.', 'Solo el anfitrión puede cambiar los equipos, antes de que empiece el draft.', "Seul l'hôte peut changer les équipes, avant le début du draft.", "Solo chi ospita può cambiare le squadre, prima che inizi il draft.",
  'チームを変更できるのはホストのみで、ドラフト開始前に限ります。', '팀은 드래프트가 시작되기 전에 방장만 변경할 수 있습니다.', 'Só o anfitrião pode trocar as equipes, antes de o draft começar.', '只有房主可以在轮抽开始前更换队伍。'),
 'This 2v2 room already has four players.': t(
  'Dieser 2-gegen-2-Raum hat bereits vier Spieler.', 'Esta sala de 2 contra 2 ya tiene cuatro jugadores.', 'Ce salon 2 contre 2 a déjà quatre joueurs.', 'Questa stanza 2 contro 2 ha già quattro giocatori.',
  'この2対2のルームにはすでに4人のプレイヤーがいます。', '이 2대2 방에는 이미 플레이어가 네 명 있습니다.', 'Esta sala de 2 contra 2 já tem quatro jogadores.', '这个2对2房间已有四名玩家。'),
 'This is a 2v2 room. Update or refresh the game to join it.': t(
  'Das ist ein 2-gegen-2-Raum. Aktualisiere das Spiel oder lade es neu, um beizutreten.', 'Esta es una sala de 2 contra 2. Actualiza o recarga el juego para unirte.', "C'est un salon 2 contre 2. Mettez à jour ou rechargez le jeu pour le rejoindre.", "Questa è una stanza 2 contro 2. Aggiorna o ricarica il gioco per entrare.",
  'これは2対2のルームです。参加するにはゲームを更新または再読み込みしてください。', '2대2 방입니다. 참가하려면 게임을 업데이트하거나 새로고침하세요.', 'Esta é uma sala de 2 contra 2. Atualize ou recarregue o jogo para entrar.', '这是2对2房间。请更新或刷新游戏后加入。'),
 'Team A': t('Team A', 'Equipo A', 'Équipe A', 'Squadra A', 'チームA', 'A팀', 'Equipe A', 'A队'),
 'Team B': t('Team B', 'Equipo B', 'Équipe B', 'Squadra B', 'チームB', 'B팀', 'Equipe B', 'B队'),
 'Drag a player to another slot to change teams.': t(
  'Ziehe einen Spieler auf einen anderen Platz, um die Teams zu ändern.', 'Arrastra a un jugador a otra plaza para cambiar los equipos.', 'Faites glisser un joueur vers une autre place pour changer les équipes.', 'Trascina un giocatore in un altro posto per cambiare le squadre.',
  'プレイヤーを別の枠にドラッグしてチームを変更します。', '플레이어를 다른 자리로 끌어 팀을 바꾸세요.', 'Arraste um jogador para outra vaga para trocar as equipes.', '将玩家拖到另一个位置以更换队伍。'),
 'The host arranges the teams.': t('Der Host stellt die Teams zusammen.', 'El anfitrión organiza los equipos.', "L'hôte organise les équipes.", 'Chi ospita organizza le squadre.', 'ホストがチームを編成します。', '방장이 팀을 편성합니다.', 'O anfitrião organiza as equipes.', '由房主分配队伍。'),
 'Drag a player to another slot.': t('Ziehe einen Spieler auf einen anderen Platz.', 'Arrastra a un jugador a otra plaza.', 'Faites glisser un joueur vers une autre place.', 'Trascina un giocatore in un altro posto.', 'プレイヤーを別の枠にドラッグしてください。', '플레이어를 다른 자리로 끌어 놓으세요.', 'Arraste um jogador para outra vaga.', '请将玩家拖到另一个位置。'),
 'Wait for your turn to pick.': t('Warte, bis du mit Wählen dran bist.', 'Espera tu turno para elegir.', 'Attendez votre tour pour choisir.', 'Aspetta il tuo turno per scegliere.', '自分の選択の番まで待ってください。', '선택할 차례를 기다리세요.', 'Aguarde a sua vez de escolher.', '请等待轮到你选择。'),
}


def main():
    for lang in L:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, tr in TERMS.items():table.setdefault(en, tr[lang])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
