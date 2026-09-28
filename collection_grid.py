"""Viewport-only collection tiles with asynchronous, bounded thumbnail loading."""
import math,queue,tkinter as tk
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageTk,ImageOps
import visual_ui as v
from artwork import ASSETS

class CardViewport(tk.Frame):
 def __init__(self,parent,app,thumb_path,by_id,size=(96,140)):
  super().__init__(parent,bg=v.BG)
  self.app=app;self.thumb_path=thumb_path;self.by_id=by_id;self.size=size
  self.rows=[];self.tiles={};self.images=OrderedDict();self.inflight=set();self.results=queue.Queue();self.closed=False;self.job=None;self.region=None
  self.executor=ThreadPoolExecutor(max_workers=2,thread_name_prefix='collection-thumbs')
  self.canvas=tk.Canvas(self,bg=v.BG,highlightthickness=0,yscrollincrement=32)
  self.bar=tk.Scrollbar(self,command=self.scroll);self.bar.pack(side='right',fill='y');self.canvas.pack(fill='both',expand=True)
  self.canvas.configure(yscrollcommand=self.scrolled)
  self.canvas.bind('<Configure>',lambda e:self.schedule());self.canvas.bind('<MouseWheel>',self.wheel)
  self.bind('<Map>',lambda e:self.schedule());self.bind('<Destroy>',self.close,add='+')
  self.placeholder=app.art.photo(ASSETS/'card-back.jpg',size)
  self.poll_job=self.after(20,self.poll)
 def set_rows(self,rows):
  if self.rows==rows:self.schedule();return
  self.rows=rows
  for _,box,_ in self.tiles.values():box.destroy()
  self.tiles.clear();self.canvas.delete('all');self.canvas.yview_moveto(0);self.schedule()
 def scroll(self,*args):self.canvas.yview(*args);self.schedule()
 def scrolled(self,*args):self.bar.set(*args);self.schedule()
 def wheel(self,e):self.scroll('scroll',-int(e.delta/120) if abs(e.delta)>=120 else (-1 if e.delta>0 else 1),'units');return 'break'
 def schedule(self):
  if not self.closed and self.job is None:self.job=self.after(16,self.render)
 def render(self):
  self.job=None
  if self.closed or not self.winfo_ismapped():return
  width=max(1,self.canvas.winfo_width());height=max(1,self.canvas.winfo_height());cols=max(1,min(8,width//174));row_h=224
  region=(0,0,width,math.ceil(len(self.rows)/cols)*row_h)
  if region!=self.region:self.region=region;self.canvas.configure(scrollregion=region)
  first=max(0,int(self.canvas.canvasy(0)//row_h)-1)*cols
  last=min(len(self.rows),(int(self.canvas.canvasy(height)//row_h)+2)*cols)
  visible=set(range(first,last))
  for i in set(self.tiles)-visible:
   window,box,_=self.tiles.pop(i);box.destroy();self.canvas.delete(window)
  for i in range(first,last):
   cid,name,sub=self.rows[i];cid=int(cid)
   if i not in self.tiles:
    box=tk.Frame(self.canvas,bg=v.PANEL,width=164,height=214);box.pack_propagate(False)
    art=tk.Label(box,image=self.placeholder,bg=v.PANEL,bd=0,cursor='hand2');art.pack(pady=(8,3))
    card=self.by_id().get(cid)
    art.bind('<Button-1>',lambda e,c=card:v.inspect(self.app,c) if c else None)
    if card:v.tooltip(self.app,art,card)
    info=tk.Label(box,text=name+'\n'+sub,bg=v.PANEL,fg='white',font=('Segoe UI',10),wraplength=154);info.pack()
    for widget in (box,art,info):widget.bind('<MouseWheel>',self.wheel,add='+')
    window=self.canvas.create_window(0,0,window=box,anchor='nw');self.tiles[i]=(window,box,art)
   window,box,art=self.tiles[i];self.canvas.coords(window,(i%cols)*(width/cols)+5,(i//cols)*row_h+5)
   if cid in self.images:
    img=self.images[cid];self.images.move_to_end(cid)
    if getattr(art,'image',None) is not img:art.configure(image=img);art.image=img
   elif cid not in self.inflight and len(self.inflight)<48:
    self.inflight.add(cid);self.executor.submit(self.load,cid)
 def load(self,cid):
  image=None
  try:
   path=self.thumb_path(cid) or ASSETS/'cards'/f'{cid}.jpg'
   with Image.open(path) as im:image=ImageOps.contain(im.convert('RGB'),self.size,Image.Resampling.LANCZOS).copy()
  except (OSError,ValueError):pass
  if not self.closed:self.results.put((cid,image))
 def poll(self):
  if self.closed:return
  changed=False
  for _ in range(4):
   try:cid,im=self.results.get_nowait()
   except queue.Empty:break
   self.inflight.discard(cid);changed=True
   self.images[cid]=ImageTk.PhotoImage(im,master=self.app) if im is not None else self.placeholder
   self.images.move_to_end(cid)
   while len(self.images)>128:self.images.popitem(last=False)
  if changed:self.schedule()
  self.poll_job=self.after(20,self.poll)
 def close(self,e):
  if e.widget is not self:return
  self.closed=True
  for job in (self.job,self.poll_job):
   if job:
    try:self.after_cancel(job)
    except tk.TclError:pass
  self.executor.shutdown(wait=False,cancel_futures=True)
