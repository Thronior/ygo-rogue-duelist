from in_game_popup import Popup
"""A responsive shop scene: shelves, booster display and shopkeeper counter."""
import tkinter as tk
from PIL import Image,ImageTk,ImageOps,ImageDraw
from tkinter import messagebox
import campaign as game
import shop_rewards
import visual_ui as v
from content import ARTIFACTS, ART_INFO, PACK_BY_ID, CHARACTERS
from artwork import ASSETS

class ShopScene(tk.Canvas):
 def __init__(self,app):
  super().__init__(app,bg='#68434b',highlightthickness=0)
  self.app=app;self.selected=set();self.images=[];self.buttons={};self.tip=None;self.timer=None;self.resize=None
  self.pack(fill='both',expand=True)
  self.bind('<Configure>',self.schedule)
  self.bind('<Destroy>',lambda e:self.hide_tip())
 def schedule(self,event=None):
  if self.resize:self.after_cancel(self.resize)
  self.resize=self.after(80,self.draw)
 def hide_tip(self,event=None):
  if self.timer:
   try:self.after_cancel(self.timer)
   except tk.TclError:pass
   self.timer=None
  if self.tip:
   self.tip.destroy();self.tip=None
 def hover(self,tag,title,description='',card=None):
  def enter(e):
   self.hide_tip()
   def show():
    self.tip=Popup(self,modal=False);self.tip.overrideredirect(True);self.tip.attributes('-topmost',True);self.tip.configure(bg=v.PANEL)
    if card:v.badges(self.tip,card)
    v.label(self.tip,v.card_text(card) if card else title+'\n\n'+description,11,wraplength=330,justify='left').pack(padx=14,pady=12)
    self.tip.update_idletasks();x=min(self.winfo_pointerx()+14,self.winfo_screenwidth()-self.tip.winfo_reqwidth()-8);y=min(self.winfo_pointery()+14,self.winfo_screenheight()-self.tip.winfo_reqheight()-8)
    self.tip.geometry(f'+{max(0,x)}+{max(0,y)}')
   self.timer=self.after(240,show)
  self.tag_bind(tag,'<Enter>',enter);self.tag_bind(tag,'<Leave>',self.hide_tip)
 def toggle_select(self,idx):
  item=self.app.run['shop'][idx]
  if item['sold'] or (CHARACTERS[self.app.run['character']].get('copycat') and item['kind']!='artifact'):return
  if idx in self.selected:self.selected.remove(idx)
  elif sum(self.app.run['shop'][i]['price'] for i in self.selected)+item['price']>self.app.run['gold']:
   self.show_notice('Not enough gold');return
  elif self.selected and (item['kind']=='deck' or any(self.app.run['shop'][i]['kind']=='deck' for i in self.selected)):
   self.show_notice('Buy a replacement deck separately.');return
  else:self.selected.add(idx)
  self.draw()
 def draw(self):
  self.resize=None;self.hide_tip();self.delete('all');self.images=[]
  for b in self.buttons.values():b.destroy()
  self.buttons={};w=self.winfo_width();h=self.winfo_height()
  if w<100 or h<100:return
  sx=w/1280;sy=h/720;scale=max(min(sx,sy),0.55)
  def rect(x,y,x2,y2,fill,outline='',width=1):return self.create_rectangle(x*sx,y*sy,x2*sx,y2*sy,fill=fill,outline=outline,width=width)
  def glass(x,y,x2,y2,tag=''):
   im=Image.new('RGBA',(max(1,int((x2-x)*sx)),max(1,int((y2-y)*sy))))
   ImageDraw.Draw(im).rounded_rectangle((0,0,im.width-1,im.height-1),radius=max(7,int(12*scale)),fill=(19,43,55,140),outline=(127,174,183,170),width=2)
   photo=ImageTk.PhotoImage(im,master=self);self.images.append(photo)
   return self.create_image(x*sx,y*sy,image=photo,anchor='nw',tags=tag)
  def text(x,y,t,size=12,fill='#fff5de',anchor='center',**kw):return self.create_text(x*sx,y*sy,text=t,fill=fill,font=('Segoe UI',max(9,int(size*scale)),'bold'),anchor=anchor,**kw)
  def title_text(x,y,t,size=12,anchor='center',**kw):
   f=('Segoe UI Black',max(9,int(size*scale)),'bold')
   for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:self.create_text((x+dx)*sx,(y+dy)*sy,text=t,font=f,fill='black',anchor=anchor,**kw)
   return self.create_text(x*sx,y*sy,text=t,font=f,fill='white',anchor=anchor,**kw)
  def art(path,x,y,bw,bh,tag=None,crop=False):
   try:im=self.app.art.photo(path,(max(1,int(bw*sx)),max(1,int(bh*sy))),crop)
   except (OSError,ValueError):im=self.app.art.photo(ASSETS/'card-back.jpg',(max(1,int(bw*sx)),max(1,int(bh*sy))))
   self.images.append(im);return self.create_image(x*sx,y*sy,image=im,anchor='s',tags=tag or ())
  # Keep the supplied anime frame unchanged on disk; cover-fit it at render time.
  with Image.open(ASSETS/'shop-background.png') as source:
   self.background=ImageTk.PhotoImage(ImageOps.fit(source.convert('RGB'),(w,h),Image.Resampling.LANCZOS),master=self)
  self.create_image(0,0,image=self.background,anchor='nw')
  self.create_rectangle(22*sx,12*sy,784*sx,484*sy,fill='#332932',stipple='gray50',outline='')
  blabel=self.app.run.get('bias','');blabel=('TOP ROW: '+shop_rewards.LABELS.get(blabel,blabel+' monsters')) if blabel else ''
  text(49,26,'SINGLES',13,anchor='w');text(150,26,blabel,11,'#ffe29a',anchor='w');text(760,26,'Hover to read  /  Click to select',11,'#edcec2',anchor='e')
  singles=[(i,x) for i,x in enumerate(self.app.run['shop']) if x['kind']=='single']
  packs=[(i,x) for i,x in enumerate(self.app.run['shop']) if x['kind'] in ('pack','deck')]
  artifacts=[(i,x) for i,x in enumerate(self.app.run['shop']) if x['kind']=='artifact']
  def buy_button(idx,item,x,y,bw):
   blocked=item['sold'] or (CHARACTERS[self.app.run['character']].get('copycat') and item['kind']!='artifact')
   y-=35
   price='SOLD' if item['sold'] else str(item['price'])
   text(x-bw/2+6,y-11,price,14,'#000000',anchor='w')
   text(x-bw/2+4,y-13,price,14,'#ffe29a',anchor='w')
   if not item['sold']:
    import tkinter.font as _tkf
    _w=_tkf.Font(family='Segoe UI',size=max(9,int(14*scale)),weight='bold').measure(price)/max(sx,0.01)
    art(ASSETS/'ui/coins.png',x-bw/2+4+_w+18,y-2,22,22)
   def toggle():self.toggle_select(idx)
   button=tk.Button(self,text='✓' if idx in self.selected else '□',command=toggle,relief='flat',bg='#d8b463' if idx in self.selected else '#142735',fg='white',font=('Segoe UI',15,'bold'),cursor='hand2')
   if blocked:button.config(state='disabled')
   self.create_window((x+bw/2-17)*sx,y*sy,window=button,width=30*sx,height=30*sy);self.buttons[idx]=button
  for n,(idx,item) in enumerate(singles):
   # Keep bonus general singles on their shelf instead of spilling into packs.
   row=0 if n<5 else 1;col=n if row==0 else n-5
   columns=5 if row==0 else max(5,len(singles)-5);cell=735/columns
   x=35+cell*(col+.5);y=222+row*219;card=game.BY_ID[item['id']];tag='item'+str(idx)
   width=min(136,cell-11)
   art(ASSETS/'cards'/f'{card["id"]}.jpg',x,y+12,width,width*189/136,tag)
   self.hover(tag,card['name'],card=card);self.tag_bind(tag,'<Button-1>',lambda e,idx=idx:self.toggle_select(idx))
   buy_button(idx,item,x,y+8,min(129,cell-18))
  for y in [250,469]:
   rect(22,y,784,y+10,'#bca1a3');rect(22,y+10,784,y+17,'#4e3742');rect(30,y+2,777,y+4,'#efd4bb')
  text(403,255,'GENERAL STOCK',9,'#3a2b33')
  text(48,510,'BOOSTER PACKS',14,anchor='w');text(760,510,'9 cards per pack',11,'#edcec2',anchor='e')
  self.create_rectangle(28*sx,531*sy,778*sx,708*sy,fill='#332932',stipple='gray50',outline='#b38a88',width=2)
  for n,(idx,item) in enumerate(packs):
   p=PACK_BY_ID[item['id']] if item['kind']=='pack' else dict(id=item['id'],name=item['name'],region='Replaces ALL owned cards',code=f"{len(item['cards'])} cards / {item['price']} coins");x=85+n*367;tag='item'+str(idx)
   art((ASSETS/'decks'/f'{item["art"]}.jpg') if item['kind']=='deck' else (ASSETS/'packs'/f'{p["id"]}.jpg'),x+27,689,115,148,tag)
   text(x+99,553,p['name'],13,anchor='nw',width=int(208*sx));text(x+99,616,('Opponent reward / ' if item.get('opponent_pack') else p['region']+' / ')+p['code'],11,'#dfc1b2',anchor='w')
   self.hover(tag,p['name'],'Replaces ALL owned cards with this original 50-card starter deck. Keeps relics.' if item['kind']=='deck' else p['region']+' booster. Open nine cards and add them to your collection.')
   self.tag_bind(tag,'<Button-1>',lambda e,idx=idx:self.toggle_select(idx))
   buy_button(idx,item,x+27,716,110)
  # Transparent official portrait stands behind the counter.
  art(ASSETS/'dm16.png',1040,562,460,460)
  # Match the mobile counter: gold above, Buy left, triangular Next Duel right.
  glass(1080,24,1256,94)
  import tkinter.font as tkfont
  number_width=tkfont.Font(family='Segoe UI',size=max(9,int(32*scale)),weight='bold').measure(f'{self.app.run["gold"]:,}')/sx
  art(ASSETS/'ui/coins.png',1236-number_width-23,81,40,40)
  text(1236,60,f'{self.app.run["gold"]:,}',32,'#ffe18a',anchor='e')
  boss=(self.app.run['round']+1)%3==0
  self.create_polygon(1148*sx,316*sy,1265*sx,386*sy,1148*sx,456*sy,fill='#a52b3b' if boss else '#bb803c',outline='#e7b16c',width=2,tags='next-duel')
  label=text(1180,386,'Boss\nfight!' if boss else 'Next\nDuel!',16,'#fff2cf');self.addtag_withtag('next-duel',label)
  self.tag_bind('next-duel','<Button-1>',lambda e:self.app.routes())
  self.tag_bind('next-duel','<Enter>',lambda e:self.configure(cursor='hand2'))
  self.tag_bind('next-duel','<Leave>',lambda e:self.configure(cursor=''))
  edit=tk.Button(self,text='Edit deck',command=self.app.draft,relief='flat',bg='#d8b463',activebackground='#f1d18b',fg='#142735',activeforeground='#142735',font=('Segoe UI',max(12,int(17*scale)),'bold'),cursor='hand2',takefocus=True)
  self.create_window(887*sx,112*sy,window=edit,width=150*sx,height=48*sy)
  self.buttons['edit-deck']=edit
  rect(807,535,1264,715,'#383841','#b7a3ad',5);rect(800,521,1270,543,'#ccbec1','#685563',2)
  text(830,561,'ARTIFACTS',13,anchor='w');text(1244,561,'Permanent upgrades',10,'#cfc5c3',anchor='e')
  width=427/max(1,len(artifacts))
  for n,(idx,item) in enumerate(artifacts):
   x=827+width*(n+.5);name,_,desc=ARTIFACTS[item['id']];card=game.BY_NAME.get(ART_INFO[item['id']]['art'],game.BY_NAME['Sangan']);tag='item'+str(idx)
   rect(x-width/2+5,578,x+width/2-5,663,'#222c36','#776a79')
   art(ASSETS/'cards'/f'{card["id"]}.jpg',x,696,width-22,112,tag,crop=True)
   title_text(x,591,name,10,width=int((width-14)*sx))
   self.hover(tag,name,desc);self.tag_bind(tag,'<Button-1>',lambda e,idx=idx:self.toggle_select(idx));buy_button(idx,item,x,688,width-12)

  total=sum(self.app.run['shop'][i]['price'] for i in self.selected)
  glass(812,333,920,439,'buy-basket')
  for item in (text(866,361,'BUY',15,'#fff2cf' if self.selected else '#aab5bd'),text(877,405,str(total),14,'#ffe18a' if self.selected else '#aab5bd'),art(ASSETS/'ui/coins.png',850,420,27,27)):
   self.addtag_withtag('buy-basket',item)
  self.tag_bind('buy-basket','<Button-1>',lambda e:self.buy_selected() if self.selected else None)
  self.tag_bind('buy-basket','<Enter>',lambda e:self.configure(cursor='hand2' if self.selected else ''))
  self.tag_bind('buy-basket','<Leave>',lambda e:self.configure(cursor=''))
 def show_notice(self,message):
  tag=self.create_text(self.winfo_width()/2,40,text=message,fill='#ffe0a1',font=('Segoe UI',19,'bold'),tags='notice')
  self.after(2200,lambda:self.delete(tag) if self.winfo_exists() else None)
 def buy_selected(self):
  try:
   if any(self.app.run['shop'][i]['kind']=='deck' for i in self.selected) and not messagebox.askyesno('Replace your entire collection?','Spend 200 coins to replace ALL owned cards with this starter deck? Your relics stay.'):return
   result=game.buy_many(self.app.run,sorted(self.selected));self.selected.clear();self.app.audio.effect('purchase')
   from frontend import shop
   shop(self.app)
   misprints=self.app.run.get('last_misprints') or []
   if misprints:
    lines=[f"{m['name']}: ATK {m['atk']}→{m['atk']+m['datk']}, DEF {m['defense']}→{m['defense']+m['ddef']}" for m in misprints]
    messagebox.showinfo('Faulty Printer','The printer misprinted:\n'+'\n'.join(lines))
   packs=[x for x in result if x['kind'] in ('pack','deck')]
   if packs:
    import campaign_ui
    campaign_ui.open_packs(self.app,[x['cards'] for x in packs],self.app.run['character'],lambda:shop(self.app),pack_ids=[x['id'] for x in packs],auto_reveal=True)
  except ValueError as error:self.show_notice(str(error))
