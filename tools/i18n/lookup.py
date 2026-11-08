"""Shows how official cards phrase something in another language, to keep relic and UI wording close to card text.

Usage: python tools/i18n/lookup.py <lang> <English words or regex> [max]
Prints game cards whose English name or text matches, with that language's official name and text.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
lang, pattern = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 6
content = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf8'))
loc = json.loads((ROOT / f'data/i18n/cards/{lang}.json').read_text(encoding='utf8'))
rx = re.compile(pattern, re.I)
shown = 0
for c in content['cards'] + content['tokenCards']:
    if not (rx.search(c['name']) or rx.search(c.get('desc') or '')):
        continue
    t = loc.get(str(c['id']))
    if not t:
        continue
    print(f"EN  {c['name']}: {c.get('desc')}\n{lang.upper()}  {t[0]}: {t[1]}\n")
    shown += 1
    if shown >= limit:
        break
print(f'({shown} shown)')
