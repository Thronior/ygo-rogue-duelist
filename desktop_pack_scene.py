"""Native presentation matching the mobile booster theatre."""
import math,time,tkinter as tk
from pathlib import Path
from PIL import Image,ImageDraw,ImageTk
from artwork import ASSETS
from content import PACK_BY_ID
import visual_ui as views
import json

BG='#171a32'
def grid_layout(width,height,count):
 cols=min(5,count) if width>=660 else min(3,count)
 rows=math.ceil(count/cols);gap=12
 tile_w=min(180,(width-32-gap*(cols-1))/cols)
 tile_h=min(tile_w*1.48+35,(height-26-gap*(rows-1))/rows)
 art_h=max(40,tile_h-38);art_w=min(tile_w-12,art_h*.69)
 total=cols*tile_w+(cols-1)*gap
 return [(width/2-total/2+(i%cols)*(tile_w+gap),height/2-(rows*tile_h+(rows-1)*gap)/2+(i//cols)*(tile_h+gap),tile_w,tile_h,art_w,art_h) for i in range(count)]

class PackScene(tk.Frame):
 def __init__(self,app,packs,pack_ids,done,auto_reveal=False):
  for child in app.winfo_children():
   if not isinstance(child,tk.Toplevel):child.destroy()
  super().__init__(app,bg=BG);self.pack(fill='both',expand=True)
  self.app=app;self.packs=packs;self.pack_ids=pack_ids;self.done=done;self.index=0;self.generation=0;self.started=time.monotonic();self.photos={};self.auto=auto_reveal
  self.ultra=set(json.loads((ASSETS/'ultra-rare.json').read_text())['cards'])
  header=tk.Frame(self,bg=BG);header.pack(fill='x',padx=22,pady=(16,8))
  self.heading=views.label(header,'',10,'#bfcbe0');self.heading.pack(anchor='w')
  self.title=views.label(header,'',21,'#ffe3a2');self.title.pack(anchor='w')
  self.canvas=tk.Canvas(self,bg=BG,highlightthickness=0);self.canvas.pack(fill='both',expand=True,padx=12)
  footer=tk.Frame(self,bg=BG);footer.pack(fill='x',padx=22,pady=14)
  self.status=views.label(footer,'Your cards are already in your collection',11,'#d2c6af');self.status.pack(side='left')
  self.button=tk.Button(footer,text='OPEN PACK',command=self.open,bg='#dfb453',fg='#17172c',activebackground='#ffe3a2',relief='flat',padx=28,pady=11,font=('Segoe UI',12,'bold'),cursor='hand2');self.button.pack(side='right')
  self.canvas.bind('<Configure>',self.resize);self.resize_job=None
  self.show();self.after(80,self.ambient)
 def alive(self,token=None):return self.winfo_exists() and self.app.screen=='packs' and (token is None or token==self.generation)
 def later(self,ms,fn):
  token=self.generation
  self.after(ms,lambda:fn() if self.alive(token) else None)
 def show(self):
  self.generation+=1;self.opened=False;self.dealt=False;self.revealed=0;self.skip=False;self.jackpot=False;self.sparkles=[]
  self.cards=sorted(self.packs[self.index],key=lambda c:c in self.ultra);self.meta=PACK_BY_ID.get(self.pack_ids[self.index],{})
  self.heading.configure(text=f'BOOSTER {self.index+1} / {len(self.packs)}');self.title.configure(text=self.meta.get('name','Your cards'))
  self.status.configure(text='Your cards are already in your collection');self.button.configure(text='OPEN PACK',command=self.open)
  self.update_idletasks();self.draw()
  if self.auto:self.later(200,self.open)
 def resize(self,event):
  if self.resize_job:self.after_cancel(self.resize_job)
  self.resize_job=self.after(80,self.draw)
 def rounded(self,x,y,w,h,fill,outline,width=1,tag=''):
  r=8;points=[x+r,y,x+w-r,y,x+w,y,x+w,y+r,x+w,y+h-r,x+w,y+h,x+w-r,y+h,x+r,y+h,x,y+h,x,y+h-r,x,y+r,x,y]
  return self.canvas.create_polygon(points,smooth=True,fill=fill,outline=outline,width=width,tags=tag)
 def draw(self):
  self.resize_job=None
  if not self.alive():return
  c=self.canvas;c.delete('all');self.photos={};self.sparkles=[];self.width=max(100,c.winfo_width());self.height=max(100,c.winfo_height())
  c.create_image(0,0,anchor='nw',tags='background')
  self.dust=[c.create_oval(0,0,2,2,fill='#cbb98c',outline='') for _ in range(24)]
  if self.dealt:
   self.layout=grid_layout(self.width,self.height,len(self.cards))
   for i in range(len(self.cards)):self.draw_card(i)
  else:
   self.rays=[c.create_line(0,0,0,0,fill='#61503c',width=2) for _ in range(18)]
   h=min(330,self.height*.73);w=h*.68
   path=ASSETS/'packs'/f'{self.pack_ids[self.index]}.jpg'
   if not path.exists():path=ASSETS/'card-back.jpg'
   self.photos['pack']=self.app.art.photo(path,(int(w),int(h)))
   c.create_image(self.width/2,self.height/2-13,image=self.photos['pack'],tags='pack')
   c.create_text(self.width/2,self.height/2+h/2+15,text='OPEN PACK',fill='#ffe3a2',font=('Segoe UI',13,'bold'),tags='pack')
   c.tag_bind('pack','<Button-1>',lambda event:self.open())
  self.background()
 def draw_card(self,i,scale=1):
  c=self.canvas;tag=f'card{i}';c.delete(tag);x,y,w,h,aw,ah=self.layout[i];cid=self.cards[i];shown=i<self.revealed;ultra=shown and cid in self.ultra;rare=shown and cid in self.meta.get('rare_display',[])
  color='#a5f5ff' if ultra else '#ffdb79' if rare else '#6d719a'
  fill='#24213e' if ultra else '#302633' if rare else '#101725'
  self.rounded(x,y,w,h,fill,color,3 if ultra else 2 if rare else 1,tag)
  path=ASSETS/'cards'/f'{cid}.jpg' if shown else ASSETS/'card-back.jpg'
  if scale<1:
   with Image.open(path) as im:photo=ImageTk.PhotoImage(im.resize((max(2,int(aw*scale)),int(ah)),Image.Resampling.BILINEAR),master=c)
  else:photo=self.app.art.photo(path,(int(aw),int(ah)))
  self.photos[i]=photo;c.create_image(x+w/2,y+8+ah/2,image=photo,tags=tag)
  name=self.app.byid[cid]['name'] if shown else '?'
  c.create_text(x+w/2,y+h-22,text=name if len(name)<27 else name[:25]+'…',fill='#f5e6b5' if rare or ultra else '#e5e9f0',font=('Segoe UI',9),width=w-8,tags=tag)
  if rare or ultra:
   badge='ULTRA RARE' if ultra else 'RARE';bw=91 if ultra else 48
   self.rounded(x+4,y+3,bw,21,color,color,tag=tag)
   c.create_text(x+8,y+13,text=badge,anchor='w',fill='#231139' if ultra else '#271805',font=('Segoe UI',8,'bold'),tags=tag)
  if ultra:
   for dx,dy in [(.27,.3),(.75,.57),(.48,.77)]:c.create_text(x+w*dx,y+h*dy,text='✦',fill='#dcffff',font=('Segoe UI',12),tags=(tag,'sparkle'))
  if shown:c.tag_bind(tag,'<Button-1>',lambda event,cid=cid:views.inspect(self.app,self.app.byid[cid]))
  else:c.tag_bind(tag,'<Button-1>',lambda event:self.reveal_one())
 def background(self):
  t=time.monotonic()-self.started;im=Image.new('RGB',(80,60));d=ImageDraw.Draw(im)
  for y in range(60):
   for x in range(80):
    a=max(0,1-math.hypot((x-40-math.sin(t*.2)*12)/54,(y-25)/43));v=(math.sin(x*.07+y*.06+t*.14)+1)/2
    d.point((x,y),fill=(int(10+36*a+9*v),int(17+16*a+5*v),int(30+34*a+9*v)))
  self.photos['background']=ImageTk.PhotoImage(im.resize((self.width,self.height),Image.Resampling.BILINEAR),master=self.canvas)
  self.canvas.itemconfigure('background',image=self.photos['background']);self.bg_time=time.monotonic()
 def ambient(self):
  if not self.alive():return
  t=time.monotonic()-self.started;c=self.canvas
  if time.monotonic()-getattr(self,'bg_time',0)>.35:self.background()
  for i,dot in enumerate(self.dust):
   x=(i*137+math.sin(t+i)*12)%self.width;y=(i*73-t*18)%self.height;c.coords(dot,x,y,x+2,y+2)
  if not self.dealt:
   for i,line in enumerate(self.rays):
    a=i*math.tau/18+t*.09;r=min(self.width,self.height)*.44
    c.coords(line,self.width/2+math.cos(a)*55,self.height/2+math.sin(a)*55,self.width/2+math.cos(a)*r,self.height/2+math.sin(a)*r)
  c.itemconfigure('sparkle',fill='#dcffff' if int(t*4)%3 else '#b5a0ef')
  self.after(80,self.ambient)
 def open(self):
  if self.opened:return
  self.opened=True;self.app.audio.effect('pack-rustle');self.status.configure(text='Opening your booster…');self.button.configure(text='Reveal all',command=self.reveal_all)
  token=self.generation
  def shake(n=0):
   if not self.alive(token) or self.dealt:return
   if n>=9:return self.deal()
   self.canvas.move('pack',(-1 if n%2 else 1)*(5+n),-3)
   self.later(65,lambda:shake(n+1))
  shake()
 def deal(self):
  if self.dealt:return
  self.dealt=True;self.draw()
  if not self.skip:
   for i in range(len(self.cards)):self.later(200+i*250,self.reveal_one)
 def reveal_one(self):
  if not self.dealt or self.revealed>=len(self.cards):return
  i=self.revealed;self.revealed+=1;cid=self.cards[i];ultra=cid in self.ultra;rare=cid in self.meta.get('rare_display',[])
  self.draw_card(i,.12 if not self.skip else 1)
  if not self.skip:
   for n in range(1,6):self.later(n*35,lambda n=n,i=i:self.draw_card(i,1 if self.skip else .12+.88*n/5))
  if ultra and not self.jackpot:
   from pack_fx import money_rain
   self.jackpot=True;self.app.audio.effect('pack-rare');token=self.generation;money_rain(self.app,lambda:self.alive(token))
  elif not ultra:self.app.audio.effect('rare-shimmer' if rare else 'card-reveal')
  self.status.configure(text=f'{self.revealed} / {len(self.cards)} revealed')
  if self.revealed==len(self.cards):self.button.configure(text='Next pack' if self.index+1<len(self.packs) else 'Continue',command=self.next)
 def reveal_all(self):
  self.skip=True
  if not self.opened:self.open()
  self.deal()
  while self.revealed<len(self.cards):self.reveal_one()
 def next(self):
  self.index+=1
  if self.index>=len(self.packs):self.generation+=1;self.destroy();self.done()
  else:self.show()
