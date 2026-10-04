"""Write Android release metadata; native desktop releases are retired."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
def finalize():
 p=ROOT/'releases/YGO-Rogue-Android.apk'
 with zipfile.ZipFile(p) as z:version=json.loads(z.read('assets/web/build.json'))['version']
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 p.with_suffix('.apk.sha256').write_text(digest+'  '+p.name+'\n')
 data={'version':version,'files':{p.name:{'version':version,'bytes':p.stat().st_size,'sha256':digest}}}
 from android_delta import generate
 data['files'].update(generate(p))
 (p.parent/'release-manifest.json').write_text(json.dumps(data,indent=2)+'\n')
 return data
if __name__=='__main__':print(finalize())
