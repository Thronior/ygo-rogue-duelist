"""Shared indexed card categories and compact in-game icon picker."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
GENRES=json.loads((ROOT/'data/card-genres.json').read_text(encoding='utf8'))
INDEX=json.loads((ROOT/'data/card-genre-index.json').read_text(encoding='utf8'))
TYPES=json.loads((ROOT/'assets/icons/yugipedia/manifest.json').read_text(encoding='utf8'))['types']
def categories(c):return [g for g in GENRES if g['id'] in INDEX.get(str(c['id']),[])]
def matches(c,state):
 state=state or {};words=state.get('q','').casefold().split();text=(c['name']+' '+c['desc']).casefold()
 if not all(word in text for word in words):return False
 if state.get('race') and c['race']!=state['race']:return False
 if state.get('attribute') and c['attribute']!=state['attribute']:return False
 if state.get('level') and (not c['data']['type']&1 or str(c['level'])!=state['level']):return False
 chosen=state.get('effects',[]);tags=INDEX.get(str(c['id']),[])
 return not chosen or (all(x in tags for x in chosen) if state.get('all') else any(x in tags for x in chosen))
def photo(path,parent,size=22):
 from PIL import Image,ImageTk
 with Image.open(path) as im:
  im=im.convert('RGBA');im.thumbnail((size,size));return ImageTk.PhotoImage(im,master=parent)
def tip(widget,text):
 import tkinter as tk
 from in_game_popup import Popup
 box=[None];timer=[None]
 def hide(e=None):
  if timer[0]:widget.after_cancel(timer[0]);timer[0]=None
  if box[0]:box[0].destroy();box[0]=None
 def show():
  p=Popup(widget.winfo_toplevel(),modal=False);p.overrideredirect(True);tk.Label(p,text=text,bg='#183642',fg='white',padx=6,pady=4).pack();p.geometry(f'+{widget.winfo_pointerx()+8}+{widget.winfo_pointery()+12}');box[0]=p
 widget.bind('<Enter>',lambda e:timer.__setitem__(0,widget.after(400,show)),add='+');widget.bind('<Leave>',hide,add='+');widget.bind('<Destroy>',hide,add='+')
def icon_row(parent,c):
 import tkinter as tk
 tags=categories(c)
 if not tags:return
 f=tk.Frame(parent,bg=parent.cget('bg'));f.pack(fill='x',padx=10,pady=4)
 for i,g in enumerate(tags):
  im=photo(ROOT/'assets/icons/yugipedia'/g['icon'],f);b=tk.Label(f,image=im,bg=f.cget('bg'));b.image=im;b.grid(row=i//10,column=i%10,padx=2,pady=2);tip(b,g['name'])
def search_button(parent,app,cards,state,apply):
 import tkinter as tk
 im=photo(ROOT/'assets/icons/yugipedia/genres-search-deck.png',parent)
 b=tk.Button(parent,image=im,command=lambda:open_search(app,cards,state,apply),bg='#183642',activebackground='#365a67',padx=6,pady=4);b.image=im;b.pack(side='left',padx=5);tip(b,'Search card text and effects');return b
def open_search(app,cards,state,apply):
 import tkinter as tk
 from tkinter import ttk
 from in_game_popup import Popup
 p=Popup(app);p.title('Card search');p.configure(bg='#122b35');p.geometry('510x440')
 form=tk.Frame(p,bg='#122b35');form.pack(fill='x',padx=10,pady=8)
 q=tk.StringVar(value=state.get('q',''));entry=tk.Entry(form,textvariable=q);entry.pack(fill='x');entry.focus_set()
 fields=tk.Frame(form,bg='#122b35');fields.pack(fill='x',pady=6);vars={}
 for key,values in [('race',sorted({c['race'] for c in cards if c['data']['type']&1})),('attribute',['EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE']),('level',[str(i) for i in range(1,13)])]:
  var=tk.StringVar(value=state.get(key,''));vars[key]=var;combo=ttk.Combobox(fields,textvariable=var,values=['']+values,state='readonly',width=12);combo.pack(side='left',padx=2);tip(combo,key.title())
 mode=tk.StringVar(value='All selected' if state.get('all') else 'Any selected');ttk.Combobox(fields,textvariable=mode,values=['Any selected','All selected'],state='readonly',width=12).pack(side='left')
 bottom=tk.Frame(p,bg='#122b35');bottom.pack(side='bottom',fill='x',padx=10,pady=8)
 holder=tk.Frame(p,bg='#122b35');holder.pack(fill='both',expand=True,padx=10);canvas=tk.Canvas(holder,bg='#122b35',highlightthickness=0);scroll=tk.Scrollbar(holder,command=canvas.yview);scroll.pack(side='right',fill='y');canvas.pack(fill='both',expand=True);canvas.configure(yscrollcommand=scroll.set);grid=tk.Frame(canvas,bg='#122b35');canvas.create_window((0,0),window=grid,anchor='nw');grid.bind('<Configure>',lambda e:canvas.configure(scrollregion=canvas.bbox('all')))
 selected=set(state.get('effects',[]));buttons={};count=tk.Label(bottom,bg='#122b35',fg='white');count.pack(side='left')
 def current():return dict(q=q.get(),**{k:v.get() for k,v in vars.items()},effects=list(selected),all=mode.get()=='All selected')
 def refresh(*a):
  count.configure(text=f'{sum(matches(c,current()) for c in cards)} cards')
  for id,b in buttons.items():b.configure(bg='#86672c' if id in selected else '#183642',relief='sunken' if id in selected else 'flat')
 def toggle(id):
  if id in selected:selected.remove(id)
  else:selected.add(id)
  refresh()
 for i,g in enumerate(GENRES):
  im=photo(ROOT/'assets/icons/yugipedia'/g['icon'],grid,26);b=tk.Button(grid,image=im,width=40,height=40,command=lambda id=g['id']:toggle(id));b.image=im;b.grid(row=i//9,column=i%9,padx=3,pady=3);buttons[g['id']]=b;tip(b,g['name']);b.bind('<MouseWheel>',lambda e:canvas.yview_scroll(int(-e.delta/120),'units'))
 def done():state.clear();state.update(current());p.destroy();apply()
 def reset():
  selected.clear();q.set('');mode.set('Any selected')
  for v in vars.values():v.set('')
  refresh()
 tk.Button(bottom,text='Apply',command=done).pack(side='right');tk.Button(bottom,text='Reset',command=reset).pack(side='right',padx=8)
 for v in [q,mode,*vars.values()]:v.trace_add('write',refresh)
 p.bind('<Escape>',lambda e:p.destroy());refresh()
