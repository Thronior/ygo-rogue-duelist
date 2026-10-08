"""One file selection policy for both offline mobile apps."""
from pathlib import Path
import subprocess,shutil,json

def web_files(root):
 # One CPU implementation for solo/tag; fail releases if a separate tag policy appears.
 source=Path(root).resolve().parent.parent
 check=source/'android/test_cpu_parity.mjs'
 if check.exists():
  node=source/'runtime/ai/node.exe'
  executable=str(node) if node.exists() else shutil.which('node')
  if not executable:raise RuntimeError('Node is required to verify shared solo/tag CPU policy.')
  subprocess.run([executable,str(check)],check=True)
 music_manifest=source/'assets/music/soundtrack.json'
 selected_music=set(json.loads(music_manifest.read_text(encoding='utf8'))['tracks']) if music_manifest.exists() else None
 for p in sorted(Path(root).rglob('*')):
  if not p.is_file():continue
  relative=p.relative_to(root)
  # Retained source reference; all supported clients now use the smaller H.264 copy.
  if relative.as_posix()=='assets/duel-tunnel-1080.webm':continue
  if relative.parts[:2]==('assets','music') and selected_music is not None:
   if len(relative.parts)!=3 or p.suffix.lower()!='.mp3' or p.stem not in selected_music:continue
  if any(part.casefold()=='potential sound effects' for part in relative.parts):continue
  if p.name=='package.json' or p.name.startswith(('test-','tmp-')):continue
  if any(part.startswith('ai-backup-') or part=='__pycache__' for part in relative.parts):continue
  yield p,relative
