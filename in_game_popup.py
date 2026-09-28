"""Owned Tk panels: dialogs stay inside the game instead of opening OS windows."""
import re
import tkinter as tk

class Popup(tk.Frame):
 def __init__(self,owner,modal=True,**kwargs):
  self.root=owner.winfo_toplevel();self.modal=modal;self.previous_grab=self.root.grab_current();self.previous_focus=self.root.focus_get();self.requested=None;self.position=None
  super().__init__(self.root,bg='#122934',highlightbackground='#a7c5ce',highlightthickness=1,**kwargs)
  self.header=tk.Frame(self,bg='#122934');self.header.pack(fill='x')
  self.caption=tk.Label(self.header,text='',bg='#122934',fg='#ffe19a',font=('Segoe UI',13,'bold'));self.caption.pack(side='left',padx=14,pady=8)
  self.close_command=self.destroy
  tk.Button(self.header,text='×',command=lambda:self.close_command(),bg='#234653',fg='white',relief='flat',font=('Segoe UI',15)).pack(side='right',padx=6)
  if not modal:self.header.pack_forget()
  self.place(relx=.5,rely=.5,anchor='center');self.lift()
  self.resize_binding=self.root.bind('<Configure>',lambda e:self._layout() if e.widget is self.root else None,add='+')
  self.bind('<Escape>',self._escape);self.after_idle(self._layout)
  if modal:self.grab_set();self.focus_set()
 def _escape(self,event=None):self.close_command();return 'break'
 def _layout(self):
  if not self.winfo_exists():return
  rw,rh=self.root.winfo_width(),self.root.winfo_height()
  if rw<10 or rh<10:return
  width,height=self.requested or (self.winfo_reqwidth(),self.winfo_reqheight())
  width,height=min(width,max(1,rw-24)),min(height,max(1,rh-24))
  if self.position:
   x,y=self.position;x=max(0,min(x-self.root.winfo_rootx(),rw-width));y=max(0,min(y-self.root.winfo_rooty(),rh-height));self.place(x=x,y=y,relx=0,rely=0,anchor='nw',width=width,height=height)
  else:self.place(relx=.5,rely=.5,anchor='center',width=width,height=height)
  self.lift()
 def title(self,text):self.caption.configure(text=text)
 def geometry(self,value):
  size=re.match(r'^(\d+)x(\d+)',value)
  if size:self.requested=tuple(map(int,size.groups()))
  pos=re.search(r'([+-]\d+)([+-]\d+)$',value)
  if pos and not self.modal:self.position=tuple(map(int,pos.groups()))
  self._layout()
 def transient(self,*args):pass
 def resizable(self,*args):pass
 def overrideredirect(self,*args):pass
 def attributes(self,*args):pass
 def protocol(self,name,callback):
  if name=='WM_DELETE_WINDOW':self.close_command=callback
 def withdraw(self):self.place_forget()
 def deiconify(self):self._layout()
 def destroy(self):
  if not self.winfo_exists():return
  if self.resize_binding:self.root.unbind('<Configure>',self.resize_binding);self.resize_binding=None
  current=self.root.grab_current()
  super().destroy()
  if current is self:
   try:
    if self.previous_grab and self.previous_grab.winfo_exists():self.previous_grab.grab_set()
    if self.previous_focus and self.previous_focus.winfo_exists():self.previous_focus.focus_set()
   except tk.TclError:pass

def install_messages(app):
 from tkinter import messagebox
 def show(title=None,message=None,_icon=None,_type=None,**options):
  popup=Popup(options.get('parent') or app);popup.title(title or 'Yu-Gi-Oh: Rogue Duelist')
  popup.geometry('520x240');result=['cancel' if _type in ('okcancel','yesnocancel','retrycancel') else 'no' if _type=='yesno' else 'ok']
  tk.Label(popup,text=message or '',wraplength=465,justify='left',bg='#122934',fg='white',font=('Segoe UI',12)).pack(expand=True,fill='both',padx=22,pady=15)
  buttons={'yesno':['yes','no'],'yesnocancel':['yes','no','cancel'],'okcancel':['ok','cancel'],'retrycancel':['retry','cancel'],'abortretryignore':['abort','retry','ignore']}.get(_type,['ok'])
  row=tk.Frame(popup,bg='#122934');row.pack(pady=12)
  def choose(value):result[0]=value;popup.destroy()
  for value in buttons:tk.Button(row,text=value.capitalize(),command=lambda value=value:choose(value),bg='#285466',fg='white',padx=20,pady=8).pack(side='left',padx=6)
  app.wait_window(popup);return result[0]
 messagebox._show=show
