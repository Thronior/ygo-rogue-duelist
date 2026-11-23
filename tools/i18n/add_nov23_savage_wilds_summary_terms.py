"""The Savage Wilds pack summary after the Moth LV line joined it (2026-11-23): Insect is now its first monster Type.
Same text as the earlier "Beast, Insect, Dinosaur" summary with the first two Types swapped. All 8 languages; never
overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
OLD = 'Main monster types: Beast, Insect, Dinosaur. Archetypes: Archfiend, Horus LV. Support: Ritual Summoning, Fusion Summoning, removal and control. {0} different cards. Click to inspect.'
NEW = 'Main monster types: Insect, Beast, Dinosaur. Archetypes: Archfiend, Horus LV. Support: Ritual Summoning, Fusion Summoning, removal and control. {0} different cards. Click to inspect.'
# The localized Beast and Insect in the old translation, swapped in place.
SWAP = {'de': ('Ungeheuer, Insekt', 'Insekt, Ungeheuer'), 'es': ('Bestia, Insecto', 'Insecto, Bestia'),
        'fr': ('Bête, Insecte', 'Insecte, Bête'), 'it': ('Bestia, Insetto', 'Insetto, Bestia'),
        'ja': ('獣族、昆虫族', '昆虫族、獣族'), 'ko': ('야수족, 곤충족', '곤충족, 야수족'),
        'pt': ('Besta, Inseto', 'Inseto, Besta'), 'zh': ('兽族、昆虫族', '昆虫族、兽族')}


def main():
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        a, b = SWAP[lang]
        assert table[OLD].count(a) == 1, (lang, table[OLD])
        table.setdefault(NEW, table[OLD].replace(a, b))
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
