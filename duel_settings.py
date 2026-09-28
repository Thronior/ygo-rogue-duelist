from in_game_popup import Popup
"""Non-destructive settings overlay for an active native duel."""
import tkinter as tk
import storage

def show(app):
 existing=getattr(app,'duel_settings_window',None)
 if existing and existing.winfo_exists():existing.lift();return existing
 win=Popup(app);app.duel_settings_window=win;win.title('Duel settings');win.transient(app);win.configure(bg='#122934');win.resizable(False,False)
 tk.Label(win,text='Duel settings',font=('Segoe UI',20,'bold'),bg='#122934',fg='#ffe19a').pack(padx=30,pady=(20,10))
 sliders={}
 def change(key,value):
  app.settings[key]=int(float(value))
  if key=='music':app.audio.volume()
  else:app.audio.sound_volume()
  storage.write(storage.ROOT/'settings.json',app.settings);app.apply_native_settings()
 for key,label in [('music','Music volume'),('sound','Sound effects volume')]:
  slider=tk.Scale(win,from_=0,to=100,orient='horizontal',label=label,length=340,bg='#122934',fg='white',highlightthickness=0);slider.set(app.settings[key]);slider.configure(command=lambda value,key=key:change(key,value));slider.pack(padx=30,pady=8);sliders[key]=slider
 fullscreen=tk.BooleanVar(value=bool(app.attributes('-fullscreen')))
 def toggle():
  app.settings['fullscreen']=fullscreen.get();app.attributes('-fullscreen',fullscreen.get());storage.write(storage.ROOT/'settings.json',app.settings)
 tk.Checkbutton(win,text='Fullscreen',variable=fullscreen,command=toggle,bg='#122934',fg='white',selectcolor='#234653',activebackground='#122934',activeforeground='white').pack(pady=12)
 def close():
  win.destroy();app.duel_settings_window=None
 tk.Button(win,text='Back to duel',command=close,bg='#234653',fg='white',padx=24,pady=10).pack(pady=(0,20));win.protocol('WM_DELETE_WINDOW',close);win.bind('<Escape>',lambda e:close());win.sliders=sliders;win.fullscreen=fullscreen;win.toggle_fullscreen=toggle;win.close_settings=close
 win.update_idletasks();win.geometry(f'+{app.winfo_rootx()+(app.winfo_width()-win.winfo_reqwidth())//2}+{app.winfo_rooty()+(app.winfo_height()-win.winfo_reqheight())//2}');win.lift();return win
