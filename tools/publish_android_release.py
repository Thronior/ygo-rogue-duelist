import json,subprocess,urllib.request,urllib.error,hashlib
from pathlib import Path
import argparse
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description="Publish verified APK and delta assets to GitHub.")
parser.add_argument('--notes',required=True,type=Path)
parser.add_argument('--target-commitish',default='main',help='Remote branch or commit to tag (defaults to main).')
parser.add_argument('--replace-assets',action='store_true',help='Replace release assets whose names already exist but whose digests differ.')
args=parser.parse_args()
version=(root/'VERSION').read_text().strip()
from finalize_releases import finalize
manifest=finalize()
assert manifest['version']==version, 'Build version does not match source VERSION'

c=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,check=True,cwd=root)
a=dict(x.split('=',1) for x in c.stdout.splitlines() if '=' in x);headers={'Authorization':'Bearer '+a['password'],'Accept':'application/vnd.github+json','User-Agent':'YGO-release'}
def request(url,body=None,content='application/json',method=None):
 req=urllib.request.Request(url,data=body,headers={**headers,'Content-Type':content},method=method)
 with urllib.request.urlopen(req,timeout=600) as response:
  payload=response.read()
  return json.loads(payload) if payload else {}
base='https://api.github.com/repos/Thronior/ygo-rogue-duelist/releases'
existing=request(base);release=next((x for x in existing if x['tag_name']=='v'+version),None)
if not release:
 release=request(base,json.dumps({'tag_name':'v'+version,'target_commitish':args.target_commitish,'name':'YGO Rogue Duelist '+version,'body':args.notes.read_text(encoding='utf-8-sig'),'draft':True,'prerelease':False}).encode())
for name in [*manifest['files'],'release-manifest.json','YGO-Rogue-Android.apk.sha256']:
 p=root/'releases'/name;digest='sha256:'+hashlib.sha256(p.read_bytes()).hexdigest();old=next((x for x in release['assets'] if x['name']==name),None)
 if old:
  if old.get('digest')==digest:continue
  if not args.replace_assets:raise AssertionError('Existing asset differs: '+name+' (pass --replace-assets to replace it)')
  print('Replacing',name,flush=True)
  request(old['url'],method='DELETE')
 print('Uploading',name,p.stat().st_size,flush=True)
 result=request(release['upload_url'].split('{')[0]+'?name='+name,p.read_bytes(),'application/octet-stream')
 assert result['size']==p.stat().st_size and result.get('digest')==digest
 print('Verified upload',name,flush=True)
release=request(release['url'],json.dumps({'draft':False,'make_latest':'true'}).encode(),method='PATCH')
print('Published',release['html_url'],flush=True)
