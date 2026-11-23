"""The Obelisk duelist was named "Obelisk the Tormenter"; the card (and the user, 2026-11-23) spell it "Tormentor".

Renames the duelist everywhere it is shown or matched: opponent data, tutorial text, the translation keys of all 8
languages (source and web bundles), the web content copies and the code that looks the name up. The portrait file
(opponents/obelisk-the-tormenter.png) and deck file keep their old names; they are referenced by path, not by the name.
Old release notes keep the spelling they shipped with. Safe to run again.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD, NEW = 'Obelisk the Tormenter', 'Obelisk the Tormentor'
FILES = [
    'data/tier-exclusive-opponents.json', 'data/tier4-decks.json', 'data/tutorial.json', 'data/decks/README.md',
    'data/i18n/catalog.json', *[f'data/i18n/ui/{c}.json' for c in ('de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh')],
    *[f'android/web/i18n/{c}.json' for c in ('de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh')],
    'android/web/content.json', 'android/web/campaign-files.json',
    'android/web/mobile.js', 'android/web/opponent-backgrounds.js', 'android/web/run-card.js',
    'character_progression.py', 'endless.py', 'tools/test_obelisk_loop_gate.py',
]

for name in FILES:
    path = ROOT / name
    if not path.exists():
        continue
    raw = path.read_bytes()
    count = raw.count(OLD.encode())
    if count:
        path.write_bytes(raw.replace(OLD.encode(), NEW.encode()))
    print(f'{name}: {count}')
