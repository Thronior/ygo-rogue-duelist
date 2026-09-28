"""Native integration: EDOPro is a resized child of the campaign's game window."""
import sys,time,uuid,ctypes
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import frontend as ui,campaign as g,storage,campaign_ui
from native_host import U,W
base=ROOT/'temp'/('embed-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=[0,1,37];storage.write(base/'profile.json',p)
paths=[g.RUNTIME/'campaign-request.json',g.RUNTIME/'campaign-result.json',g.RUNTIME/'puzzles/shadow-run.lua']
backups={p:p.read_bytes() if p.exists() else None for p in paths}
app=ui.App();errors=[];app.report_callback_exception=lambda *args:errors.append(str(args))
try:
 app.run=g.new_run(37);app.run['route_confirmed']=True
 end=time.monotonic()+20
 while not app.preloader.finished and time.monotonic()<end:app.update();time.sleep(.05)
 assert app.preloader.finished and not app.preloader.failed
 app.launch_duel()
 end=time.monotonic()+25
 while time.monotonic()<end and not getattr(getattr(app,'native_host',None),'hwnd',None):app.update();time.sleep(.04)
 host=app.native_host;assert host.hwnd,('Native window did not attach',host.error,getattr(host,'debug',{}))
 assert U.GetParent(host.hwnd)==host.winfo_id()
 assert U.GetWindowLongPtrW(host.hwnd,-16)&0x40000000
 for size in ['1280x880','1024x768']:
  app.geometry(size)
  for _ in range(15):app.update();time.sleep(.04)
  rect=W.RECT();U.GetClientRect.argtypes=[W.HWND,ctypes.POINTER(W.RECT)];U.GetClientRect(host.hwnd,ctypes.byref(rect))
  assert abs(rect.right-host.winfo_width())<5 and abs(rect.bottom-host.winfo_height())<5,(rect.right,host.winfo_width(),rect.bottom,host.winfo_height())
 assert app.screen=='duel' and not errors,errors
 print('PASS: native EDOPro embedded in campaign window; no independent top-level duel; resizes at 1280x880 and 1024x768')
finally:
 process=getattr(app,'duel_process',None)
 if process and process.poll() is None:process.terminate();process.wait(timeout=10)
 app.audio.close();app.destroy()
 for p,data in backups.items():
  if data is None:p.unlink(missing_ok=True)
  else:p.write_bytes(data)
