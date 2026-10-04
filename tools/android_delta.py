"""Exact APK deltas: reuse unchanged compressed ZIP entries, send changed bytes.
The reconstructed signed APK must be byte-for-byte identical to the release.
"""
from pathlib import Path
import gzip, hashlib, json, struct, zipfile
ROOT=Path(__file__).resolve().parents[1]
MAGIC=b'YGODLT01'

def digest(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.digest()

def segments(path):
 result={}
 with zipfile.ZipFile(path) as z,open(path,'rb') as f:
  for entry in z.infolist():
   f.seek(entry.header_offset);header=f.read(30)
   if header[:4]!=b'PK\x03\x04':raise ValueError('Bad ZIP header')
   names,extra=struct.unpack_from('<HH',header,26);offset=entry.header_offset+30+names+extra
   f.seek(offset);data=f.read(entry.compress_size)
   if len(data)!=entry.compress_size:raise ValueError('Truncated ZIP entry')
   result[entry.filename]=(offset,len(data),hashlib.sha256(data).digest())
 return result

def create(base,target,output):
 old=segments(base);new=segments(target);size=target.stat().st_size
 with open(target,'rb') as src,open(output,'wb') as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0,compresslevel=6) as out:
  out.write(MAGIC+struct.pack('>Q',base.stat().st_size)+digest(base)+struct.pack('>Q',size)+digest(target))
  position=0
  def literal(start,length):
   src.seek(start)
   while length:
    chunk=src.read(min(length,1024*1024))
    if not chunk:raise ValueError('Truncated target')
    out.write(b'\x01'+struct.pack('>I',len(chunk))+chunk);length-=len(chunk)
  for name,(offset,length,hash_) in sorted(new.items(),key=lambda item:item[1][0]):
   prior=old.get(name)
   if length<256 or not prior or prior[1:]!=(length,hash_):continue
   literal(position,offset-position)
   out.write(b'\x00'+struct.pack('>QI',prior[0],length));position=offset+length
  literal(position,size-position);out.write(b'\x02')
 return output.stat().st_size

def archive_base(apk):
 if not apk.exists():return
 folder=apk.parent/'delta-bases';folder.mkdir(exist_ok=True)
 dest=folder/(digest(apk).hex()+'.apk')
 if not dest.exists():
  import shutil;shutil.copy2(apk,dest)
 # Only our content-addressed historical APKs; never touch live releases or saves.
 bases=sorted(folder.glob('*.apk'),key=lambda p:p.stat().st_mtime,reverse=True)
 for old in bases[3:]:
  if len(old.stem)==64 and all(c in '0123456789abcdef' for c in old.stem) and old.resolve().parent==folder.resolve():old.unlink()

def generate(target):
 rows={};folder=target.parent/'delta-bases';target_hash=digest(target)
 for base in sorted(folder.glob('*.apk'),key=lambda p:p.stat().st_mtime,reverse=True)[:3]:
  base_hash=digest(base)
  if base_hash==target_hash:continue
  patch=target.parent/('ygo-update-'+base_hash.hex()+'.delta.gz')
  size=create(base,target,patch)
  if size>=target.stat().st_size*0.8:patch.unlink();continue
  rows[patch.name]={'bytes':size,'sha256':digest(patch).hex(),'baseSha256':base_hash.hex(),'targetSha256':target_hash.hex()}
 return rows

if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('base',type=Path);p.add_argument('target',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
 print(create(a.base,a.target,a.output))
