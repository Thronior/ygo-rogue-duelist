"""Campaign controller; all duel decisions and rules belong to native EDOPro."""
import json, math, os, subprocess, tkinter as tk
from tkinter import messagebox
import campaign as game
import visual_ui as views
from artwork import ROOT, ASSETS
BG=views.BG
PANEL=views.PANEL
GOLD=views.GOLD
NATIVE=game.RUNTIME/'ShadowDuel.exe'

def resume(self):
    if not self.run: return self.home()
    stage=self.run['stage']
    if stage=='shop': return shop(self)
    if stage in ('complete','gameover'): return ending(self)
    if stage=='duel':
        if read_result(self): return
        if getattr(self,'duel_process',None) and self.duel_process.poll() is None: return waiting(self)
        self.run['stage']='draft'; self.save()
    self.draft()

def new_run(self,index):
    if self.run and not messagebox.askyesno('New run','Replace your saved run?'): return
    self.run=game.new_run(index); self.save()
    open_packs(self,self.run['packs'],index,self.draft)

def open_packs(self,packs,index,done,pack_ids=None,auto_reveal=False):
    from content import starting_packs
    from desktop_pack_scene import PackScene
    self.screen='packs';self.audio.music('packs')
    if not packs:return done()
    self.pack_scene=PackScene(self,packs,pack_ids or starting_packs(index),done,auto_reveal)


def launch_duel(self):
    if getattr(self,'duel_process',None) and self.duel_process.poll() is None:
        return messagebox.showinfo('Duel in progress','Finish the open EDOPro duel first.')
    error=game.validate(self.run)
    if error: return messagebox.showinfo('Deck requirements',error)
    if not NATIVE.exists(): return messagebox.showerror('Native client missing','runtime/ShadowDuel.exe is missing. Run tools/build_native.ps1 to rebuild it.')
    try:
        stop_ai(self)
        game.prepare_duel(self.run)
    except (OSError,ValueError) as exc:
        self.run['stage']='draft'; self.save()
        return messagebox.showerror('Could not start duel',str(exc))
    _toss_animation(self,self.run.get('first_player',0),lambda:_spawn_duel(self))
