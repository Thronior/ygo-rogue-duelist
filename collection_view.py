"""Scrollable, searchable collection of every card, booster and relic."""
import json
import tkinter as tk
from pathlib import Path
import campaign as g,content,visual_ui as v
from artwork import ASSETS
THUMB_DIR=ASSETS/'cards-thumb';THUMB_SIZE=(96,140)
def _thumb_path(cid):return THUMB_DIR/f'{cid}.jpg'
def _ensure_thumb(cid):
 try:
  src=ASSETS/'cards'/f'{cid}.jpg';dst=_thumb_path(cid)
  if not src.exists():return None
  if dst.exists() and dst.stat().st_mtime>=src.stat().st_mtime:return dst
  THUMB_DIR.mkdir(parents=True,exist_ok=True)
  from PIL import Image,ImageOps
  with Image.open(src) as im:
   im=im.convert('RGB')
   im=ImageOps.contain(im,THUMB_SIZE,Image.Resampling.LANCZOS)
   tmp=dst.with_suffix('.tmp');im.save(tmp,'JPEG',quality=60,optimize=True);tmp.replace(dst)
  return dst
 except Exception:return None
_ERA=None;_ERA_BY_ID=None
def _era_pool():
 global _ERA,_ERA_BY_ID
 if _ERA is None:
  _ERA=json.loads((Path(__file__).parent/'data/era-cards.json').read_text(encoding='utf8'))
  _ERA_BY_ID={c['id']:c for c in _ERA}
 return _ERA
def _era_by_id():
 _era_pool();return _ERA_BY_ID
def _category(c):
 t=c.get('type','')
 if 'Monster' in t:return 0
 if 'Spell' in t:return 1
 if 'Trap' in t:return 2
 return 3
def _subtype(c):
 t=c.get('type','')
 if 'Monster' in t:return t
 return c.get('race','')
CATEGORY_NAMES=['All','Monster','Spell','Trap']
MONSTER_ORDER=['Normal Monster','Effect Monster','Flip Effect Monster','Spirit Monster','Union Effect Monster','Toon Monster','Ritual Monster','Ritual Effect Monster','Fusion Monster']
SPELL_ORDER=['Normal','Quick-Play','Field','Equip','Continuous','Ritual']
TRAP_ORDER=['Normal','Continuous','Counter']
def _subtype_rank(c):
 cat=_category(c);sub=_subtype(c)
 if cat==0:order=MONSTER_ORDER
 elif cat==1:order=SPELL_ORDER
 elif cat==2:order=TRAP_ORDER
 else:return 99
 try:return order.index(sub)
 except ValueError:return len(order)
def _subtypes_for(type_filter,pool=None):
 pool=pool if pool is not None else _era_pool()
 if type_filter=='Monster':names={c['type'] for c in pool if _category(c)==0};order=MONSTER_ORDER
 elif type_filter=='Spell':names={c.get('race','') for c in pool if _category(c)==1};order=SPELL_ORDER
 elif type_filter=='Trap':names={c.get('race','') for c in pool if _category(c)==2};order=TRAP_ORDER
 else:names={_subtype(c) for c in pool};order=None
 names=[n for n in names if n]
 if order is None:return sorted(names)
 return sorted(names,key=lambda n:order.index(n) if n in order else len(order))
_SHELL=None
_CARDS={'key':None,'rows':[],'pending':[],'done':False,'token':0}
def _reset():
 global _SHELL,_CARDS
 _SHELL=None
 _CARDS={'key':None,'rows':[],'pending':[],'done':False,'token':_CARDS.get('token',0)+1}
def _wrap_home(app):
 if getattr(app,'_coll_home_wrapped',False):return
 orig=app.home
 def home():
  _reset()
  return orig()
 app.home=home;app._coll_home_wrapped=True
_EFFECT_SEARCH={}

def _rows_for(pack,type_filter,subtype,query):
 pool=_era_pool()
 if pack:
  ids=set(content.PACK_BY_ID[pack]['common']+content.PACK_BY_ID[pack]['rare'])
  pool=[c for c in pool if c['id'] in ids]
 if type_filter in ('Monster','Spell','Trap'):
  want={'Monster':0,'Spell':1,'Trap':2}[type_filter]
  pool=[c for c in pool if _category(c)==want]
 if subtype!='All':pool=[c for c in pool if _subtype(c)==subtype]
 pool=[c for c in pool if __import__('card_categories').matches(c,_EFFECT_SEARCH) and (not query or query.casefold() in (c['name']+' '+c['desc']).casefold())]
 pool=sorted(pool,key=lambda c:(_category(c),_subtype_rank(c),c['name'].casefold()))
 rows=[(str(c['id']),c['name'],_subtype(c)) for c in pool]

 return rows
