"""Build supported Android and web releases only."""
from pathlib import Path
import subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
# The in-game patch notes are drawn inside the game's own CSS; refuse a release whose sheets break there (user,
# 2026-11-18: v0.2.38's relic and pack sections were pulled into the shop's grid classes).
subprocess.run([sys.executable,'-B',str(ROOT/'tools/patch_notes.py'),'check'],cwd=ROOT,check=True)
subprocess.run([sys.executable,'-B',str(ROOT/'tools/refresh_fallen_collectors.py')],cwd=ROOT,check=True)
subprocess.run([sys.executable,'-B',str(ROOT/'tools/build_android.py')],cwd=ROOT,check=True)
version=(ROOT/'VERSION').read_text().strip()
subprocess.run([sys.executable,'-B',str(ROOT/'tools/build_pwa.py'),'--output',str(ROOT/'releases'/('web-'+version))],cwd=ROOT,check=True)
print('Built Android and web. Publishing is separate.')

subprocess.run([sys.executable,'-B',str(ROOT/'tools/finalize_releases.py')],cwd=ROOT,check=True)
