"""Build an isolated, debuggable device-test app; never replace normal releases."""
from pathlib import Path
import os, shutil, subprocess, sys, zipfile
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'android';D=ROOT/'dependencies/android';B=ROOT/'temp/crossplay-test-build';B.mkdir(parents=True,exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'temp')
sys.path.insert(0,str(ROOT/'tools'));from mobile_bundle import web_files
jdk=next((D/'jdk').glob('jdk-*'));bt=D/'sdk/android-15';platform=D/'sdk/android-35/android.jar'
def run(args):subprocess.run(list(map(str,args)),check=True,cwd=B)
source=(A/'src/com/shadowrun/game/MainActivity.java').read_text();source=source.replace('web = new WebView(this);','WebView.setWebContentsDebuggingEnabled(true); web = new WebView(this);').replace('WebSettings.MIXED_CONTENT_NEVER_ALLOW','WebSettings.MIXED_CONTENT_ALWAYS_ALLOW').replace('"https".equals(uri.getScheme())','("https".equals(uri.getScheme()) || "127.0.0.1".equals(uri.getHost()))').replace('/index.html"','/index.html?tagtest=1"');(B/'MainActivity.java').write_text(source)
manifest=(A/'AndroidManifest.xml').read_text().replace('package="com.shadowrun.game"','package="com.shadowrun.crossplaytest"').replace('android:name=".MainActivity"','android:name="com.shadowrun.game.MainActivity"').replace('android:usesCleartextTraffic="false"','android:usesCleartextTraffic="true" android:debuggable="true"').replace('android:label="@string/app_name"','android:label="Shadow Run Test"');(B/'AndroidManifest.xml').write_text(manifest)
(B/'classes').mkdir(exist_ok=True)
run([jdk/'bin/javac.exe','-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',B/'classes',B/'MainActivity.java']);run([jdk/'bin/jar.exe','cf',B/'classes.jar','-C',B/'classes','.']);run([jdk/'bin/java.exe','-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--min-api','29','--lib',platform,'--output',B,B/'classes.jar'])
run([bt/'aapt2.exe','compile','--dir',A/'res','-o',B/'res.zip']);run([bt/'aapt2.exe','link','-o',B/'unsigned.apk','--manifest',B/'AndroidManifest.xml','-I',platform,'--version-code','1','--version-name','crossplay-test',B/'res.zip'])
with zipfile.ZipFile(B/'unsigned.apk','a',zipfile.ZIP_DEFLATED,compresslevel=1) as archive:
 archive.write(B/'classes.dex','classes.dex')
 for p,relative in web_files(A/'web'):
  if relative.as_posix()=='mobile.js':archive.writestr('assets/web/mobile.js',"HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()};\n"+p.read_text(encoding='utf8'))
  else:archive.write(p,'assets/web/'+relative.as_posix())
run([bt/'zipalign.exe','-f','4',B/'unsigned.apk',B/'aligned.apk'])
run([jdk/'bin/java.exe','-jar',bt/'lib/apksigner.jar','sign','--ks',A/'signing/private-experiment.jks','--ks-key-alias','shadowrun','--ks-pass','pass:shadowrun-private','--out',B/'Shadow-Run-Test.apk',B/'aligned.apk'])
print(B/'Shadow-Run-Test.apk',flush=True)
