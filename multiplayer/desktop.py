"""Local desktop tag shell. P2P lives in the bundled browser client; duels use EDOPro."""
import json, mimetypes, os, secrets, subprocess, threading, time
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit,unquote
from multiplayer.native_bridge import NativeBridge
ROOT=Path(__file__).resolve().parents[1];WEB=ROOT/'android/web'
class DesktopTag:
 def __init__(self,port=4197,embed=True,mode="tag"):
  self.mode=mode;self.browser_process=None
  self.token=secrets.token_urlsafe(32);self.lock=threading.RLock();self.bridge=None;self.process=None;self.embed=embed;self.closed=False;self.native_visible=True;self.browser_hwnd=None;self.exit_requested=False;self.native_top_ratio=.09;self.browser_chrome=0
  owner=self
  class Handler(BaseHTTPRequestHandler):
   protocol_version="HTTP/1.1"
   def log_message(self,*args):pass
   def reply(self,status,data,mime='application/json'):
    self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
   def do_GET(self):
    path=(WEB/unquote(urlsplit(self.path).path).lstrip('/')).resolve()
    if not path.is_relative_to(WEB.resolve()):return self.reply(403,b'{}')
    if path==WEB:path=WEB/'index.html'
    if not path.is_file():return self.reply(404,b'{}')
    mime='text/javascript' if path.suffix in ('.js','.mjs') else mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    data=path.read_bytes()
    if path==WEB/'index.html':
     # Attach immediately so startup artwork progress is visible inside Tk.
     data=data.replace(b'<title>Yu-Gi-Oh: Rogue Duelist</title>',('<title>YGO Rogue Tag '+owner.token[:12]+'</title>').encode('utf-8'))
    if mime.startswith('text/') or mime=='application/javascript':mime+='; charset=utf-8'
    self.reply(200,data,mime)
   def do_POST(self):
    if self.path!='/desktop-rpc' or self.headers.get('X-Shadow-Token')!=owner.token:return self.reply(403,b'{}')
    try:
     size=int(self.headers.get('Content-Length','0'))
     if not 0<size<=4_000_000:raise ValueError('Invalid request size')
     request=json.loads(self.rfile.read(size))
     with owner.lock:result=owner.rpc(request['action'],request.get('value'))
     self.reply(200,json.dumps({'result':result}).encode())
    except Exception as error:self.reply(400,json.dumps({'error':str(error)}).encode())
  class Server(ThreadingHTTPServer):
   request_queue_size=128
   daemon_threads=True
  self.http=Server(('127.0.0.1',port),Handler);self.port=self.http.server_port
  threading.Thread(target=self.http.serve_forever,daemon=True).start()
 def rpc(self,action,value=None):
  if action in ('desktop-storage-load','desktop-storage-write'):
   import storage
   target=storage.ROOT/'tag-browser-state.json'
   data=storage.read(target,{})
   if not isinstance(data,dict):data={}
   if action=='desktop-storage-load':return data
   key=value.get('key') if isinstance(value,dict) else None
   allowed=isinstance(key,str) and len(key)<600 and (key in ('tag-last-code','tag-endpoint') or key.startswith('tag-draft:') or key.startswith(('https://','http://127.0.0.1:','http://localhost:')) and (':tag:' in key or ':tag-outbox:' in key))
   if not allowed:raise ValueError('Invalid game storage key')
   text=value.get('value')
   if text is None:data.pop(key,None)
   elif isinstance(text,str) and len(text)<2_000_000:data[key]=text
   else:raise ValueError('Invalid game storage value')
   if len(json.dumps(data))>6_000_000:raise ValueError('Game reconnect storage is full')
   storage.write(target,data);return None
  if action=='browser-layout':
   if self.browser_hwnd:
    import ctypes
    from native_host import U,W
    rect=W.RECT();U.GetClientRect(self.browser_hwnd,ctypes.byref(rect))
    self.browser_chrome=max(0,min(120,round(rect.bottom-float(value['height'])*float(value['dpr']))))
   return {'attached':bool(self.browser_hwnd)}
  if action=='desktop-exit':self.exit_requested=True;return None
  if action=='native-layout':self.native_top_ratio=max(0,min(.5,float(value)));return None
  if action=='bootstrap':
   import storage
   return {'profile':storage.profile()}
  if action=='native-state':
   if self.bridge is None:
    self.bridge=NativeBridge();self.bridge.publish(value)
    env={**os.environ,'SHADOW_RUN_TAG_PORT':str(self.bridge.port),'TEMP':str(ROOT/'temp'),'TMP':str(ROOT/'temp')}
    executable=ROOT/'runtime/ShadowDuel.exe'
    startup=None
    if os.name=='nt':
     startup=subprocess.STARTUPINFO();startup.dwFlags=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
    self.process=subprocess.Popen([str(executable)],cwd=ROOT/'runtime',env=env,startupinfo=startup)
    if self.embed:threading.Thread(target=self.embed_native,args=(self.process,),daemon=True).start()
   else:self.bridge.publish(value)
   return None
  if action=='native-visible':self.native_visible=bool(value);return None
  if action=='native-status':return {'connected':bool(self.bridge and self.bridge.connection),'messages':self.bridge.messages if self.bridge else 0,'errors':list(self.bridge.errors) if self.bridge else [],'running':bool(self.process and self.process.poll() is None)}
  if action=='native-poll':return self.bridge.drain() if self.bridge else []
  if action=='native-stop':self.stop_native();return None
  if not action.startswith('tag-'):raise ValueError('Unsupported desktop tag operation')
  from android import mobile_backend
  return json.loads(mobile_backend.dispatch(json.dumps({'action':action,'value':value})))['result']
 def embed_native(self,process):
  import ctypes
  from ctypes import wintypes as W
  from native_host import U,ENUM
  U.GetWindowTextW.argtypes=[W.HWND,W.LPWSTR,ctypes.c_int]
  native=None;parent=None
  while not self.closed and process.poll() is None:
   @ENUM
   def find(hwnd,_):
    nonlocal native,parent
    pid=W.DWORD();U.GetWindowThreadProcessId(hwnd,ctypes.byref(pid));rect=W.RECT();U.GetClientRect(hwnd,ctypes.byref(rect))
    title=ctypes.create_unicode_buffer(512);U.GetWindowTextW(hwnd,title,512)
    if pid.value==process.pid and rect.right>500:native=hwnd
    if not self.browser_hwnd and title.value=='YGO Rogue Tag '+self.token[:12]:parent=hwnd
    return True
   parent=self.browser_hwnd or parent
   if not native or not parent:U.EnumWindows(find,0)
   if native and parent:
    if not U.IsWindow(parent):break
    if U.GetParent(native)!=parent:
     style=U.GetWindowLongPtrW(native,-16);U.SetWindowLongPtrW(native,-16,(style&~(0x80000000|0x00c00000|0x00040000))|0x40000000|0x10000000);U.SetParent(native,parent)
    U.ShowWindow(native,5 if self.native_visible else 0)
    if not self.native_visible:
     time.sleep(.1);continue
    rect=W.RECT();U.GetClientRect(parent,ctypes.byref(rect));top=self.browser_chrome+round((rect.bottom-self.browser_chrome)*self.native_top_ratio);U.SetWindowPos(native,0,0,top,rect.right,max(1,rect.bottom-top),0x0010|0x0040)
   time.sleep(.1)
 def stop_native(self):
  if self.process and self.process.poll() is None:self.process.terminate();self.process.wait(timeout=10)
  self.process=None
  if self.bridge:self.bridge.close();self.bridge=None
 def launch(self,embedded=False):
  edge=Path(os.environ.get('PROGRAMFILES(X86)','C:/Program Files (x86)'))/'Microsoft/Edge/Application/msedge.exe'
  if not edge.exists():raise RuntimeError('Microsoft Edge is needed for the desktop P2P transport.')
  env={**os.environ,'TEMP':str(ROOT/'temp'),'TMP':str(ROOT/'temp')}
  profile=ROOT/'temp'/'tag-browser'/self.token[:12];profile.mkdir(parents=True,exist_ok=True)
  args=[str(edge),'--guest','--disable-sync','--no-default-browser-check','--disable-background-mode','--disable-extensions','--app='+f'http://127.0.0.1:{self.port}/?desktop={self.token}&mode={self.mode}','--user-data-dir='+str(profile),'--no-first-run','--disable-features=msEdgeSidebarV2','--autoplay-policy=no-user-gesture-required']
  startup=None
  if embedded:
   args+=['--window-position=-32000,-32000','--window-size=1100,720']
   startup=subprocess.STARTUPINFO();startup.dwFlags=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
  self.browser_process=subprocess.Popen(args,env=env,startupinfo=startup)
  return self.browser_process

 def stop_browser(self):
  process=self.browser_process;self.browser_process=None
  if process and process.poll() is None:
   process.terminate()
   try:process.wait(timeout=2)
   except subprocess.TimeoutExpired:process.kill()
 def close(self):
  if self.closed:return
  self.closed=True;self.stop_browser();self.stop_native();self.http.shutdown();self.http.server_close()
def open_tag(app,mode="tag"):
 import tkinter as tk
 from multiplayer.window import TagWindow
 if getattr(app,'screen',None)=='tag' and getattr(app,'tag_window',None):return
 previous=getattr(app,'tag_service',None)
 if previous:previous.close()
 app.screen='tag'
 app.audio.suspend()
 for child in app.winfo_children():
  child.destroy()
 app.title_scene=None
 app.achievement_toast=None
 service=DesktopTag(port=0,mode=mode);app.tag_service=service
 app.tag_window=TagWindow(app,service)
if __name__=='__main__':
 service=DesktopTag();service.launch()
 try:
  while True:time.sleep(1)
 except KeyboardInterrupt:service.close()
