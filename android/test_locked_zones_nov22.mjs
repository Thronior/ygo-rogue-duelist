// Locked zones (user, 2026-11-22): the snapshot reports every locked zone per player as bits (Monster Zones 0-4, Spell &
// Trap Zones 8-13): a Trap Monster's own Spell & Trap Zone, and zones the core disables (Narrow Gate).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const {MobileDuel,M,R,L}=await import(new URL('./web/duel.js',import.meta.url));
const json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const id=n=>meta.cards.find(c=>c.name===n).id,fill=n=>Array(40).fill(id(n));
const python=fs.existsSync(path.join(root,'python/python.exe'))?path.join(root,'python/python.exe'):'python';
const lua=keys=>execFileSync(python,['-B','-c',`import passives,json; print(passives.multiplayer_script(dict(curses=[],artifacts=${JSON.stringify(keys)}),0))`],{cwd:root,encoding:'utf8'}).trim();
async function run(script){const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);let s=e.start(fill('Waboku'),fill('Waboku'),8000,8000,5,5,[],[],script),n=0;while(!s.finished&&e.pending&&e.turn<=1&&++n<500)s=e.respond(e.pending.type===M.SELECT_IDLECMD&&e.pending.to_ep?{type:R.SELECT_IDLECMD,action:7,index:null}:e.auto());return e}
{
 const apophis=id('Embodiment of Apophis');
 const e=await run(`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW)
 e:SetOperation(function(e) e:Reset() local c=Duel.CreateToken(0,${apophis}) Duel.MoveToField(c,0,0,LOCATION_SZONE,POS_FACEUP,true,1<<2)
 c:AddMonsterAttribute(TYPE_NORMAL|TYPE_TRAP) Duel.SpecialSummonStep(c,0,0,0,true,false,POS_FACEUP_ATTACK) c:AddMonsterAttributeComplete() Duel.SpecialSummonComplete() end) Duel.RegisterEffect(e,0) end`);
 const s=e.snapshot();
 assert.equal(e.query(0,L.MZONE).filter(Boolean).length,1,'Apophis is a monster');
 assert.equal(s.players[0].locked&(1<<10),1<<10,'its Spell & Trap Zone 3 is locked: '+s.players[0].locked.toString(2));
 assert.equal(s.players[1].locked,0);
 e.destroy();
}
console.log('PASS a Trap Monster locks the Spell & Trap Zone it came from');
{
 const e=await run(lua(['cursed_narrow_gate']));
 const s=e.snapshot();
 // The first and last of each (user, 2026-11-23): Monster Zones 0 and 4, Spell & Trap Zones 0 and 4, never the Field Zone.
 for(const p of s.players){
  assert.equal(p.locked&0x1f,0x11,'Narrow Gate disables Monster Zones 1 and 5 on both sides: '+s.players.map(p=>p.locked.toString(2)));
  assert.equal((p.locked>>8)&0x3f,0x11,'and Spell & Trap Zones 1 and 5, not the Field Zone: '+p.locked.toString(2));
 }
 e.destroy();
}
console.log('PASS Narrow Gate\u2019s disabled zones are reported as locked');
