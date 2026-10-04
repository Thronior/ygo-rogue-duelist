"""Host-side generator/Android Java reader interoperability and malformed patch tests."""
from pathlib import Path
import gzip,random,struct,subprocess,uuid,zipfile,sys
from contextlib import nullcontext
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from android_delta import create,archive_base,generate,digest

def run():
 jdk=next((ROOT/'dependencies/android/jdk').glob('jdk-*'))
 with nullcontext(ROOT/'temp'/('delta-tests-'+uuid.uuid4().hex)) as tmp:
  t=Path(tmp);t.mkdir(parents=True);base=t/'base.apk';target=t/'target.apk';patch=t/'valid.gz';out=t/'output.apk'
  payload=random.Random(8).randbytes(1024*1024)
  for path,new in [(base,False),(target,True)]:
   with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('unchanged',payload);z.writestr('code',b'updated code' if new else b'old code');z.writestr('added' if new else 'deleted',b'data')
  create(base,target,patch);assert patch.stat().st_size<target.stat().st_size//20
  archive_base(base);rows=generate(target);name='ygo-update-'+digest(base).hex()+'.delta.gz';assert rows[name]['targetSha256']==digest(target).hex();assert rows[name]['sha256']==digest(t/name).hex()
  src=ROOT/'android/src/com/shadowrun/game'
  subprocess.run([str(jdk/'bin/javac.exe'),'-encoding','UTF-8','-d',str(t),*[str(src/n) for n in ['UpdatePolicy.java','UpdateDownload.java','UpdateDelta.java']],str(ROOT/'tools/UpdateDeltaTest.java')],check=True)
  command=[str(jdk/'bin/java.exe'),'-cp',str(t),'com.shadowrun.game.UpdateDeltaTest']
  def check(p,mode=None):subprocess.run(command+list(map(str,[base,p,out,target]))+([mode] if mode else []),check=True)
  check(patch);check(patch,'cancel');raw=gzip.decompress(patch.read_bytes());header=raw[:88]
  cases={'wrong-base':raw[:16]+bytes(32)+raw[48:],'wrong-target':raw[:56]+bytes(32)+raw[88:],'bad-offset':header+b'\0'+struct.pack('>QI',base.stat().st_size,1)+b'\2','oversized-output':header+b'\1'+struct.pack('>I',target.stat().st_size+1),'invalid-op':header+b'\x09','truncated':raw[:-5],'trailing-data':raw+b'garbage','wrong-magic':b'INVALID!'+raw[8:],'corrupt-output':raw[:-2]+bytes([raw[-2]^1])+raw[-1:]}
  for name,body in cases.items():
   p=t/(name+'.gz');p.write_bytes(gzip.compress(body));check(p,'reject')
  p=t/'bad-gzip.gz';p.write_bytes(patch.read_bytes()[:-5]);check(p,'reject')
  print('PASS bounded exact reconstruction, added/deleted entries, corruption, cancellation, and partial-file cleanup')
if __name__=='__main__':run()
