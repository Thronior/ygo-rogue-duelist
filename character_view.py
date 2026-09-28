from in_game_popup import Popup
"""Character roster and selected-duelist panel over the supplied background."""
import tkinter as tk
from PIL import Image,ImageTk,ImageOps,ImageEnhance,ImageChops,ImageDraw
from tkinter import font as tkfont
import campaign as game
import challenge_levels
import storage,visual_ui as v
import random,math
from content import CHARACTERS,PACK_BY_ID,PLAYABLE_IDS,starting_packs,ARTIFACTS,ART_INFO
from artwork import ASSETS

class CharacterSelect(tk.Canvas):
 def __init__(self,app):
  super().__init__(app,bg='#081618',highlightthickness=0,takefocus=True)
  self.app=app;self.selected=0;self.secret_taps=0;self.secret_playing=False;self.levels={};self.unlocked=set(storage.profile()['unlocked'])&set(PLAYABLE_IDS);self.roster=PLAYABLE_IDS;self.photos={};self.refs=[];self.widgets=[];self.resize=None;self._fx_after=None;self._fx=[];self._fx_box=None;self._fx_t=0;self._tip=None;self._tip_after=None
  self.pack(fill='both',expand=True);self.bind('<Configure>',self.schedule)
  for key,step in [('Left',-1),('Right',1),('Up',-6),('Down',6)]:self.bind('<'+key+'>',lambda e,d=step:self.select(self.roster[(self.roster.index(self.selected)+d)%len(self.roster)]))
  self.bind('<Return>',lambda e:self.begin());self.focus_set()
 def schedule(self,event=None):
  if self.resize:self.after_cancel(self.resize)
  self.resize=self.after(70,self.draw)
 def _fx_start(self,x0,y0,x1,y1,sx,sy,scale,palette=None,motes=None):
  X0,Y0,X1,Y1=x0*sx,y0*sy,x1*sx,y1*sy
  self._fx_box=(X0,Y0,X1,Y1)
  rng=random.Random(self.selected)
  bands=palette or ['#d6e2df','#cfdfd9','#d9e7e1','#d6e2df'];n=len(bands)
  for i,col in enumerate(bands):
   ya=Y0+(Y1-Y0)*i/n;yb=Y0+(Y1-Y0)*(i+1)/n
   self.create_rectangle(X0,ya,X1,yb+1,fill=col,outline='')
  cx=(X0+X1)/2;cy=(Y0+Y1)/2;rx=(X1-X0)*0.32;ry=(Y1-Y0)*0.42
  self.create_oval(cx-rx,cy-ry,cx+rx,cy+ry,fill='#eef5f1',outline='')
  self.create_oval(cx-rx*0.6,cy-ry*0.6,cx+rx*0.6,cy+ry*0.6,fill='#f4ead0',outline='',stipple='gray25')
  self._fx=[]
  for _ in range(12):
   px=rng.uniform(X0+6,X1-6);py=rng.uniform(Y0+6,Y1-6)
   r=(1.4+rng.random()*2.2)*scale
   col=rng.choice(motes or ['#ffffff','#97c5bd','#e9c386','#7fb3a8'])
   it=self.create_oval(px-r,py-r,px+r,py+r,fill=col,outline='')
   self._fx.append({'id':it,'x':px,'y':py,'r':r,'vy':(0.5+rng.random()*1.1)*max(sy,0.6),'ph':rng.uniform(0,6.28)})
  sh=46*sy
  sit=self.create_rectangle(X0,Y1,X1,Y1+sh,fill='#ffffff',outline='',stipple='gray12')
  self._fx_sweep={'id':sit,'y':Y1,'h':sh,'v':max(2.5,3.0*sy)}
  self._fx_tick()
 def _fx_tick(self):
  self._fx_after=None
  try:
   if not self.winfo_exists():return
   box=getattr(self,'_fx_box',None)
   if not box:return
   X0,Y0,X1,Y1=box
   self._fx_t=getattr(self,'_fx_t',0)+1
   for m in self._fx:
    m['y']-=m['vy']
    if m['y']<Y0+3:m['y']=Y1-3
    m['x']+=math.sin(self._fx_t*0.12+m['ph'])*0.35
    if m['x']<X0+2:m['x']=X0+2
    if m['x']>X1-2:m['x']=X1-2
    r=m['r'];self.coords(m['id'],m['x']-r,m['y']-r,m['x']+r,m['y']+r)
   sw=self._fx_sweep
   sw['y']-=sw['v']
   if sw['y']+sw['h']<Y0:sw['y']=Y1
   self.coords(sw['id'],X0,sw['y'],X1,sw['y']+sw['h'])
  except tk.TclError:return
  try:self._fx_after=self.after(110,self._fx_tick)
  except tk.TclError:self._fx_after=None
 def _tip_hide(self):
  if getattr(self,'_tip_after',None):
   try:self.after_cancel(self._tip_after)
   except tk.TclError:pass
   self._tip_after=None
  if getattr(self,'_tip',None):
   try:self._tip.destroy()
   except tk.TclError:pass
   self._tip=None
 def _tip_place(self):
  w=getattr(self,'_tip',None)
  if not w:return
  try:w.update_idletasks()
  except tk.TclError:return
  x=min(self.winfo_pointerx()+16,self.winfo_screenwidth()-w.winfo_reqwidth()-10)
  y=min(self.winfo_pointery()+16,self.winfo_screenheight()-w.winfo_reqheight()-10)
  try:w.geometry(f'+{max(0,x)}+{max(0,y)}')
  except tk.TclError:pass
 def _tip_move(self):
  if getattr(self,'_tip',None):self._tip_place()
 def _card_tip_show(self,card):
  self._tip_hide()
  self._tip_after=self.after(250,lambda:self._card_tip_open(card))
 def _card_tip_open(self,card):
  self._tip_after=None
  if not self.winfo_exists():return
  w=Popup(self,modal=False);self._tip=w;w.overrideredirect(True);w.attributes('-topmost',True);w.configure(bg=v.PANEL)
  v.badges(w,card);v.label(w,v.card_text(card),10,wraplength=340,justify='left').pack(padx=12,pady=10)
  self._tip_place()
 def _pack_tip_show(self,pid):
  self._tip_hide()
  self._tip_after=self.after(250,lambda:self._pack_tip_open(pid))
 def _pack_tip_open(self,pid):
  self._tip_after=None
  if not self.winfo_exists():return
  info=PACK_BY_ID.get(pid,{'name':pid});meta=' / '.join(x for x in [info.get('region'),info.get('code')] if x)
  w=Popup(self,modal=False);self._tip=w;w.overrideredirect(True);w.attributes('-topmost',True);w.configure(bg=v.PANEL)
  v.label(w,info.get('name',pid),12,v.GOLD).pack(padx=14,pady=(10,2))
  v.label(w,('9 cards per pack'+(' - '+meta if meta else '')),10,'#a5b9c9').pack(padx=14,pady=(0,10))
  self._tip_place()
 def select(self,index):
  if self.secret_playing:return
  if index!=self.selected:self.secret_taps=0
  self.selected=index;self.app.audio.effect();self.draw();self.focus_set()
  if index==37:self.secret_click()
 def secret_click(self):
  if self.selected!=37 or self.secret_playing:return
  self.secret_taps+=1
  if self.secret_taps<10:return
  self.secret_taps=0;self.secret_playing=True
  import time
  overlay=self
  overlay.update_idletasks()
  width,height=overlay.winfo_width(),overlay.winfo_height()
  with Image.open(ASSETS/'Meerkat.png') as im:
   im=ImageOps.fit(im,(max(1,int(width*.5)),height),Image.Resampling.LANCZOS)
   photo=ImageTk.PhotoImage(im,master=overlay)
  overlay.photo=photo;item=overlay.create_image(0,height,image=photo,anchor='s');began=time.monotonic()
  def tick():
   if not overlay.winfo_exists():return
   elapsed=time.monotonic()-began;part=int(elapsed/2)
   if part>=3:
    overlay.delete(item)
    import secret_challenge
    self.app.run=secret_challenge.create(game);self.app.launch_duel();return
   phase=(elapsed-part*2)/2
   progress=min(1,phase/.15,(1-phase)/.15);progress=max(0,progress)
   ease=progress*progress*(3-2*progress)
   overlay.coords(item,width*[.25,.75,.5][part],height+photo.height()*(1-ease))
   overlay.after(16,tick)
  tick()
 def level_menu(self):
  if self.secret_playing:return
  panel=tk.Frame(self,bg='#152e34',highlightbackground='#d4c17f',highlightthickness=2)
  panel.place(relx=.5,rely=.5,anchor='center',relwidth=.8)
  tk.Label(panel,text='CHALLENGE LEVEL — includes all previous modifiers',bg='#152e34',fg='white').pack(pady=8)
  beaten=challenge_levels.highest(storage.profile(),self.selected)
  for level,desc in enumerate(challenge_levels.DESCRIPTIONS):
   locked=level>beaten+1
   title=f'LVL {level}: '+(f'Beat lvl {level-1} to unlock — ??????????' if locked else desc)
   if level<=beaten:title+=' (Completed)'
   def choose(n=level):
    self.levels[self.selected]=n;panel.destroy();self.draw()
   tk.Button(panel,text=title,command=choose,state='disabled' if locked else 'normal',wraplength=650,anchor='w',bg='#214955',fg='white').pack(fill='x',padx=10,pady=3)
  tk.Button(panel,text='Close',command=panel.destroy).pack(pady=8)
 def begin(self):
  if self.secret_playing:return
  if self.selected in self.unlocked:self.app.audio.effect('major');self.app.new_run(self.selected,self.levels.get(self.selected,0))
 def photo(self,path,size,locked=False,angle=0,portrait=False,radius=0):
  key=(str(path),size,locked,angle,portrait,radius)
  if key not in self.photos:
   with Image.open(path) as source:
    im=source.convert('RGBA')
    abox=im.getchannel('A').getbbox()
    if abox:
     l,t,r,b=max(0,abox[0]-3),max(0,abox[1]-3),min(im.width,abox[2]+3),min(im.height,abox[3]+3)
     if r>l and b>t:im=im.crop((l,t,r,b))
    bg=im.convert('RGB');border=bg.getpixel((0,0))
    bw=ImageChops.difference(bg,Image.new('RGB',bg.size,border)).convert('L').point(lambda v:255 if v>30 else 0).getbbox()
    if bw:
     l,t,r,b=max(0,bw[0]-3),max(0,bw[1]-3),min(bg.width,bw[2]+3),min(bg.height,bw[3]+3)
     if r>l and b>t:im=im.crop((l,t,r,b))
    if locked:
     alpha=im.getchannel('A');im=ImageEnhance.Brightness(ImageOps.grayscale(im)).enhance(.57).convert('RGBA');im.putalpha(alpha)
    tw,th=size
    if portrait and not angle:
     iw,ih=im.size
     sc=th/max(1,ih);nw=max(1,round(iw*sc))
     im=im.resize((nw,th),Image.Resampling.LANCZOS)
     if nw>tw:
      lf=(nw-tw)//2;im=im.crop((lf,0,lf+tw,th))
    else:
     im=ImageOps.fit(im,size,Image.Resampling.LANCZOS)
    if portrait and radius and not angle:
     w,h=im.size;r=max(1,min(radius,w//2,h//2))
     mask=Image.new('L',(w,h),0)
     ImageDraw.Draw(mask).rounded_rectangle([0,0,w-1,h-1],radius=r,fill=255)
     im.putalpha(ImageChops.darker(im.getchannel('A'),mask))
    if angle:im=im.rotate(angle,Image.Resampling.BICUBIC,expand=True)
    self.photos[key]=ImageTk.PhotoImage(im,master=self)
  return self.photos[key]
 def draw(self):
  if self.secret_playing:return
  self.resize=None
  if self._fx_after:
   try:self.after_cancel(self._fx_after)
   except tk.TclError:pass
   self._fx_after=None
  self._fx=[];self._fx_box=None
  self._tip_hide()
  self.delete('all');self.refs=[]
  for widget in self.widgets:widget.destroy()
  self.widgets=[];w=self.winfo_width();h=self.winfo_height()
  if w<100 or h<100:return
  sx=sy=scale=min(w/1280,h/800)
  offset_x=(w-1280*scale)/2;offset_y=(h-800*scale)/2
  with Image.open(ASSETS/'character-select-background.png') as im:
   self.background=ImageTk.PhotoImage(ImageOps.fit(im.convert('RGB'),(w,h),Image.Resampling.LANCZOS),master=self)
  background_id=self.create_image(0,0,image=self.background,anchor='nw')
  def rounded(x,y,x2,y2,color,outline='',border=1,tag=None):
   r=18;points=[x+r,y,x2-r,y,x2,y,x2,y+r,x2,y2-r,x2,y2,x2-r,y2,x+r,y2,x,y2,x,y2-r,x,y+r,x,y]
   return self.create_polygon(*[p*(sx if i%2==0 else sy) for i,p in enumerate(points)],smooth=True,fill=color,outline=outline,width=border,tags=tag or ())
  def text(x,y,value,size=12,color='#eef6f2',anchor='center',tag=None,**kw):
   return self.create_text(x*sx,y*sy,text=value,font=('Segoe UI',max(9,int(size*scale)),'bold'),fill=color,anchor=anchor,tags=tag or (),**kw)
  def banner(x,y,value,size=30,limit=340,tag=None):
   s=size;f=('Segoe UI Black',max(8,int(s*scale)),'bold')
   while s>10:
    f=('Segoe UI Black',max(8,int(s*scale)),'bold')
    if tkfont.Font(font=f).measure(value)<=int(limit*sx):break
    s-=2
   for dx,dy in [(-2,0),(2,0),(0,-2),(0,2),(-2,-2),(2,2),(-2,2),(2,-2)]:self.create_text((x+dx)*sx,(y+dy)*sy,text=value,font=f,fill='black',tags=tag or ())
   return self.create_text(x*sx,y*sy,text=value,font=f,fill='white',tags=tag or ())
  def art(path,x,y,bw,bh,locked=False,tag=None,angle=0,portrait=False,radius=0):
   try:im=self.photo(path,(max(1,int(bw*sx)),max(1,int(bh*sy))),locked,angle,portrait,radius)
   except OSError:im=self.photo(ASSETS/'card-back.jpg',(max(1,int(bw*sx)),max(1,int(bh*sy))),locked,angle,portrait,radius)
   self.refs.append(im);return self.create_image(x*sx,y*sy,image=im,tags=tag or ())
  text(38,32,'CHOOSE YOUR DUELIST',23,anchor='w')
  text(820,32,f'{len(self.unlocked)} / {len(self.roster)} unlocked',12,'#b5ded4',anchor='e')
  self.tiles={}
  # Six rows keep all 36 characters on screen, without a scrolling roster.
  for slot,i in enumerate(self.roster):
   c=CHARACTERS[i]
   x=35+(slot%6)*133;y=70+(slot//6)*111;locked=i not in self.unlocked;tag=f'character-{i}'
   self.tiles[i]=rounded(x,y,x+123,y+101,'#dfb955' if challenge_levels.highest(storage.profile(),i)>=5 else '#62676a' if locked else '#e6efec','#d64a85' if i==self.selected else '#283d40',5 if i==self.selected else 2,tag)
   art(ASSETS/c['sprite'],x+61,y+49,119,97,locked,tag,portrait=True,radius=max(3,int(11*min(sx,sy))))
   nm=c['name'].upper();words=nm.split();lines=[nm]
   if len(words)>1 and tkfont.Font(font=('Segoe UI Black',max(8,int(13*scale)),'bold')).measure(nm)>int(115*sx):
    bk=min(range(1,len(words)),key=lambda k:max(len(' '.join(words[:k])),len(' '.join(words[k:]))))
    lines=[' '.join(words[:bk]),' '.join(words[bk:])]
   if len(lines)>1:banner(x+61,y+76,lines[0],11,115,tag);banner(x+61,y+90,lines[1],11,115,tag)
   else:banner(x+61,y+84,lines[0],13,115,tag)
   if locked:banner(x+61,y+9,'LOCKED',8,115,tag)
   self.tag_bind(tag,'<Button-1>',lambda e,index=i:self.select(index))
   self.tag_bind(tag,'<Enter>',lambda e:self.config(cursor='hand2'));self.tag_bind(tag,'<Leave>',lambda e:self.config(cursor=''))
  c=CHARACTERS[self.selected];locked=self.selected not in self.unlocked;random_draft=c.get('random_packs',False);copy_draft=c.get('copycat',False);engine_draft=c.get('engine_deck',False);p=PACK_BY_ID.get(c['pack'],{'id':'RANDOM','name':'Random boosters','region':'EN + JP','code':'RANDOM'})
  rounded(855,30,1253,739,'#152e34','#97c5bd',2)
  rounded(874,44,1234,252,'#3d2350','#3d2350',1)
  with Image.open(ASSETS/'character-backgrounds'/f'{self.selected}.jpg') as backdrop:
   portrait_bg=ImageTk.PhotoImage(ImageOps.fit(backdrop,(max(1,int(360*sx)),max(1,int(208*sy))),Image.Resampling.LANCZOS),master=self)
  self.refs.append(portrait_bg);self.create_image(874*sx,44*sy,image=portrait_bg,anchor='nw',tags='copycat-secret' if self.selected==37 else ())
  art(ASSETS/c['sprite'],1054,148,344,192,locked,portrait=True,tag='copycat-secret' if self.selected==37 else None)
  if self.selected==37:
   self.create_rectangle(874*sx,44*sy,1234*sx,252*sy,fill='',outline='',tags='copycat-secret')
   self.tag_bind('copycat-secret','<Button-1>',lambda e:self.secret_click())
  rounded(1179,49,1228,110,'#a82445','#ffe3af',2,'level-picker')
  text(1203,63,'LVL',12,tag='level-picker')
  text(1203,88,str(self.levels.get(self.selected,0)),24,tag='level-picker')
  self.tag_bind('level-picker','<Button-1>',lambda e:self.level_menu())
  banner(1054,252,c['name'].upper(),26 if len(c['name'])>18 else 30)
  self.detail_text=game.unlock_text(self.selected) if locked else ''
  text(1054,298,self.detail_text,10,'#e3afc0' if locked else '#95e9bd',width=int(355*sx))
  pack_ids=[] if (random_draft or copy_draft or engine_draft) else starting_packs(self.selected)
  text(1054,324,'BORROWED DECK' if copy_draft else 'RANDOM STARTER DECK' if engine_draft else 'GUARANTEED CARDS',11,'#e9c386')
  if pack_ids:
   for n,pid in enumerate(pack_ids[:4]):
    tag=f'pack-{n}'
    art(ASSETS/'packs'/f'{pid}.jpg',948+(n-1.5)*22,412,65,100,False,tag,angle=[-10,-3,4,10][n])
    self.tag_bind(tag,'<Enter>',lambda e,pid=pid:(self.config(cursor='hand2'),self._pack_tip_show(pid)))
    self.tag_bind(tag,'<Leave>',lambda e:(self.config(cursor=''),self._tip_hide()))
    self.tag_bind(tag,'<Motion>',lambda e:self._tip_move())
  else:
   art(ASSETS/'card-back.jpg',948,412,65,100)
   text(1054,484,("Opponent deck + 1 Copycat" if copy_draft else 'A random starter or structure deck every duel' if engine_draft else '4 different random unlocked packs' if random_draft else '1 each: Tournament Packs 1 - 4' if self.selected==24 else '4 x '+p['name']),11,width=int(300*sx))
   text(1054,510,'One guaranteed Copycat. Relics only.' if copy_draft else 'Relics-only shopping. A new deck each duel.' if engine_draft else 'A fresh selection every new run' if random_draft else ('9 cards + starter support included' if p.get('starter_support') else p['region']+' / '+p['code']+' / 9 cards per pack'),9,'#a5c6bd',width=int(300*sx))
  for n,name in enumerate(c['cards']):
   card=game.BY_NAME[name];x=1080+n*91;tag='signature-'+str(n)
   art(ASSETS/'cards'/f'{card["id"]}.jpg',x,412,80,117,False,tag)
   self.tag_bind(tag,'<Button-1>',lambda e,card=card:(self._tip_hide(),v.inspect(self.app,card)))
   self.tag_bind(tag,'<Enter>',lambda e,card=card:(self.config(cursor='hand2'),self._card_tip_show(card)))
   self.tag_bind(tag,'<Leave>',lambda e:(self.config(cursor=''),self._tip_hide()))
   self.tag_bind(tag,'<Motion>',lambda e:self._tip_move())
  relic=c.get('starting_relic','random')
  if relic in (None,'none'):relic='none'
  try:rid=game.BY_NAME[ART_INFO[relic]['art']]['id'] if relic!='random' else None
  except KeyError:rid=None
  relic_image=self.app.art.photo(ASSETS/'cards'/f'{rid}.jpg' if rid else ASSETS/'card-back.jpg',(max(1,int(96*sx)),max(1,int(96*sy))),crop=bool(rid))
  if relic!='none':self.refs.append(relic_image);self.create_image(929*sx,584*sy,image=relic_image)
  text(992,565,'Random relic' if relic=='random' else 'No relic' if relic=='none' else ARTIFACTS[relic][0],13,'#f0d8b2',anchor='w')
  text(992,606,'A different relic each run.' if relic=='random' else 'The Dueling Engine starts with no relic.' if relic=='none' else ARTIFACTS[relic][2],9,'#e9d3ae',anchor='w',width=int(238*sx))
  def button(label,command,x,y,bw,disabled=False,bg='#b93b73'):
   b=tk.Button(self,text=label,command=command,bg=bg if not disabled else '#536064',fg='white',activebackground='#df639b',activeforeground='white',relief='flat',font=('Segoe UI',max(10,int(12*scale)),'bold'),cursor='hand2',disabledforeground='#b4bcbe')
   if disabled:b.config(state='disabled')
   self.create_window(x*sx,y*sy,window=b,width=bw*sx,height=38*sy);self.widgets.append(b);return b
  button('Back to title',self.app.home,125,770,180)
  text(436,770,'Select a portrait. Arrow keys also move selection.',10,'#b5ded4')
  self.begin_button=button('Locked' if locked else 'Choose opponent' if (copy_draft or engine_draft) else 'START RUN',self.begin,1054,768,398,locked,bg='#cf3a81')

  self.move("all",offset_x,offset_y);self.move(background_id,-offset_x,-offset_y)
