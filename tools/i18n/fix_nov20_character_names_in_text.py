"""Character names inside translated sentences (Discord, magna98, 2026-11-20): the unlock goal "Win a run with Weevil
Underwood" kept the English name in Italian while the roster says "Bruchido Haga". Every translated value that still
contains a character's English name gets that character's own translation (the official names added 2026-11-18/19).
Only values whose English key also contains that name are touched. Safe to run again."""
import json, runpy, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']


def main():
    meta = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf-8-sig'))
    names = sorted({c['name'] for c in meta['characters']}, key=len, reverse=True)
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        changed = 0
        for key, value in list(table.items()):
            if not isinstance(value, str): continue
            new = value
            for name in names:
                local = table.get(name)
                if not local or local == name or name not in key or name not in new: continue
                new = new.replace(name, local)
            if new != value:
                table[key] = new; changed += 1
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        print(lang, changed)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
