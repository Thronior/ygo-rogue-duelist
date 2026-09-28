from in_game_popup import Popup
"""Artwork-based views; retains the existing draft/save/duel behavior."""
import tkinter as tk
from artwork import Artwork, ASSETS, ROOT

BG='#101923'
PANEL='#1b2b39'
GOLD='#e5c58a'
PACKS=['MFC','LOB','MRD','MRL']
ITEMS=[('Golden Ankh','Monster Reborn','Gain LP and raise the healing cap.'),
       ('Phoenix Feather',"Harpie's Feather Duster",'Recover LP after victories.'),
       ('Merchant Urn','Pot of Greed','Additional victory coins.'),
       ('Millennium Eye','Sangan','An additional opening-hand card.'),
       ('Jade Scarab','Man-Eater Bug','Recover LP when entering a shop.'),
       ('Broken Seal','Spellbinding Circle','Opponents begin with fewer LP.')]

def label(parent,text,size=11,color='white',**kw):
    return tk.Label(parent,text=text,bg=parent.cget('bg'),fg=color,font=('Segoe UI',size),**kw)

def home(self):
    from desktop import CHARACTERS
    self.clear('Choose your duelist','Four booster packs. Two signature cards. Your opening deck.')
    grid=tk.Frame(self,bg=BG); grid.pack(fill='both',expand=True,padx=20)
    for i,(name,pack,signatures) in enumerate(CHARACTERS):
        box=tk.Frame(grid,bg=PANEL,highlightbackground='#3b5162',highlightthickness=1)
        box.grid(row=0,column=i,padx=6,sticky='nsew'); grid.columnconfigure(i,weight=1,uniform='char')
        self.art.label(box,ASSETS/f'dm0{i+1}.png',(224,195),bg=PANEL).pack(pady=(12,4))
        label(box,name,17,GOLD).pack(pady=5)
        row=tk.Frame(box,bg=PANEL); row.pack(pady=5)
        self.art.pack(row,PACKS[i],(53,78),bg=PANEL).pack(side='left',padx=5)
        label(row,'4 packs\n'+pack,10,wraplength=145,justify='left').pack(side='left')
        label(box,'GUARANTEED CARDS',9,'#9eb1c1').pack(pady=(10,4))
        cards=tk.Frame(box,bg=PANEL); cards.pack()
        for namecard in signatures:
            c=next(c for c in self.cards if c['name']==namecard)
            cell=tk.Frame(cards,bg=PANEL); cell.pack(side='left',padx=4)
            art=self.art.card(cell,c['id'],(91,133),bg=PANEL); art.pack()
            art.bind('<Button-1>',lambda e,c=c:inspect(self,c))
            label(cell,namecard,9,wraplength=112).pack(pady=4)
        self.button(box,'Begin draft',lambda i=i:self.new_run(i))
        import campaign
        label(box,'Coin bonuses: '+campaign.CHARACTERS[i]['bonus'],9,'#9eb1c1',wraplength=230).pack(padx=8,pady=4)
    grid.rowconfigure(0,weight=1)
    footer=tk.Frame(self,bg=BG); footer.pack(fill='x',padx=22,pady=10)
    if self.run: self.button(footer,'Continue saved run',getattr(self,'resume',self.draft)).pack(side='left')
    self.button(footer,'Artifact reference',lambda:items(self)).pack(side='right')

def card_text(c):
    stats=f'Level {c["level"]} | ATK {c["atk"]} / DEF {c["defense"]}\n' if c['data']['type'] & 1 else ''
    return f'{c["name"]}\n\n{c["type"]}\n{stats}{c["race"]}\n\n{c["desc"]}'