def show(app,kind='Packs',query='',page=0,pack=None,type_filter='All',subtype='All'):
 global _SHELL
 _wrap_home(app)
 fresh=app.screen!='collection' or _SHELL is None or not _SHELL.get('stack') or not _SHELL['stack'].winfo_exists()
 if fresh:
  _reset()
  app.screen='collection';app.clear('Collection','Every card, booster and relic')
  bar=tk.Frame(app,bg=v.BG);bar.pack(fill='x',padx=20)
  for tab in ['Cards','Packs','Relics','Run History']:app.button(bar,tab,lambda tab=tab:show(app,tab)).pack(side='left')
  search=tk.Entry(bar);search.pack(side='left',padx=10)
  app.button(bar,'Back to title',app.home).pack(side='right')
  filt=tk.Frame(app,bg=v.BG);filt.pack(fill='x',padx=20)
  count=tk.Frame(app,bg=v.BG);count.pack(fill='x',padx=20)
  status=v.label(count,'');status.pack(side='left',padx=8,pady=4)
  stack=tk.Frame(app,bg=v.BG);stack.pack(fill='both',expand=True)
  cards_holder=tk.Frame(stack,bg=v.BG)
  other_holder=tk.Frame(stack,bg=v.BG)
  from collection_grid import CardViewport
  grid=CardViewport(cards_holder,app,_ensure_thumb,_era_by_id,THUMB_SIZE);grid.pack(fill='both',expand=True,padx=18,pady=6)
  _SHELL={'bar':bar,'search':search,'filt':filt,'count':count,'status':status,'stack':stack,'cards_holder':cards_holder,'other_holder':other_holder,'grid':grid,'wheel':grid.wheel}
  _SHELL['search_btn']=app.button(bar,'Search',lambda:show(app,_SHELL.get('kind','Packs'),_SHELL['search'].get(),0,_SHELL.get('pack'),_SHELL.get('type_filter','All'),_SHELL.get('subtype','All')))
  _SHELL['search'].bind('<Return>',lambda e:show(app,_SHELL.get('kind','Packs'),_SHELL['search'].get(),0,_SHELL.get('pack'),_SHELL.get('type_filter','All'),_SHELL.get('subtype','All')))
 _SHELL['kind']=kind;_SHELL['pack']=pack;_SHELL['type_filter']=type_filter;_SHELL['subtype']=subtype
 search=_SHELL['search']
 if search.get()!=query:
  search.delete(0,tk.END);search.insert(0,query)
 filt=_SHELL['filt']
 for w in filt.winfo_children():w.destroy()
 status=_SHELL['status'];grid=_SHELL['grid'];wheel=_SHELL['wheel']
 cards_holder=_SHELL['cards_holder'];other_holder=_SHELL['other_holder']
 if kind=='Cards':
  other_holder.pack_forget()
  if not cards_holder.winfo_ismapped():cards_holder.pack(fill='both',expand=True)
  subs=['All']+_subtypes_for(type_filter)
  if subtype not in subs:subtype='All';_SHELL['subtype']=subtype
  v.label(filt,'Type:',10).pack(side='left')
  tvar=tk.StringVar(value=type_filter)
  tk.OptionMenu(filt,tvar,*CATEGORY_NAMES,command=lambda val:show(app,kind,search.get(),0,pack,val,'All')).pack(side='left',padx=4)
  v.label(filt,'Subtype:',10).pack(side='left',padx=(12,0))
  svar=tk.StringVar(value=subtype)
  tk.OptionMenu(filt,svar,*subs,command=lambda val:show(app,kind,search.get(),0,pack,type_filter,val)).pack(side='left',padx=4)
  __import__('card_categories').search_button(filt,app,_era_pool(),_EFFECT_SEARCH,lambda:show(app,kind,search.get(),0,pack,type_filter,subtype))
  key=(pack,type_filter,subtype,query)
  rows=_rows_for(pack,type_filter,subtype,query)
  _CARDS['key']=key;_CARDS['rows']=rows;_CARDS['done']=True
  grid.set_rows(rows)
  label=content.PACK_BY_ID[pack]['name']+' · ' if pack else ''
  status.configure(text=f'{label}{len(rows)} entries · scroll to browse' if rows else 'No cards match these filters')
  return
 cards_holder.pack_forget()
 if not other_holder.winfo_ismapped():other_holder.pack(fill='both',expand=True)
 for w in other_holder.winfo_children():w.destroy()
 if kind=='Run History':
  show_history(app,other_holder,query);status.configure(text='Completed and lost runs on this device');return
 if kind=='Packs':rows=[(p['id'],p['name'],'') for p in content.PACKS]
 else:rows=[(key,row[0],'') for key,row in content.ARTIFACTS.items()]
 rows=[r for r in rows if query.casefold() in r[1].casefold()]
 try:status.configure(text=f'{len(rows)} entries · scroll to browse')
 except Exception:pass
 from frontend import scroller
 grid2,wheel2=scroller(other_holder)
 for i,(key,name,sub) in enumerate(rows):
  box=tk.Frame(grid2,bg=v.PANEL,padx=8,pady=8);box.grid(row=i//6,column=i%6,padx=5,pady=5,sticky='nsew')
  if kind=='Packs':art=app.art.pack(box,key,(120,165),bg=v.PANEL);callback=lambda e,key=key:show(app,'Cards','',0,key)
  else:
   art=app.art.card(box,g.BY_NAME[content.ART_INFO[key]['art']]['id'],(120,100),bg=v.PANEL,crop=True);callback=None
   v.label(box,content.ARTIFACTS[key][2],10,wraplength=170).pack(side='bottom')
  art.pack();v.label(box,name,10,wraplength=150).pack()
  if callback:art.bind('<Button-1>',callback);art.configure(cursor='hand2')
  for w in [box,*box.winfo_children()]:w.bind('<MouseWheel>',wheel2)


def show_history(app,parent,query=''):
 import storage
 from datetime import datetime
 from frontend import scroller
 body,wheel=scroller(parent)
 rows=storage.run_history()
 rows=[r for r in rows if query.casefold() in (content.CHARACTERS[r['character']]['name']+' '+r.get('result','')).casefold()]
 if not rows:v.label(body,'No recorded runs yet. Completed and lost runs appear here. Previously deleted runs cannot be reconstructed.',13,wraplength=800).pack(padx=22,pady=25)
 for r in rows:
  c=content.CHARACTERS[r['character']];box=tk.Frame(body,bg=v.PANEL,padx=16,pady=12);box.pack(fill='x',padx=18,pady=7)
  app.art.label(box,ASSETS/c['sprite'],(90,105),bg=v.PANEL).pack(side='left',padx=(0,16))
  text=tk.Frame(box,bg=v.PANEL);text.pack(side='left',fill='both',expand=True)
  v.label(text,c['name']+' · '+('Completed' if r['result']=='complete' else 'Lost'),16,v.GOLD).pack(anchor='w')
  stamp=r.get('finished_at') or r.get('started_at');date=datetime.fromtimestamp(stamp).strftime('%d %b %Y, %H:%M') if stamp else 'Date not recorded'
  mode='Tag with '+content.CHARACTERS[r['partner']]['name'] if r.get('mode')=='tag' and r.get('partner') is not None else 'Solo'
  v.label(text,f"{mode} · LVL {r.get('challenge_level') or 0} · Loop {(r.get('loop') or 0)+1} · {r.get('round') or 0}/9 victories",11).pack(anchor='w',pady=3)
  v.label(text,f"{date} · {r.get('lp') or 0:,} LP · {r.get('gold') or 0:,} coins",11).pack(anchor='w')
  if r.get('loss',{}):v.label(text,r['loss'].get('text',''),11,wraplength=850,justify='left').pack(anchor='w',pady=5)
  details=tk.Frame(text,bg=v.PANEL)
  v.label(details,'Relics: '+', '.join(content.ARTIFACTS.get(a,(a,))[0] for a in r.get('artifacts') or []) or 'None',10,wraplength=850,justify='left').pack(anchor='w')
  for duel in r.get('timeline') or []:v.label(details,f"Duel {duel['duel']}: {content.CHARACTERS[duel['opponent']]['name']} — {'Win' if duel['won'] else 'Loss'} · {duel['lp_after_healing']:,} LP",10).pack(anchor='w')
  def toggle(pane=details):
   if pane.winfo_manager():pane.pack_forget()
   else:pane.pack(fill='x',pady=5)
  app.button(text,'Run details',toggle).pack(anchor='w',pady=5)
  for widget in (box,text,*text.winfo_children()):widget.bind('<MouseWheel>',wheel)
