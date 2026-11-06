// Behaviour flags 2026-11-06: the CPU Normal Summoned Nuvia the Wicked (it destroys itself when Normal Summoned) and
// equipped its own Spirit Reaper (destroyed when targeted). Replays 55fe592a12 and bdcd35cfce.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const e=new MobileDuel([...meta.cards,...meta.tokenCards]);
let checks=0;
for(const name of ['Nuvia the Wicked','Boar Soldier']){assert(e.destroyedOnNormalSummon({code:id(name)}),`${name} is never Normal Summoned`);checks++}
for(const name of ['Dark Dust Spirit','Dragon Seeker','Battle Ox','Spirit Reaper']){assert(!e.destroyedOnNormalSummon({code:id(name)}),`${name} can be Normal Summoned`);checks++}
const policy=fs.readFileSync(root+'android/web/smart_policy.js','utf8'),equip=policy.slice(policy.indexOf(' function equipUseful('),policy.indexOf(' function equipUseful(')+400);
assert.match(equip,/destroyedWhenTargeted\(target\)/,'equipUseful skips your own destroyed-when-targeted monsters');checks++;
console.log(`PASS Nuvia/Boar Soldier summons and Spirit Reaper equips (${checks} checks)`);
