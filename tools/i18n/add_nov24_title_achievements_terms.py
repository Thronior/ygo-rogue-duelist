"""Title screen completion now reads "X/Y achievements", with the percent inside the bar (user, 2026-11-24), in all 8
languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 '{0}/{1} achievements': ('{0}/{1} Erfolge', '{0}/{1} logros', '{0}/{1} succès', '{0}/{1} obiettivi', '実績 {0}/{1}', '업적 {0}/{1}', '{0}/{1} conquistas', '成就 {0}/{1}'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
