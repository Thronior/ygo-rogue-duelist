"""Write Android release metadata; native desktop releases are retired."""
from pathlib import Path
import json,zipfile
ROOT=Path(__file__).resolve().parents[1]
def finalize():
 p=ROOT/'releases/YGO-Rogue-Android.apk'
 with zipfile.ZipFile(p) as z:version=json.loads(z.read('assets/web/build.json'))['version']
 from android_delta import digest as file_digest,generate
 raw=file_digest(p);digest=raw.hex()
 p.with_suffix('.apk.sha256').write_text(digest+'  '+p.name+'\n')
 data={'version':version,'files':{p.name:{'version':version,'bytes':p.stat().st_size,'sha256':digest}}}
 data['files'].update(generate(p,raw))
 (p.parent/'release-manifest.json').write_text(json.dumps(data,indent=2)+'\n')
 return data
if __name__=='__main__':print(finalize())
