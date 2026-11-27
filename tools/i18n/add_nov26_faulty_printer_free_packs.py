"""Faulty Printer also misprints Absolute Random's free Random Packs (Discord 2026-11-26). The relic text gains one sentence;
each language keeps its existing translation and adds the same sentence. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
OLD = "Each monster purchased as a single or pulled from a purchased booster has a {}% chance to become a misprint. A misprint changes that copy's original ATK and DEF independently by a random amount from -1000 to +1000 (min. 0) and gives it a random Type and Attribute."
EXTRA = 'Free Random Packs count too.'
ADD = {'de': 'Kostenlose Zufallsbooster zählen ebenfalls.', 'es': 'Los sobres aleatorios gratuitos también cuentan.',
       'fr': 'Les boosters aléatoires gratuits comptent aussi.', 'it': 'Contano anche le buste casuali gratuite.',
       'ja': '無料のランダムパックも対象です。', 'ko': '무료 무작위 팩도 포함됩니다.', 'pt': 'Pacotes aleatórios gratuitos também contam.',
       'zh': '免费的随机补充包也算在内。'}
SEP = {'ja': '', 'zh': ''}


def main():
    for lang, extra in ADD.items():
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key in [k for k in table if k.startswith(OLD.split('{}')[0]) and k.endswith(OLD.split('{}')[1])]:
            table.setdefault(f'{key} {EXTRA}', table[key] + SEP.get(lang, ' ') + extra)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
