"""Checks that the GitHub release mirrors used for players in China serve a published release.

The mirrors relay GitHub's release files, so nothing is uploaded to them: publishing on GitHub publishes there too.
The list lives in android/src/com/shadowrun/game/UpdatePolicy.java (MIRRORS); the web check uses the CORS ones
(android/web/android-update.js MANIFEST_MIRRORS). Usage: python tools/china_mirrors.py [VERSION]
"""
import json,re,sys,time,urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MANIFEST='https://github.com/Thronior/ygo-rogue-duelist/releases/latest/download/release-manifest.json'

def mirrors():
 source=(ROOT/'android/src/com/shadowrun/game/UpdatePolicy.java').read_text(encoding='utf-8')
 block=re.search(r'MIRRORS\s*=\s*\{([^}]*)\}',source).group(1)
 return re.findall(r'"(https://[^"]+/)"',block)

def check(version,attempts=3,wait=20):
 """Returns the mirrors that did not serve `version`. A mirror that is down only warns: the updater falls back to GitHub."""
 failed=[]
 for mirror in mirrors():
  for attempt in range(attempts):
   try:
    req=urllib.request.Request(f'{mirror}{MANIFEST}?t={int(time.time())}',headers={'User-Agent':'YGO-Rogue-Updater'})
    with urllib.request.urlopen(req,timeout=30) as r:manifest=json.loads(r.read())
    if manifest.get('version')==version and 'YGO-Rogue-Android.apk' in manifest.get('files',{}):
     print('China mirror OK',mirror,version,flush=True);break
    note=f"serves {manifest.get('version')}"
   except Exception as error:note=str(error)
   if attempt<attempts-1:time.sleep(wait)
  else:
   print('WARNING China mirror not serving',version,'from',mirror,'-',note,flush=True);failed.append(mirror)
 return failed

if __name__=='__main__':
 version=sys.argv[1] if len(sys.argv)>1 else (ROOT/'VERSION').read_text().strip()
 sys.exit(1 if check(version) else 0)
