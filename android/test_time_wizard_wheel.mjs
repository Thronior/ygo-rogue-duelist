// Time Wizard's roulette: the arrow stops inside the coin result's half of the wheel, never on a divider,
// and towers (heads) and skulls (tails) each own exactly half the wheel, like the coin they stand for.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {WHEEL_SEGMENTS,landingAngle,segmentAt,coinFace,isCoinCall,TIME_WIZARD}=await import('./web/time-wizard-wheel.js');

const arc=heads=>WHEEL_SEGMENTS.filter(s=>s.heads===heads).reduce((sum,s)=>sum+s.to-s.from,0);
assert.equal(arc(true),180,'towers cover half');assert.equal(arc(false),180,'skulls cover half');
assert.equal(WHEEL_SEGMENTS.reduce((sum,s)=>sum+s.to-s.from,0),360,'no gaps or overlaps');

for(const heads of [true,false])for(let i=0;i<=1000;i++){
 const angle=landingAngle(heads,()=>i/1000),seg=segmentAt(angle);
 assert.ok(angle>=0&&angle<360,'angle in range');
 assert.equal(seg.heads,heads,`${heads?'heads':'tails'} lands on ${heads?'a tower':'a skull'} (${angle}°)`);
 for(const s of WHEEL_SEGMENTS)for(const edge of [s.from,s.to]){const d=Math.abs(((angle-edge)%360+540)%360-180);assert.ok(d>=7-1e-9,`clear of the divider at ${edge}° (${angle}°)`)}
}
// Every slice of the result can be hit, top and bottom tower alike.
const hit=heads=>new Set(Array.from({length:200},(_,i)=>WHEEL_SEGMENTS.indexOf(segmentAt(landingAngle(heads,()=>i/200)))));
assert.equal(hit(true).size,2);assert.equal(hit(false).size,4);

assert.deepEqual([coinFace(true).label,coinFace(false).label],['HEADS','TAILS']);
for(const heads of [true,false])assert.ok(existsSync(root+coinFace(heads).icon),coinFace(heads).icon);
assert.ok(existsSync(root+'assets/time-wizard/wheel.webp'));
assert.ok(isCoinCall(['Heads','Tails'])&&isCoinCall(['Tails','Heads']));
assert.ok(!isCoinCall(['Heads effect','Tails effect'])&&!isCoinCall(['Heads'])&&!isCoinCall(['Destroy','Draw']));
assert.equal(TIME_WIZARD,71625222);
// Only Time Wizard's toss is tagged for the wheel; every other coin keeps the 3D coin.
assert.match(readFileSync(root+'android/web/duel.js','utf8'),/kind:'coin',results:m\.results,player:m\.player,wheel:this\.name\(this\.effect\?\.code\)==='Time Wizard'/);
console.log('PASS Time Wizard wheel: lands on its result, clear of dividers, half the wheel per face');
