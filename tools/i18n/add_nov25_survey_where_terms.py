"""The survey's first question became "Where are you from?" (android/web/survey.js, user 2026-11-25): no "country", so
the wording takes no stance on regions in the list. All 8 languages; never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Where are you from?': ('Woher kommst du?', '¿De dónde eres?', "D'où venez-vous ?", 'Da dove vieni?',
  'どこから遊んでいますか？', '어디에서 오셨나요?', 'De onde você é?', '你来自哪里？'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
