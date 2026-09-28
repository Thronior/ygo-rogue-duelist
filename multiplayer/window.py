"""Embed the isolated Chromium tag client as a child of the main Tk window."""
import ctypes,time,tkinter as tk
from ctypes import wintypes as W
from tkinter import ttk
from native_host import U,ENUM
from artwork import ASSETS
from PIL import Image,ImageTk

U.GetFocus.argtypes=[];U.GetFocus.restype=W.HWND
U.GetForegroundWindow.argtypes=[];U.GetForegroundWindow.restype=W.HWND
U.GetAncestor.argtypes=[W.HWND,W.UINT];U.GetAncestor.restype=W.HWND
U.IsChild.argtypes=[W.HWND,W.HWND];U.IsChild.restype=W.BOOL
U.IsWindowVisible.argtypes=[W.HWND];U.IsWindowVisible.restype=W.BOOL
U.EnumChildWindows.argtypes=[W.HWND,ENUM,W.LPARAM];U.EnumChildWindows.restype=W.BOOL

class TagWindow(tk.Frame):
 def __init__(self,app,service):
  super().__init__(app,bg='#07141d',takefocus=True)
  self.app=app;self.service=service;self.hwnd=None;self.timer=None;self.started=time.monotonic();self.closed=False
  self.pack(fill='both',expand=True)
  self.exit_height=34
  # Clip Chromium's client-drawn title bar outside the game viewport.
  self.viewport=tk.Frame(self,bg='#07141d')
  self.viewport.place(x=0,y=self.exit_height,relwidth=1,relheight=1,height=-self.exit_height)
  self.exit_bar=tk.Frame(self,bg='#07141d',height=self.exit_height)
  self.exit_bar.place(x=0,y=0,relwidth=1,height=self.exit_height)
  tk.Button(self.exit_bar,text='Exit to main menu',command=self.leave).pack(side='right',padx=6,pady=2)
  with Image.open(ASSETS/'time-wizard.png') as source:
   wizard=source.convert('RGBA');wizard.thumbnail((160,160),Image.Resampling.LANCZOS)
   self.wizard=ImageTk.PhotoImage(wizard,master=self)
  self.loading=tk.Label(self,text='Loading CPU Duel...' if service.mode=='cpu' else 'Loading Tag Duels...',image=self.wizard,compound='top',bg='#07141d',fg='#f1d293',font=('Segoe UI',20),pady=12);self.loading.place(relx=.5,rely=.45,anchor='center')
  self.progress=ttk.Progressbar(self,mode='indeterminate');self.progress.place(relx=.5,rely=.7,relwidth=.45,anchor='center');self.progress.start(20)
  self.back=tk.Button(self,text='Exit',command=self.leave);self.back.place(relx=.5,rely=.8,anchor='center')
  self.bind('<Configure>',self.resize)
  try:self.process=service.launch(embedded=True)
  except Exception as error:self.loading.configure(text=str(error));return
  self.timer=self.after(40,self.poll)
 def poll(self):
  self.timer=None
  if self.closed:return
  if self.service.exit_requested:return self.leave()
  if self.hwnd:
   if not U.IsWindow(self.hwnd):return self.leave()
   # Tk can reclaim focus after startup or when the game is reactivated.
   # Repair only our own foreground window, never another app or the duel.
   # Mouse input focuses the page naturally; never synchronously force cross-process focus.
   rect=W.RECT();U.GetClientRect(self.hwnd,ctypes.byref(rect))
   if abs(rect.right-self.winfo_width())>1 or abs(rect.bottom-self.service.browser_chrome-(self.winfo_height()-self.exit_height))>1:self.resize()
  else:
   U.GetWindowTextW.argtypes=[W.HWND,W.LPWSTR,ctypes.c_int]
   expected='YGO Rogue Tag '+self.service.token[:12]
   @ENUM
   def find(hwnd,_):
    text=ctypes.create_unicode_buffer(256);U.GetWindowTextW(hwnd,text,256)
    if text.value in (expected,expected+' - [Guest]'):self.hwnd=hwnd
    return True
   U.EnumWindows(find,0)
   if self.hwnd:
    style=U.GetWindowLongPtrW(self.hwnd,-16)
    U.SetWindowLongPtrW(self.hwnd,-16,(style&~(0x80000000|0x00c00000|0x00040000|0x00080000|0x00020000|0x00010000))|0x40000000|0x04000000)
    U.SetWindowLongPtrW(self.hwnd,-20,U.GetWindowLongPtrW(self.hwnd,-20)&~0x00040000)
    U.SetParent(self.hwnd,self.viewport.winfo_id())
    if U.GetParent(self.hwnd)!=self.viewport.winfo_id():
     U.PostMessageW(self.hwnd,0x0010,0,0);self.hwnd=None;self.loading.configure(text='Could not open Tag Duels inside the game.');return
    self.service.browser_hwnd=self.hwnd;self.loading.destroy();self.progress.stop();self.progress.destroy();self.back.destroy();self.resize();U.ShowWindow(self.hwnd,5);self.exit_bar.lift()
   elif time.monotonic()-self.started>90:
    self.loading.configure(text='Tag Duels could not finish loading. Return to the menu to retry.');return
  self.timer=self.after(100,self.poll)
 def resize(self,event=None):
  if self.hwnd and U.IsWindow(self.hwnd):
   width,height=max(1,self.winfo_width()),max(1,self.winfo_height()-self.exit_height)+self.service.browser_chrome
   U.SetWindowPos(self.hwnd,None,0,0,width,height,0x0004|0x0010|0x0020|0x4000)
   # Chromium can retain invisible resize insets after losing its caption.
   # Fit its drawable client, including at non-default Windows DPI settings.
   U.GetWindowRect.argtypes=[W.HWND,ctypes.POINTER(W.RECT)]
   U.ClientToScreen.argtypes=[W.HWND,ctypes.POINTER(W.POINT)]
   outer=W.RECT();client=W.RECT();origin=W.POINT()
   U.GetWindowRect(self.hwnd,ctypes.byref(outer));U.GetClientRect(self.hwnd,ctypes.byref(client));U.ClientToScreen(self.hwnd,ctypes.byref(origin))
   left,top=origin.x-outer.left,origin.y-outer.top
   extra_w,extra_h=outer.right-outer.left-client.right,outer.bottom-outer.top-client.bottom
   U.SetWindowPos(self.hwnd,None,-left,-top-self.service.browser_chrome,width+extra_w,height+extra_h,0x0004|0x0010|0x4000)

 def focus_browser(self,event=None):
  # Explicit SetFocus across attached Tk/Chromium input queues can hang Tk
  # behind a browser modal. Mouse-driven controls do not require it.
  return
 def leave(self):
  if self.closed:return
  self.service.close();self.app.tag_service=None;self.app.tag_window=None;self.destroy();self.app.home()
 def destroy(self):
  self.closed=True
  if self.progress.winfo_exists():self.progress.stop()
  if self.timer:
   try:self.after_cancel(self.timer)
   except tk.TclError:pass
  if self.hwnd and U.IsWindow(self.hwnd):U.PostMessageW(self.hwnd,0x0010,0,0)
  self.service.browser_hwnd=None
  super().destroy()
