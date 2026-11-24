"""CPU Action Delay setting (user 2026-11-24): 0–1000 ms added before each CPU action. All 8 languages; never overwrites
an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'CPU Action Delay': ('CPU-Aktionsverzögerung', 'Retraso de acciones de la CPU', 'Délai des actions du CPU', 'Ritardo azioni della CPU',
  'CPUの行動ディレイ', 'CPU 행동 지연', 'Atraso das ações da CPU', 'CPU行动延迟'),
 'Extra wait before each CPU action.': ('Zusätzliche Wartezeit vor jeder CPU-Aktion.', 'Espera adicional antes de cada acción de la CPU.',
  'Attente supplémentaire avant chaque action du CPU.', 'Attesa aggiuntiva prima di ogni azione della CPU.', 'CPUの各行動の前に待ち時間を追加します。',
  'CPU의 각 행동 전에 추가로 기다립니다.', 'Espera extra antes de cada ação da CPU.', '在CPU每次行动前额外等待。'),
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
