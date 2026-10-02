import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MobileDuel} from '../android/web/duel.js';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=source+'/android/web/';
const output=process.argv[2]||source+'/temp/tier2-balance';fs.mkdirSync(output,{recursive:true});
const content=JSON.parse(fs.readFileSync(root+'content.json')),resources=['engine-data','scripts'].map(n=>JSON.parse(fs.readFileSync(root+n+'.json')));
const metadata=JSON.parse(fs.readFileSync(source+'/data/tier-exclusive-opponents.json'));
const candidates=metadata.opponents.filter(r=>r.tier_decks?.['2']).map(r=>{let section='main';const deck={main:[],extra:[],side:[]};for(const line of fs.readFileSync(source+'/data/decks/'+r.tier_decks['2']+'.ydk','utf8').split(/\r?\n/)){if(line==='#main')section='main';else if(line==='#extra')section='extra';else if(line==='!side')section='side';else if(/^\d+$/.test(line))deck[section].push(Number(line));}return {...r,...deck};});
const ids=Object.keys(content.cpuDecks).filter(k=>content.cpuDecks[k]?.length>=3).sort((a,b)=>a-b);
function shuffle(cards,seed){const a=[...cards];let s=seed>>>0;for(let i=a.length-1;i>0;i--){s=(Math.imul(s,1664525)+1013904223)>>>0;const j=Math.floor(s/4294967296*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const engine=await new MobileDuel(content.cards).init(resources);
for(const c of candidates){
 const resultPath=output+`/tier2-results-${c.character}.json`;if(fs.existsSync(resultPath)){const previous=JSON.parse(fs.readFileSync(resultPath));if(JSON.stringify(previous.main)===JSON.stringify(c.main)&&JSON.stringify(previous.extra)===JSON.stringify(c.extra)&&previous.rows.length===100)continue;}
 const rows=[];
 for(let pair=0;pair<50;pair++)for(let seat=0;seat<2;seat++){
  const id=ids[pair%ids.length],enemy=content.cpuDecks[id][1],seed=20261003+pair*7919;
  const a=shuffle(c.main,seed),b=shuffle(enemy.main,seed+731),row={pair,opponent:Number(id),seat,seed};
  try{engine.start(seat===0?a:b,seat===0?b:a,8000,8000,5,seed,seat===0?c.extra:enemy.extra,seat===0?enemy.extra:c.extra);
   let steps=0;while(!engine.finished&&engine.pending&&steps<5000&&engine.turn<160){engine.respond(engine.auto());steps++;}
   const winner=engine.finished?.player;Object.assign(row,{result:winner===seat?'win':winner===1-seat?'loss':engine.finished?'draw':'unfinished',winner:winner??null,steps,turn:engine.turn,errors:[...engine.errors]});
  }catch(error){row.result='error';row.error=String(error);}finally{engine.destroy();}
  rows.push(row);
 }
 const report={name:c.name,character:c.character,main:c.main,extra:c.extra,lp:8000,openingHand:5,relics:false,rows};fs.writeFileSync(resultPath,JSON.stringify(report));
 console.log(JSON.stringify({name:c.name,n:rows.length,w:rows.filter(r=>r.result==='win').length,l:rows.filter(r=>r.result==='loss').length,unfinished:rows.filter(r=>r.result==='unfinished').length,errors:rows.filter(r=>r.error||r.errors?.length).length}));
}
