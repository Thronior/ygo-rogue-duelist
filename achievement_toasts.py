from in_game_popup import Popup
"""Small non-modal completion notices, queued once by campaign progress."""
import tkinter as tk
import storage

def poll(app):
 if not app.winfo_exists():return
 if getattr(app,'screen',None)=='tag':
  app.after(750,lambda:poll(app));return
 p=storage.profile();queue=p.get('achievement_notices',[])
 if queue and not getattr(app,'achievement_toast',None):
  notice=queue.pop(0);storage.write(storage.ROOT/'profile.json',p)
  toast=Popup(app,modal=False);app.achievement_toast=toast;toast.overrideredirect(True);toast.transient(app);toast.attributes('-topmost',True)
  box=tk.Frame(toast,bg='#162f35',highlightbackground='#d9b967',highlightthickness=2,padx=18,pady=12);box.pack(fill='both',expand=True)
  tk.Label(box,text='ACHIEVEMENT COMPLETE',bg='#162f35',fg='#f0ca79',font=('Segoe UI',10,'bold')).pack(anchor='w')
  tk.Label(box,text=notice['name'],bg='#162f35',fg='white',font=('Segoe UI',15,'bold'),wraplength=300).pack(anchor='w')
  tk.Label(box,text=notice['reward'],bg='#162f35',fg='#acd7ca',font=('Segoe UI',10)).pack(anchor='w')
  toast.update_idletasks();toast.geometry(f"+{app.winfo_rootx()+max(0,app.winfo_width()-toast.winfo_reqwidth()-24)}+{app.winfo_rooty()+24}")
  def dismiss():
   if toast.winfo_exists():toast.destroy()
   app.achievement_toast=None
  toast.bind('<Button-1>',lambda e:dismiss());app.after(4500,dismiss)
 app.after(750,lambda:poll(app))
