import fs from 'node:fs';import assert from 'node:assert/strict';import {TagDuel,flipPerspective} from './web/tag-duel.js';import {M,R,I} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),scripts=read('scripts'),passives=JSON.parse(fs.readFileSync('temp/pvp-relic-script.json','utf8'));
const deck={main:Array(30).fill(meta.cards.find(c=>c.name==='Battle Ox').id),extra:[]},config={mode:'pvp',teams:[[deck],[deck]],lp:8000,enemyLP:8000,seed:23,passives};
const e=await new TagDuel(meta.cards).init([data,scripts]);try{
 e.startTag(config);for(let i=0;i<120&&e.turn<5;i++){const seat=e.respondingSeat,m=e.pending,r=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:e.auto(m);e.respondFor(seat,e.responseNumber,seat===1?flipPerspective(r):r)}
 for(const player of [0,1])for(const amount of [200,-200])assert(e.visuals.some(v=>v.kind==='lp'&&v.player===player&&v.amount===amount),'Both humans receive mirrored healing and burn');assert.deepEqual(e.errors,[]);e.destroy();
 e.startTag({...config,passives:passives+'\ndo local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1) e:SetOperation(function() Duel.Damage(0,9000,REASON_EFFECT) Duel.Damage(1,9000,REASON_EFFECT) end) Duel.RegisterEffect(e,0) end'});assert.deepEqual(e.lp,[1000,1000]);assert(!e.finished);assert.deepEqual(e.errors,[]);
 console.log('PASS symmetric healing, burn, and independent Phoenix protection for both humans');
}finally{e.destroy()}
