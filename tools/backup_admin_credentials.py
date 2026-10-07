"""Windows-user encrypted admin credential. Never bundled with the game."""
import base64,ctypes,os
from ctypes import wintypes
class Blob(ctypes.Structure):
 _fields_=[('size',wintypes.DWORD),('data',ctypes.POINTER(ctypes.c_ubyte))]
def crypt(data,decrypt=False):
 if os.name!='nt':raise RuntimeError('Use YGO_BACKUP_ADMIN_TOKEN on non-Windows systems')
 buf=ctypes.create_string_buffer(data);source=Blob(len(data),ctypes.cast(buf,ctypes.POINTER(ctypes.c_ubyte)));target=Blob()
 api=ctypes.windll.crypt32.CryptUnprotectData if decrypt else ctypes.windll.crypt32.CryptProtectData
 if not api(ctypes.byref(source),None,None,None,None,1,ctypes.byref(target)):raise ctypes.WinError()
 try:return ctypes.string_at(target.data,target.size)
 finally:ctypes.windll.kernel32.LocalFree(target.data)
def save_key(path,key):path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(base64.b64encode(crypt(key.encode())))
def load_key(path):return os.environ.get('YGO_BACKUP_ADMIN_TOKEN') or crypt(base64.b64decode(path.read_bytes()),True).decode()
