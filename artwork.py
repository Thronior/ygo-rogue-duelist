from pathlib import Path
from io import BytesIO
from queue import Queue, Empty
import threading, urllib.request, time, shutil
from PIL import Image, ImageTk, ImageOps, ImageChops
ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'assets'

class Artwork:
    def __init__(self,window):
        self.window=window; self.card_bytes={}; self.cache={}; self.pending=set(); self.callbacks={}
        self.jobs=Queue(); self.done=Queue()
        threading.Thread(target=self.worker,daemon=True).start()
        window.after(150,self.poll)
    def worker(self):
        while True:
            path,url=self.jobs.get(); success=False
            try:
                path.parent.mkdir(parents=True,exist_ok=True)
                with urllib.request.urlopen(url,timeout=12) as response: data=response.read()
                temp=path.with_suffix('.download'); temp.write_bytes(data)
                with Image.open(temp) as im: im.verify()
                if path.parent.name=='cards':
                    with Image.open(temp) as im:
                        scaled=im.convert('RGB');scaled.thumbnail((610,889),Image.Resampling.LANCZOS)
                    scaled.save(temp,format='JPEG',quality=85,optimize=True)
                temp.replace(path); success=True
                if path.parent.name=='cards':
                    native=ROOT/'runtime/pics'; native.mkdir(exist_ok=True)
                    shutil.copy2(path,native/path.name)
            except Exception: pass
            self.done.put((path,success)); time.sleep(.25)
    def poll(self):
        try:
            while True:
                path,success=self.done.get_nowait()
                self.pending.discard(path)
                for callback in self.callbacks.pop(path,[]):
                    if success: callback()
        except Empty: pass
        self.window.after(150,self.poll)
    def photo(self,path,size,crop=False):
        key=(str(path),size,crop)
        if key not in self.cache:
            with Image.open(BytesIO(self.card_bytes[int(Path(path).stem)]) if Path(path).parent.name=='cards' and Path(path).stem.isdigit() and int(Path(path).stem) in self.card_bytes else path) as im:
                im=im.convert('RGBA')
                if crop:
                    w,h=im.size; im=im.crop((int(w*.12),int(h*.22),int(w*.88),int(h*.62)))
                im=ImageOps.contain(im,size,Image.Resampling.LANCZOS)
                self.cache[key]=ImageTk.PhotoImage(im,master=self.window)
        return self.cache[key]
    def label(self,parent,path,size,url=None,crop=False,**kw):
        import tkinter as tk
        label=tk.Label(parent,bd=0,**kw)
        def refresh():
            if not label.winfo_exists(): return
            try:
                label.image=self.photo(path,size,crop); label.configure(image=label.image,text='')
            except (OSError,ValueError): pass
        if path.exists(): refresh()
        else:
            label.image=self.photo(ASSETS/'card-back.jpg',size); label.configure(image=label.image)
            if url:
                self.callbacks.setdefault(path,[]).append(refresh)
                if path not in self.pending:
                    self.pending.add(path); self.jobs.put((path,url))
        return label
    def portrait_photo(self,path,size):
        key=('portrait',str(path),size)
        if key not in self.cache:
            with Image.open(path) as im:
                im=im.convert('RGBA')
                abox=im.getchannel('A').getbbox()
                if abox:
                    l,t,r,b=max(0,abox[0]-3),max(0,abox[1]-3),min(im.width,abox[2]+3),min(im.height,abox[3]+3)
                    if r>l and b>t:im=im.crop((l,t,r,b))
                rgb=im.convert('RGB');border=rgb.getpixel((0,0))
                bw=ImageChops.difference(rgb,Image.new('RGB',rgb.size,border)).convert('L').point(lambda v:255 if v>30 else 0).getbbox()
                if bw:
                    l,t,r,b=max(0,bw[0]-3),max(0,bw[1]-3),min(rgb.width,bw[2]+3),min(rgb.height,bw[3]+3)
                    if r>l and b>t:
                        im=im.crop((l,t,r,b));rgb=rgb.crop((l,t,r,b))
                tw,th=size;iw,ih=rgb.size
                sc=th/max(1,ih);nw=max(1,round(iw*sc))
                rgb=rgb.resize((nw,th),Image.Resampling.LANCZOS)
                if nw>tw:
                    lf=(nw-tw)//2;rgb=rgb.crop((lf,0,lf+tw,th))
                im=rgb
                self.cache[key]=ImageTk.PhotoImage(im,master=self.window)
        return self.cache[key]
    def portrait(self,parent,path,size,**kw):
        import tkinter as tk
        try:img=self.portrait_photo(path,size)
        except (OSError,ValueError):img=self.photo(ASSETS/'card-back.jpg',size)
        label=tk.Label(parent,image=img,bd=0,**kw);label.image=img
        return label
    def card(self,parent,cid,size=(115,168),crop=False,**kw):
        return self.label(parent,ASSETS/'cards'/f'{cid}.jpg',size,
            f'https://images.ygoprodeck.com/images/cards/{cid}.jpg',crop=crop,**kw)
    def pack(self,parent,code,size=(65,95),**kw):
        from content import PACK_BY_ID
        p=PACK_BY_ID.get(code)
        url=(p.get('image') or f'https://images.ygoprodeck.com/images/sets/{p["code"]}.jpg') if p else f'https://images.ygoprodeck.com/images/sets/{code}.jpg'
        return self.label(parent,ASSETS/'packs'/f'{code}.jpg',size,
            url,**kw)