def badges(parent,c):
    row=tk.Frame(parent,bg=PANEL);row.pack(fill='x',padx=8,pady=5)
    from PIL import Image,ImageTk
    def icon(name):
        path=ASSETS/'icons'/f'{name}.png' if '/' in name else ASSETS/'icons/pixel'/f'{name}.png'
        if not path.exists():return
        with Image.open(path) as source:
            source.thumbnail((20,20));photo=ImageTk.PhotoImage(source,master=row)
        widget=tk.Label(row,image=photo,bg=PANEL);widget.image=photo;widget.pack(side='left',padx=2)
    t=c['data']['type']
    icon('type-'+('spell' if t&2 else 'trap' if t&4 else 'fusion' if t&64 else 'ritual' if t&128 else 'normal' if t&16 else 'effect'))
    if c.get('attribute'):icon('attribute-'+c['attribute'].lower())
    if t&1:
        import card_categories as cc
        race=cc.TYPES.get(''.join(x for x in c.get('race','') if x.isalpha()))
        if race:icon('yugipedia/'+race[:-4])
        icon('../icons/level-star')
    typ=c['data']['type'];color='#d9994e' if typ&1 else '#36b5a0' if typ&2 else '#bd6ca4'
    label(row,'◆ '+('MONSTER' if typ&1 else 'SPELL' if typ&2 else 'TRAP'),10,color).pack(side='left',padx=4)
    if typ&1:
        label(row,str(c['level']),10,GOLD).pack(side='left',padx=4)
        label(row,'● '+c.get('attribute',''),10,'#9ed5ff').pack(side='left',padx=4)

def tooltip(self,widget,c):
    popup=[None];timer=[None]
    def hide(e=None):
        if timer[0]:
            try:self.after_cancel(timer[0])
            except tk.TclError:pass
            timer[0]=None
        if popup[0]:
            try:popup[0].destroy()
            except tk.TclError:pass
            popup[0]=None
    def show():
        if not widget.winfo_exists():return
        w=Popup(self,modal=False);popup[0]=w;w.overrideredirect(True);w.attributes('-topmost',True);w.configure(bg=PANEL)
        badges(w,c);__import__('card_categories').icon_row(w,c);label(w,card_text(c),10,wraplength=340,justify='left').pack(padx=12,pady=10)
        w.update_idletasks();x=min(self.winfo_pointerx()+15,self.winfo_screenwidth()-w.winfo_reqwidth()-10);y=min(self.winfo_pointery()+15,self.winfo_screenheight()-w.winfo_reqheight()-10)
        w.geometry(f'+{max(0,x)}+{max(0,y)}')
    widget.bind('<Enter>',lambda e:timer.__setitem__(0,self.after(250,show)),add='+');widget.bind('<Leave>',hide,add='+');widget.bind('<Destroy>',hide,add='+');widget.bind('<Button-1>',hide,add='+')

def inspect(self,c):
    owner=self.grab_current() or self.winfo_toplevel()
    popup=Popup(owner); popup.transient(owner); popup.title(c['name']); popup.configure(bg=PANEL)
    def close():
        popup.destroy()
        if owner.winfo_exists():
            owner.lift();owner.focus_set()
    popup.protocol('WM_DELETE_WINDOW',close)
    self.art.card(popup,c['id'],(280,410),bg=PANEL).pack(side='left',padx=18,pady=18)
    side=tk.Frame(popup,bg=PANEL);side.pack(side='left',fill='both',expand=True)
    run=getattr(self,'run',None) or {};pool=run.get('pool',[]);owned=pool.count(c['id']);selected=sum(1 for i in run.get('selected',[]) if 0<=i<len(pool) and pool[i]==c['id'])
    label(side,f'Owned: {owned} · In deck: {selected}',11,GOLD).pack(pady=(14,0))
    badges(side,c);__import__('card_categories').icon_row(side,c);label(side,card_text(c),12,wraplength=380,justify='left').pack(padx=18,pady=18)
    tk.Button(side,text='Close',command=close,bg='#285466',fg='white',padx=22,pady=8).pack(pady=(0,18))
    popup.bind('<Escape>',lambda event:close())

