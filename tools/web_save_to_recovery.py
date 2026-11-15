"""Turns a player's browser save export (YGO-Rogue-save-backup.json) into an admin recovery file the app accepts
(Settings > Devices & App > Other recovery options). Needed until players can import their own exports (2026-11-14).

  python/python.exe tools/web_save_to_recovery.py <export.json> [output.json]

The output is written next to the export as <name>-recovery.json unless a path is given. The checks match
validateRecovery in android/web/device-backup.js, so a file this tool writes is one the app will take.
"""
import json, re, sys
from pathlib import Path


def convert(text):
    files = json.loads(text)
    if isinstance(files, dict) and files.get('format') == 'ygo-device-recovery-v1':
        return files  # already a recovery file
    if not isinstance(files, dict) or not files:
        raise ValueError('Not a game save backup.')
    for name, value in files.items():
        if not re.fullmatch(r'[\w-]+\.(json|bak)', name) or not isinstance(value, str):
            raise ValueError(f'Invalid save file entry: {name}')
        json.loads(value)
    if 'profile.json' not in files:
        raise ValueError('The backup has no profile.json, so it holds no progress.')
    if len(files) > 100:
        raise ValueError('Too many files for a recovery file.')
    return {'format': 'ygo-device-recovery-v1', 'backup': {'schema': 1, 'files': files, 'extras': {}}}


def main(argv):
    if len(argv) < 2:
        print(__doc__); return 2
    source = Path(argv[1])
    target = Path(argv[2]) if len(argv) > 2 else source.with_name(source.stem + '-recovery.json')
    recovery = convert(source.read_text(encoding='utf-8-sig'))
    target.write_text(json.dumps(recovery, ensure_ascii=False), encoding='utf-8')
    profile = json.loads(recovery['backup']['files']['profile.json'])
    profile = profile.get('payload', profile) if isinstance(profile, dict) else {}
    print(f"Wrote {target}  (runs {profile.get('runs', 0)}, wins {profile.get('wins', 0)}, files {len(recovery['backup']['files'])})")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
