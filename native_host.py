"""Host the existing EDOPro HWND inside the desktop campaign window."""
import ctypes,time,tkinter as tk
from ctypes import wintypes as W

U=ctypes.WinDLL('user32',use_last_error=True)
ENUM=ctypes.WINFUNCTYPE(W.BOOL,W.HWND,W.LPARAM)
U.EnumWindows.argtypes=[ENUM,W.LPARAM];U.EnumWindows.restype=W.BOOL
U.GetWindowThreadProcessId.argtypes=[W.HWND,ctypes.POINTER(W.DWORD)]
U.GetClassNameW.argtypes=[W.HWND,W.LPWSTR,ctypes.c_int]
U.GetClientRect.argtypes=[W.HWND,ctypes.POINTER(W.RECT)]
U.GetParent.argtypes=[W.HWND];U.GetParent.restype=W.HWND
U.SetParent.argtypes=[W.HWND,W.HWND];U.SetParent.restype=W.HWND
U.GetWindowLongPtrW.argtypes=[W.HWND,ctypes.c_int];U.GetWindowLongPtrW.restype=ctypes.c_ssize_t
U.SetWindowLongPtrW.argtypes=[W.HWND,ctypes.c_int,ctypes.c_ssize_t];U.SetWindowLongPtrW.restype=ctypes.c_ssize_t
U.SetWindowPos.argtypes=[W.HWND,W.HWND,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_int,W.UINT]
U.SetFocus.argtypes=[W.HWND];U.SetFocus.restype=W.HWND
U.ShowWindow.argtypes=[W.HWND,ctypes.c_int]
U.IsWindow.argtypes=[W.HWND];U.IsWindow.restype=W.BOOL
U.PostMessageW.argtypes=[W.HWND,W.UINT,W.WPARAM,W.LPARAM]

class NativeDuelHost(tk.Frame):
 def __init__(self,app,process):
  super().__init__(app,bg='#07141d',takefocus=True)
  self.app=app;self.portrait_panels=[];self.portrait_cache={}
  self.process=process;self.hwnd=None;self.timer=None;self.started=time.monotonic();self.error=None;self.candidate=None;self.candidate_since=0
  self.pack(fill='both',expand=True)
  self.label=tk.Label(self,text='Loading duel...',bg='#07141d',fg='#f1d293',font=('Segoe UI',18));self.label.place(relx=.5,rely=.5,anchor='center')
  from artwork import ASSETS
  self.wizard=app.art.photo(ASSETS/'time-wizard.png',(200,200));self.label.configure(image=self.wizard,compound='top',padx=12,pady=12)
  self.bind('<Configure>',self.resize);self.bind('<FocusIn>',self.focus_native);self.bind('<Button-1>',self.focus_native)
  self.timer=self.after(30,self.attach)
 def attach(self):
  self.timer=None
  if not self.winfo_exists() or self.process.poll() is not None:return
  candidates=[]
  @ENUM
  def visit(hwnd,param):
   pid=W.DWORD();U.GetWindowThreadProcessId(hwnd,ctypes.byref(pid))
   if pid.value==self.process.pid:
    name=ctypes.create_unicode_buffer(256);U.GetClassNameW(hwnd,name,256)
    rect=W.RECT();U.GetClientRect(hwnd,ctypes.byref(rect))
    if rect.right>=500 and rect.bottom>=300:candidates.append(hwnd)
   return True
  U.EnumWindows(visit,0)
  if not candidates:
   if time.monotonic()-self.started>20:self.label.configure(text='Loading duel...')
   self.timer=self.after(80,self.attach);return
  hwnd=candidates[0]
  if hwnd!=self.candidate:
   self.candidate=hwnd;self.candidate_since=time.monotonic()
  if time.monotonic()-self.candidate_since<1.2:
   self.timer=self.after(100,self.attach);return
  self.debug={'child':hwnd,'parent':self.winfo_id(),'child_valid':bool(U.IsWindow(hwnd)),'parent_valid':bool(U.IsWindow(self.winfo_id()))};style=U.GetWindowLongPtrW(hwnd,-16)
  # A child surface has no independent taskbar button, caption or resizing frame.
  style=(style & ~(0x80000000|0x00C00000|0x00040000|0x00080000|0x00020000|0x00010000))|0x40000000|0x10000000|0x04000000
  U.SetWindowLongPtrW(hwnd,-16,style)
  U.SetWindowLongPtrW(hwnd,-20,U.GetWindowLongPtrW(hwnd,-20)&~0x00040000)
  self.debug['after_style']=bool(U.IsWindow(hwnd))
  ctypes.set_last_error(0);self.debug['previous_parent']=U.SetParent(hwnd,self.winfo_id());self.debug['setparent_error']=ctypes.get_last_error();self.debug['after_parent']=bool(U.IsWindow(hwnd))
  if U.GetParent(hwnd)!=self.winfo_id():
   self.error=ctypes.get_last_error();self.label.configure(text=f'Could not attach EDOPro (Windows error {self.error}).');return
  self.hwnd=hwnd;self.label.destroy();self.resize();U.ShowWindow(hwnd,5);self.create_portraits();self.focus_native()
 def create_portraits(self):
  for enemy,index in enumerate((self.app.run['character'],self.app.run['opponent'])):
   panel=tk.Canvas(self,bg='#07141d',highlightthickness=0,takefocus=False)
   panel.bind('<Button-1>',self.focus_native)
   self.portrait_panels.append((panel,index,bool(enemy)))
  self.position_portraits()
 def position_portraits(self):
  if not self.portrait_panels:return
  from PIL import ImageTk
  from duel_portraits import layout,portrait
  # Query the actual native drawable client, not the enclosing app (toolbar/sidebar).
  rect=W.RECT()
  if self.hwnd and U.IsWindow(self.hwnd) and U.GetClientRect(self.hwnd,ctypes.byref(rect)):
   width,height=rect.right-rect.left,rect.bottom-rect.top
  else:width,height=self.winfo_width(),self.winfo_height()
  boxes=layout(width,height)
  for (panel,index,enemy),(x,y,w,h) in zip(self.portrait_panels,boxes):
   key=(index,w,enemy)
   if getattr(panel,'portrait_key',None)!=key:
    photo=ImageTk.PhotoImage(portrait(index,w,enemy),master=panel)
    panel.photo=photo;panel.portrait_key=key
    panel.delete('all');panel.create_image(0,0,image=photo,anchor='nw')
   panel.place(x=x,y=y,width=w,height=h)
   # Both are child HWNDs; raise only these siblings, never a global topmost window.
   U.SetWindowPos(panel.winfo_id(),0,x,y,w,h,0x0010|0x0040)
 def resize(self,event=None):
  if self.hwnd and U.IsWindow(self.hwnd):
   U.SetWindowPos(self.hwnd,None,0,0,max(1,self.winfo_width()),max(1,self.winfo_height()),0x0004|0x0010|0x0020)
   self.position_portraits()
 def focus_native(self,event=None):
  if self.hwnd and U.IsWindow(self.hwnd):U.SetFocus(self.hwnd)
 def destroy(self):
  if self.timer:
   try:self.after_cancel(self.timer)
   except tk.TclError:pass
  # The native process exits itself on a campaign result. Close any lingering surface.
  if self.hwnd and U.IsWindow(self.hwnd):U.PostMessageW(self.hwnd,0x0010,0,0)
  super().destroy()
