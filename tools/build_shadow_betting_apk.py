"""Shadow Betting as its own Android app (com.shadowrun.shadowbetting): the standalone site
(tools/build_shadow_betting.py) inside a small WebView wrapper (tools/shadow-betting/android). Not part of the game's
APK or releases; its save is its own. Installing a newer build over an older one keeps the save.

Usage: python/python.exe -B tools/build_shadow_betting_apk.py [--install]
  --install  installs it on every phone connected by USB (adb, USB debugging on)
Output: exports/shadow-betting/Shadow-Betting.apk (in the checkout that holds dependencies/android)
Uses the Android SDK, JDK and signing key of the main checkout (the same ones the game's APK uses).
"""
from pathlib import Path
import shutil,subprocess,sys,time,zipfile
from datetime import datetime
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
MAIN=next(p for p in [ROOT,*ROOT.parents] if (p/'dependencies/android/sdk').is_dir())  # a worktree uses the main checkout's SDK
DEP=MAIN/'dependencies/android'
TEMP=MAIN/'temp/shadow-betting-apk';SITE=TEMP/'site';BUILD=TEMP/'build'
HERE=ROOT/'tools/shadow-betting/android'
APK=MAIN/'exports/shadow-betting/Shadow-Betting.apk'
sys.path.insert(0,str(ROOT/'tools'))
import build_shadow_betting

def run(args):subprocess.run([str(x) for x in args],check=True,cwd=BUILD)

def icon(dest):
 """The Dice Re-Roll art (the Shadow Betting menu card), square."""
 with Image.open(ROOT/'android/web/assets/menu/83241722.jpg') as im:
  im=im.convert('RGB');w,h=im.size;side=min(w,h)
  im=im.crop(((w-side)//2,(h-side)//2,(w-side)//2+side,(h-side)//2+side)).resize((432,432),Image.LANCZOS)
 dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest)

def build():
 for d in (SITE,BUILD):
  if d.exists():shutil.rmtree(d)
 cache=MAIN/'temp/build/packaged-assets'
 build_shadow_betting.build(SITE,cache if cache.is_dir() else None)
 jdk=next((DEP/'jdk').glob('jdk-*'));bt=DEP/'sdk/android-15';platform=DEP/'sdk/android-35/android.jar'
 classes=BUILD/'classes';classes.mkdir(parents=True)
 run([jdk/'bin/javac.exe','-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',classes,*(HERE/'src').rglob('*.java')])
 run([jdk/'bin/jar.exe','cf',BUILD/'classes.jar','-C',classes,'.'])
 run([jdk/'bin/java.exe','-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--min-api','29','--lib',platform,'--output',BUILD,BUILD/'classes.jar'])
 res=BUILD/'res';shutil.copytree(HERE/'res',res);icon(res/'drawable/icon.png')
 compiled=BUILD/'compiled';compiled.mkdir();run([bt/'aapt2.exe','compile','--dir',res,'-o',compiled])
 linked=BUILD/'linked';linked.mkdir()
 for folder in res.rglob('*'):
  if folder.is_dir():(linked/'res'/folder.relative_to(res)).mkdir(parents=True,exist_ok=True)# --output-to-dir only fills existing folders
 code=int(time.time()//60);version=datetime.now().strftime('%Y.%m.%d.%H%M')
 run([bt/'aapt2.exe','link',*sorted(compiled.glob('*.flat')),'-o',linked,'--output-to-dir','--manifest',HERE/'AndroidManifest.xml','-I',platform,'--replace-version','--version-code',str(code),'--version-name',version])
 unsigned=BUILD/'unsigned.apk'
 with zipfile.ZipFile(unsigned,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(linked.rglob('*')):
   if p.is_file():
    name=p.relative_to(linked).as_posix()
    z.write(p,name,compress_type=zipfile.ZIP_STORED if name=='resources.arsc' else zipfile.ZIP_DEFLATED)# Android 11+ needs it stored
  z.write(BUILD/'classes.dex','classes.dex')
  for p in sorted(SITE.rglob('*')):
   if p.is_file():
    stored=p.suffix.lower() in ('.png','.jpg','.webp','.m4a','.mp3')
    z.write(p,'assets/site/'+p.relative_to(SITE).as_posix(),compress_type=zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED)
 aligned=BUILD/'aligned.apk';run([bt/'zipalign.exe','-f','4',unsigned,aligned])
 # Signed with the project's key (as the game and the deck-sim app); the package name keeps the apps apart.
 key=MAIN/'android/signing/private-experiment.jks';APK.parent.mkdir(parents=True,exist_ok=True)
 sign=[jdk/'bin/java.exe','-jar',bt/'lib/apksigner.jar']
 run(sign+['sign','--ks',key,'--ks-key-alias','shadowrun','--ks-pass','pass:shadowrun-private','--out',APK,aligned])
 run(sign+['verify',APK])
 print(f'APK: {APK} ({APK.stat().st_size/1048576:.1f} MiB), version {version}',flush=True)

def install():
 adb=DEP/'sdk/platform-tools/adb.exe'
 devices=[l.split()[0] for l in subprocess.run([str(adb),'devices'],capture_output=True,text=True).stdout.splitlines()[1:] if l.strip().endswith('device')]
 if not devices:print('No phone found. Connect it by USB with USB debugging on, or copy the APK to the phone and open it.');return
 for serial in devices:subprocess.run([str(adb),'-s',serial,'install','-r',str(APK)],check=True);print(f'Installed on {serial}.',flush=True)

if __name__=='__main__':
 build()
 if '--install' in sys.argv:install()
