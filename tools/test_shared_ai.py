import sys,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[1];runtime=root/'runtime';files=['ai-request.json','ai-response.json','ai-ready'];saved={n:(runtime/n).read_bytes() for n in files if (runtime/n).exists()}
for n in files:(runtime/n).unlink(missing_ok=True)
try:
 with (root/'temp/bridge-node.log').open('w') as log:
  proc=subprocess.Popen([str(runtime/'ai/node.exe'),str(root/'android/native_ai.mjs')],cwd=root,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
  try:
   deadline=time.monotonic()+10
   while not (runtime/'ai-ready').exists() and time.monotonic()<deadline:time.sleep(.05)
   result=subprocess.run([str(runtime/'native_bridge_check.exe'),'ai-equip'],cwd=runtime,capture_output=True,text=True,timeout=60)
   (root/'temp/native-bridge-test.log').write_text(result.stdout+result.stderr,encoding='utf8')
   print(result.stdout[-900:]);print(result.stderr[-700:]);print('EXIT',result.returncode)
   if result.returncode:print((root/'temp/bridge-node.log').read_text());sys.exit(result.returncode)
  finally:proc.terminate();proc.wait(timeout=5)
finally:
 for n in files:
  if n in saved:(runtime/n).write_bytes(saved[n])
  else:(runtime/n).unlink(missing_ok=True)
