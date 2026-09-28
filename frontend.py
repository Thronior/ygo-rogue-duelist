"""Desktop campaign screens around the native EDOPro duel client."""
import tkinter as tk
from tkinter import ttk,messagebox
import json,re,time
import shop_rewards,unlocks
import campaign as game,storage,visual_ui as v,campaign_ui as controller
from content import PACKS,PACK_BY_ID,CHARACTERS,ARTIFACTS,ART_INFO,CURSES,GAME_DECKS,PLAYABLE_IDS,starting_packs,opponent_record
from artwork import Artwork,ROOT,ASSETS
from audio import Audio
from cache_assets import Preloader
BG=v.BG;PANEL=v.PANEL;GOLD=v.GOLD

def scroller(parent):
 outer=tk.Frame(parent,bg=BG);outer.pack(fill='both',expand=True,padx=18,pady=6)
 canvas=tk.Canvas(outer,bg=BG,highlightthickness=0);bar=ttk.Scrollbar(outer,command=canvas.yview)
 bar.pack(side='right',fill='y');canvas.pack(fill='both',expand=True);canvas.configure(yscrollcommand=bar.set)
 grid=tk.Frame(canvas,bg=BG);canvas.create_window((0,0),window=grid,anchor='nw')
 grid.bind('<Configure>',lambda e:canvas.configure(scrollregion=canvas.bbox('all')))
 def wheel(e):canvas.yview_scroll(int(-e.delta/90),'units')
 canvas.bind('<MouseWheel>',wheel)
 return grid,wheel

