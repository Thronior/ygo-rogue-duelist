"""Mokuba's and Serenity's Draft pack summaries after their pack changes (tools/add_nov26_loadout_changes.py, 2026-11-26),
in all 8 languages. Made from the translation of Mokuba's previous summary, which has the same shape, by swapping in each
language's own Type and archetype words (the same words its other summaries use). Never overwrites a translation."""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
SUPPORT = ('Support: Ritual Summoning, Fusion Summoning, removal and control, LP recovery, card draw, Equip Spells, Staples. '
           '{0} different cards. Click to inspect.')
summary = lambda types, archetypes: f'Main monster types: {", ".join(types)}. Archetypes: {", ".join(archetypes)}. {SUPPORT}'
OLD_TYPES, OLD_ARCHETYPES = ['Dragon', 'Aqua', 'Spellcaster'], ['Archfiend', 'Blue-Eyes', 'Horus LV', 'Red-Eyes', 'Toon', 'Union']
NEW = [(['Dragon', 'Thunder', 'Aqua'], OLD_ARCHETYPES),                         # DRAFT-MOKUBA-KAIBA
       (['Fairy', 'Dragon', 'Spellcaster'], ['Archfiend', 'Harpie', 'Red-Eyes', 'Spirit'])]  # DRAFT-SERENITY-WHEELER


def main():
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        template = table[summary(OLD_TYPES, OLD_ARCHETYPES)]
        word = lambda w: w if w == 'Horus LV' and w not in table else table[w]
        # The separator the translation uses between list items (", " or "、").
        sep = next(s for s in (', ', '、', '，') if s.join(word(w) for w in OLD_TYPES) in template)
        old_types, old_archetypes = sep.join(word(w) for w in OLD_TYPES), sep.join(word(w) for w in OLD_ARCHETYPES)
        assert template.count(old_types) == 1 and template.count(old_archetypes) == 1, (lang, template)
        for types, archetypes in NEW:
            text = template.replace(old_types, sep.join(word(w) for w in types)).replace(old_archetypes, sep.join(word(w) for w in archetypes))
            table.setdefault(summary(types, archetypes), text)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
