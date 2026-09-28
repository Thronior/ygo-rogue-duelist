"""EDOPro's ordinary TCP client protocol over a private loopback bridge.
Game state comes from the shared tag core; this process never runs a second duel.
"""
import ctypes as C, socket, struct, threading, queue
class HostInfo(C.LittleEndianStructure):
 _fields_=[('lflist',C.c_uint32),('rule',C.c_uint8),('mode',C.c_uint8),('duel_rule',C.c_uint8),('no_check',C.c_uint8),('no_shuffle',C.c_uint8),('lp',C.c_uint32),('hand',C.c_uint8),('draw',C.c_uint8),('time',C.c_uint16),('flags_high',C.c_uint32),('handshake',C.c_uint32),('version',C.c_uint32),('team1',C.c_int32),('team2',C.c_int32),('best_of',C.c_int32),('flags_low',C.c_uint32),('forbidden',C.c_uint32),('extra_rules',C.c_uint16),('sizes',C.c_uint16*6)]
def packet(kind,data=b''):
 data=bytes(data)
 if len(data)>65534:raise ValueError('Native packet too large')
 return struct.pack('<HB',len(data)+1,kind)+data
def exact(connection,n):
 parts=bytearray()
 while len(parts)<n:
  block=connection.recv(n-len(parts))
  if not block:raise EOFError()
  parts.extend(block)
 return bytes(parts)
class NativeBridge:
 def __init__(self):
  self.listener=socket.socket();self.listener.bind(('127.0.0.1',0));self.listener.listen(1);self.port=self.listener.getsockname()[1]
  self.lock=threading.RLock();self.connection=None;self.latest=None;self.commands=queue.Queue();self.closed=False;self.errors=[];self.messages=0
  threading.Thread(target=self.accept,daemon=True).start()
 def accept(self):
  while not self.closed:
   try:
    connection,_=self.listener.accept();connection.setsockopt(socket.IPPROTO_TCP,socket.TCP_NODELAY,1)
    while True:
     n=struct.unpack('<H',exact(connection,2))[0];message=exact(connection,n);self.messages+=1
     if message[0]==0x12:
      with self.lock:self.connection=connection;self.initialize()
     elif message[0]==1:
      with self.lock:
       if self.latest and self.latest['tag']['canRespond']:
        self.commands.put({'action':'duel-response','value':{'number':self.latest['tag']['responseNumber'],'response':{'nativeBytes':list(message[1:])}}})
        self.latest['tag']['canRespond']=False
     elif message[0]==0x14:self.commands.put({'action':'surrender','value':None})
   except (OSError,EOFError):pass
   except Exception as error:self.errors.append(str(error))
   finally:
    with self.lock:self.connection=None
    try:connection.close()
    except (UnboundLocalError,OSError):pass
 def send(self,kind,data=b''):
  if self.connection:self.connection.sendall(packet(kind,data))
 def initialize(self):
  if not self.latest:return
  state=self.latest;info=HostInfo();info.mode=2;info.duel_rule=1;info.no_check=1;info.lp=state['lp'][0];info.hand=5;info.draw=1;info.handshake=4043399681;info.version=41|(10<<16);info.team1=info.team2=2;info.best_of=1;info.flags_low=int.from_bytes(bytes(state['native']['field'][:4]),'little');info.sizes=(C.c_uint16*6)(0,100,0,100,0,100)
  self.send(0x12,bytes(info))
  for pos,name in enumerate(sum(state['tag']['names'],[])):
   self.send(0x20,name.encode('utf-16le')[:38].ljust(40,b'\0')+bytes([pos]))
  self.send(0x13,bytes([state['tag']['localSeat']]))
  self.send(0x15);self.send(0xf0,b'\1')
  self.send(1,struct.pack('<BBIIHHHH',4,0,*state['lp'],state['players'][0]['deck'],state['players'][0]['extra'],state['players'][1]['deck'],state['players'][1]['extra']))
  self.push()
 def publish(self,state):
  with self.lock:
   first=self.latest is None;self.latest=state
   if self.connection:
    try:self.initialize() if first else self.push()
    except OSError:self.connection=None
 def push(self):
  s=self.latest;n=s['native'];self.send(0xf4,struct.pack('<IHBBB',s['turn'],s['phase'],*s['tag']['activeSeats'],s['player']))
  self.send(0xf0,b'\1');self.send(1,bytes([162])+bytes(n['field']))
  for zone in n['locations']:self.send(1,bytes([6,zone['player'],zone['location']])+bytes(zone['bytes']))
  self.send(1,struct.pack('<BH',41,s['phase']));self.send(0xf0,b'\0')
  if s['tag']['canRespond'] and n.get('prompt'):self.send(1,n['prompt'])
 def drain(self):
  items=[]
  while not self.commands.empty():items.append(self.commands.get_nowait())
  return items
 def close(self):
  self.closed=True;self.listener.close()
  if self.connection:
   try:self.connection.shutdown(socket.SHUT_RDWR);self.connection.close()
   except OSError:pass
