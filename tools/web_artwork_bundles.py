"""Lossless, bounded-size JPEG bundles for the web and itch.io build only."""
import hashlib,json

def pack_artwork(out,templates):
 entries={};packs={};data=bytearray();pending=[]
 images=sorted(out.rglob('*.jpg'))
 def flush():
  if not data:return
  digest=hashlib.sha256(data).hexdigest();name=f'artwork-{len(packs):02}-{digest[:12]}.bin'
  (out/name).write_bytes(data);packs[name]=len(data)
  for source,offset,length in pending:
   path=source.relative_to(out).as_posix();entries[path]=[name,offset,length]
   assert data[offset:offset+length]==source.read_bytes(),path
   source.unlink()
  data.clear();pending.clear()
 for source in images:
  raw=source.read_bytes()
  if data and len(data)+len(raw)>8*1024*1024:flush()
  pending.append((source,len(data),len(raw)));data.extend(raw)
 flush()
 page=out/'index.html';text=page.read_text(encoding='utf8');old='<script type="module" src="mobile.js"></script><script type="module" src="pwa.js"></script>'
 assert old in text;text=text.replace(old,'<script type="module" src="bundle-boot.js"></script>');page.write_text(text,encoding='utf8')
 (out/'bundle-boot.js').write_bytes((templates/'bundle-boot.js').read_bytes())
 page=out/'card-assets.js';text=page.read_text(encoding='utf8');start=text.index(' const cache=');end=text.index(';',start)
 text=text[:start]+' const cache=null'+text[end:]
 old='const ids=[...new Set(cards.map(c=>Number(c.id)))];';assert old in text
 text=text.replace(old,'const ids=[...new Set(cards.map(c=>Number(c.id)))].sort((a,b)=>String(a).localeCompare(String(b)));');page.write_text(text,encoding='utf8')
 return entries,packs
