"""Tag room seat messages from the rooms Worker (bug report, 2026-11-23: "rooms full"). A started run keeps player 2's
seat for the device that joined it; the message says so. All 8 languages; never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Room already has two players.': (
  'Der Raum hat bereits zwei Spieler.',
  'La sala ya tiene dos jugadores.',
  'Le salon a déjà deux joueurs.',
  'La stanza ha già due giocatori.',
  'このルームにはすでに2人のプレイヤーがいます。',
  '이 방에는 이미 플레이어가 두 명 있습니다.',
  'A sala já tem dois jogadores.',
  '该房间已有两名玩家。'),
 "Player 2's seat in this run belongs to the device that joined it. Rejoin from that device, or ask the host to open a new room.": (
  'Der Platz von Spieler 2 in diesem Durchlauf gehört dem Gerät, mit dem beigetreten wurde. Tritt von diesem Gerät aus wieder bei oder bitte den Host, einen neuen Raum zu öffnen.',
  'El puesto del jugador 2 en esta partida pertenece al dispositivo que se unió. Vuelve a unirte desde ese dispositivo o pide al anfitrión que abra una sala nueva.',
  'La place du joueur 2 dans cette partie appartient à l\'appareil qui l\'a rejointe. Reviens depuis cet appareil, ou demande à l\'hôte d\'ouvrir un nouveau salon.',
  'Il posto del giocatore 2 in questa partita appartiene al dispositivo che si è unito. Rientra da quel dispositivo o chiedi all\'host di aprire una nuova stanza.',
  'このランのプレイヤー2の席は、参加した端末のものです。その端末から再参加するか、ホストに新しいルームを開いてもらってください。',
  '이 런의 플레이어 2 자리는 참가한 기기에 속합니다. 그 기기로 다시 참가하거나 호스트에게 새 방을 열어 달라고 하세요.',
  'O lugar do jogador 2 nesta partida pertence ao dispositivo que entrou. Volte por esse dispositivo ou peça ao anfitrião para abrir uma nova sala.',
  '本局中玩家2的座位属于当初加入的设备。请用该设备重新加入，或请房主新开一个房间。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
