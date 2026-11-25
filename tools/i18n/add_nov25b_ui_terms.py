"""Ultimate Collector import messages (collector.py, collector-ui.js, user 2026-11-25): a run in a duel, an empty slot and an
ended run are refused with a plain sentence instead of a Python traceback. Run words follow each language's existing
"Select this run" entry. All 8 languages; never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'You can only import a run between duels, not during a duel. Finish the duel first, then import the run.': (
  'Du kannst einen Durchlauf nur zwischen Duellen importieren, nicht während eines Duells. Beende zuerst das Duell und importiere dann den Durchlauf.',
  'Solo puedes importar una partida entre duelos, no durante un duelo. Termina primero el duelo y luego importa la partida.',
  "Vous ne pouvez importer une partie qu'entre deux duels, pas pendant un duel. Terminez d'abord le duel, puis importez la partie.",
  'Puoi importare una partita solo tra un Duello e l\'altro, non durante un Duello. Prima termina il Duello, poi importa la partita.',
  'ランはデュエルとデュエルの間にのみインポートできます。デュエル中はできません。先にデュエルを終えてからランをインポートしてください。',
  '런은 듀얼 사이에만 가져올 수 있으며, 듀얼 중에는 가져올 수 없습니다. 먼저 듀얼을 끝낸 뒤 런을 가져오세요.',
  'Você só pode importar uma jornada entre duelos, não durante um duelo. Termine o duelo primeiro e depois importe a jornada.',
  '只能在两场决斗之间导入冒险，决斗进行中无法导入。请先完成这场决斗，再导入冒险。'),
 'In a duel: import it between duels': (
  'Im Duell: zwischen Duellen importieren',
  'En duelo: impórtala entre duelos',
  'En duel : importez-la entre deux duels',
  'In Duello: importala tra un Duello e l\'altro',
  'デュエル中：デュエルの間にインポート',
  '듀얼 중: 듀얼 사이에 가져오기',
  'Em duelo: importe entre duelos',
  '决斗中：请在决斗之间导入'),
 'This save slot has no run to import. Choose another saved run.': (
  'In diesem Speicherplatz gibt es keinen Durchlauf zum Importieren. Wähle einen anderen gespeicherten Durchlauf.',
  'Esta ranura de guardado no tiene ninguna partida para importar. Elige otra partida guardada.',
  "Cet emplacement de sauvegarde n'a aucune partie à importer. Choisissez une autre partie enregistrée.",
  'Questo slot di salvataggio non contiene partite da importare. Scegli un\'altra partita salvata.',
  'このセーブスロットにはインポートできるランがありません。別の保存されたランを選んでください。',
  '이 저장 슬롯에는 가져올 런이 없습니다. 다른 저장된 런을 선택하세요.',
  'Este espaço de salvamento não tem nenhuma jornada para importar. Escolha outra jornada salva.',
  '此存档位没有可导入的冒险。请选择另一个已保存的冒险。'),
 'This run has ended and cannot be imported. Choose a run that is still going.': (
  'Dieser Durchlauf ist beendet und kann nicht importiert werden. Wähle einen Durchlauf, der noch läuft.',
  'Esta partida ha terminado y no se puede importar. Elige una partida que siga en curso.',
  'Cette partie est terminée et ne peut pas être importée. Choisissez une partie encore en cours.',
  'Questa partita è terminata e non può essere importata. Scegli una partita ancora in corso.',
  'このランは終了しているため、インポートできません。進行中のランを選んでください。',
  '이 런은 끝나서 가져올 수 없습니다. 아직 진행 중인 런을 선택하세요.',
  'Esta jornada terminou e não pode ser importada. Escolha uma jornada que ainda esteja em andamento.',
  '此冒险已结束，无法导入。请选择仍在进行中的冒险。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
