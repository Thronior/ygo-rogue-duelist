// Duel Bets: plays whole CPU vs CPU duels off the main thread and posts back each recorded timeline
// (idle-bets-sim.js). The page sends the duel data and only the card scripts the CPU decks use (the web build
// splits scripts.json into chunks, so the page's own loader, engine.js loadDuelResources, reads them).
import {MobileDuel} from './duel.js';
import {recordDuel} from './idle-bets-sim.js';

let engine=null,decks=null,ready=null;
const late={};
function missingScript(target,name){
 // A card an effect creates that no deck lists: ask the page for it. This duel goes on without it; later ones have it.
 if(!late[name]){late[name]=1;postMessage({type:'missing',name})}
 return undefined}
async function init({cards,deckList,data,scripts}){
 decks=deckList;
 engine=await new MobileDuel(cards).init([data,scripts]);
 engine.scripts=new Proxy(engine.scripts,{get(target,name){if(typeof name!=='string'||name in target||!/^c\d+\.lua$/.test(name))return target[name];return missingScript(target,name)}});
}
onmessage=async({data:m})=>{
 try{
  if(m.type==='init'){ready=init(m);await ready;postMessage({type:'ready'});return}
  if(m.type==='script'){await ready;if(m.text)engine.scripts[m.name]=m.text;return}
  if(m.type==='sim'){await ready;const t0=performance.now();
   const tl=recordDuel(engine,[decks[m.seats[0].key],decks[m.seats[1].key]],m.seats.map(({id,tier})=>({id,tier})),m.seed,{lp:m.lp||[8000,8000],passives:m.passives||''});if(m.sig)tl.mods=m.sig;
   engine.visuals?.splice?.(0);
   postMessage({type:'done',id:m.id,tl,ms:performance.now()-t0});return}
 }catch(error){postMessage({type:'failed',id:m.id,error:String(error?.message||error)})}
};
