"""Build writes wait out a program that has the target memory-mapped, instead of failing with Errno 22."""
import mmap,os,sys,tempfile,threading,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import safe_write

folder=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='safe-write-'))
target=folder/'catalog.json'
target.write_bytes(b'old'*100000)

def mapped(seconds):
 f=open(target,'rb');m=mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ)
 def release():
  time.sleep(seconds);m.close();f.close()
 thread=threading.Thread(target=release);thread.start();return thread

# The bug: a plain truncating write fails while the file is mapped.
thread=mapped(.4)
try:
 open(target,'w').close();raise SystemExit('expected the plain write to fail on Windows')
except OSError as error:assert error.errno==22,error
thread.join()

# The fix: the same situation waits and succeeds.
thread=mapped(.4);start=time.monotonic()
safe_write.write_text(target,'new text')
assert time.monotonic()-start>=.3,'waited for the mapping to end'
thread.join();assert target.read_text()=='new text'

# Installed, Path.write_text and write_bytes behave as usual and leave no temp files.
safe_write.install()
target.write_text('héllo',encoding='utf-8');assert target.read_text(encoding='utf-8')=='héllo'
assert target.write_bytes(b'abc')==3 and target.read_bytes()==b'abc'
(folder/'new.json').write_text('{}');assert (folder/'new.json').read_text()=='{}'
assert sorted(p.name for p in folder.iterdir())==['catalog.json','new.json'],list(folder.iterdir())

# A file that never frees up still reports the failure, and cleans up after itself.
f=open(target,'rb');m=mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ)
try:
 safe_write.write_bytes(target,b'x',wait=.2);raise SystemExit('expected a timeout')
except OSError:pass
m.close();f.close()
assert sorted(p.name for p in folder.iterdir())==['catalog.json','new.json'],'no temp file left behind'
print('PASS build writes survive a memory-mapped target')
