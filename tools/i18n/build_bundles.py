"""Writes android/web/i18n/<lang>.json, the file the client loads for a language (android/web/i18n.js).

{ui: {English text or {n} pattern: translation}, cards: {id: [name, text, [effect labels]]}, setnames: {setcode: name}}
Sources: data/i18n/ui/<lang>.json (translations), data/i18n/cards/<lang>.json and data/i18n/system/<lang>.json.
Run directly, or through tools/build_android.py.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')


def build():
    out_dir = ROOT / 'android/web/i18n'
    out_dir.mkdir(exist_ok=True)
    for lang in LANGS:
        ui_file = ROOT / f'data/i18n/ui/{lang}.json'
        ui = json.loads(ui_file.read_text(encoding='utf8')) if ui_file.exists() else {}
        cards = json.loads((ROOT / f'data/i18n/cards/{lang}.json').read_text(encoding='utf8'))
        system = json.loads((ROOT / f'data/i18n/system/{lang}.json').read_text(encoding='utf8'))
        # Keep identity values too: the locale bundle must contain every catalog key,
        # even when a translator intentionally leaves a technical term in English.
        bundle = {'ui': ui, 'cards': cards, 'setnames': system.get('setnames', {})}
        (out_dir / f'{lang}.json').write_text(json.dumps(bundle, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    return out_dir


if __name__ == '__main__':
    print('Wrote', build())
