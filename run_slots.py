"""Three portrait tiles over the character picker; saves remain independent."""
import tkinter as tk
from datetime import datetime
from PIL import Image,ImageDraw,ImageOps,ImageTk
import storage
from content import CHARACTERS
from artwork import ASSETS
from in_game_popup import Popup
import visual_ui as v

def choose(app,callback,new=False):
 app.save()
 if getattr(app,'screen',None)!='characters':app.characters()
 popup=Popup(app);popup.title('Choose a slot for your new run' if new else 'Continue a saved run');popup.configure(bg=v.BG);popup.geometry('720x445')
 tiles=tk.Frame(popup,bg=v.BG);tiles.pack(expand=True);popup.photos=[];popup.slot_tiles=[]
 def pick(row):
  if not new and not row['run']:return
  if new and row['occupied']:
   confirm=Popup(popup);confirm.title('Replace saved run?');confirm.configure(bg=v.BG);confirm.geometry('430x200')
   v.label(confirm,f"Replace slot {row['slot']}? This erases only that run.",12,wraplength=380).pack(pady=25)
   def replace():confirm.destroy();popup.destroy();callback(row['slot'])
   app.button(confirm,'Replace this run',replace).pack(side='left',padx=18,pady=15)
   app.button(confirm,'Cancel',confirm.destroy).pack(side='right',padx=18,pady=15)
   return
  popup.destroy();callback(row['slot'])
 for row in storage.run_slots():
  run=row['run'];character=CHARACTERS[run['character']] if run else None
  tile=tk.Canvas(tiles,width=192,height=300,bg=v.BG,highlightthickness=0,cursor='hand2' if new or run else 'arrow');tile.pack(side='left',padx=10);popup.slot_tiles.append(tile)
  tile.create_text(96,12,text=f"Slot {row['slot']}",fill='#c5d6df',font=('Segoe UI',11))
  art=Image.new('RGBA',(164,164));draw=ImageDraw.Draw(art);draw.rounded_rectangle((1,1,162,162),radius=20,fill='#17343f',outline='#83a6b2',width=2)
  if character:
   with Image.open(ASSETS/character['sprite']) as source:
    portrait=ImageOps.contain(source.convert('RGBA'),(152,152),Image.Resampling.LANCZOS);art.alpha_composite(portrait,((164-portrait.width)//2,(164-portrait.height)//2))
   mask=Image.new('L',(164,164));ImageDraw.Draw(mask).rounded_rectangle((1,1,162,162),radius=20,fill=255);art.putalpha(mask)
  photo=ImageTk.PhotoImage(art,master=tile);popup.photos.append(photo);tile.create_image(96,110,image=photo)
  caption=f"Loop {(run.get('loop') or 0)+1} · Duel {min(9,(run.get('round') or 0)+1)}/9" if run else 'Empty'
  tile.create_text(96,207,text=caption,fill=v.GOLD if run else '#a1bac6',font=('Segoe UI',11))
  if run:
   stamp=run.get('last_played_at');last=datetime.fromtimestamp(stamp).strftime('%d %b, %H:%M') if stamp else 'Not recorded'
   tile.create_text(96,231,text=f"{run.get('lp',0):,} LP",fill='white',font=('Segoe UI',11))
   tile.create_text(96,251,text='Last played: '+last,fill='#a1bac6',font=('Segoe UI',9))
  tile.create_text(96,280,text=('Replace saved run' if new else 'Resume run') if run else ('Start here' if new else 'Empty'),fill=v.GOLD,font=('Segoe UI',11,'bold'))
  tile.bind('<Button-1>',lambda e,row=row:pick(row));tile.bind('<Return>',lambda e,row=row:pick(row));tile.configure(takefocus=bool(new or run))
 app.button(popup,'Cancel',popup.destroy).pack(pady=8)
 return popup
