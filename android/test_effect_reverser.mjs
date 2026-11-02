// Effect Reverser in the real core: both players at base, only what you do to your opponent at Level 2+.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
import {curseDescription,curseIconFile} from './web/experience-ui.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\ufeff/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');let checks=0;
const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};const ok=(v,why)=>{assert.ok(v,why);checks++};
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.')\n${code}`],{cwd:root,maxBuffer:1<<26}).toString();
const script=(curses=[],level=0,artifacts=[])=>py(`import passives;print(passives.script(${JSON.stringify({curses,artifacts,challenge_level:level})}))`);
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const idle=()=>{for(let i=0;i<60&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==0);i++)e.respond(e.auto());return e.pending};
const activate=name=>{const m=idle(),k=m.activates.findIndex(x=>x.code===id(name));if(k<0)return false;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});idle();return true};
const OX=id('Battle Ox'),POT=id('Pot of Greed'),OOKAZI=id('Ookazi'),GOBLIN=id('Upstart Goblin'),KETO=id('Dian Keto the Cure Master');
const start=(mine,enemy,s)=>e.start(Array(40).fill(mine),Array(40).fill(enemy),8000,8000,5,3,[],[],s);
// What one of your cards does to both LP totals.
const mine=(card,name,s)=>{start(card,OX,s);ok(activate(name),name+' can be activated');return [...e.lp]};
// What the opponent's cards do. force plays them even when the CPU would rather hold them.
const theirs=(card,s,force=true)=>{start(POT,card,s);for(let i=0;i<220&&e.turn<3&&e.pending&&!e.finished;i++){const m=e.pending,k=force&&m.type===M.SELECT_IDLECMD&&m.player===1?m.activates.findIndex(x=>x.code===card):-1;e.respond(k>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}:e.auto())}return [...e.lp]};

// Base: both players.
const base=script(['effect_reverser']);
same(mine(OOKAZI,'Ookazi',base),[8000,8800],'your effect damage heals your opponent');
same(mine(GOBLIN,'Upstart Goblin',base),[8000,7000],'healing you give your opponent damages them');
same(mine(KETO,'Dian Keto the Cure Master',base),[7000,8000],'your own healing damages you');
ok(theirs(OOKAZI,base)[0]>8000,'their effect damage heals you');
ok(theirs(KETO,base)[1]<8000,'their own healing damages them');
same(theirs(KETO,base,false)[1],8000,'so the CPU holds its healing');
same(theirs(OX,base),theirs(OX,script()),'battle damage is untouched');
start(POT,OX,script(['effect_reverser','spell_jammer']));activate('Pot of Greed');same(e.lp,[7700,8000],'LP costs are not damage');

// Level 2+: only what you do to your opponent.
const amplified=script(['effect_reverser'],2);
same(mine(OOKAZI,'Ookazi',amplified),[8000,8800],'amplified: your effect damage heals your opponent');
same(mine(GOBLIN,'Upstart Goblin',amplified),[8000,7000],'amplified: healing you give your opponent damages them');
same(mine(KETO,'Dian Keto the Cure Master',amplified),[9000,8000],'amplified: your own healing still heals');
ok(theirs(OOKAZI,amplified)[0]<8000,'amplified: their effect damage still hurts you');
ok(theirs(KETO,amplified)[1]>8000,'amplified: their own healing still heals them');
ok(theirs(GOBLIN,amplified)[0]>8000,'amplified: LP they give you still heals you');
same(theirs(OX,amplified),theirs(OX,script([],2)),'amplified: battle damage is untouched');

// Alongside other reversal and LP rules.
same(mine(OOKAZI,'Ookazi',script(['effect_reverser'],0,['cursed_reversed_remedy'])),[8000,7200],'Reversed Remedy cancels the curse: back to normal');
same(mine(KETO,'Dian Keto the Cure Master',script(['effect_reverser'],0,['cursed_reversed_remedy'])),[9000,8000],'healing is back to normal too, without looping');
same(mine(OOKAZI,'Ookazi',script(['effect_reverser'],2,['cursed_reversed_remedy'])),[8000,7200],'at Level 2 your burn is flipped twice as well');
same(mine(KETO,'Dian Keto the Cure Master',script(['effect_reverser'],2,['cursed_reversed_remedy'])),[7000,8000],'the relic still hurts your healing at Level 2');
start(POT,OX,script(['effect_reverser','spell_jammer'],0,['cursed_reversed_remedy']));activate('Pot of Greed');same(e.lp,[8300,8000],'the relic still turns LP costs into healing');
same(mine(KETO,'Dian Keto the Cure Master',script(['effect_reverser','no_recovery'])),[7000,8000],'Withered Hope does not soften the reversed healing');
same(mine(KETO,'Dian Keto the Cure Master',script(['effect_reverser','no_recovery'],2)),[8000,8000],'amplified: Withered Hope still blocks your healing');
same(mine(OOKAZI,'Ookazi',script(['effect_reverser','fireproof_vest'])),[8000,8800],'Fireproof Vest does not shrink the healing');
same(mine(OOKAZI,'Ookazi',script(['effect_reverser','fireproof_vest'],2)),[8000,8800],'Effect Reverser wins over the amplified Vest');
const bargain=script(['effect_reverser'],0,['cursed_zombies_bargain']);
same(mine(KETO,'Dian Keto the Cure Master',bargain),[8000,8000],"Zombie's Bargain: your healing does nothing");
same(theirs(OOKAZI,bargain),[8000,8000],"Zombie's Bargain: reversed damage cannot heal you, so nothing happens");
e.destroy();

// The CPU plans around the base version only.
const healing=(curses,level)=>smartContext({player:1,phase:4,data:{},cards:new Map(),lp:[8000,8000],name:()=>'Monster',query:()=>[],activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],activeCurses:curses,challengeLevel:level}},1,L).healingAllowed(1);
same([healing([],0),healing(['effect_reverser'],0),healing(['effect_reverser'],1),healing(['effect_reverser'],2)],[true,false,false,true],'the CPU stops healing at base levels only');

// Text, icon and drawing.
const rows=JSON.parse(py(`import json,challenge_levels as c,content,feedback_update as f
key='effect_reverser';print(json.dumps([c.curse_description(dict(challenge_level=2),key,content.CURSES[key][1]),c.curse_description(dict(challenge_level=1),key,content.CURSES[key][1]),f.dedupe_curses([key,key]),f.draw_curses(__import__('random').Random(1),60,existing=[key]).count(key)]))`));
same(rows[0],curseDescription(meta,'effect_reverser',2),'Python and the client share the amplified text');
same(rows[1],curseDescription(meta,'effect_reverser',1),'and the base text');
same(rows[2],['effect_reverser'],'it never stacks');same(rows[3],0,'and is never drawn twice');
ok(curseIconFile('effect_reverser').includes('recover-life-points'),'it has its own icon entry');
console.log(`PASS Effect Reverser: ${checks} checks`);
