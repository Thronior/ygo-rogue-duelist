"""Build supported Android and web releases only."""
from pathlib import Path
import subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,'-B',str(ROOT/'tools/build_android.py')],cwd=ROOT,check=True)
version=(ROOT/'VERSION').read_text().strip()
subprocess.run([sys.executable,'-B',str(ROOT/'tools/build_pwa.py'),'--output',str(ROOT/'releases'/('web-'+version))],cwd=ROOT,check=True)
print('Built Android and web. Publishing is separate.')
