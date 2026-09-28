"""Achievement ledger backed by the same persistent metrics that unlock rewards."""
import tkinter as tk
from tkinter import ttk
import campaign as game,storage,unlocks,visual_ui as v
from content import CHARACTERS,PLAYABLE_IDS

from achievement_model import entries

def show(app,filter_name='All'):
 from frontend import scroller
 app.screen='achievements';rows=entries();done=sum(r['done'] for r in rows)
 app.clear('Achievements',f'{done} / {len(rows)} completed  •  Progress is saved across runs')
 app.button(app,'Back to title',app.home).pack(side='bottom')
 filters=tk.Frame(app,bg=v.BG);filters.pack()
 for name in ['All','Completed','In progress']:
  button=app.button(filters,name,lambda name=name:show(app,name));button.pack(side='left')
  if name==filter_name:button.configure(bg='#516b55')
 grid,wheel=scroller(app);style=ttk.Style(app);style.configure('Achievement.Horizontal.TProgressbar',background='#d9bd73',troughcolor='#30424a')
 selected=[r for r in rows if filter_name=='All' or r['done']==(filter_name=='Completed')]
 app.achievement_rows=selected
 if not selected:v.label(grid,'No achievements in this category yet.',15,v.GOLD).pack(pady=30)
 for n,r in enumerate(selected):
  box=tk.Frame(grid,bg=('#193e32' if r['done'] else v.PANEL),padx=18,pady=14,highlightbackground='#648b69' if r['done'] else '#3e535f',highlightthickness=1);box.grid(row=n//3,column=n%3,sticky='nsew',padx=8,pady=8)
  from artwork import ASSETS
  app.art.label(box,ASSETS/r['image'],(90,90),bg=v.PANEL).pack(anchor='w')
  v.label(box,'COMPLETED' if r['done'] else 'IN PROGRESS',10,'#a1dcad' if r['done'] else '#dbb973').pack(anchor='w')
  v.label(box,r['name'],14,v.GOLD,wraplength=260,justify='left').pack(anchor='w',pady=5)
  v.label(box,r['reward'],10,'#9fb9bd').pack(anchor='w')
  v.label(box,r['description'],10,wraplength=260,justify='left').pack(anchor='w',pady=6)
  ttk.Progressbar(box,style='Achievement.Horizontal.TProgressbar',maximum=r['target'],value=r['target'] if r['done'] else min(r['value'],r['target']),length=255).pack(fill='x',pady=6)
  progress='Completed via an alternative requirement' if r['done'] and r['value']<r['target'] else f'{min(r["value"],r["target"]):,} / {r["target"]:,}'
  v.label(box,progress+('  •  Across all runs' if r['cumulative'] else ''),9,'#bdccc9',wraplength=260).pack(anchor='w')
  if r['testing']:v.label(box,'Reward available through testing unlock',9,'#9eb1c1',wraplength=260).pack(anchor='w')
  for w in [box,*box.winfo_children()]:w.bind('<MouseWheel>',wheel)
