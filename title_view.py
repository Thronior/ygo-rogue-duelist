"""Animated, keyboard/mouse controlled carousel of vintage-style menu cards."""
import math, random, time, sqlite3, tkinter as tk
from collections import OrderedDict
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageTk, ImageEnhance
from artwork import ASSETS
from content import PLAYABLE_IDS
import storage

OPTIONS=[
 ('Watch CPU duel',28566710,'Observe two opponent AIs. Choose their decks, pause, step and inspect plays.','cpu_duels'),
 ('Tag duels',81332143,'Team up across desktop and Android. Shared coins and relics, separate decks.','tag_duels'),
 ('Continue',30834988,'Return to your saved journey. Your deck, coins and life points await.','resume'),
 ('New Game',71625222,'Turn back the clock. Choose a duelist and draft a new beginning.','characters'),
 ('Collection',75500286,'Browse every card, booster pack and relic in the game.','collection_view'),
 ('Settings',36560997,'Tune your resolution, music and sound effects.','settings_view'),
 ('Achievements',32012841,'Track your feats, lifetime progress and the rewards still waiting to be earned.','achievements_view'),
 ('Tutorial',91595718,'Learn drafting, shopping, card actions and chain responses.','tutorial_view'),
 ('Exit',36261276,'Leave the Shadow Realm. Your current run is saved automatically.','close'),
]

def font(size,bold=False):
 return ImageFont.truetype(str(ASSETS.parent/'runtime/fonts/NotoSansJP-Regular.otf'),size)

def card_face(title,cid,description,number,disabled=False):
 """Draw UI typography/borders around existing database artwork, no generated art."""
 with sqlite3.connect(ASSETS.parent/'runtime/expansions/cards.cdb') as db:
  typ,level=db.execute('SELECT type,level FROM datas WHERE id=?',(cid,)).fetchone()
 palette=('#d4b86b','#ead59a','#675732') if typ&16 and typ&1 else ('#b97c4c','#dfa571','#673e26') if typ&1 else ('#439d8c','#82c0aa','#24534e') if typ&2 else ('#ac668d','#d599bd','#60344e')
 base,light,dark=palette
 im=Image.new('RGBA',(380,550),'#332a20');d=ImageDraw.Draw(im)
 # The imperfect gold grain recalls the early OCG card stock in the reference.
 d.rectangle((6,6,373,543),fill=base,outline='#ede0a8',width=3)
 rng=random.Random(12)
 for _ in range(2600):
  x,y=rng.randrange(9,371),rng.randrange(9,541);d.point((x,y),fill=rng.choice([base,base,light,dark]))
 d.rectangle((18,18,361,65),fill=light,outline=dark,width=2)
 size=29
 while d.textlength(title.upper(),font=font(size,True))>283:size-=1
 d.text((29,27),title.upper(),font=font(size,True),fill='#24271e')
 d.ellipse((325,29,349,53),fill='#203133',outline='#efe2a3',width=2)
 d.text((332,30),str(number+1),font=font(17,True),fill='#efdda0')
 if typ&1:
  for n in range(min(level&255,12)):
   x=328-n*25;d.ellipse((x,76,x+19,95),fill='#ad4c2e',outline='#f1c663',width=2)
   d.text((x+4,76),'*',font=font(20,True),fill='#f5d884')
 else:
  label='[ SPELL CARD ]' if typ&2 else '[ TRAP CARD ]'
  d.text((350-d.textlength(label,font=font(16,True)),78),label,font=font(16,True),fill='#192e29')
 d.rectangle((28,105,351,386),fill='#333e42',outline='#efe2a9',width=3)
 source_path=ASSETS/'Meerkat.png' if title=='Gallery' else ASSETS/'menu'/f'{cid}.jpg'
 if title!='Gallery' and not source_path.is_file():source_path=ASSETS/'cards'/f'{cid}.jpg'
 with Image.open(source_path) as source:
  w,h=source.size;art=source if title=='Gallery' else source.crop((int(w*.12),int(h*.215),int(w*.885),int(h*.615)))
  im.paste(ImageOps.fit(art.convert('RGB'),(309,267),Image.Resampling.LANCZOS),(36,112))
 d.text((29,397),'[ YGO ROGUE / MENU ]',font=font(13,True),fill='#302b20')
 d.rectangle((25,420,354,512),fill='#e0d4aa',outline='#665b38',width=2)
 words=description.split();line='';y=430
 for word in words+['\n']:
  trial=(line+' '+word).strip()
  if word=='\n' or d.textlength(trial,font=font(16))>302:
   d.text((36,y),line,font=font(16),fill='#302e25');y+=20;line=word
  else:line=trial
 d.text((28,524),'YGR - '+str(number+1).zfill(3),font=font(11),fill='#352f20')
 d.text((266,522),'SELECT / ENTER',font=font(10,True),fill='#352f20')
 d.rectangle((340,526,351,538),fill='#cbd5b9',outline='#f5edbf')
 if disabled:im=ImageEnhance.Color(im).enhance(.12);im=ImageEnhance.Brightness(im).enhance(.65)
 return im

