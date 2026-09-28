"""Export the identical Android web bundle and a native Xcode iOS project.
Windows creates an Xcode source export, never pretends to produce a signed IPA.
"""
from pathlib import Path
import sys,json,hashlib,shutil,zipfile,plistlib,argparse,subprocess
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(Path(__file__).parent))
from mobile_bundle import web_files

def export(sync=True):
 if sync:subprocess.run([sys.executable,'-B',str(ROOT/'tools/build_android.py'),'--sync-only'],cwd=ROOT,check=True)
 ios=ROOT/'ios';web=ROOT/'android/web';dest=ios/'ShadowRun/web';dest.mkdir(parents=True,exist_ok=True)
 version=(ROOT/'VERSION').read_text().strip()
 expected={relative.as_posix():source for source,relative in web_files(web)}
 # Only remove stale generated assets within the dedicated bundle directory.
 for p in dest.rglob('*'):
  if p.is_file() and p.relative_to(dest).as_posix() not in expected:
   assert p.resolve().is_relative_to(dest.resolve());p.unlink()
 hashes={}
 for relative,source in expected.items():
  target=dest/relative;target.parent.mkdir(parents=True,exist_ok=True)
  digest=hashlib.sha256(source.read_bytes()).hexdigest()
  if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest()!=digest:shutil.copy2(source,target)
  assert hashlib.sha256(target.read_bytes()).hexdigest()==digest,relative
  hashes[relative]=digest
 manifest=dict(version=version,files=hashes,webBundleHash=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest(),status='Source export; requires Xcode compilation, signing and device testing')
 (ios/'bundle-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
 info=dict(CFBundleDevelopmentRegion='en',CFBundleDisplayName='Yu-Gi-Oh: Rogue Duelist',CFBundleExecutable='$(EXECUTABLE_NAME)',CFBundleIdentifier='$(PRODUCT_BUNDLE_IDENTIFIER)',CFBundleInfoDictionaryVersion='6.0',CFBundleName='$(PRODUCT_NAME)',CFBundlePackageType='APPL',CFBundleShortVersionString=version,CFBundleVersion='1',LSRequiresIPhoneOS=True,UILaunchScreen={},UIRequiresFullScreen=True,UIStatusBarHidden=True,UIViewControllerBasedStatusBarAppearance=True,UISupportedInterfaceOrientations=['UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight'],NSAppTransportSecurity={'NSAllowsLocalNetworking':True})
 info['UISupportedInterfaceOrientations~ipad']=info['UISupportedInterfaceOrientations']
 (ios/'ShadowRun/Info.plist').write_bytes(plistlib.dumps(info))
 from PIL import Image,ImageOps
 icons=ios/'ShadowRun/Assets.xcassets/AppIcon.appiconset';icons.mkdir(parents=True,exist_ok=True)
 with Image.open(ROOT/'android/res/drawable/icon.png') as im:ImageOps.fit(im.convert('RGB'),(1024,1024),Image.Resampling.LANCZOS).save(icons/'AppIcon.png')
 (icons/'Contents.json').write_text(json.dumps({'images':[{'filename':'AppIcon.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}},indent=2))
 (icons.parent/'Contents.json').write_text('{"info":{"author":"xcode","version":1}}')
 release=ROOT/'releases/YGO-Rogue-iOS-Xcode.zip'
 with zipfile.ZipFile(release,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  for p in sorted(ios.rglob('*')):
   if p.is_file() and not any(part in ('build','DerivedData','xcuserdata') for part in p.relative_to(ios).parts):archive.write(p,Path('Shadow-Run-iOS')/p.relative_to(ios))
 release.with_suffix('.zip.sha256').write_text(hashlib.sha256(release.read_bytes()).hexdigest()+'  '+release.name+'\n')
 print(f'iOS source export: {release} ({release.stat().st_size/2**20:.1f} MiB)')
 print(f'PASS: {len(hashes)} shared web files match Android byte for byte; {manifest["webBundleHash"]}')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--no-sync',action='store_true');args=parser.parse_args();export(not args.no_sync)
