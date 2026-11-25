// Free Duels unlock (user, 2026-11-25): everyone with a won run already on record gets it without winning again.
// Run wins on the profile (kept from before Run History existed) or a completed Run History row, solo or Tag. Not a
// single duel win (`victories`), not an Easy run, not a lost run. The unlock-everything test codes open it too.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const body=src.match(/function sandboxUnlocked\(\)\{[^\n]*\}/)?.[0];assert(body,'sandboxUnlocked() is in mobile.js');
const unlocked=state=>new Function('state',body+';return sandboxUnlocked()')(state);
const fresh={wins:0,runs:3,victories:0,won_as:[]};
assert.equal(unlocked({profile:fresh,history:[]}),false,'a new player has no Free Duels');
assert.equal(unlocked({profile:{...fresh,victories:12},history:[{result:'lost'}]}),false,'duel wins in lost runs are not a won run');
assert.equal(unlocked({profile:{...fresh,wins:1,won_as:[0]},history:[]}),true,'a run win from before Run History existed');
assert.equal(unlocked({profile:{...fresh,won_as:[4]},history:[]}),true,'won_as alone');
assert.equal(unlocked({profile:fresh,history:[{result:'lost'},{result:'complete',mode:'solo'}]}),true,'a completed solo run in history');
assert.equal(unlocked({profile:fresh,history:[{result:'complete',mode:'tag'}]}),true,'a completed Tag run in history');
assert.equal(unlocked({profile:fresh,history:[{result:'complete',easy:true}]}),false,'Easy runs unlock nothing');
assert.equal(unlocked({profile:{...fresh,run_history:[{result:'complete'}]}}),true,'history read from the profile when the list is not loaded');
assert.equal(unlocked({profile:{...fresh,unlock_all:true},history:[]}),true,'heartofthecards');
assert.equal(unlocked({profile:{...fresh,testing_all_clears:true},history:[]}),true,'touchgrass');
assert.equal(unlocked({history:[]}),false,'no profile yet');
console.log('PASS Free Duels unlock: past run wins and completed history rows count; duel wins, Easy and lost runs do not');
