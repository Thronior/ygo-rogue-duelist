"""Build writes that survive another program briefly mapping the target.

Windows refuses to truncate a file while any process has it memory-mapped (error 1224), and Python reports that
as "[Errno 22] Invalid argument". git, ripgrep and indexers map files while scanning them, so a plain write_text
failed at random on large tracked files. These writes never truncate: they fill a sibling temp file, then swap it
in, waiting out the scanner, because a swap onto a mapped file is refused too.
"""
import os,time,uuid
from pathlib import Path

WAIT=15.0

def replace_when_free(temp,target,wait=WAIT):
 deadline=time.monotonic()+wait
 while True:
  try:
   os.replace(temp,target);return
  except OSError:
   if time.monotonic()>=deadline:
    try:os.remove(temp)
    except OSError:pass
    raise
   time.sleep(.05)

def write_bytes(path,data,wait=WAIT):
 path=Path(path);temp=path.with_name(f'.{path.name}.{uuid.uuid4().hex[:8]}.tmp')
 with open(temp,'wb') as f:f.write(data)
 replace_when_free(temp,path,wait)
 return len(data)

def write_text(path,text,encoding='utf-8',errors=None,newline=None):
 path=Path(path);temp=path.with_name(f'.{path.name}.{uuid.uuid4().hex[:8]}.tmp')
 with open(temp,'w',encoding=encoding or 'utf-8',errors=errors,newline=newline) as f:f.write(text)
 replace_when_free(temp,path)
 return len(text)

def install():
 """Route every Path.write_text and Path.write_bytes in this process through the safe writes."""
 Path.write_text=lambda self,data,encoding=None,errors=None,newline=None:write_text(self,data,encoding,errors,newline)
 Path.write_bytes=lambda self,data:write_bytes(self,data)
