from in_game_popup import Popup
"""Owned relics, shown without leaving the current duel or shop."""
import tkinter as tk
from content import ARTIFACTS,ART_INFO
import campaign as game
import visual_ui as v

def show(app):
 popup=Popup(app);popup.title('Your relics');popup.geometry('760x560');popup.configure(bg=v.BG)
 v.label(popup,'PERMANENT RUN RELICS',20,v.GOLD).pack(pady=12)
 sealed='relic_seal' in (app.run or {}).get('curses',[])
 v.label(popup,'NEGATED THIS DUEL — Relic Seal' if sealed else 'Owned effects apply when their stated conditions are met.',11,'#ffb3b3' if sealed else v.GOLD).pack(pady=5)
 outer=tk.Frame(popup,bg=v.BG);outer.pack(fill='both',expand=True)
 canvas=tk.Canvas(outer,bg=v.BG,highlightthickness=0);bar=tk.Scrollbar(outer,command=canvas.yview)
 canvas.configure(yscrollcommand=bar.set);bar.pack(side='right',fill='y');canvas.pack(fill='both',expand=True)
 body=tk.Frame(canvas,bg=v.BG);window=canvas.create_window(0,0,window=body,anchor='nw')
 body.bind('<Configure>',lambda e:canvas.configure(scrollregion=canvas.bbox('all')))
 canvas.bind('<Configure>',lambda e:canvas.itemconfigure(window,width=e.width))
 owned=(app.run or {}).get('artifacts',[])
 if not owned:v.label(body,'No relics owned yet.',14).pack(pady=30)
 for key in owned:
  name,_,desc=ARTIFACTS[key]
  if key=='magic_mirror' and app.run.get('mirror_copy'):desc+=' Current copy: '+ARTIFACTS[app.run['mirror_copy']][0]+'.'
  row=tk.Frame(body,bg=v.PANEL,padx=12,pady=12);row.pack(fill='x',padx=15,pady=5)
  card=game.BY_NAME.get(ART_INFO[key]['art'],game.BY_NAME['Sangan'])
  app.art.card(row,card['id'],(85,100),bg=v.PANEL).pack(side='left',padx=(0,15))
  v.label(row,name,15,v.GOLD).pack(anchor='w');v.label(row,desc,12,wraplength=540,justify='left').pack(anchor='w',pady=8)
 app.button(popup,'Close',popup.destroy).pack(pady=8)
 return popup

def show_curses(app):
 import challenge_levels
 popup=Popup(app);popup.title('This duel: curses & difficulty');popup.geometry('620x520');popup.configure(bg=v.BG)
 v.label(popup,'THIS DUEL: CURSES & DIFFICULTY',18,v.GOLD).pack(pady=12)
 outer=tk.Frame(popup,bg=v.BG);outer.pack(fill='both',expand=True)
 canvas=tk.Canvas(outer,bg=v.BG,highlightthickness=0);bar=tk.Scrollbar(outer,command=canvas.yview)
 canvas.configure(yscrollcommand=bar.set);bar.pack(side='right',fill='y');canvas.pack(fill='both',expand=True)
 body=tk.Frame(canvas,bg=v.BG);window=canvas.create_window(0,0,window=body,anchor='nw')
 body.bind('<Configure>',lambda e:canvas.configure(scrollregion=canvas.bbox('all')))
 canvas.bind('<Configure>',lambda e:canvas.itemconfigure(window,width=e.width))
 rows=challenge_levels.active_modifiers(app.run or {})
 if not rows:v.label(body,'No active curses or LVL modifiers.',13).pack(pady=20)
 for item in rows:
  row=tk.Frame(body,bg=v.PANEL,padx=12,pady=8);row.pack(fill='x',padx=12,pady=4)
  v.label(row,item['name'],14,v.GOLD).pack(anchor='w')
  v.label(row,item['description'],11,wraplength=530,justify='left').pack(anchor='w',pady=4)
 app.button(popup,'Close',popup.destroy).pack(pady=8)
 return popup
