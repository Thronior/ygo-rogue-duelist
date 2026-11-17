// Developer room tool route (tools/room-admin). POST /v3/admin with "Authorization: Bearer <ADMIN_TOKEN>", where
// ADMIN_TOKEN is a Worker secret whose only local copy is the ignored multiplayer/cloudflare/.admin-token. No client
// ever holds it. Without the secret the route answers 401 to everyone. Body: {mode:'tag'|'draft'|'auto', code, action}.
import {adminAction} from '../../android/web/room-admin.js';
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const digest=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
// Compares fixed-length digests, so the time taken says nothing about how much of the token matched.
async function sameSecret(given,secret){const [a,b]=await Promise.all([digest(given),digest(secret)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0}
export async function adminRoute(request,env){
 const secret=typeof env.ADMIN_TOKEN==='string'?env.ADMIN_TOKEN:'';
 const given=(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
 if(secret.length<32||!given||!await sameSecret(given,secret))return json(401,{error:'Unauthorized.'});
 let body;try{const text=await request.text();if(text.length>8192)throw Error();body=JSON.parse(text)}catch{return json(400,{error:'Invalid request.'})}
 const code=String(body?.code||'').toUpperCase(),mode=body?.mode||'auto';
 if(!/^[A-Z2-9]{5}$/.test(code))return json(400,{error:'Enter a five-character room code.'});
 if(!['tag','draft','auto'].includes(mode))return json(400,{error:'Mode must be tag, draft or auto.'});
 let action;try{action=adminAction(body.action)}catch(error){return json(400,{error:error.message})}
 const send=async(binding,name)=>{const response=await binding.get(binding.idFromName(name)).fetch(new Request('https://internal/v3/admin',{method:'POST',body:JSON.stringify({code,action})}));return {status:response.status,data:await response.json()}};
 let result=null;
 if(mode!=='draft')result=await send(env.ROOMS,'rooms-v1');
 if(mode==='draft'||mode==='auto'&&result.status===404)result=await send(env.DRAFT,'draft-v1');
 return json(result.status,{...result.data,code,action:action.kind,id:action.id});
}
