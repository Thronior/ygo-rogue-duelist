"""Real Windows integration: the tag browser belongs to the main game HWND."""
import sys,time,ctypes,tkinter as tk,subprocess
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from multiplayer.desktop import open_tag
from native_host import U,W
from PIL import ImageGrab
from audio import Audio
class App(tk.Tk):
 def __init__(self):
  super().__init__();self.title('Shadow Run - embedded tag check');self.geometry('1280x720');self.screen='title'
  self.audio=Audio({'music':100,'sound':100});self.audio.mci=lambda *args:0;self.audio.music('title')
 def home(self):
  self.screen='title'
  for child in self.winfo_children():child.destroy()
  tk.Label(self,text='Main menu').pack()
  self.audio.resume();self.audio.music('title')
app=App();errors=[];app.report_callback_exception=lambda *args:errors.append(str(args))
original=subprocess.Popen

def muted(args,*a,**kw):
 if isinstance(args,list) and 'msedge.exe' in args[0].lower():args=[*args,'--mute-audio']
 return original(args,*a,**kw)
def pump(seconds):
 end=time.monotonic()+seconds
 while time.monotonic()<end:app.update();time.sleep(.03)
try:
 with patch('multiplayer.desktop.subprocess.Popen',muted):
  for cycle in range(2):
   stale=tk.Toplevel(app);old_screen=tk.Frame(app);old_screen.pack()
   open_tag(app);host=app.tag_window;service=app.tag_service
   assert app.audio.suspended and not app.audio.opened and app.audio.track is None
   app.audio.music('title');app.audio.volume();assert not app.audio.opened
   assert not stale.winfo_exists() and not old_screen.winfo_exists()
   end=time.monotonic()+95
   while not host.hwnd and time.monotonic()<end:pump(.1)
   assert host.hwnd,'Browser did not attach'
   assert U.GetParent(host.hwnd)==host.winfo_id()
   assert U.GetWindowLongPtrW(host.hwnd,-16)&0x40000000
   assert not U.GetWindowLongPtrW(host.hwnd,-16)&0x00c00000
   assert service.browser_hwnd==host.hwnd
   U.GetFocus.restype=W.HWND
   U.EnumChildWindows.argtypes=[W.HWND,ctypes.c_void_p,W.LPARAM]
   from native_host import ENUM
   def focus_info():
    handle=U.GetFocus();name=ctypes.create_unicode_buffer(256);U.GetClassNameW(handle,name,256)
    return [handle,name.value]
   print('INITIAL FOCUS',focus_info(),flush=True)
   children=[]
   @ENUM
   def child(hwnd,param):
    name=ctypes.create_unicode_buffer(256);U.GetClassNameW(hwnd,name,256)
    children.append((hwnd,name.value));return True
   U.EnumChildWindows(host.hwnd,child,0);print('CHILDREN',children,flush=True)
   pump(8);print('SETTLED FOCUS',focus_info(),flush=True)
   children.clear();U.EnumChildWindows(host.hwnd,child,0);print('LOADED CHILDREN',children,flush=True)
   for handle,name in children:
    if name=='Chrome_RenderWidgetHostHWND':
     U.SetFocus(handle);print('RENDER FOCUS',focus_info(),flush=True);pump(1);print('AFTER RENDER',focus_info(),flush=True)
   for size in ['1280x720','1024x768','1600x720']:
    app.geometry(size);pump(.7);rect=W.RECT();U.GetClientRect(host.hwnd,ctypes.byref(rect))
    assert abs(rect.right-host.winfo_width())<5 and abs(rect.bottom-service.browser_chrome-host.winfo_height())<5,(size,rect.right,rect.bottom)
   app.geometry('1280x720');pump(2)
   if cycle==0:
    box=(app.winfo_rootx(),app.winfo_rooty(),app.winfo_rootx()+app.winfo_width(),app.winfo_rooty()+app.winfo_height())
    ImageGrab.grab(bbox=box).save(ROOT/'temp/tag-embedded-desktop.png')
   hwnd=host.hwnd;service.rpc('desktop-exit');pump(2)
   assert app.screen=='title' and app.tag_service is None
   assert not U.IsWindow(hwnd),'Browser remained open after Menu'
   assert service.closed
   assert not app.audio.suspended and app.audio.opened and app.audio.track=='title'
 assert not errors,errors
 print('PASS real Edge child window: no separate caption/taskbar window, three aspect ratios, previous-screen/audio suspension, Menu audio restore and reopen')
finally:
 if getattr(app,'tag_service',None):app.tag_service.close()
 app.destroy()