def items(self):
    popup=Popup(self); popup.title('Artifact reference'); popup.configure(bg=BG)
    label(popup,'ARTIFACTS',22,GOLD).pack(pady=15)
    label(popup,'Permanent upgrades available from the traveling merchant.',10,'#a5b9c9').pack()
    grid=tk.Frame(popup,bg=BG); grid.pack(padx=16,pady=16)
    for i,(name,card,desc) in enumerate(ITEMS):
        box=tk.Frame(grid,bg=PANEL,padx=15,pady=15); box.grid(row=i//3,column=i%3,padx=6,pady=6,sticky='nsew')
        cid=next(c['id'] for c in self.cards if c['name']==card)
        self.art.card(box,cid,(190,125),crop=True,bg=PANEL).pack()
        label(box,name,14,GOLD).pack(pady=7); label(box,desc,10,wraplength=210).pack()

def draft(self):
    from content import CHARACTERS
    self.clear('Edit your deck' if self.run['stage']=='shop' else 'Build your opening deck','Click to add or remove cards. Hover for artwork and effects. Signature cards are optional.')
    label(self,'Right-click a card to lock its details. Right-click anywhere to unlock.',11,GOLD).pack(pady=(0,4))
    if CHARACTERS[self.run['character']].get('copycat'):label(self,'COPYCAT: Read-only borrowed deck. Choosing an opponent replaces it with their exact deck.',12,GOLD).pack(pady=4)
    if CHARACTERS[self.run['character']].get('engine_deck'):label(self,'DUELING ENGINE: fixed random starter deck, re-dealt every duel. Relics-only shopping.',12,GOLD).pack(pady=4)
    filt=tk.Frame(self,bg=BG);filt.pack(fill='x',padx=24,pady=(0,4))
    self._draft_tab='All';self._draft_tabs={};self._preview_lock=None
    for _tab in ['All','Monster','Spell','Trap','Deck']:
        _btn=tk.Button(filt,text=_tab,command=lambda _tab=_tab:draft_tab(self,_tab),relief='flat',bg='#8a6d2f' if _tab=='All' else '#263c50',fg='white',activebackground='#426480',activeforeground='white',padx=12,pady=4,cursor='hand2')
        _btn.pack(side='left',padx=3);self._draft_tabs[_tab]=_btn
    tk.Label(filt,text='Search:',bg=BG,fg='white',font=('Segoe UI',10)).pack(side='left',padx=(10,0))
    self._draft_query=tk.StringVar(value='')
    tk.Entry(filt,textvariable=self._draft_query,width=22).pack(side='left',padx=6)
    tk.Label(filt,text='Sort:',bg=BG,fg='white',font=('Segoe UI',10)).pack(side='left')
    self._draft_sort=tk.StringVar(value='Default')
    tk.OptionMenu(filt,self._draft_sort,'Default','Name','Type','ATK','DEF','Level','Newest','Oldest',command=lambda _:apply_draft_filter(self)).pack(side='left',padx=4)
    import card_categories as cc
    self._effect_search=getattr(self,'_effect_search',{})
    cc.search_button(filt,self,[self.byid[id] for id in self.run['pool']],self._effect_search,lambda:apply_draft_filter(self))
    self._draft_count=label(filt,'',10,'#9bb2c3');self._draft_count.pack(side='left',padx=8)
    self._draft_query.trace_add('write',lambda *a:apply_draft_filter(self))
    footer=tk.Frame(self,bg=BG); footer.pack(side='bottom',fill='x',padx=22,pady=10)
    self.counter=label(footer,'',12,GOLD); self.counter.pack(side='left')
    tk.Button(footer,text='Deselect all',command=lambda:deselect_all(self),relief='flat',bg='#263c50',fg='white',activebackground='#426480',activeforeground='white',padx=15,pady=8,cursor='hand2').pack(side='left',padx=12)
    self.golden_pick=False
    if 'golden_sleeve' in (self.run.get('artifacts') or []):
     self.golden_btn=tk.Button(footer,text='Name golden card',command=lambda:golden_mode(self),relief='flat',bg='#263c50',fg='white',activebackground='#426480',activeforeground='white',padx=15,pady=8,cursor='hand2');self.golden_btn.pack(side='left',padx=12)
     label(footer,'then click a card.',10,'#9bb2c3').pack(side='left')
    boss=(self.run['round']+1)%3==0
    self.button(footer,'Back',self.draft_back).pack(side='right')
    self.button(footer,'Settings',lambda:self.settings_view(self.draft)).pack(side='right')
    self.button(footer,'Coin scorecard',self.coin_scorecard).pack(side='right')
    body=tk.Frame(self,bg=BG); body.pack(fill='both',expand=True,padx=24)
    right=tk.Frame(body,bg=PANEL,width=330); right.pack(side='right',fill='y',padx=(16,0)); right.pack_propagate(False)
    index=self.run['character']; name=CHARACTERS[index]['name']
    strip=tk.Frame(right,bg=PANEL); strip.pack(fill='x',padx=12,pady=8)
    self.art.label(strip,ASSETS/CHARACTERS[index]['sprite'],(66,66),bg=PANEL).pack(side='left')
    label(strip,f'{name}\n{self.run["lp"]} LP / {self.run["gold"]} coins',11,GOLD,justify='left').pack(side='left',padx=8)
    self.preview=tk.Frame(right,bg=PANEL); self.preview.pack(fill='both',expand=True)
    left=tk.Frame(body,bg=BG); left.pack(side='left',fill='both',expand=True)
    canvas=tk.Canvas(left,bg=BG,highlightthickness=0)
    scrollbar=tk.Scrollbar(left,command=canvas.yview); scrollbar.pack(side='right',fill='y')
    canvas.pack(side='left',fill='both',expand=True); canvas.configure(yscrollcommand=scrollbar.set)
    grid=tk.Frame(canvas,bg=BG); canvas.create_window((0,0),window=grid,anchor='nw')
    self._draft_grid=grid
    grid.bind('<Configure>',lambda e:canvas.configure(scrollregion=canvas.bbox('all')))
    def wheel(e): canvas.yview_scroll(int(-e.delta/120),'units')
    canvas.bind('<MouseWheel>',wheel)
    self.tiles={}
    columns=max(2,min(5,(self.winfo_width()-410)//140))
    self._draft_columns=columns
    for i,cid in enumerate(self.run['pool']):
        c=dict(self.byid[cid]);mod=self.run.get('card_mods',{}).get(str(i))
        if mod:c.update(atk=max(0,c['atk']+mod[0]),defense=max(0,c['defense']+mod[1]),desc='Faulty Printer: modified copy.\n'+c['desc'])
        box=tk.Frame(grid,bg=PANEL,highlightthickness=2,cursor='hand2')
        box.grid(row=i//columns,column=i%columns,padx=5,pady=5)
        art=self.art.card(box,cid,(119,174),bg=PANEL); art.pack(padx=4,pady=(4,0))
        name=label(box,c['name'],9,wraplength=123); name.pack()
        badge=label(box,'',9,GOLD); badge.pack(pady=(0,3))
        self.tiles[i]=(box,badge)
        for widget in (box,art,name,badge):
            widget.bind('<Button-1>',lambda e,i=i:pick_golden(self,i) if getattr(self,'golden_pick',False) else toggle(self,i))
            widget.bind('<Button-3>',lambda e,i=i:lock_preview(self,i))
            widget.bind('<Enter>',lambda e,i=i,c=c:hover_preview(self,i,c))
            widget.bind('<MouseWheel>',wheel)
    self.bind('<Button-3>',lambda e:unlock_preview(self) if self.screen=='draft' else None)
    self.selection(); preview(self,self.byid[self.run['pool'][0]])

def mark_golden(self,i):
    from content import CHARACTERS
    if CHARACTERS[self.run['character']].get('copycat') or CHARACTERS[self.run['character']].get('engine_deck'):return
    if 'golden_sleeve' not in (self.run.get('artifacts') or []):return
    cid=self.run['pool'][i]
    self.run['golden_card']=None if self.run.get('golden_card')==cid else cid
    self.selection()

def lock_preview(self,i):
    from content import CHARACTERS
    if getattr(self,'_preview_lock',None) is not None:
        unlock_preview(self);return 'break'
    if getattr(self,'golden_pick',False):mark_golden(self,i);return 'break'
    self._preview_lock=i
    preview(self,self.byid[self.run['pool'][i]])
    self.selection()
    return 'break'
def unlock_preview(self,e=None):
    if getattr(self,'_preview_lock',None) is None:return
    self._preview_lock=None
    self.selection()
def hover_preview(self,i,c):
    locked=getattr(self,'_preview_lock',None)
    if locked is None:preview(self,c)
    else:preview(self,self.byid[self.run['pool'][locked]])
def deselect_all(self):
    from content import CHARACTERS
    if CHARACTERS[self.run['character']].get('copycat') or CHARACTERS[self.run['character']].get('engine_deck'):return
    self.run['selected']=[]
    self.selection()

def golden_mode(self):
    from content import CHARACTERS
    if CHARACTERS[self.run['character']].get('copycat') or CHARACTERS[self.run['character']].get('engine_deck'):return
    self.golden_pick=not getattr(self,'golden_pick',False)
    btn=getattr(self,'golden_btn',None)
    if btn:btn.configure(text='Click a card\u2026 (cancel)' if self.golden_pick else 'Name golden card',bg='#8a6d2f' if self.golden_pick else '#263c50')
    self.selection()

def pick_golden(self,i):
    from content import CHARACTERS
    if CHARACTERS[self.run['character']].get('copycat') or CHARACTERS[self.run['character']].get('engine_deck'):return
    if 'golden_sleeve' not in (self.run.get('artifacts') or []):return
    cid=self.run['pool'][i]
    self.run['golden_card']=None if self.run.get('golden_card')==cid else cid
    self.golden_pick=False
    btn=getattr(self,'golden_btn',None)
    if btn:btn.configure(text='Name golden card',bg='#263c50')
    self.selection()

def preview(self,c):
    if getattr(self,'preview_id',None)==c['id'] and self.preview.winfo_children(): return
    self.preview_id=c['id']
    for w in self.preview.winfo_children(): w.destroy()
    art=self.art.card(self.preview,c['id'],(215,314),bg=PANEL); art.pack(pady=(4,8))
    art.bind('<Button-1>',lambda e:inspect(self,c))
    badges(self.preview,c)
    __import__('card_categories').icon_row(self.preview,c)
    text=tk.Text(self.preview,bg=PANEL,fg='white',relief='flat',wrap='word',height=8,padx=14,pady=6,font=('Segoe UI',10))
    text.pack(fill='both',expand=True,padx=4,pady=(0,8)); text.insert('1.0',card_text(c)); text.configure(state='disabled')

def draft_tab(self,tab):
    self._draft_tab=tab
    if tab=='Deck' and self._draft_sort.get()=='Default':self._draft_sort.set('Type')
    for name,btn in self._draft_tabs.items():
        btn.configure(bg='#8a6d2f' if name==tab else '#263c50')
    apply_draft_filter(self)
def draft_order(self):
    pool=self.run['pool'];tab=getattr(self,'_draft_tab','All');key=getattr(self,'_draft_sort','Default');key=key.get() if hasattr(key,'get') else key;byid=self.byid
    if tab=='Monster':base=[i for i in range(len(pool)) if byid[pool[i]]['data']['type']&1]
    elif tab=='Spell':base=[i for i in range(len(pool)) if byid[pool[i]]['data']['type']&2]
    elif tab=='Trap':base=[i for i in range(len(pool)) if byid[pool[i]]['data']['type']&4]
    elif tab=='Deck':base=[i for i in self.run.get('selected',[]) if 0<=i<len(pool)]
    else:base=list(range(len(pool)))
    first={};last={}
    for i in base:
        n=byid[pool[i]]['name']
        if n not in first:first[n]=i
        last[n]=i
    def cat(c):
        t=c['data']['type']
        if t&1:return 0
        if t&2:return 1
        if t&4:return 2
        return 3
    def sub(c):
        t=c['data']['type']
        if t&1:return c.get('type','')
        return c.get('race','')
    if key in ('Default','Oldest'):return sorted(base,key=lambda i:(first[byid[pool[i]]['name']],i))
    if key=='Name':return sorted(base,key=lambda i:(byid[pool[i]]['name'].casefold(),pool[i]))
    if key=='Type':return sorted(base,key=lambda i:(cat(byid[pool[i]]),sub(byid[pool[i]]).casefold(),byid[pool[i]]['name'].casefold(),pool[i]))
    if key=='ATK':return sorted(base,key=lambda i:(-(byid[pool[i]].get('atk') or 0),byid[pool[i]]['name'].casefold(),pool[i]))
    if key=='DEF':return sorted(base,key=lambda i:(-(byid[pool[i]].get('defense') or 0),byid[pool[i]]['name'].casefold(),pool[i]))
    if key=='Level':return sorted(base,key=lambda i:(-(byid[pool[i]].get('level') or 0),-(byid[pool[i]].get('atk') or 0),byid[pool[i]]['name'].casefold(),pool[i]))
    if key=='Newest':return sorted(base,key=lambda i:(-last[byid[pool[i]]['name']],i))
    return list(base)
def apply_draft_filter(self):
    if not hasattr(self,'_draft_grid'):return
    q=self._draft_query.get().casefold();n=0;shown=set()
    for i in draft_order(self):
        cid=self.run['pool'][i]
        c=self.byid[cid]
        box=self.tiles[i][0]
        if (not q or q in (c['name']+' '+c['desc']).casefold()) and __import__('card_categories').matches(c,getattr(self,'_effect_search',{})):
            box.grid(row=n//self._draft_columns,column=n%self._draft_columns,padx=5,pady=5);n+=1;shown.add(i)
    for i in range(len(self.run['pool'])):
        if i not in shown:self.tiles[i][0].grid_remove()
    self._draft_count.configure(text=f'{n} cards')
def toggle(self,i):
    from content import CHARACTERS
    if CHARACTERS[self.run['character']].get('copycat') or CHARACTERS[self.run['character']].get('engine_deck'):return
    chosen=set(self.run['selected'])
    if i in chosen: chosen.remove(i)
    else:
        import campaign as game
        key=game.card_identity(self.run['pool'][i])
        if sum(game.card_identity(self.run['pool'][j])==key for j in chosen)>=3:
            self.counter.config(text='Three-copy limit: remove a copy before adding another.')
            return
        if sum(not game.is_extra(self.run['pool'][j]) for j in chosen)>=60 and not game.is_extra(self.run['pool'][i]):return
        if sum(game.is_extra(self.run['pool'][j]) for j in chosen)>=15 and game.is_extra(self.run['pool'][i]):return
        chosen.add(i)
    self.run['selected']=sorted(chosen); self.selection()

def selection(self,event=None):
    selected=set(self.run['selected']); self.run['selected']=sorted(selected)
    chosen=[self.byid[self.run['pool'][i]] for i in selected]
    main=sum(not(c['data']['type'] & 64) for c in chosen)
    self.counter.config(text=f'{main} main / {__import__('approved_relics').minimum(self.run)} minimum | {len(chosen)-main} extra')
    for i,(box,badge) in self.tiles.items():
        if i==getattr(self,'_preview_lock',None):box.configure(highlightbackground='#2f9df0',highlightthickness=3)
        else:box.configure(highlightbackground=GOLD if i in selected else '#334758',highlightthickness=2)
        star=' \u2605' if self.byid[self.run['pool'][i]]['id']==self.run.get('golden_card') else ''
        mis=' \u26a0 MISPRINT' if str(i) in (self.run.get('card_mods') or {}) else ''
        badge.configure(text=(('SIGNATURE / IN DECK' if i<2 else 'IN DECK') if i in selected else 'Click to add')+star+mis)
    self.save()
    if getattr(self,'_draft_tab','All')=='Deck':apply_draft_filter(self)

def enhance(cls):
    original=cls.__init__
    def init(self):
        # Existing constructor calls home; initialize artwork in the home wrapper.
        original(self)
        self.geometry('1280x880'); self.minsize(1200,800)
        self.iconphoto(True,self.art.photo(ROOT/'runtime/textures/AppIcon.png',(64,64)))
    def first_home(self):
        if not hasattr(self,'art'): self.art=Artwork(self)
        home(self)
    cls.__init__=init; cls.home=first_home; cls.draft=draft; cls.selection=selection
