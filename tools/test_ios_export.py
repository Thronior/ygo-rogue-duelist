"""Audit every shipped iOS web file against the signed Android APK."""
from pathlib import Path
import json,hashlib,zipfile,plistlib,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
ios=ROOT/'ios';manifest=json.loads((ios/'bundle-manifest.json').read_text());failures=[]
def check(ok,message):
 if not ok:failures.append(message)
with zipfile.ZipFile(ROOT/'releases/YGO-Rogue-Android.apk') as apk:
 files={n[len('assets/web/'):]:n for n in apk.namelist() if n.startswith('assets/web/') and not n.endswith('/')}
 check(set(files)==set(manifest['files']),'APK/iOS file sets differ')
 for rel,digest in manifest['files'].items():
  source=ROOT/'android/web'/rel;target=ios/'ShadowRun/web'/rel
  for name,data in [('source',source.read_bytes()),('iOS',target.read_bytes()),('APK',apk.read(files[rel]))]:check(hashlib.sha256(data).hexdigest()==digest,f'{name} mismatch: {rel}')
  if rel.endswith('.json'):
   try:json.loads(target.read_text(encoding='utf-8-sig'))
   except Exception as e:failures.append(f'Invalid JSON {rel}: {e}')
 info=plistlib.loads((ios/'ShadowRun/Info.plist').read_bytes());check(info['CFBundleShortVersionString']==(ROOT/'VERSION').read_text().strip(),'Version mismatch')
 ET.parse(ios/'ShadowRun.xcodeproj/xcshareddata/xcschemes/ShadowRun.xcscheme')
 pbx=(ios/'ShadowRun.xcodeproj/project.pbxproj').read_text()
 defined=set(re.findall(r'^([A-F0-9]{24}) =',pbx,re.M));used=set(re.findall(r'\b[A-F0-9]{24}\b',pbx));check(defined==used,'Undefined Xcode object reference')
 for name in ['AppDelegate.swift','AssetServer.swift','GameViewController.swift','Info.plist','Assets.xcassets','web']:check((ios/'ShadowRun'/name).exists(),'Missing Xcode input '+name)
 campaign=json.loads((ios/'ShadowRun/web/campaign-files.json').read_text(encoding='utf8'))
 for name,text in campaign.items():
  if name.endswith('.py'):
   try:compile(text,name,'exec')
   except Exception as e:failures.append(f'Python syntax {name}: {e}')
  original=ROOT/('android/mobile_backend.py' if name=='mobile_backend.py' else name)
  check(original.read_text(encoding='utf8')==text,'Bundled campaign stale: '+name)
 meta=json.loads((ios/'ShadowRun/web/content.json').read_text(encoding='utf8'))
 engine=json.loads((ios/'ShadowRun/web/engine-data.json').read_text())
 for card in meta['cards']+meta['tokenCards']:
  check((ios/'ShadowRun/web/assets/cards'/f'{card["id"]}.jpg').exists(),'Missing art '+str(card['id']))
  check(str(card['id']) in engine,'Missing engine card '+str(card['id']))
 report={'sharedFilesChecked':len(files),'allHashesMatch':not failures,'failures':failures,'nativeIOSCompiled':False,'testedOnIOSDevice':False,'note':'Xcode/macOS and signing are still required. Shared game tests do not substitute for iOS device validation.'}
 (ios/'validation-report.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
 assert not failures
