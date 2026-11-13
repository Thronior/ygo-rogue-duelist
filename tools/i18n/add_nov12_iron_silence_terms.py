"""Iron Silence wording (user, 2026-11-12, after Der_Rutscher's report that "everywhere" read as if summoning conditions
were negated too): the second sentence becomes "Negate all your monsters' activated effects everywhere." The new full
text and drawback half are built from the existing translations, swapping only that sentence, in all 8 languages.
Removes the intermediate "Summoning conditions still apply." keys and renames the two catalog rows."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
OLD_SENTENCE = 'Negate your activated monster effects in all locations.'
NEW_SENTENCE = "Negate all your monsters' activated effects everywhere."
NEW = {'de': 'Annulliere alle aktivierten Effekte deiner Monster, egal wo sie sich befinden.',
       'es': 'Niega todos los efectos activados de tus monstruos, estén donde estén.',
       'fr': "Annulez tous les effets activés de vos monstres, où qu'ils soient.",
       'it': 'Annulla tutti gli effetti attivati dei tuoi mostri, ovunque si trovino.',
       'ja': 'どこにあっても、自分のモンスターの発動した効果は全て無効になる。',
       'ko': '어디에 있든 자신의 몬스터가 발동한 효과는 모두 무효가 된다.',
       'pt': 'Negue todos os efeitos ativados dos seus monstros, onde quer que estejam.',
       'zh': '无论在哪里，自己怪兽发动的效果全部无效。'}
FULL = 'Monsters you control gain 600 ATK/DEF, but their effects are negated. ' + OLD_SENTENCE
HALF = 'Their effects are negated. ' + OLD_SENTENCE
STALE = ' Summoning conditions still apply.'

def common_suffix(a, b):
    n = 0
    while n < min(len(a), len(b)) and a[-1 - n] == b[-1 - n]: n += 1
    return a[len(a) - n:]

def main():
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key in [k for k in table if k.endswith(STALE)]: del table[key]
        full, half = table[FULL], table[HALF]
        # The old second sentence is the shared ending of both translations, cut back to where that sentence starts.
        tail = common_suffix(full, half)
        start = max(tail.rfind(mark, 0, len(tail) - 1) for mark in ('. ', '。', '! ', '.')) if lang not in ('ja', 'zh') else max(tail.rfind('。', 0, len(tail) - 1), -1)
        old = tail[start + (2 if lang not in ('ja', 'zh') and tail[start:start + 2] == '. ' else 1):] if start >= 0 else tail.lstrip()
        table[FULL.replace(OLD_SENTENCE, NEW_SENTENCE)] = full[:len(full) - len(old)] + NEW[lang]
        table[HALF.replace(OLD_SENTENCE, NEW_SENTENCE)] = half[:len(half) - len(old)] + NEW[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        print(lang, '|', table[HALF.replace(OLD_SENTENCE, NEW_SENTENCE)])
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    for row in catalog:
        en = row.get('en', '')
        if en in (FULL + STALE, HALF + STALE, FULL, HALF): row['en'] = en.replace(STALE, '').replace(OLD_SENTENCE, NEW_SENTENCE)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')

if __name__ == '__main__':
    main()
