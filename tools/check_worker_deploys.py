"""Before a release: say which Cloudflare Workers changed since the last release commit and so need deploying first.

Workers deploy before the clients that depend on them. The rooms Worker bundles draft-catalog.json and
collector-cards.json, which tools/build_android.py regenerates, so a character, pack or card change also needs it.
Usage: python tools/check_worker_deploys.py [--since <commit>] [--strict]   (--strict exits 1 when a deploy is needed)
"""
from pathlib import Path
import subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
WORKERS={'Rooms Worker (multiplayer/cloudflare)':'multiplayer/cloudflare','Stats Worker (multiplayer/global-stats)':'multiplayer/global-stats'}
# Tests, docs and local logs are not deployed.
IGNORED=('.test.mjs','test.mjs','README.md','.log','.md')
SKIP_DIRS=('node_modules/','.wrangler/')

def git(*args):return subprocess.run(['git',*args],cwd=ROOT,capture_output=True,text=True,check=True).stdout

def last_release():
 line=git('log','--grep=^Release v','-1','--format=%H %s').strip()
 if not line:raise SystemExit('No "Release v..." commit found; pass --since <commit>.')
 return line.split(' ',1)

def changed(base,folder):
 files=set(git('diff','--name-only',base,'--',folder).split())|set(git('ls-files','--others','--exclude-standard','--',folder).split())
 return sorted(f for f in files if not any(s in f for s in SKIP_DIRS) and not f.endswith(IGNORED))

def main():
 args=sys.argv[1:]
 if '--since' in args:base=args[args.index('--since')+1];title=base
 else:base,title=last_release()
 print('Compared with',base[:10],'-',title)
 needed=False
 for name,folder in WORKERS.items():
  files=changed(base,folder)
  if not files:print(f'  {name}: unchanged, no deploy needed');continue
  needed=True;print(f'  {name}: DEPLOY BEFORE THE CLIENTS')
  for f in files:print('    -',f)
  if folder.endswith('global-stats'):
   print('    Stats migration rule (AGENTS.md): run `node tools/snapshot_global_stats.mjs before D:/<release-output>/stats-before.json`')
   print('    right before deploying, then `verify` with the same path afterwards. Do not publish clients if verify fails.')
 if needed and '--strict' in args:sys.exit(1)

if __name__=='__main__':main()