class TitleScene(tk.Canvas):
 def __init__(self,app):
  super().__init__(app,bg='#070f16',highlightthickness=0,takefocus=True)
  self.app=app;self.profile=storage.profile();self.selected=next(i for i,o in enumerate(OPTIONS) if o[3]==('resume' if app.run else 'characters'));self.position=float(self.selected);self.target=float(self.selected)
  self.started=time.monotonic();self.timer=None;self.resize_timer=None;self.frames=OrderedDict();self.refs=[];self.hitboxes=[];self.drag=None;self.hover=None;self.alive=True
  self.options=list(OPTIONS)
  if self.profile.get('gallery_unlocked'):self.options.insert(-1,('Gallery',75500286,'Under construction','gallery_view'))
  self.faces=[]
  for i,(name,cid,desc,action) in enumerate(self.options):
   if action=='resume' and app.run and app.run['stage'] in ('complete','gameover'):name='Last Run';desc='Review the statistics and unlocks from your last journey.'
   self.faces.append(card_face(name,cid,desc,i,action=='resume' and not any(s['run'] for s in storage.run_slots())))
  self.pack(fill='both',expand=True)
  self.bind('<Configure>',self.resize);self.bind('<Left>',lambda e:self.roll(-1));self.bind('<Right>',lambda e:self.roll(1))
  self.bind('<Return>',lambda e:self.activate());self.bind('<space>',lambda e:self.activate())
  self.bind('<MouseWheel>',lambda e:self.roll(-1 if e.delta>0 else 1))
  self.bind('<ButtonPress-1>',self.press);self.bind('<ButtonRelease-1>',self.release);self.bind('<Motion>',self.motion)
  self.bind('<Destroy>',self.destroyed);self.focus_set();self.after_idle(self.tick)
 def destroyed(self,event):
  if event.widget!=self:return
  self.alive=False
  for timer in (self.timer,self.resize_timer):
   if timer:
    try:self.after_cancel(timer)
    except tk.TclError:pass
 def resize(self,event):
  if self.resize_timer:self.after_cancel(self.resize_timer)
  self.resize_timer=self.after(60,self.background)
 def background(self):
  self.resize_timer=None;w,h=self.winfo_width(),self.winfo_height()
  if w<100 or h<100:return
  scale=min(w/1280,h/800)
  with Image.open(ASSETS/'character-select-background.png') as source:
   im=ImageOps.fit(source.convert('RGB'),(w,h),Image.Resampling.LANCZOS)
   im=Image.blend(im,Image.new('RGB',(w,h),'#070c18'),.78)
   self.back=ImageTk.PhotoImage(im,master=self)
  self.frames.clear();self.delete('all');self.create_image(0,0,image=self.back,anchor='nw')
  rng=random.Random(37);self.particles=[]
  for n in range(38):
   x,y,speed,r=rng.random()*w,rng.random()*h,8+rng.random()*18,(1+rng.random()*1.5)*scale
   halo=self.create_oval(0,0,1,1,fill='#183939',outline='');dot=self.create_oval(0,0,1,1,fill='#c4b979' if n%3 else '#72b8af',outline='')
   self.particles.append((halo,dot,x,y,speed,r))
  self.logo=self.app.art.photo(ASSETS/'rogue-duelist-logo.png',(max(1,int(265*scale)),max(1,int(106*scale))))
  self.create_image(w/2,57*scale,image=self.logo)
  self.create_line(w*.35,115*scale,w*.65,115*scale,fill='#746944')
  self.card_items=[self.create_image(0,0,state='hidden') for _ in self.options];self.card_keys={};self.current_photos={}
  self.shadow_items=[self.create_oval(0,0,1,1,fill='#04090e',outline='',state='hidden') for _ in self.options]
  for x,symbol in [(40,'‹'),(w-40,'›')]:self.create_text(x,h*.48,text=symbol,fill='#d2c085',font=('Segoe UI',int(38*scale)))
  self.description_item=self.create_text(w/2,h-114*scale,fill='#dbd4bd',font=('Segoe UI',max(10,int(12*scale))),width=w*.75)
  self.dots=[]
  for i in range(len(self.options)):
   x=w/2+(i-(len(self.options)-1)/2)*19*scale;r=4*scale
   self.dots.append(self.create_oval(x-r,h-85*scale-r,x+r,h-85*scale+r,fill='#3d4d50',outline=''))
  self.create_text(w/2,h-57*scale,text='SCROLL / DRAG / ARROW KEYS   •   CLICK THE CENTER CARD OR PRESS ENTER',fill='#84999a',font=('Segoe UI',max(8,int(9*scale))))
  p=self.profile;self.create_text(22,h-22,anchor='w',text=f'{len(set(p["unlocked"])&set(PLAYABLE_IDS))} / {len(PLAYABLE_IDS)} DUELISTS   ·   {p["wins"]} RUNS WON',fill='#8ba6a6',font=('Segoe UI',9))
  self.status_item=self.create_text(w-22,h-22,anchor='e',fill='#bda876',font=('Segoe UI',9));self.drawn_selection=None;self.last_status=None
 def roll(self,step):
  self.target+=step;self.selected=int(round(self.target))%len(self.options);self.app.audio.effect('select')
 def activate(self):
  if abs(self.position-self.target)>.12:return
  if self.options[self.selected][3]=='resume' and not any(s['run'] for s in storage.run_slots()):return
  self.app.audio.effect('major' if self.options[self.selected][3]=='characters' else 'select');getattr(self.app,self.options[self.selected][3])()
 def hit(self,x,y):
  for i,b in reversed(self.hitboxes):
   if b[0]<=x<=b[2] and b[1]<=y<=b[3]:return i
  return None
 def motion(self,e):
  self.hover=self.hit(e.x,e.y);self.config(cursor='hand2' if self.hover is not None or e.x<80 or e.x>self.winfo_width()-80 else '')
 def press(self,e):self.drag=(e.x,e.y);self.focus_set()
 def release(self,e):
  if not self.drag:return
  dx=e.x-self.drag[0];self.drag=None
  if abs(dx)>45:return self.roll(-1 if dx>0 else 1)
  if e.y>self.winfo_height()-35 and self.app.preloader.failed:
   self.app.preloader.start();return
  if e.x<80:return self.roll(-1)
  if e.x>self.winfo_width()-80:return self.roll(1)
  i=self.hit(e.x,e.y)
  if i is None:return
  if i==self.selected:self.activate()
  else:
   count=len(self.options);self.roll((i-self.selected+count//2)%count-count//2)
 def photo(self,index,height,angle):
  # Quantized/capped cache avoids an ever-growing set of animation images.
  height=max(8,int(round(height/8)*8));angle=round(angle/2)*2
  key=(index,height,angle)
  if key not in self.frames:
   im=self.faces[index].resize((round(height*380/550),height),Image.Resampling.BILINEAR).rotate(angle,Image.Resampling.BICUBIC,expand=True)
   self.frames[key]=ImageTk.PhotoImage(im,master=self)
   if len(self.frames)>100:self.frames.popitem(last=False)
  else:self.frames.move_to_end(key)
  return self.frames[key]
 def tick(self):
  if not self.alive:return
  start=time.monotonic();self.timer=None
  w,h=self.winfo_width(),self.winfo_height()
  if w<100 or h<100:
   self.timer=self.after(100,self.tick);return
  if not hasattr(self,'card_items'):self.background()
  scale=min(w/1280,h/800);t=start-self.started
  # Time-based easing behaves consistently regardless of machine speed.
  dt=min(.1,start-getattr(self,'last_tick',start-.016));self.last_tick=start
  self.position+=(self.target-self.position)*(1-math.exp(-12*dt));self.hitboxes=[]
  for n,(halo,dot,x,y,speed,r) in enumerate(self.particles):
   px=(x+math.sin(t*.22+n)*20)%w;py=(y-t*speed)%h
   self.coords(halo,px-r*3,py-r*3,px+r*3,py+r*3);self.coords(dot,px-r,py-r,px+r,py+r)
  entries=[];count=len(self.options)
  for i in range(count):
   d=(i-self.position+count/2)%count-count/2
   if abs(d)<2.65:entries.append((abs(d),i,d))
   else:self.itemconfigure(self.card_items[i],state='hidden');self.itemconfigure(self.shadow_items[i],state='hidden')
  for _,i,d in sorted(entries,reverse=True):
   # Three reusable depth sizes; motion itself remains smoothly interpolated.
   depth=min(2,int(abs(d)+.5));height=(490 if depth==0 else 325 if depth==1 else 290)*scale
   x=w/2+d*min(w*.225,290*scale);y=h*.49+abs(d)*21*scale+math.sin(t*1.15+i*.7)*7*scale
   angle=(-depth*5 if d>0 else depth*5)+math.sin(t*.85+i)*1.8
   if i==self.selected and self.hover==i:y-=9*scale
   key=(int(round(height/8)*8),round(angle/2)*2)
   if self.card_keys.get(i)!=key:
    photo=self.photo(i,height,angle);self.current_photos[i]=photo;self.itemconfigure(self.card_items[i],image=photo);self.card_keys[i]=key
   shadow=self.shadow_items[i];item=self.card_items[i]
   self.coords(shadow,x-height*.28,y+height*.53,x+height*.28,y+height*.59);self.itemconfigure(shadow,state='normal');self.tag_raise(shadow)
   self.coords(item,x,y);self.itemconfigure(item,state='normal');self.tag_raise(item)
   self.hitboxes.append((i,self.bbox(item)))
  if self.drawn_selection!=self.selected:
   self.itemconfigure(self.description_item,text=self.options[self.selected][2] if self.selected or self.app.run else 'No saved run yet. Select New Game to begin.')
   for i,dot in enumerate(self.dots):self.itemconfigure(dot,fill='#e8ca7a' if i==self.selected else '#3d4d50')
   self.drawn_selection=self.selected
  pre=self.app.preloader;status='Artwork ready' if pre.finished and not pre.failed else ('Click here to retry missing artwork' if pre.failed and pre.finished else f'Preparing artwork {pre.completed}/{pre.total}')
  if status!=self.last_status:self.itemconfigure(self.status_item,text=status);self.last_status=status
  elapsed=time.monotonic()-start
  self.timer=self.after(max(1,16-int(elapsed*1000)) if self.winfo_viewable() else 200,self.tick)
