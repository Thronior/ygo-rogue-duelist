"""Once-per-Duel relics grey out after acting (user 2026-11-24): their relic bar label adds "Used this duel." All 8
languages; never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {'Used this duel.': ('In diesem Duell verwendet.', 'Usada en este duelo.', 'Utilisée pour ce duel.', 'Usata in questo duello.',
                             'このデュエル中は使用済み。', '이번 듀얼에서 사용됨.', 'Usada neste duelo.', '本场决斗中已使用。')}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
