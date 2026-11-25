"""Bandit Keith's Draft pack summary after Umi and Amphibious Bugroth MK-3 left it (2026-11-25): the same text without the
Umi archetype, in all 8 languages, made from the existing translation. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
OLD = 'Main monster types: Machine, Dragon, Rock. Archetypes: Red-Eyes, Toon, Union, Umi. Support: Ritual Summoning, Fusion Summoning, removal and control, card draw, Equip Spells. {0} different cards. Click to inspect.'
NEW = OLD.replace(', Umi.', '.')
# Each language's "Umi" archetype entry, removed with its separator.
UMI = {'de': ', Umi.', 'es': ', Umi.', 'fr': ', Umi.', 'it': ', Umi.', 'ja': '、海。', 'ko': ', 바다.', 'pt': ', Umi.', 'zh': '、海。'}
END = {'de': '.', 'es': '.', 'fr': '.', 'it': '.', 'ja': '。', 'ko': '.', 'pt': '.', 'zh': '。'}


def main():
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        old = table[OLD]
        assert old.count(UMI[lang]) == 1, (lang, old)
        table.setdefault(NEW, old.replace(UMI[lang], END[lang]))
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
