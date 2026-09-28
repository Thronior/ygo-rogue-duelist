"""One file selection policy for both offline mobile apps."""
from pathlib import Path
import subprocess,shutil

def web_files(root):
 # One CPU implementation for solo/tag; fail releases if a separate tag policy appears.
 source=Path(root).resolve().parent.parent
 check=source/'android/test_cpu_parity.mjs'
 if check.exists():
  node=source/'runtime/ai/node.exe'
  executable=str(node) if node.exists() else shutil.which('node')
  if not executable:raise RuntimeError('Node is required to verify shared solo/tag CPU policy.')
  subprocess.run([executable,str(check)],check=True)
 for p in sorted(Path(root).rglob('*')):
  if not p.is_file():continue
  relative=p.relative_to(root)
  if any(part.casefold()=='potential sound effects' for part in relative.parts):continue
  if p.name=='package.json' or p.name.startswith(('test-','tmp-')):continue
  if any(part.startswith('ai-backup-') or part=='__pycache__' for part in relative.parts):continue
  yield p,relative
