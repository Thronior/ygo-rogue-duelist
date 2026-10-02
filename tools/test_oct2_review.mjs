import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R} from '../android/web/duel.js';
import {automaticChainResponse,liveCardFacts} from '../android/web/duel-presentation.js';
import {preloadCards,cardImages} from '../android/web/card-assets.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../android/web/'+n+'.json',import.meta.url)));
const content=read('content'),byName=n=>content.cards.find(c=>c.name===n);
assert.equal(content.characters[5].cards.at(-1),'The Mask of Remnants');
assert.equal(automaticChainResponse({type:M.SELECT_CHAIN,player:0,forced:true,selects:[{}]},false,M,R).index,0);
for(const skip of [true,false])assert.equal(automaticChainResponse({type:M.SELECT_CHAIN,player:0,forced:true,selects:[{},{}]},skip,M,R),null);
assert.equal(automaticChainResponse({type:M.SELECT_CHAIN,player:0,forced:false,selects:[{}]},false,M,R),null);
assert.equal(automaticChainResponse({type:M.SELECT_CHAIN,player:1,forced:true,selects:[{}]},false,M,R),null);
assert.equal(liveCardFacts(byName('Blue-Eyes White Dragon'),{attribute:32,attack:3300},content.cards).attribute,'DARK');
let liveURLs=0,maxURLs=0;await preloadCards(content.cards.slice(0,100),()=>{},{fetchImage:async()=>new Response(new Blob(['art'])),validateImage:async()=>{},makeURL:()=>{maxURLs=Math.max(maxURLs,++liveURLs);return 'blob:test'},revokeURL:()=>--liveURLs});
assert.equal(liveURLs,0);assert.ok(maxURLs<=4);assert.ok([...cardImages.values()].every(u=>!u.startsWith('blob:')));
console.log('PASS prompt ordering, live attributes, signature card and bounded artwork validation');
const e=await new MobileDuel(content.cards).init([read('engine-data'),read('scripts')]);
const mermaid=byName('Cure Mermaid').id,normal=byName('Giant Soldier of Stone').id;
const script=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_DRAW) e:SetOperation(function(e) e:Reset() local c=Duel.CreateToken(0,${mermaid}) Duel.MoveToField(c,0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end) Duel.RegisterEffect(e,0)`;
e.start(Array(40).fill(normal),Array(40).fill(normal),8000,8000,5,125,[],[],script);
let found=false;for(let i=0;i<150&&!e.finished;i++){
 const m=e.pending;
 if(m.type===M.SELECT_CHAIN&&m.player===0&&m.selects.some(c=>c.code===mermaid)){const response=automaticChainResponse(m,false,M,R);assert.ok(response,'lone Cure Mermaid trigger auto-resolves');e.respond(response);found=true;break;}
 e.respond(e.auto());
}
assert.ok(found);assert.deepEqual(e.errors,[]);e.destroy();console.log('PASS real-engine Cure Mermaid mandatory Standby trigger');