def _toss_animation(app,toss,done):
    try:w,h=app.winfo_width(),app.winfo_height()
    except tk.TclError:w,h=1280,880
    if w<100 or h<100:w,h=1280,880
    cv=tk.Canvas(app,bg='#0a141b',highlightthickness=0)
    cv.place(relx=0,rely=0,relwidth=1,relheight=1)
    cx,cy,r=w/2,h/2-30,70
    coin=cv.create_oval(cx-r,cy-r,cx+r,cy+r,fill='#e8c28a',outline='#8a6d2f',width=4)
    face=cv.create_text(cx,cy,text='?',fill='#30232c',font=('Segoe UI',36,'bold'))
    label=cv.create_text(cx,cy+120,text='TOSSING...',fill='#9fd8c9',font=('Segoe UI',14,'bold'))
    state={'i':0}
    def frame():
     try:
      if not cv.winfo_exists():return
      i=state['i'];state['i']=i+1
      if i<22:
       squeeze=abs(math.cos(i*0.55));squeeze=max(0.12,squeeze)
       cv.coords(coin,cx-r*squeeze,cy-r,cx+r*squeeze,cy+r)
       cv.itemconfigure(face,text='H' if (i//2)%2==0 else 'T')
       app.after(90,frame)
      else:
       word='HEADS' if toss==0 else 'TAILS'
       cv.coords(coin,cx-r,cy-r,cx+r,cy+r)
       cv.itemconfigure(face,text=word[0])
       cv.itemconfigure(label,text=word+' - '+('YOU START' if toss==0 else 'OPPONENT STARTS'))
       app.after(900,finish)
     except tk.TclError:pass
    def finish():
     try:
      if cv.winfo_exists():cv.destroy()
     except tk.TclError:pass
     try:done()
     except tk.TclError:pass
    frame()
def _spawn_duel(self):
    try:
        pending=game.RUNTIME/'ShadowDuel.pending.exe'
        if pending.exists():pending.replace(NATIVE)
        env=os.environ.copy(); env.update(TEMP=str(ROOT/'temp'),TMP=str(ROOT/'temp'))
        from passives import ai_modifiers
        env['SHADOW_RUN_AI_MODIFIERS']=json.dumps(ai_modifiers(self.run))
        ai=ROOT/'runtime/ai/node.exe'
        if ai.exists():
            for name in ('ai-request.json','ai-response.json','ai-ready'):(game.RUNTIME/name).unlink(missing_ok=True)
            self.ai_log=open(ROOT/'temp/shared-ai.log','w',encoding='utf8')
            self.ai_process=subprocess.Popen([str(ai),str(ROOT/'android/native_ai.mjs')],cwd=ROOT,stdout=self.ai_log,stderr=self.ai_log,creationflags=subprocess.CREATE_NO_WINDOW)
            import time
            deadline=time.monotonic()+8
            while not (game.RUNTIME/'ai-ready').exists() and time.monotonic()<deadline:
                if self.ai_process.poll() is not None:raise ValueError('Shared AI failed to start; see temp/shared-ai.log')
                time.sleep(.05)
            if not (game.RUNTIME/'ai-ready').exists():raise ValueError('Shared AI startup timed out.')
            env['SHADOW_RUN_SHARED_AI']='1'
            puzzle=game.RUNTIME/'puzzles/shadow-run.lua'
            puzzle.write_text(puzzle.read_text(encoding='utf8').replace('DUEL_MODE_MR1|DUEL_SIMPLE_AI','DUEL_MODE_MR1'),encoding='utf8')

        with open(ROOT/'temp/duel-client.log','w',encoding='utf-8') as log:
            startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
            self.duel_process=subprocess.Popen([str(NATIVE)],cwd=game.RUNTIME,env=env,stdout=log,stderr=log,startupinfo=startup)
    except (OSError,ValueError) as exc:
        self.run['stage']='draft'; self.save()
        return messagebox.showerror('Could not start duel',str(exc))
    waiting(self); self.after(500,lambda:poll(self))

def waiting(self):
    self.clear('Duel in progress',f'Battle {self.run["round"]+1} / 8 against {game.OPPONENTS[self.run["round"]]}')
    self.art.label(self,ASSETS/f'dm0{self.run["character"]+1}.png',(330,320),bg=BG).pack(pady=18)
    views.label(self,'Your duel opens in the native EDOPro window.',16,GOLD).pack(pady=10)
    views.label(self,'Play cards and choose targets directly on the field.\nYour rewards and shop open automatically when the duel ends.',12).pack(pady=10)
    self.button(self,'Concede duel',lambda:concede(self))

def read_result(self):
    path=game.RUNTIME/'campaign-result.json'
    if not path.exists() or self.run.get('stage')!='duel': return False
    try:
        result=json.loads(path.read_text(encoding='utf-8'))
        if result.get('id')!=self.run['duel']['id']: return False
        game.finish_duel(self.run,result)
    except (ValueError,KeyError,OSError): return False
    stop_ai(self)
    self.deiconify(); self.lift()
    if self.run.get('secret_challenge'):
        if result.get('winner')==0:self.audio.effect('victory');self.after(850,self.home)
        else:self.home()
        return True
    if result.get('winner')==0:
        self.audio.effect('victory');self.after(850,lambda:resume(self))
    else:resume(self)
    if result.get('winner')==0:
        from duel_rewards import show_earned
        self.after(950,lambda:show_earned(self))
    return True

def poll(self):
    if self.run.get('stage')!='duel' or read_result(self): return
    process=getattr(self,'duel_process',None)
    if process and process.poll() is not None:
        stop_ai(self)
        self.run['stage']='draft'; self.save(); self.draft()
        messagebox.showinfo('Duel closed','No finished result was received. Your pre-duel LP and deck are preserved; press Duel to retry. Details: temp/duel-client.log')
        return
    self.after(500,lambda:poll(self))

def concede(self):
    if not messagebox.askyesno('Concede','Concede this duel and end the run?'): return
    process=getattr(self,'duel_process',None)
    if process and process.poll() is None: process.terminate()
    game.finish_duel(self.run,dict(protocol=1,id=self.run['duel']['id'],winner=1,lp=0,events=[]))
    if self.run.get('secret_challenge'):self.home()
    else:ending(self)

def shop(self):
    self.clear('Victory - the traveling merchant',f'{self.run["round"]} / 8 duels won | {self.run["lp"]} LP carried forward | {self.run["gold"]} coins')
    rewards=self.run.get('last_rewards',{})
    views.label(self,'Earned '+str(self.run.get('last_gold',0))+' coins: '+', '.join(f'{k} +{v}' for k,v in rewards.items()),10,GOLD,wraplength=1150).pack(pady=(0,7))
    bar=tk.Frame(self,bg=BG); bar.pack(side='bottom',fill='x',padx=18,pady=10)
    self.button(bar,'Edit deck',self.draft).pack(side='left')
    self.button(bar,'Duel: '+game.OPPONENTS[self.run['round']],self.launch_duel).pack(side='right')
    owned=', '.join(game.ARTIFACTS[a][0] for a in self.run['artifacts']) or 'None yet'
    views.label(bar,'Artifacts: '+owned,10,GOLD,wraplength=500).pack(side='left',padx=15)
    outer=tk.Frame(self,bg=BG); outer.pack(fill='both',expand=True,padx=22)
    canvas=tk.Canvas(outer,bg=BG,highlightthickness=0); scroll=tk.Scrollbar(outer,command=canvas.yview)
    scroll.pack(side='right',fill='y'); canvas.pack(fill='both',expand=True); canvas.config(yscrollcommand=scroll.set)
    grid=tk.Frame(canvas,bg=BG); canvas.create_window((0,0),window=grid,anchor='nw')
    grid.bind('<Configure>',lambda e:canvas.config(scrollregion=canvas.bbox('all')))
    for i,item in enumerate(self.run['shop']):
        box=tk.Frame(grid,bg=PANEL,padx=10,pady=8); box.grid(row=i//6,column=i%6,padx=6,pady=6,sticky='nsew')
        if item['kind']=='single':
            c=self.byid[item['id']]; title=c['name']
            art=self.art.card(box,c['id'],(133,185),bg=PANEL); art.pack()
            art.bind('<Button-1>',lambda e,c=c:views.inspect(self,c))
        elif item['kind']=='pack':
            idx=next(j for j,c in enumerate(game.CHARACTERS) if c['pack']==item['id'])
            title=item['id']; self.art.pack(box,views.PACKS[idx],(133,185),bg=PANEL).pack()
        else:
            idx=list(game.ARTIFACTS).index(item['id'])
            title,_,desc=game.ARTIFACTS[item['id']]
            card=next(c for c in self.cards if c['name']==views.ITEMS[idx][1])
            self.art.card(box,card['id'],(133,95),crop=True,bg=PANEL).pack(pady=8)
            views.label(box,desc,9,wraplength=154).pack()
        views.label(box,title,10,GOLD,wraplength=154).pack(pady=5)
        b=self.button(box,'Sold' if item['sold'] else f'Buy - {item["price"]} coins',lambda i=i:purchase(self,i))
        if item['sold'] or item['price']>self.run['gold']: b.config(state='disabled')
        for w in (box,*box.winfo_children()): w.bind('<MouseWheel>',lambda e:canvas.yview_scroll(int(-e.delta/120),'units'))

def purchase(self,index):
    item=dict(self.run['shop'][index])
    try: obtained=game.buy(self.run,index)
    except ValueError as exc: return messagebox.showinfo('Merchant',str(exc))
    shop(self)
    if item['kind']=='pack':
        idx=next(i for i,c in enumerate(game.CHARACTERS) if c['pack']==item['id'])
        open_packs(self,[obtained],idx,lambda:None)

def ending(self):
    won=self.run['stage']=='complete'
    self.clear('RUN COMPLETE' if won else 'GAME OVER',f'{game.CHARACTERS[self.run["character"]]["name"]} | {self.run["round"]} victories | {self.run["gold"]} coins')
    self.art.label(self,ASSETS/f'dm0{self.run["character"]+1}.png',(440,370),bg=BG).pack(pady=20)
    views.label(self,'You conquered all eight duels.' if won else 'Your journey ends here. A new draft awaits.',18,GOLD).pack(pady=18)
    self.button(self,'Choose a duelist',self.home)

def enhance(cls):
    old_init=cls.__init__; old_draft=cls.draft
    def init(self):
        old_init(self)
        if self.run:
            for k,v in dict(version=2,stage='draft',artifacts=[],history=[],shop=[],duel=None).items(): self.run.setdefault(k,v)
        self.protocol('WM_DELETE_WINDOW',lambda:close(self))
    def draft(self):
        old_draft(self)
        tools=tk.Frame(self,bg=BG); tools.pack(fill='x',padx=20,pady=3)
        def auto(): game.auto_deck(self.run); self.save(); self.draft()
        self.button(tools,'Auto-build 20-card deck',auto).pack(side='left')
        if self.run['stage']=='shop': self.button(tools,'Return to shop',lambda:shop(self)).pack(side='right')
    cls.__init__=init; cls.new_run=new_run; cls.launch_duel=launch_duel; cls.resume=resume; cls.draft=draft
    cls.save=lambda self:game.save(self.run)

def close(self):
    process=getattr(self,'duel_process',None)
    if process and process.poll() is None:
        if not messagebox.askyesno('Exit','Close the active duel? Its unfinished state cannot be resumed; your pre-duel deck and LP will be saved.'): return
        process.terminate()
    if self.run: self.save()
    self.destroy()

def stop_ai(self):
    process=getattr(self,'ai_process',None)
    if process and process.poll() is None:process.terminate()
    log=getattr(self,'ai_log',None)
    if log:log.close()
