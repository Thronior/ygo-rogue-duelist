// Run in a child process so a regression cannot hang the test runner indefinitely.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {shuffleCPUDeck} from './web/cpu-viewer.js';

if (!process.argv.includes('--child')) {
  const run=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--child'],{timeout:30000,encoding:'utf8'});
  process.stdout.write(run.stdout||'');
  process.stderr.write(run.stderr||'');
  assert.ifError(run.error);
  assert.equal(run.status,0,'Trap-return regression failed');
} else {
  const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
  const fixture=read('./fixtures/pegasus-odion-30715010.json');
  const meta=read('./web/content.json');
  const e=await new MobileDuel(meta.cards).init([read('./web/engine-data.json'),read('./web/scripts.json')]);
  const pass='-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end';
  const apophis=28649820;
  for (const mode of ['full','space','permanent']) {
    try {
      const [a,b]=fixture.decks;
      let s=e.start(shuffleCPUDeck(a.main,fixture.seed,0),shuffleCPUDeck(b.main,fixture.seed,1),8000,8000,5,fixture.seed,a.extra,b.extra,pass);
      for(let n=0;n<128;n++)s=e.respond(fixture.responses[n]);
      assert.equal(s.turn,7);
      assert(e.query(0,L.MZONE).some(c=>c?.code===apophis),'Original stolen Apophis must be present');
      if(mode==='permanent') {
        // A still-valid permanent control effect must not be mistaken for an expired theft.
        e.core.loadScript(e.h,'test-permanent-control.lua',`local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
local e=Effect.CreateEffect(c)
e:SetType(EFFECT_TYPE_SINGLE)
e:SetCode(EFFECT_SET_CONTROL)
e:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
e:SetValue(0)
c:RegisterEffect(e)`);
      }
      if(mode==='space'){
        s=e.respond({...fixture.responses[128],yes:false});
        for(let n=0;n<5&&!e.query(1,L.MZONE).some(c=>c?.code===apophis);n++)s=e.respond(e.auto());
      }
      else for(let n=128;n<131;n++)s=e.respond(fixture.responses[n]);
      if(mode==='full')assert(e.query(1,L.GRAVE).some(c=>c?.code===apophis),'Impossible return must resolve by rule');
      if(mode==='space')assert(e.query(1,L.MZONE).some(c=>c?.code===apophis),'Return normally when a zone is free');
      if(mode==='permanent')assert(e.query(0,L.MZONE).some(c=>c?.code===apophis),'Permanent control must survive');
      let decisions=0;
      while(!s.finished&&decisions++<3000)s=e.respond(e.auto());
      assert(s.finished,'Duel must finish');
      assert.deepEqual(e.errors,[]);
      console.log('PASS original decks/seed:',mode,'turns',s.turn,'remaining decisions',decisions);
    } finally {e.destroy();}
  }
}
