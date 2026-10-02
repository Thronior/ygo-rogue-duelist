import {validateDeck,deckCards,rankFor} from '../../android/web/collector-rules.js';
import cards from './collector-cards.json' with {type:'json'};
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
// Shuffle once on the server at each game boundary. Both clients and reconnects
// receive the same persisted order; editor order and prize snapshots stay intact.
export function shuffleCollectorDeck(deck,randomWord=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
 const result=structuredClone(deck);
 for(let i=result.main.length-1;i>0;i--){
  const range=i+1,limit=4294967296-(4294967296%range);let word;
  do{word=randomWord();}while(word>=limit);
  const j=word%range;[result.main[i],result.main[j]]=[result.main[j],result.main[i]];
 }
 return result;
}
export class CollectorRegistry {
 constructor(ctx){this.ctx=ctx;this.tail=Promise.resolve();this.cache=new Map();ctx.blockConcurrencyWhile(async()=>{
 this.data={players:{},rooms:{}};const stored=await ctx.storage.list({prefix:'collector:'});
 for(const [key,meta] of stored){if(!key.endsWith(':meta'))continue;const base=key.slice(0,-5);let text='';for(let i=0;i<meta.count;i++)text+=stored.get(base+':'+i);const value=JSON.parse(text),[,kind,id]=base.split(':');this.data[kind][id]=value;this.cache.set(base,{text,count:meta.count});}
 });}
 async persist(){
 const changes=[];for(const kind of ['players','rooms'])for(const [id,value] of Object.entries(this.data[kind])){const base=`collector:${kind}:${id}`,text=JSON.stringify(value),previous=this.cache.get(base);if(previous?.text===text)continue;changes.push({base,text,count:Math.ceil(text.length/30000),oldCount:previous?.count||0});}
 if(changes.length)await this.ctx.storage.transaction(async tx=>{for(const row of changes){for(let i=0;i<row.count;i++)await tx.put(row.base+':'+i,row.text.slice(i*30000,(i+1)*30000));await tx.put(row.base+':meta',{count:row.count});for(let i=row.count;i<row.oldCount;i++)await tx.delete(row.base+':'+i);}});
 for(const row of changes)this.cache.set(row.base,row);
 if(Object.values(this.data.rooms).some(r=>r.phase!=='complete'&&r.players.length===2))await this.ctx.storage.setAlarm(Date.now()+10000);
 }
 finish(room,loser,reason){if(room.phase==='complete')return;room.phase='complete';room.winner=1-loser;room.reason=reason;const win=this.data.players[room.players[room.winner]],loss=this.data.players[room.players[loser]];loss.defeatedDeck=structuredClone(room.decks?.[loser]||room.startDecks[loser]);loss.defeatedAt=Date.now();loss.defeatReason=reason;loss.status='eliminated';loss.pool=[];loss.deck={main:[],side:[],extra:[]};win.wins++;room.prizes=deckCards(room.startDecks[loser]);const entry={room:room.code,at:Date.now(),score:room.score,reason,cards:[]};win.history.push({...entry,won:true,opponent:loss.name,games:(room.games||[]).map(g=>({...g,result:g.winner===2?'Draw':g.winner===room.winner?'Won':'Lost'}))});loss.history.push({...entry,won:false,opponent:win.name,games:(room.games||[]).map(g=>({...g,result:g.winner===2?'Draw':g.winner===loser?'Won':'Lost'}))});}
 tick(room,now=Date.now()){
 if(room.phase==='complete'||room.players.length!==2)return;
 room.disconnectLeft??=[300000,300000];room.charged??=[0,0];
 for(let seat=0;seat<2;seat++){
  const gap=now-room.seen[seat];if(gap>=15000){room.disconnectLeft[seat]-=Math.max(0,gap-room.charged[seat]);room.charged[seat]=gap;}
 }
 if(room.phase==='duel'&&room.actor!==null&&room.actor!==undefined){const until=Math.min(now,...room.seen.map(t=>t+15000));const elapsed=Math.max(0,until-(room.clockAt||now));room.turnLeft??=[180000,180000];room.turnLeft[room.actor]-=elapsed;}
 room.clockAt=now;
 const expired=room.disconnectLeft.map(t=>t<=0);
 if(expired.every(Boolean)){room.phase='complete';room.winner=null;room.reason='Both disconnect allowances expired';for(const id of room.players){const p=this.data.players[id],seat=room.players.indexOf(id);p.defeatedDeck=structuredClone(room.decks?.[seat]||room.startDecks[seat]);p.defeatedAt=now;p.defeatReason=room.reason;p.status='eliminated';p.pool=[];p.deck={main:[],side:[],extra:[]};p.history.push({room:room.code,at:now,won:false,reason:room.reason,cards:[]});}}
 else if(expired.some(Boolean))this.finish(room,expired[0]?0:1,'Disconnect allowance exhausted');
 else if(room.phase==='duel'&&room.turnLeft?.some(t=>t<=0))this.finish(room,room.turnLeft[0]<=0?0:1,'Turn timer expired');
 }
 expire(){for(const room of Object.values(this.data.rooms))this.tick(room);}
 async alarm(){const job=this.tail.then(async()=>{this.expire();await this.persist();});this.tail=job.catch(()=>{});await job;}
 fetch(request){const job=this.tail.then(()=>this.handle(request));this.tail=job.catch(()=>{});return job;}
 async handle(request){try{const raw=await request.text();if(raw.length>1000000)throw Error('Request too large.');const v=JSON.parse(raw),op=new URL(request.url).pathname.split('/').pop();this.expire();let p=this.data.players[v.id];
 if(op==='leaderboard'){const list=Object.values(this.data.players).filter(x=>x.status==='alive'&&x.deck.main.length>=40).sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name)).slice(0,10).map(x=>({name:x.name,wins:x.wins,rank:rankFor(x.wins),deck:x.deck,character:x.character}));await this.persist();return this.reply({leaderboard:list});}
 if(op==='register'){
 if(!p){const q=v.duelist;if(!q||typeof v.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(v.id)||[37].includes(q.character)||q.id!==v.id||!Array.isArray(q.pool)||q.pool.length>30000||q.pool.some(id=>!cards.some(c=>c.id===id))||typeof q.name!=='string'||!q.name.trim()||q.name.length>32||typeof v.token!=='string'||v.token.length<40)throw Error('Invalid Collector.');p=this.data.players[v.id]={id:v.id,token:v.token,name:q.name,character:q.character,pool:q.pool,deck:{main:[],side:[],extra:[]},wins:0,status:'alive',history:[],room:null};}
 }
 if(!p||p.token!==v.token)throw Error('Invalid Collector credentials.');
 let room=p.room?this.data.rooms[p.room]:null,seat=room?.players.indexOf(p.id);
 if(p.status==='eliminated'&&!p.defeatedDeck&&room?.startDecks?.[seat]){p.defeatedDeck=structuredClone(room.decks?.[seat]||room.startDecks[seat]);p.defeatedAt=p.history?.at(-1)?.at||Date.now();p.defeatReason=room.reason;}
 if(p.status==='alive'){
 if(op==='deck'){if(room&&room.phase!=='complete')throw Error('Finish your active match first.');const errors=validateDeck(v.deck,p.pool,cards);if(errors.length)throw Error(errors.join(' '));p.deck=v.deck;}
 if(op==='host'||op==='join'){
 if(room&&room.phase!=='complete')throw Error('Reconnect to your existing room.');const errors=validateDeck(p.deck,p.pool,cards);if(errors.length)throw Error(errors.join(' '));
 if(op==='host'){let code;do{code=Array.from(crypto.getRandomValues(new Uint8Array(5)),x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%31]).join('')}while(this.data.rooms[code]);room={code,players:[p.id],phase:'waiting',score:[0,0],seen:[Date.now()],events:[],game:0};this.data.rooms[code]=room;p.room=code;seat=0;}
 else{room=this.data.rooms[String(v.code).toUpperCase()];if(!room||room.phase!=='waiting'||room.players.length!==1||room.players[0]===p.id)throw Error('Room unavailable.');room.players.push(p.id);p.room=room.code;seat=1;room.seen=[Date.now(),Date.now()];room.startDecks=room.players.map(id=>structuredClone(this.data.players[id].deck));room.decks=room.startDecks.map(deck=>shuffleCollectorDeck(deck));room.first=crypto.getRandomValues(new Uint8Array(1))[0]%2;room.seed=crypto.getRandomValues(new Uint32Array(1))[0];room.phase='duel';room.game=1;room.votes={};room.disconnectLeft=[300000,300000];room.charged=[0,0];room.turnLeft=[180000,180000];room.clockAt=Date.now();room.actor=room.first;room.turn=1;room.clockVotes={};}
 }
 if(room&&room.phase!=='complete'){
 room.seen[seat]=Date.now();room.charged??=[0,0];room.charged[seat]=0;
 if(op==='leave'&&room.phase==='waiting'){room.phase='complete';room.winner=null;p.room=null;}
 if(op==='surrender'&&room.players.length===2)this.finish(room,seat,'Surrender');
 if(op==='clock'){if(room.phase!=='duel'||v.number!==room.events.length||!Number.isInteger(v.turn)||v.turn<1||![0,1,null].includes(v.actor))throw Error('Invalid timer state.');room.clockVotes??={};room.clockVotes[seat]={number:v.number,turn:v.turn,actor:v.actor};const a=room.clockVotes[0],b=room.clockVotes[1];if(a&&b&&a.number===b.number&&a.turn===b.turn&&a.actor===b.actor){if(room.turn!==a.turn){room.turn=a.turn;room.turnLeft=[180000,180000];}room.actor=a.actor;room.clockAt=Date.now();}}
 if(op==='response'){if(room.phase!=='duel'||v.number!==room.events.length)throw Error('That choice is stale. Refresh the duel.');if(v.seat!==seat||room.actor!==seat||![0,1,null].includes(v.nextActor)||!Number.isInteger(v.turn)||v.turn<room.turn||v.turn>room.turn+1||!v.response||JSON.stringify(v.response).length>16384)throw Error('Invalid response.');room.events.push({seat,response:v.response});if(room.turn!==v.turn){room.turn=v.turn;room.turnLeft=[180000,180000];}room.actor=v.nextActor;room.clockAt=Date.now();}
 if(op==='result'){if(room.phase!=='duel'||![0,1,2].includes(v.winner)||v.number!==room.events.length)throw Error('Invalid duel receipt.');room.votes[seat]=v.winner;if(Object.keys(room.votes).length===2){if(room.votes[0]!==room.votes[1])throw Error('Duel verification mismatch; match remains recoverable.');const winner=v.winner;room.games??=[];room.games.push({game:room.game,winner,turns:room.turn,at:Date.now()});if(winner!==2)room.score[winner]++;if(winner!==2&&room.score[winner]>=2)this.finish(room,1-winner,'Match defeat');else{room.phase='siding';room.chooser=winner===2?room.first:1-winner;room.ready=[false,false];room.nextFirst=null;}}}
 if(op==='side'){if(room.phase!=='siding')throw Error('Not between duels.');const errors=validateDeck(v.deck,deckCards(room.startDecks[seat]),cards,room.startDecks[seat]);if(errors.length)throw Error(errors.join(' '));room.decks[seat]=v.deck;room.ready[seat]=true;}
 if(op==='first'){if(room.phase!=='siding'||seat!==room.chooser||![0,1].includes(v.first))throw Error('The previous loser chooses who starts.');room.nextFirst=v.first;}
 if(room.phase==='siding'&&room.ready.every(Boolean)&&room.nextFirst!==null){room.first=room.nextFirst;room.decks=room.decks.map(deck=>shuffleCollectorDeck(deck));room.phase='duel';room.game++;room.seed=crypto.getRandomValues(new Uint32Array(1))[0];room.events=[];room.votes={};room.turn=1;room.turnLeft=[180000,180000];room.actor=room.first;room.clockVotes={};room.clockAt=Date.now();}
 }
 if(op==='prizes'){if(!room||room.phase!=='complete'||room.winner!==seat)throw Error('No prizes available.');if(!room.claimed){if(!Array.isArray(v.indices)||v.indices.length!==Math.min(5,room.prizes.length)||new Set(v.indices).size!==v.indices.length||v.indices.some(i=>!Number.isInteger(i)||i<0||i>=room.prizes.length))throw Error('Choose five prize copies.');const earned=v.indices.map(i=>room.prizes[i]);p.pool.push(...earned);p.history.find(h=>h.room===room.code).cards=earned;room.claimed=true;}}
 }
 await this.persist();const {token,...record}=p;return this.reply({record,seat,room:room?{...room,players:room.players.map(id=>{const x=this.data.players[id];return {id:x.id,name:x.name,character:x.character}})}:null,now:Date.now()});
 }catch(e){await this.persist();return this.reply({error:e.message},400);}}
 reply(data,status=200){return new Response(JSON.stringify(data),{status,headers})}
}
