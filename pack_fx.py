"""Lightweight native pack effects, without stealing mouse or keyboard focus."""
import tkinter as tk
import ctypes,math,time
from pathlib import Path
from PIL import Image,ImageTk

def sparkle(canvas,x,y,alive,app):
 ids=[canvas.create_text(x+dx,y+dy,text='✦',fill='#ecffff',font=('Segoe UI',size),tags='ultra-sparkle') for dx,dy,size in [(-39,-35,18),(39,20,13),(0,58,10)]]
 border=canvas.create_rectangle(x-64,y-89,x+64,y+114,outline='#b9a4ff',width=3)
 def tick(n=0):
  if not alive():return
  value=(math.sin(n*.35)+1)/2
  color=f'#{int(155+100*value):02x}{int(175+75*value):02x}ff'
  canvas.itemconfigure(border,outline=color)
  for i,item in enumerate(ids):canvas.itemconfigure(item,fill=color,state='normal' if (n+i*4)%20<14 else 'hidden')
  app.after(100,lambda:tick(n+1))
 tick()

def money_rain(app,alive):
 # Color-keyed owned tool window with WS_EX_TRANSPARENT and NOACTIVATE.
 # It covers the complete game area while clicks still reach the game beneath.
 win=tk.Toplevel(app);win.withdraw();win.overrideredirect(True);win.transient(app)
 key='#010203';win.configure(bg=key);win.attributes('-transparentcolor',key)
 canvas=tk.Canvas(win,bg=key,highlightthickness=0);canvas.pack(fill='both',expand=True)
 gif=Image.open(Path(__file__).parent/'assets/effects/money-rain.gif');started=time.monotonic();image=canvas.create_image(0,0,anchor='nw')
 win.update_idletasks();win.deiconify();win.update_idletasks()
 user=ctypes.windll.user32;hwnd=user.GetParent(win.winfo_id());style=user.GetWindowLongW(hwnd,-20);user.SetWindowLongW(hwnd,-20,style|0x20|0x08000000|0x80)
 def frame():
  elapsed=time.monotonic()-started
  if not alive() or elapsed>=9:
   gif.close();win.destroy();return
  width,height=max(1,app.winfo_width()),max(1,app.winfo_height())
  win.geometry(f'{width}x{height}+{app.winfo_rootx()}+{app.winfo_rooty()}')
  gif.seek(int(elapsed/.03)%gif.n_frames)
  rgba=gif.convert('RGBA').resize((width,height),Image.Resampling.BILINEAR)
  background=Image.new('RGB',(width,height),key);background.paste(rgba,mask=rgba.getchannel('A'))
  canvas.photo=ImageTk.PhotoImage(background,master=canvas);canvas.itemconfigure(image,image=canvas.photo)
  app.after(75,frame)
 frame()