class App(tk.Tk):
 def __init__(self):
  super().__init__();self.title('Yu-Gi-Oh: Rogue Duelist');self.configure(bg=BG);self.option_add('*Font','SegoeUI 10')
  from in_game_popup import install_messages
  install_messages(self)
  self.settings=storage.settings();self.geometry(self.settings['resolution']);self.minsize(1024,720);self.attributes('-fullscreen',self.settings['fullscreen'])
  self.cards=game.CARDS;self.byid=game.BY_ID;self.run=game.load_run();self.art=Artwork(self);self.audio=Audio(self.settings)
  self.iconphoto(True,self.art.photo(ROOT/'runtime/textures/AppIcon.png',(64,64)))
  self.preloader=Preloader();self.art.card_bytes=self.preloader.images;self.cheat='';self.screen='loading'
  self._p_hold=False;self._p_timer=None;self._debug_panel=None
  self.bind('<KeyPress>',self.key);self.bind('<KeyRelease>',self.key_up);self.bind('<Escape>',lambda e:self.attributes('-fullscreen',False))
  self.protocol('WM_DELETE_WINDOW',self.close);self.startup_loading()
  from achievement_toasts import poll
  self.after(750,lambda:poll(self))
 def clear(self,title,subtitle=''):
  for w in self.winfo_children():
   if not isinstance(w,tk.Toplevel):w.destroy()
  self.art.label(self,ASSETS/'rogue-duelist-logo.png',(135,54),bg=BG).pack(pady=(4,3));v.label(self,title,25).pack();v.label(self,subtitle,10,'#9bb2c3',wraplength=1100).pack(pady=8)
 def button(self,parent,text,command):
  def action():self.audio.effect('major' if text.casefold() in {'new game','duel','start duel','challenge boss','begin draft'} else 'select');command()
  b=tk.Button(parent,text=text,command=action,bg='#263c50',fg='white',activebackground='#426480',activeforeground='white',relief='flat',padx=15,pady=8,cursor='hand2');b.pack(padx=8,pady=5,fill='x')
  icon=next((key for word,key in [('settings','settings'),('deck','deck'),('duel','duel'),('relic','relics'),('artifact','relics'),('buy','coins'),('shop','shop'),('achievement','achievements'),('tutorial','tutorial')] if word in text.lower()),None)
  if icon:
   b.image=self.art.photo(ASSETS/'ui'/f'{icon}.png',(24,24));b.configure(image=b.image,compound='left')
  return b
 def save(self):
  if self.run:game.save(self.run)
 def key(self,e):
  if self.screen!='title':return
  ch=(e.char or '').lower()
  if ch=='p' and not self._p_hold:
   self._p_hold=True;self._p_timer=self.after(5000,self._unlock_debug)
  self.cheat=(self.cheat+ch)[-18:]
  if self.cheat.endswith('heartofthecards'):
   p=storage.profile();p['unlocked']=list(PLAYABLE_IDS);p['unlock_all']=True;storage.write(storage.ROOT/'profile.json',p)
   self.cheat='';messagebox.showinfo('Testing mode','All duelists unlocked.');self.home()
 def key_up(self,e):
  if (e.char or '').lower()!='p':return
  self._p_hold=False
  if self._p_timer:
   try:self.after_cancel(self._p_timer)
   except tk.TclError:pass
   self._p_timer=None
 def _unlock_debug(self):
  self._p_hold=False;self._p_timer=None
  if self.screen!='title':return
  self.debug_panel()
 def debug_panel(self):
  if self._debug_panel and self._debug_panel.winfo_exists():self._debug_panel.lift();return
  panel=tk.Toplevel(self);panel.title('Debug');panel.configure(bg=BG);panel.resizable(False,False)
  self._debug_panel=panel
  def closed():
   self._debug_panel=None
   try:panel.destroy()
   except tk.TclError:pass
  panel.protocol('WM_DELETE_WINDOW',closed)
  v.label(panel,'DEBUG MENU',14,GOLD).pack(pady=(10,2))
  self.button(panel,'Add money (+1000)',self._dbg_add_money).pack(fill='x')
  self.button(panel,'Win duel',self._dbg_win_duel).pack(fill='x')
  self.button(panel,'Lose duel',self._dbg_lose_duel).pack(fill='x')
  self.button(panel,'Refresh shop',self._dbg_refresh_shop).pack(fill='x')
  v.label(panel,'Add relic',11,GOLD).pack(pady=(8,0))
  self._dbg_relic_var=tk.StringVar(value='')
  self._dbg_relic_menu=tk.OptionMenu(panel,self._dbg_relic_var,'')
  self._dbg_relic_menu.pack(fill='x',padx=8)
  self._dbg_relic_menu.bind('<MouseWheel>',self._dbg_relic_scroll)
  self.button(panel,'Add selected relic',self._dbg_add_relic).pack(fill='x')
  self._dbg_refresh_relics()
 def _dbg_refresh_relics(self):
  if not self._debug_panel or not self._debug_panel.winfo_exists():return
  owned=set((self.run or {}).get('artifacts',[]))
  names=[ARTIFACTS[k][0]+' ('+k+')' for k in ARTIFACTS if k not in owned]
  menu=self._dbg_relic_menu['menu'];menu.delete(0,'end')
  if not names:
   self._dbg_relic_var.set('All relics owned')
  else:
   for label in names:menu.add_command(label=label,command=lambda label=label:self._dbg_relic_var.set(label))
   self._dbg_relic_var.set(names[0])
 def _dbg_relic_scroll(self,e):
  owned=set((self.run or {}).get('artifacts',[]))
  names=[ARTIFACTS[k][0]+' ('+k+')' for k in ARTIFACTS if k not in owned]
  if not names:return
  cur=self._dbg_relic_var.get()
  i=names.index(cur) if cur in names else (0 if e.delta<0 else -1)
  self._dbg_relic_var.set(names[(i+(-1 if e.delta>0 else 1))%len(names)])
 def _dbg_refresh_screen(self):
  if self.screen=='shop' and self.run and self.run.get('stage')=='shop':shop(self)
 def _dbg_add_money(self):
  if not self.run:return messagebox.showinfo('Debug','No saved run.')
  self.run['gold']+=1000;self.save();self._dbg_refresh_screen()
  messagebox.showinfo('Debug',f'+1000 coins. Total: {self.run["gold"]:,}.')
 def _dbg_end_duel(self,won):
  run=self.run
  if not run or run.get('stage')!='duel' or not run.get('duel'):return messagebox.showinfo('Debug','Win/lose needs an active duel.')
  import json as _json
  (game.RUNTIME/'campaign-result.json').write_text(_json.dumps(dict(protocol=1,id=run['duel']['id'],winner=0 if won else 1,lp=max(1,run.get('lp',1)) if won else 0,events=[])),encoding='utf8')
  for attr in ('duel_process','ai_process'):
   proc=getattr(self,attr,None)
   try:
    if proc and proc.poll() is None:proc.terminate()
   except Exception:pass
  messagebox.showinfo('Debug','Victory injected.' if won else 'Defeat injected.')
 def _dbg_win_duel(self):self._dbg_end_duel(True)
 def _dbg_lose_duel(self):self._dbg_end_duel(False)
 def _dbg_refresh_shop(self):
  if not self.run or self.run.get('stage')!='shop':return messagebox.showinfo('Debug','Refresh shop needs an open shop.')
  game.restock(self.run);shop(self);messagebox.showinfo('Debug','Shop restocked.')
 def _dbg_add_relic(self):
  if not self.run:return messagebox.showinfo('Debug','No saved run.')
  label=self._dbg_relic_var.get()
  key=label.rsplit(' (',1)[-1].rstrip(')') if ' (' in label else ''
  if key not in ARTIFACTS:return messagebox.showinfo('Debug','Pick a relic from the dropdown.')
  if key in self.run['artifacts']:return messagebox.showinfo('Debug','Relic already owned.')
  self.run['artifacts'].append(key);self.save();self._dbg_refresh_relics();self._dbg_refresh_screen()
  messagebox.showinfo('Debug',f'Added relic: {ARTIFACTS[key][0]}.')
 def cpu_duels(self):
  from multiplayer.desktop import open_tag
  open_tag(self,mode="cpu")
 def tag_duels(self):
  from multiplayer.desktop import open_tag
  open_tag(self)
 def home(self):
  from content import reload_tuning
  reload_tuning()
  from title_view import TitleScene
  self.screen='title';self.audio.resume();self.audio.music('title')
  for child in self.winfo_children():
   if not isinstance(child,tk.Toplevel):child.destroy()
  self.title_scene=TitleScene(self)
 def startup_loading(self):
  self.screen='loading'
  for child in self.winfo_children():
   if not isinstance(child,tk.Toplevel):child.destroy()
  panel=tk.Frame(self,bg=BG);panel.place(relx=.5,rely=.5,anchor='center',relwidth=.75)
  self.art.label(panel,ASSETS/'rogue-duelist-logo.png',(360,144),bg=BG).pack(pady=15)
  self.loading_wizard=self.art.photo(ASSETS/'time-wizard.png',(140,140))
  tk.Label(panel,image=self.loading_wizard,bg=BG).pack(pady=4)
  v.label(panel,'Loading cards',18).pack(pady=8)
  self.loading_count=v.label(panel,'0 / 0 cards loaded',16,GOLD);self.loading_count.pack(pady=8)
  self.loading_bar=ttk.Progressbar(panel,mode='determinate');self.loading_bar.pack(fill='x',pady=12)
  self.loading_status=v.label(panel,'Preparing artwork…',11,wraplength=700);self.loading_status.pack(pady=8)
  self.loading_retry=self.button(panel,'Retry loading',self.startup_loading);self.loading_retry.pack_forget()
  self.preloader.start();self.after(50,self.cache_tick)
 def cache_tick(self):
  if self.screen!='loading':return
  pre=self.preloader;loaded=pre.completed-len(pre.failed)
  self.loading_count.configure(text=f'{loaded:,} / {pre.total:,} cards loaded')
  self.loading_bar.configure(maximum=max(1,pre.total),value=loaded)
  self.loading_status.configure(text=pre.status)
  if pre.finished:
   if pre.failed or pre.error:
    self.loading_status.configure(text=pre.error or f'{len(pre.failed)} card images could not load. Check your connection and retry.')
    self.loading_retry.pack(padx=8,pady=5,fill='x')
   else:self.after(150,self.home)
  else:self.after(50,self.cache_tick)
 def characters(self):
  self.audio.music('characters')
  from character_view import CharacterSelect
  self.screen='characters'
  for child in self.winfo_children():
   if not isinstance(child,tk.Toplevel):child.destroy()
  self.character_scene=CharacterSelect(self)
 def new_run(self,index,level=0,slot=None):
  if slot is None:
   from run_slots import choose
   return choose(self,lambda chosen:self.new_run(index,level,chosen),new=True)
  candidate=game.new_run(index,level=level);candidate['_save_slot']=slot
  game.save(candidate);storage.select_slot(slot);self.run=candidate
  if CHARACTERS[index].get('copycat') or CHARACTERS[index].get('engine_deck'):return self.routes()
  controller.open_packs(self,self.run['packs'],index,self.draft,pack_ids=self.run.get('pack_ids'))
 def resume(self):
  from run_slots import choose
  def load(slot):
   candidate=game.load_run(slot)
   if not candidate:return messagebox.showerror('Saved run','This slot has no valid saved run.')
   storage.select_slot(slot);self.run=candidate;return controller.resume(self)
  return choose(self,load)
 def draft(self):
  self.audio.music('draft')
  self.screen='draft';v.draft(self)
  footer=tk.Frame(self,bg=BG);footer.pack(fill='x')
  def auto():game.auto_deck(self.run);self.save();self.draft()
  button=self.button(footer,f"Auto-build {__import__('approved_relics').minimum(self.run)} cards",auto);button.pack(side='left')
  if CHARACTERS[self.run['character']].get('copycat') or CHARACTERS[self.run['character']].get('engine_deck'):button.configure(state='disabled')
  boss=(self.run['round']+1)%3==0
  next_button=self.button(footer,'Boss fight!' if boss else 'Choose next opponent',self.routes)
  if boss:next_button.configure(bg='#a52b3b',activebackground='#cb3b4f')
  next_button.pack(side='right')
 def selection(self,event=None):v.selection(self,event)
 def draft_back(self):return shop(self) if self.run['stage']=='shop' else self.characters()
 def launch_duel(self):
  if not self.preloader.finished or self.preloader.failed:
   return messagebox.showinfo('Card artwork is preparing',f'Preparing all opponent and player cards: {self.preloader.completed}/{self.preloader.total}. Please let the first-boot download finish on the title screen. Missing files can be retried there.')
  self.audio.music('champion' if self.run.get('encore_active') else 'boss' if (self.run['round']+1)%3==0 else 'duel');self.apply_native_settings();controller.launch_duel(self)
 def routes(self):
  self.audio.music('draft')
  from opponent_view import OpponentSelect
  self.screen='routes'
  if not self.run.get('routes'):game.routes(self.run)
  for child in self.winfo_children():
   if not isinstance(child,tk.Toplevel):child.destroy()
  self.opponent_scene=OpponentSelect(self)
 def settings_view(self,return_to=None):
  back=return_to or self.home
  self.screen='settings';self.clear('Settings','Display and audio preferences are saved locally.')
  pane=tk.Frame(self,bg=PANEL,padx=50,pady=20);pane.pack(pady=15)
  v.label(pane,'Window resolution',13,GOLD).pack();resolution=tk.StringVar(value=self.settings['resolution'])
  ttk.Combobox(pane,textvariable=resolution,values=['1024x768','1280x720','1280x880','1600x900','1920x1080'],state='readonly').pack(pady=10)
  fullscreen=tk.BooleanVar(value=self.settings['fullscreen']);tk.Checkbutton(pane,text='Fullscreen',variable=fullscreen,bg=PANEL,fg='white',selectcolor=BG).pack()
  music=tk.Scale(pane,from_=0,to=100,orient='horizontal',label='Music volume',length=320,bg=PANEL,fg='white',highlightthickness=0);music.set(self.settings['music']);music.pack(pady=10)
  sound=tk.Scale(pane,from_=0,to=100,orient='horizontal',label='Sound effects volume',length=320,bg=PANEL,fg='white',highlightthickness=0);sound.set(self.settings['sound']);sound.pack(pady=10)
  def preview_music(value):
   self.settings['music']=int(float(value));self.audio.volume();storage.write(storage.ROOT/'settings.json',self.settings)
  def preview_sound(value):
   self.settings['sound']=int(float(value));self.audio.sound_volume();storage.write(storage.ROOT/'settings.json',self.settings)
  music.config(command=preview_music);sound.config(command=preview_sound)
  sound.bind('<ButtonRelease-1>',lambda e:self.audio.effect())
  def apply():
   self.settings.update(resolution=resolution.get(),fullscreen=fullscreen.get(),music=music.get(),sound=sound.get())
   storage.write(storage.ROOT/'settings.json',self.settings);self.geometry(resolution.get());self.attributes('-fullscreen',fullscreen.get());self.audio.stop();self.apply_native_settings();back()
  self.button(pane,'Save settings',apply);self.button(pane,'Back',back)
  def reset_progress():
   if not messagebox.askyesno('Delete all progress?', 'Delete your saved run, achievements, collection unlocks and character unlocks?'):return
   if not messagebox.askyesno('Final confirmation', 'This permanently resets all progress. Are you certain?',default='no'):return
   storage.reset_progress();self.run=None;self.home()
  self.button(pane,'Delete all progress',reset_progress)

 def apply_native_settings(self):
  p=game.RUNTIME/'config/system.conf';p.parent.mkdir(parents=True,exist_ok=True);text=p.read_text(encoding='utf8') if p.exists() else ''
  w,h=self.settings['resolution'].split('x')
  values={'enable_sound':int(self.settings['sound']>0),'enable_music':0,'sound_volume':self.settings['sound'],'music_volume':self.settings['music'],'campaignWidth':w,'campaignHeight':h,'fullscreen':0,'windowStruct':''}
  if self.run:values['nickname']=CHARACTERS[self.run['character']]['name']
  for k,val in values.items():
   if re.search(r'^'+k+r'\s*=',text,re.M):text=re.sub(r'^'+k+r'\s*=.*$',k+' = '+str(val),text,flags=re.M)
   else:text+='\n'+k+' = '+str(val)
  p.write_text(text,encoding='utf8')
  storage.write(game.RUNTIME/'campaign-audio.json',{'sound':self.settings['sound']})
 def coin_scorecard(self):
  from duel_rewards import show
  show(self)
 def gallery_view(self):
  if not storage.profile().get('gallery_unlocked'):return
  self.clear('Gallery','Under construction')
  self.art.label(self,ASSETS/'Meerkat.png',(600,max(200,self.winfo_height()-180)),bg=BG).pack(expand=True)
  self.button(self,'Menu',self.home).pack(pady=10)
 def collection_view(self):
  from collection_view import show
  show(self,'Packs')
 def tutorial_view(self):
  from tutorial_view import show
  show(self)
 def achievements_view(self):
  from achievements import show
  show(self)
 def collection_unlocks(self):
  self.screen='collection';self.clear('Collection unlocks','Early releases are always available. Earn these later additions across runs.');self.button(self,'Back',self.home).pack(side='bottom')
  grid,wheel=scroller(self);profile=storage.profile()
  for n,(kind,key,name,rule) in enumerate(unlocks.entries()):
   opened=unlocks.available(kind,key,profile);box=tk.Frame(grid,bg=PANEL,padx=16,pady=12);box.grid(row=n//3,column=n%3,padx=8,pady=8,sticky='nsew')
   if kind=='pack':self.art.pack(box,key,(100,135),bg=PANEL).pack()
   else:self.art.card(box,game.BY_NAME[key]['id'],(100,135),bg=PANEL).pack()
   v.label(box,name,12,GOLD,wraplength=255).pack();v.label(box,'UNLOCKED' if opened else 'LOCKED',11,'#a3edbc' if opened else '#ec9e94').pack(pady=4)
   v.label(box,rule,10,wraplength=255).pack()
   for w in [box,*box.winfo_children()]:w.bind('<MouseWheel>',wheel)
 def artifact_reference(self):
  self.screen='artifacts';self.clear('Artifacts','Relics owned in your current run.');self.button(self,'Back',self.home).pack(side='bottom')
  grid,wheel=scroller(self);columns=max(2,min(4,(self.winfo_width()-50)//260))
  for i,(a,(name,price,desc)) in enumerate((a,row) for a,row in ARTIFACTS.items() if a in (self.run or {}).get('artifacts',[])):
   box=tk.Frame(grid,bg=PANEL,padx=15,pady=12);box.grid(row=i//columns,column=i%columns,padx=7,pady=7,sticky='nsew')
   c=game.BY_NAME.get(ART_INFO[a]['art'],game.BY_NAME['Sangan']);self.art.card(box,c['id'],(210,105),crop=True,bg=PANEL).pack()
   v.label(box,name,15,GOLD).pack();v.label(box,desc,10,wraplength=220).pack(pady=5)
   for w in [box,*box.winfo_children()]:w.bind('<MouseWheel>',wheel)
 def close(self):
  p=getattr(self,'duel_process',None)
  if p and p.poll() is None:
   if not messagebox.askyesno('Exit','Close the active duel? You can restart it from its pre-duel state.'):return
   p.terminate()
  controller.stop_ai(self)
  if getattr(self,'tag_service',None):self.tag_service.close()
  self.save();self.audio.close();self.destroy()

def shop(self):
 import cursed_relics
 if cursed_relics.pending(self.run):
  from cursed_relic_view import show
  return show(self,lambda:shop(self))
 from shop_view import ShopScene
 self.screen='shop';self.run['route_confirmed']=False;self.audio.music('shop')
 for child in self.winfo_children():
  if not isinstance(child,tk.Toplevel):child.destroy()
 self.shop_message=getattr(self,'shop_message','Find something for your next duel.')
 header=tk.Frame(self,bg='#302732');header.pack(fill='x')
 v.label(header,"SOLOMON'S CARD SHOP",19,GOLD).pack(side='left',padx=22,pady=10)
 v.label(header,f'{self.run["lp"]:,} LP  /  Duel {self.run["round"]+1}/9',11,'#cfbeb0').pack(side='right',padx=12)
 healed=self.run.get('last_boss_heal',0)
 if healed:v.label(self,f'BOSS DEFEATED  /  +{healed} LP recovered  /  Curse lifted',11,'#a3edbc').pack(pady=3)
 bar=tk.Frame(self,bg='#302732');bar.pack(side='bottom',fill='x')
 self.button(bar,'Settings',lambda:self.settings_view(lambda:shop(self))).pack(side='left');self.button(bar,'Coin scorecard',self.coin_scorecard).pack(side='left');self.button(bar,'Save & title',self.home).pack(side='left')
 v.label(bar,f'+{self.run.get("last_gold",0)} earned',10,GOLD).pack(side='left',padx=6)
 from relic_reference import show as show_relics
 self.button(bar,'Relics',lambda:show_relics(self)).pack(side='left')
 self.shop_scene=ShopScene(self)

def waiting(self):
 from native_host import NativeDuelHost
 self.screen='duel';c=CHARACTERS[self.run['opponent']]
 if self.run.get('encore_active'):c=dict(c,name='2004 World Champion')
 for child in self.winfo_children():
  if not isinstance(child,tk.Toplevel):child.destroy()
 bar=tk.Frame(self,bg='#102732');bar.pack(fill='x')
 tk.Label(bar,text=f"Duel {self.run['round']+1} / 9 — {c['name']}",bg='#102732',fg='#f2d697',font=('Segoe UI',11,'bold')).pack(side='left',padx=12)
 tk.Label(bar,text='Heads - you start' if self.run.get('first_player',0)==0 else 'Tails - opponent starts',bg='#102732',fg='#9fd8c9',font=('Segoe UI',10,'bold')).pack(side='left',padx=12)
 tk.Button(bar,text='Concede',command=lambda:controller.concede(self),bg='#462337',fg='white',relief='flat',padx=14).pack(side='right',padx=8,pady=4)
 from relic_reference import show as show_relics
 self.button(bar,'Relics',lambda:show_relics(self)).pack(side='right')
 from relic_reference import show_curses
 self.button(bar,'Curses',lambda:show_curses(self)).pack(side='right')
 from duel_settings import show as show_duel_settings
 self.button(bar,'Settings',lambda:show_duel_settings(self)).pack(side='right')
 self.native_host=NativeDuelHost(self,self.duel_process)

def ending(self):
 self.screen='ending';won=self.run['stage']=='complete';self.audio.music('victory' if won else 'defeat');c=CHARACTERS[self.run['character']]
 self.clear('RUN COMPLETE' if won else 'GAME OVER',f'{c["name"]} | {self.run["round"]} / 9 victories | {self.run["lp"]:,} LP remaining')
 self.button(self,'Return to title',self.home).pack(side='bottom')
 if won and not self.run.get('secret_challenge'):
  import endless
  def champion():
   endless.challenge(game,self.run);self.launch_duel()
  def loop():
   endless.next_loop(game,self.run);shop(self)
  self.button(self,'Begin next loop (+100 enemy ATK/DEF, +2,000 LP)' if self.run.get('encore_won') else 'Optional: challenge the 2004 World Champion',loop if self.run.get('encore_won') else champion).pack(side='bottom')
 if not won and self.run.get('loss'):
  loss=self.run['loss'];pane=tk.Frame(self,bg=PANEL);pane.pack(fill='x')
  if loss.get('card'):self.art.label(pane,ASSETS/'cards'/f"{loss['card']}.jpg",(70,100),bg=PANEL).pack(side='left',padx=15)
  v.label(pane,loss['text'],14,GOLD,wraplength=800).pack(pady=10)
 grid,wheel=scroller(self)
 self.art.label(grid,ASSETS/c['sprite'],(200,210),bg=BG).grid(row=0,column=0,padx=20,pady=12)
 stats=self.run.get('stats',{});elapsed=max(0,int(self.run.get('finished_at',time.time())-self.run.get('started_at',time.time())))
 lines=[f'Run time: {elapsed//60}m {elapsed%60}s',f'Bosses defeated: {stats.get("bosses_defeated",0)} / 3',f'Coins earned: {stats.get("coins_earned",0)} | Spent: {stats.get("coins_spent",0)}',f'Cards purchased: {self.run.get("purchased",0)} | Packs opened: {stats.get("packs_bought",0)}',f'Artifacts collected: {len(self.run["artifacts"])}',f'Monsters summoned: {stats.get("monsters_summoned",0)} | Attacks: {stats.get("attacks_declared",0)}',f'Cards activated: {stats.get("cards_activated",0)} | Damage dealt: {stats.get("damage_dealt",0):,}']
 v.label(grid,'\n'.join(lines),13,GOLD,justify='left').grid(row=0,column=1,columnspan=3,padx=25,pady=12,sticky='w')
 earned=[i for i in self.run.get('unlocks_earned',[]) if i in PLAYABLE_IDS]
 v.label(grid,'UNLOCKED THIS RUN' if earned or self.run.get('content_unlocks_earned') else 'No new unlocks this run',18,GOLD).grid(row=1,column=0,columnspan=4,pady=15)
 for n,index in enumerate(earned):
  box=tk.Frame(grid,bg=PANEL,padx=12,pady=8);box.grid(row=2+n//4,column=n%4,padx=8,pady=8)
  ch=CHARACTERS[index];self.art.label(box,ASSETS/ch['sprite'],(165,140),bg=PANEL).pack();v.label(box,ch['name'],12,GOLD).pack();v.label(box,game.unlock_text(index),10,wraplength=180).pack()

 content_earned=set(self.run.get('content_unlocks_earned',[]))
 row=2+(len(earned)+3)//4
 for kind,key,name,_ in unlocks.entries():
  if f'{kind}:{key}' in content_earned:
   v.label(grid,('Booster unlocked: ' if kind=='pack' else 'Card unlocked: ')+name,12,'#a3edbc').grid(row=row,column=0,columnspan=4,padx=15,pady=6,sticky='w');row+=1

controller.shop=shop;controller.waiting=waiting;controller.ending=ending
