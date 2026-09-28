from in_game_popup import Popup
import challenge_levels
"""Illustrated encounter selection using the existing campaign and EDOPro art."""
import tkinter as tk
import random
from collections import Counter
from PIL import Image, ImageTk, ImageOps
import campaign as game
import shop_rewards
from duelist_portrait import DuelistPortrait
from artwork import ROOT, ASSETS
from content import CHARACTERS, PACK_BY_ID, CURSES, opponent_record

class OpponentSelect(tk.Canvas):
 def __init__(self,app):
  super().__init__(app,bg='#07151c',highlightthickness=0)
  self.app=app;self.boss=(app.run['round']+1)%3==0;self.photos=[];self.cards=[]
  self.pack(fill='both',expand=True)
  self.backdrop=self.create_image(0,0,anchor='nw')
  self.heading=self.create_text(0,0,text='BOSS ENCOUNTER' if self.boss else 'CHOOSE YOUR OPPONENT',fill='#ffd289' if self.boss else '#e9ffff',font=('Segoe UI',26,'bold'))
  self.subtitle=self.create_text(0,0,text=f'Duel {app.run["round"]+1} / 9  •  Victory shapes your next shop',fill='#d2f2f0',font=('Segoe UI',11))
  self.curse=None
  if self.boss:
   count=min(3,(app.run['round']+1)//3)
   self.curse=self.create_text(0,0,text=f'{count} curse(s) • Choose your challenge below.\nThis duel only • Victory heals up to 2,000 LP ({4000 if app.run.get('challenge_level',0)>=4 else 8000:,} cap)',fill='#ffd8bc',font=('Segoe UI',10),justify='center')
  for index in app.run['routes']:self.add_opponent(index)
  self.back=tk.Button(self,text='Back',command=self.go_back,bg='#19333e',fg='white',relief='flat',cursor='hand2',padx=24,pady=7)
  self.back_window=self.create_window(0,0,window=self.back)
  self.bar=tk.Scrollbar(self,command=self.yview);self.configure(yscrollcommand=self.bar.set)
  self.bind('<Configure>',self.layout)
  def bind_wheel(widget):
   widget.bind('<MouseWheel>',lambda e:self.yview_scroll(int(-e.delta/120),'units'))
   for child in widget.winfo_children():bind_wheel(child)
  bind_wheel(self)
 def icon(self,parent,name,size=(25,25)):
  return self.app.art.label(parent,ROOT/'runtime/textures'/name,size,bg=parent.cget('bg'))
 def add_opponent(self,index):
  app=self.app;c=CHARACTERS[index];bg='#30202d' if self.boss else '#102933';accent='#df9471' if self.boss else '#54bdb6'
  panel=tk.Frame(self,bg=bg,highlightbackground=accent,highlightthickness=2,padx=14,pady=10)
  top=tk.Frame(panel,bg=bg);top.pack(fill='x')
  self.icon(top,'act.png' if self.boss else 'attack.png').pack(side='left')
  tk.Label(top,text='BOSS CHALLENGE' if self.boss else ('PRACTICE DUEL' if app.run['round']==0 else 'DUELIST CHALLENGE'),bg=bg,fg=accent,font=('Segoe UI',10,'bold')).pack(side='left',padx=8)
  portrait=DuelistPortrait(panel,index,self.boss);portrait.pack(fill='x',pady=(6,8))
  record=opponent_record(app.run['round'],index)
  intro='Practice duel • 3,000 LP' if app.run['round']==0 else ('Rising challenger' if app.run['round']<3 else 'Veteran challenger' if app.run['round']<6 else 'Elite challenger')
  if app.run.get('challenge_level',0)>=1:intro='Challenge LVL '+str(app.run['challenge_level'])+' — 8,000 LP'
  tk.Label(panel,text=intro,bg=bg,fg='#a9c8d1',font=('Segoe UI',9),wraplength=255).pack(pady=(2,7))
  if self.boss:
   for key in app.run.get('route_curses',{}).get(str(index),[]):
    name,description=CURSES[key]
    description=challenge_levels.curse_description(app.run,key,description)
    tk.Label(panel,text=name+' — '+description,bg=bg,fg='#ffc3ac',font=('Segoe UI',9),justify='left',wraplength=255).pack(fill='x',pady=2)
  reward=app.run.get('route_rewards',{}).get(str(index)) or shop_rewards.reward_for(index)
  rewards=tk.Frame(panel,bg=bg);rewards.pack(fill='x',pady=4)
  match=game.BY_NAME.get('Dark Magician Girl') if reward['key']=='darkmagician' else next((card for card in game.CARDS if shop_rewards.matches(card,reward['key'])),None)
  if match:app.art.card(rewards,match['id'],(52,46),crop=True,bg=bg).pack(side='left',padx=(0,8))
  tk.Label(rewards,text='SHOP BOOST\n'+reward['label'],bg=bg,fg='#b2e7d1',font=('Segoe UI',10),justify='left',wraplength=185).pack(side='left')
  booster=tk.Frame(panel,bg=bg);booster.pack(fill='x',pady=5)
  app.art.pack(booster,reward['pack'],(48,64),bg=bg).pack(side='left',padx=(0,10))
  tk.Label(booster,text='GUARANTEED PACK\n'+PACK_BY_ID[reward['pack']]['name'],bg=bg,fg='#e6d2ab',font=('Segoe UI',10),justify='left',wraplength=185).pack(side='left')
  if 'deck_spyglass' in (app.run.get('artifacts') or []) or app.run.get('mirror_copy')=='deck_spyglass':
   spy=tk.Button(panel,text='View decklist',command=lambda idx=index:self.show_deck(idx),bg='#23565d',fg='white',relief='flat',cursor='hand2',padx=12,pady=4);spy.pack(pady=(0,4))
  def choose():
   app.run['opponent']=index;app.run['route_confirmed']=True;app.save();app.launch_duel()
  button=app.button(panel,'Challenge boss' if self.boss else 'Duel',choose)
  button.configure(image=app.art.photo(ROOT/'runtime/textures/attack.png',(22,22)),compound='left',bg='#ba3778')
  self.cards.append((panel,self.create_window(0,0,window=panel,anchor='n')))
 def show_deck(self,index):
  import visual_ui as v
  app=self.app;variant=app.run.get('tutorial_variants',{}).get(str(index),0)
  deck=game.opponent_deck(app.run['round'],random.Random(index),index,variant)
  counts=Counter(deck)
  popup=Popup(app);popup.title('Enemy decklist');popup.configure(bg='#101923')
  tk.Label(popup,text=CHARACTERS[index]['name']+f'  ({len(deck)} cards)',bg='#101923',fg='#e5c58a',font=('Segoe UI',14,'bold')).pack(pady=10)
  outer=tk.Frame(popup,bg='#101923');outer.pack(fill='both',expand=True)
  canvas=tk.Canvas(outer,bg='#101923',highlightthickness=0)
  bar=tk.Scrollbar(outer,command=canvas.yview);bar.pack(side='right',fill='y')
  canvas.pack(fill='both',expand=True);canvas.configure(yscrollcommand=bar.set)
  grid=tk.Frame(canvas,bg='#101923');canvas.create_window((0,0),window=grid,anchor='nw')
  grid.bind('<Configure>',lambda e:canvas.configure(scrollregion=canvas.bbox('all')))
  def wheel(e):canvas.yview_scroll(int(-e.delta/90),'units')
  canvas.bind('<MouseWheel>',wheel)
  cards=sorted(counts, key=lambda cid:(game.BY_ID.get(cid,{}).get('name') or str(cid)).casefold())
  for i,cid in enumerate(cards):
   c=game.BY_ID.get(cid,{})
   box=tk.Frame(grid,bg='#1b2b39',padx=6,pady=6);box.grid(row=i//5,column=i%5,padx=4,pady=4,sticky='nsew')
   art=app.art.card(box,cid,(72,100),bg='#1b2b39');art.pack()
   if c:
    art.bind('<Button-1>',lambda e,c=c:v.inspect(app,c));art.configure(cursor='hand2')
    v.tooltip(app,art,c)
   v.label(box,f"{counts[cid]}x {c.get('name',cid)}",9,wraplength=110).pack()
   for w in (box,art):w.bind('<MouseWheel>',wheel)
  app.button(popup,'Close',popup.destroy).pack(pady=8)
 def go_back(self):self.app.audio.effect('select');self.app.draft_back()
 def layout(self,event):
  w,h=event.width,event.height
  with Image.open(ASSETS/'character-select-background.png') as source:
   im=ImageOps.fit(source.convert('RGB'),(max(1,w),max(1,h)),Image.Resampling.LANCZOS)
   im=Image.blend(im,Image.new('RGB',im.size,'#090913' if self.boss else '#041019'),.46)
   self.background=ImageTk.PhotoImage(im,master=self)
  self.itemconfigure(self.backdrop,image=self.background)
  self.coords(self.heading,w/2,35);self.coords(self.subtitle,w/2,70)
  if self.curse:self.coords(self.curse,w/2,108);self.itemconfigure(self.curse,width=w-80)
  top=144 if self.boss else 108
  columns=max(1,min(len(self.cards),w//280));width=min(350,(w-40-(columns-1)*18)/columns)
  for panel,item in self.cards:self.itemconfigure(item,width=width)
  self.update_idletasks()
  heights=[max(panel.winfo_reqheight() for panel,item in self.cards[r:r+columns]) for r in range(0,len(self.cards),columns)]
  y=top
  for row,start in enumerate(range(0,len(self.cards),columns)):
   count=min(columns,len(self.cards)-start)
   for col,(panel,item) in enumerate(self.cards[start:start+columns]):self.coords(item,w/2+(col-(count-1)/2)*(width+18),y)
   y+=heights[row]+18
  end=max(h,y+48);self.coords(self.back_window,w/2,end-28);self.configure(scrollregion=(0,0,w,end))
  if end>h:self.bar.place(relx=1,x=-14,y=0,width=14,relheight=1)
  else:self.bar.place_forget();self.yview_moveto(0)
