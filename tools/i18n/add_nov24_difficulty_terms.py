"""Difficulty prompt before the save slot (user 2026-11-24, option D): Normal or a small Easy button. All 8 languages;
never overwrites an existing translation ("Normal" and the no-achievements line already exist)."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Choose a difficulty': ('Wähle einen Schwierigkeitsgrad', 'Elige una dificultad', 'Choisissez une difficulté', 'Scegli una difficoltà',
  '難易度を選択', '난이도 선택', 'Escolha uma dificuldade', '选择难度'),
 'No boss curses, more healing and coins.': ('Keine Boss-Flüche, mehr Heilung und Münzen.', 'Sin maldiciones de jefe, más curación y monedas.',
  'Pas de malédictions de boss, plus de soins et de pièces.', 'Niente maledizioni dei boss, più cure e monete.',
  'ボスの呪いなし、回復とコインが増える。', '보스 저주 없음, 회복과 코인 증가.', 'Sem maldições de chefe, mais cura e moedas.', '没有首领诅咒，更多回复和金币。'),
 'Achievements and unlocks count.': ('Erfolge und Freischaltungen zählen.', 'Cuentan los logros y desbloqueos.', 'Les succès et déblocages comptent.',
  'Obiettivi e sblocchi contano.', '実績とアンロックが有効。', '업적과 해금이 적용됩니다.', 'Conquistas e desbloqueios contam.', '成就和解锁有效。'),
 'Normal': ('Normal', 'Normal', 'Normal', 'Normale', 'ノーマル', '노멀', 'Normal', '普通'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
