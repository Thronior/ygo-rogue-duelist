import sys,json,threading,time
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root))
import storage,campaign
storage.ROOT=root/'temp/tag-device-test/saves';storage.ROOT.mkdir(parents=True,exist_ok=True)
campaign.SAVE=storage.ROOT/'offline-run.json'
from multiplayer.desktop import DesktopTag
from multiplayer.signaling import server
service=DesktopTag(port=4197,embed=False)
signaling=server(port=8765,state_path=root/'temp/tag-device-test/rooms.json');threading.Thread(target=signaling.serve_forever,daemon=True).start()
print(json.dumps({'port':service.port,'token':service.token}),flush=True)
try:
 while True:time.sleep(1)
finally:service.close();signaling.shutdown()
