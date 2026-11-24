"""Easy mode (easy_mode.py, 2026-11-24): its modifier row, the payout line, the skippable shadow relic choice, the
run history and run card labels, the end screen note and the temporary Testing Code toasts. All 8 languages; never
overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Easy mode': ('Leichter Modus', 'Modo fácil', 'Mode facile', 'Modalità facile', 'イージーモード', '쉬움 모드', 'Modo fácil', '简单模式'),
 'Easy': ('Leicht', 'Fácil', 'Facile', 'Facile', 'イージー', '쉬움', 'Fácil', '简单'),
 'EASY MODE': ('LEICHTER MODUS', 'MODO FÁCIL', 'MODE FACILE', 'MODALITÀ FACILE', 'イージーモード', '쉬움 모드', 'MODO FÁCIL', '简单模式'),
 'EASY RUN CLEARED': ('LEICHTER DURCHLAUF GESCHAFFT', 'PARTIDA FÁCIL SUPERADA', 'PARTIE FACILE RÉUSSIE', 'PARTITA FACILE COMPLETATA',
  'イージーでランをクリア', '쉬움 모드 런 클리어', 'JORNADA FÁCIL CONCLUÍDA', '简单模式通关'),
 'Easy mode bonus': ('Bonus im leichten Modus', 'Bonificación del modo fácil', 'Bonus du mode facile', 'Bonus della modalità facile',
  'イージーモードのボーナス', '쉬움 모드 보너스', 'Bônus do modo fácil', '简单模式奖励'),
 'No boss curses. Heal 2,000 LP after every duel (up to 8,000 LP). 25% more coins. Shadow relics can be skipped. Starts with 4 removal cards. Easy runs earn no achievements or unlocks.': (
  'Keine Boss-Flüche. Nach jedem Duell 2.000 LP Heilung (bis 8.000 LP). 25 % mehr Münzen. Schattenrelikte können übersprungen werden. Beginnt mit 4 Entfernungskarten. Leichte Durchläufe bringen keine Erfolge oder Freischaltungen.',
  'Sin maldiciones de jefe. Recupera 2000 LP tras cada duelo (hasta 8000 LP). 25 % más monedas. Las reliquias de las sombras se pueden omitir. Empieza con 4 cartas de eliminación. Las partidas fáciles no dan logros ni desbloqueos.',
  "Pas de malédiction de boss. Récupérez 2 000 LP après chaque duel (jusqu'à 8 000 LP). 25 % de pièces en plus. Les reliques de l'ombre peuvent être passées. Commence avec 4 cartes d'élimination. Les parties faciles ne donnent ni succès ni déblocages.",
  "Nessuna maledizione del Boss. Recuperi 2000 LP dopo ogni duello (fino a 8000 LP). 25% di monete in più. Le reliquie dell'ombra si possono saltare. Inizi con 4 carte di rimozione. Le partite facili non danno obiettivi né sblocchi.",
  'ボスの呪いなし。デュエルのたびに2000LP回復（最大8000LP）。コイン25%増加。影のレリックはスキップできます。除去カード4枚で開始。イージーのランでは実績や解放は得られません。',
  '보스 저주 없음. 듀얼마다 LP 2,000 회복(최대 8,000 LP). 코인 25% 증가. 그림자 유물은 건너뛸 수 있습니다. 제거 카드 4장으로 시작합니다. 쉬움 모드 런은 업적이나 해금을 얻지 않습니다.',
  'Sem maldições de chefe. Recupere 2.000 PV após cada duelo (até 8.000 PV). 25% mais moedas. As relíquias das sombras podem ser puladas. Começa com 4 cartas de remoção. Jornadas fáceis não dão conquistas nem desbloqueios.',
  '首领没有诅咒。每场决斗后回复2000基本分（最多8000）。金币增加25%。可以跳过暗影遗物。开局拥有4张除去卡。简单模式的冒险不会获得成就或解锁。'),
 'Skip shadow relic': ('Schattenrelikt überspringen', 'Omitir reliquia de las sombras', "Passer la relique de l'ombre", "Salta la reliquia dell'ombra",
  '影のレリックをスキップ', '그림자 유물 건너뛰기', 'Pular relíquia das sombras', '跳过暗影遗物'),
 'Choose 1, or skip it. Its benefit and drawback last for this run.': (
  'Wähle 1 oder überspringe die Wahl. Sein Vorteil und sein Nachteil gelten für diesen Durchlauf.',
  'Elige 1 u omítelo. Su beneficio y su desventaja duran toda esta partida.',
  "Choisissez-en 1, ou passez. Son avantage et son inconvénient durent toute la partie.",
  'Scegline 1, oppure salta. Il suo vantaggio e il suo svantaggio durano per questa partita.',
  '1つ選ぶか、スキップしてください。そのメリットとデメリットはこのランの間続きます。',
  '1개를 고르거나 건너뛰세요. 이점과 단점은 이번 런 동안 유지됩니다.',
  'Escolha 1 ou pule. O benefício e a desvantagem dela duram por esta jornada.',
  '选择1个，或跳过。它的增益和代价在本次冒险中持续生效。'),
 'Easy runs earn no achievements or unlocks.': (
  'Leichte Durchläufe bringen keine Erfolge oder Freischaltungen.', 'Las partidas fáciles no dan logros ni desbloqueos.',
  'Les parties faciles ne donnent ni succès ni déblocages.', 'Le partite facili non danno obiettivi né sblocchi.',
  'イージーのランでは実績や解放は得られません。', '쉬움 모드 런은 업적이나 해금을 얻지 않습니다.',
  'Jornadas fáceis não dão conquistas nem desbloqueios.', '简单模式的冒险不会获得成就或解锁。'),
 '{0} · Easy · Loop {1} · {2}/9 victories': ('{0} · Leicht · Zyklus {1} · {2}/9 Siege', '{0} · Fácil · Vuelta {1} · {2}/9 victorias',
  '{0} · Facile · Boucle {1} · {2}/9 victoires', '{0} · Facile · Ciclo {1} · {2}/9 vittorie', '{0} · イージー · {1}周目 · {2}/9勝',
  '{0} · 쉬움 · 루프 {1} · {2}/9승', '{0} · Fácil · Ciclo {1} · {2}/9 vitórias', '{0} · 简单 · 第{1}周目 · {2}/9胜'),
 'Easy mode is on for new solo runs (testing).': ('Leichter Modus ist für neue Solo-Durchläufe aktiv (Test).',
  'El modo fácil está activado para nuevas partidas en solitario (prueba).', 'Le mode facile est activé pour les nouvelles parties en solo (test).',
  'La modalità facile è attiva per le nuove partite in solitario (test).', '新しいソロのランでイージーモードが有効です（テスト）。',
  '새 솔로 런에 쉬움 모드가 켜졌습니다(테스트).', 'O modo fácil está ativado para novas jornadas solo (teste).', '新的单人冒险已开启简单模式（测试）。'),
 'Easy mode is off for new runs.': ('Leichter Modus ist für neue Durchläufe aus.', 'El modo fácil está desactivado para nuevas partidas.',
  'Le mode facile est désactivé pour les nouvelles parties.', 'La modalità facile è disattivata per le nuove partite.',
  '新しいランのイージーモードは無効です。', '새 런의 쉬움 모드가 꺼졌습니다.', 'O modo fácil está desativado para novas jornadas.', '新的冒险已关闭简单模式。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
