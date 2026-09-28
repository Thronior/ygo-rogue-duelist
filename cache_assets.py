"""Resumable, validated first-boot cache of the entire playable card pool."""
from pathlib import Path
import json,shutil,urllib.request,time,threading
from PIL import Image
ROOT=Path(__file__).parent
class Preloader:
 def __init__(self):self.total=0;self.completed=0;self.failed=[];self.finished=False;self.status='Checking artwork';self.thread=None;self.images={};self.error=None
 def start(self):
  if self.thread and self.thread.is_alive():return
  self.failed=[];self.finished=False;self.error=None;self.thread=threading.Thread(target=self.safe_run,daemon=True);self.thread.start()
 def safe_run(self):
  try:self.run()
  except Exception as error:self.error=str(error);self.status='Could not load card artwork';self.finished=True
 def run(self):
  cards=json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'))
  cards += json.loads((ROOT/'data/tokens.json').read_text(encoding='utf8'))
  cards=list({c["id"]:c for c in cards}.values())
  self.total=len(cards);self.completed=0
  source=ROOT/'assets/cards';native=ROOT/'runtime/pics';source.mkdir(exist_ok=True);native.mkdir(exist_ok=True)
  for c in cards:
   cid=c['id'];path=source/f'{cid}.jpg';dest=native/path.name
   self.status='Loading '+c.get('name',str(cid))
   try:
    valid=False
    if path.exists():
     try:
      with Image.open(path) as im:im.load()
      valid=True
     except Exception:pass
    if not valid:
     self.status='Downloading '+c['name']
     for attempt in range(3):
      try:
       req=urllib.request.Request(c.get('image') or f'https://images.ygoprodeck.com/images/cards/{cid}.jpg',headers={'User-Agent':'ShadowRunPrivateCache/1.0'})
       data=urllib.request.urlopen(req,timeout=15).read();tmp=path.with_suffix('.preload');tmp.write_bytes(data)
       with Image.open(tmp) as im:
        im.load();scaled=im.convert('RGB');scaled.thumbnail((610,889),Image.Resampling.LANCZOS)
       scaled.save(tmp,format='JPEG',quality=85,optimize=True)
       tmp.replace(path);break
      except Exception:
       if attempt==2:raise
       time.sleep(1+attempt)
     time.sleep(.15)
    # Retain compressed bytes rather than thousands of full-size decoded bitmaps.
    self.images[cid]=path.read_bytes()
    if not dest.exists() or dest.stat().st_size!=path.stat().st_size:shutil.copy2(path,dest)
   except Exception:self.failed.append(cid)
   self.completed+=1
  self.finished=True;self.status='Ready' if not self.failed else f'{len(self.failed)} downloads need retrying'
if __name__=='__main__':
 p=Preloader();p.run();print('Cached',p.completed-len(p.failed),'/',p.total,'failures',p.failed)
