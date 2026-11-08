"""Merges translated work chunks into data/i18n/ui/<lang>.json and data/i18n/glossary/<lang>.json.

Existing translations are kept unless the work folder has a newer one for the same English text.
Usage: python tools/i18n/merge_work.py <work dir> [lang ...]
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
work = Path(sys.argv[1])
langs = sys.argv[2:] or ['de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh']
for lang in langs:
    folder = work / lang
    target = ROOT / f'data/i18n/ui/{lang}.json'
    merged = json.loads(target.read_text(encoding='utf8')) if target.exists() else {}
    for out in sorted(folder.glob('out-*.json')):
        merged.update(json.loads(out.read_text(encoding='utf8')))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(dict(sorted(merged.items())), ensure_ascii=False, indent=1), encoding='utf8')
    glossary = folder / 'glossary.json'
    if glossary.exists():
        (ROOT / 'data/i18n/glossary').mkdir(exist_ok=True)
        (ROOT / f'data/i18n/glossary/{lang}.json').write_text(glossary.read_text(encoding='utf8'), encoding='utf8')
    print(lang, len(merged), 'translations')
