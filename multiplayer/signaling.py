"""Room discovery only. Game data travels over the peers' encrypted RTC channel."""
import argparse, base64, hashlib, hmac, json, os, secrets, threading, time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
MAX_BODY=65536
class Signaling:
 def __init__(self, clock=time.time, state_path=None):
  self.clock=clock;self.rooms={};self.lock=threading.RLock();self.attempts=defaultdict(deque);self.state_path=Path(state_path) if state_path else None;self.last_save=0
  if self.state_path and self.state_path.exists():
   saved=json.loads(self.state_path.read_text(encoding='utf8'))
   if saved.get('protocol')!=1:raise ValueError('Unsupported room registry.')
   for code,room in saved['rooms'].items():
    if self.clock()-room['touched']<86400:
     # SDP/ICE is intentionally never stored. Recreate the transport after a
     # service restart, retaining only the code and its two reserved seats.
     self.rooms[code]={**room,'started':room.get('started',False),'generation':room['generation']+1,'queues':[[],[]],'seq':0}
   self.save()
 def save(self):
  if not self.state_path:return
  self.state_path.parent.mkdir(parents=True,exist_ok=True)
  data={'protocol':1,'rooms':{code:{key:room[key] for key in ('tokens','generation','touched','started')} for code,room in self.rooms.items()}}
  temporary=self.state_path.with_suffix('.tmp')
  with temporary.open('w',encoding='utf8') as output:
   json.dump(data,output,separators=(',',':'));output.flush();os.fsync(output.fileno())
  os.replace(temporary,self.state_path);self.last_save=self.clock()
 def ice(self):
  servers=[]
  stun=os.environ.get('TAG_STUN_URL')
  if stun:servers.append({'urls':stun})
  turn=os.environ.get('TAG_TURN_URL');secret=os.environ.get('TAG_TURN_SECRET')
  if turn and secret:
   username=str(int(self.clock())+86400)+':shadowrun'
   credential=base64.b64encode(hmac.new(secret.encode(),username.encode(),hashlib.sha1).digest()).decode()
   servers.append({'urls':turn.split(','),'username':username,'credential':credential})
  return servers
 def request(self, action, body, token='', address='local'):
  with self.lock:
   now=self.clock()
   self.rooms={k:r for k,r in self.rooms.items() if now-r['touched']<86400}
   if action in ('create','join'):
    self.attempts={k:v for k,v in self.attempts.items() if v and now-v[-1]<60}
    q=self.attempts.setdefault(address,deque())
    while q and now-q[0]>60:q.popleft()
    if len(q)>=12:raise ValueError('Too many room attempts. Wait a minute.')
    q.append(now)
   if action=='create':
    if len(self.rooms)>=256:raise ValueError('Room service is full. Try again later.')
    while True:
     code=''.join(secrets.choice(ALPHABET) for _ in range(5))
     if code not in self.rooms:break
    token=secrets.token_urlsafe(32)
    self.rooms[code]={'tokens':[token,None],'queues':[[],[]],'seq':0,'generation':0,'touched':now,'started':False}
    self.save()
    return {'code':code,'token':token,'seat':0,'iceServers':self.ice(),'protocol':1,'generation':0,'started':False}
   code=str(body.get('code','')).upper();room=self.rooms.get(code)
   if not room:raise ValueError('Room not found or expired.')
   if action=='join' and body.get('resumeToken'):
    resume=body['resumeToken']
    if resume not in room['tokens']:raise PermissionError('This device cannot resume that seat.')
    seat=room['tokens'].index(resume);room['queues']=[[],[]];room['generation']+=1;room['touched']=now
    self.save()
    return {'code':code,'token':resume,'seat':seat,'iceServers':self.ice(),'protocol':1,'generation':room['generation'],'resumed':True,'started':room['started']}
   if action=='join':
    if room['tokens'][1]:raise ValueError('Room already has two players.')
    token=secrets.token_urlsafe(32);room['tokens'][1]=token;room['touched']=now
    self.save()
    return {'code':code,'token':token,'seat':1,'iceServers':self.ice(),'protocol':1,'generation':room['generation']}
   if not token or token not in room['tokens']:raise PermissionError('Invalid room session.')
   seat=room['tokens'].index(token);room['touched']=now
   if action=='started':
    if seat!=0:raise PermissionError('Only the host can start a run.')
    room['started']=True;self.save();return {'ok':True}
   if action=='poll':
    if now-self.last_save>=60:self.save()
    after=body.get('after',0)
    if not isinstance(after,int) or after<0:raise ValueError('Invalid message cursor.')
    if body.get('generation')==room['generation']:
     room['queues'][seat]=[m for m in room['queues'][seat] if m['sequence']>after]
    return {'messages':room['queues'][seat][:],'joined':bool(room['tokens'][1]),'generation':room['generation']}
   if action=='signal':
    if body.get('generation')!=room['generation']:raise ValueError('Connection was replaced. Reconnect this peer.')
    message=body.get('message')
    if not isinstance(message,dict) or message.get('type') not in ('offer','answer','candidate'):raise ValueError('Only connection signals are accepted.')
    if len(json.dumps(message))>48000:raise ValueError('Signal too large.')
    queue=room['queues'][1-seat]
    if len(queue)>=256:raise ValueError('Peer is not receiving connection signals.')
    room['seq']+=1;queue.append({'sequence':room['seq'],'message':message})
    return {'ok':True}
   if action=='leave':
    if seat==0:del self.rooms[code]
    else:room['tokens'][1]=None;room['queues']=[[],[]];room['generation']+=1
    self.save()
    return {'ok':True}
   raise ValueError('Unknown signaling action.')

class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass # Never log room credentials or SDP addresses.
 def reply(self,status,payload):
  data=json.dumps(payload).encode();self.send_response(status)
  self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)))
  self.send_header('Access-Control-Allow-Origin','*');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
 def do_OPTIONS(self):
  self.send_response(204);self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Headers','Content-Type, Authorization');self.send_header('Access-Control-Allow-Methods','POST, OPTIONS');self.end_headers()
 def do_POST(self):
  try:
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<=MAX_BODY:raise ValueError('Invalid request size.')
   body=json.loads(self.rfile.read(size))
   if not isinstance(body,dict):raise ValueError('Expected a JSON object.')
   token=self.headers.get('Authorization','').removeprefix('Bearer ')
   result=self.server.signaling.request(self.path.removeprefix('/v1/'),body,token,self.client_address[0]);self.reply(200,result)
  except PermissionError as e:self.reply(403,{'error':str(e)})
  except (ValueError,TypeError) as e:self.reply(400,{'error':str(e)})
  except OSError:self.reply(503,{'error':'Room storage is temporarily unavailable.'})
 def setup(self):super().setup();self.connection.settimeout(10)

def server(host='127.0.0.1',port=8765,state_path=None):
 result=ThreadingHTTPServer((host,port),Handler);result.signaling=Signaling(state_path=state_path);return result
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8765);parser.add_argument('--state',default=str(Path(__file__).with_name('data')/'rooms.json'));args=parser.parse_args()
 print(f'Shadow Run signaling: {args.host}:{args.port}. This service does not run duels.',flush=True)
 server(args.host,args.port,args.state).serve_forever()
