"""Checks a language's translated chunks: every entry present, same {n} placeholders, nothing empty.

Usage: python tools/i18n/check_work.py <work dir> <lang>
Reads <work>/<lang>/chunk-NN.json and out-NN.json; prints problems and exits 1 if any.
"""
import json, re, sys
from pathlib import Path

work, lang = Path(sys.argv[1]), sys.argv[2]
folder = work / lang
problems, total, same = [], 0, 0
slots = lambda s: sorted(re.findall(r'\{\d+\}', s))
for chunk in sorted(folder.glob('chunk-*.json')):
    out = folder / chunk.name.replace('chunk-', 'out-')
    entries = json.loads(chunk.read_text(encoding='utf8'))
    if not out.exists():
        problems.append(f'{out.name}: missing file')
        continue
    try:
        done = json.loads(out.read_text(encoding='utf8'))
    except json.JSONDecodeError as e:
        problems.append(f'{out.name}: invalid JSON ({e})')
        continue
    for e in entries:
        total += 1
        t = done.get(e['en'])
        if not isinstance(t, str) or not t.strip():
            problems.append(f'{out.name}: missing or empty: {e["en"][:70]}')
        elif slots(t) != slots(e['en']):
            problems.append(f'{out.name}: placeholders {slots(e["en"])} -> {slots(t)}: {e["en"][:70]}')
        elif t == e['en'] and len(e['en']) > 12 and re.search(r'[a-z]{3}', e['en']):
            same += 1
    extra = set(done) - {e['en'] for e in entries}
    if extra:
        problems.append(f'{out.name}: {len(extra)} keys not in the chunk (keys must be the exact English text), e.g. {sorted(extra)[0][:60]}')
for p in problems[:80]:
    print(p)
print(f'{lang}: {total} entries, {len(problems)} problems, {same} long entries left in English')
sys.exit(1 if problems else 0)
