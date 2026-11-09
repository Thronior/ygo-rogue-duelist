// Iceman (Discord 2026-11-09): against Ordeal of a Traveler the CPU always called Trap. Its seeded guess was nearly
// constant mod 3. It now mixes the seed and weights each type by the opponent's public cards.
import fs from 'node:fs';import assert from 'node:assert/strict';
const {MobileDuel,M,R,L}=await import('./web/duel.js');
const read=n=>JSON.parse(fs.readFileSync(new URL(`./web/${n}.json`,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;
const ORDEAL=id('Ordeal of a Traveler'),SPELL=id('Pot of Greed'),MONSTER=id('Battle Ox');
function guesses(seen,runs=600){
 const counts=[0,0,0];
 for(let i=0;i<runs;i++){
  const e=new MobileDuel(meta.cards);const zones={};e.query=(side,loc)=>zones[`${side}:${loc}`]||[];
  Object.assign(e,{data,lp:[8000,8000],player:1,turn:2+i%9,phase:8,reasoningSeed:(i*7919+13)>>>0,orDealGuesses:i%3,effect:{code:ORDEAL,player:0},activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});
  zones[`0:${L.HAND}`]=[{code:0,controller:0,location:L.HAND,sequence:0}];
  zones[`0:${L.GRAVE}`]=seen.map((code,sequence)=>({code,controller:0,location:L.GRAVE,sequence,position:1}));
  e.handRevealed=()=>false;
  const m={type:M.SELECT_OPTION,player:1,options:[1050,1051,1052]};
  const r=e.auto(m);assert.equal(r.type,R.SELECT_OPTION);counts[r.index]++;
 }
 return counts;
}
const blank=guesses([]);console.log('nothing public:',blank.join(' / '));
for(const n of blank)assert(n>120,'each type is called a fair share with nothing public: '+blank);
const spells=guesses(Array(8).fill(SPELL));console.log('8 Spells in the Graveyard:',spells.join(' / '));
assert(spells[1]>spells[0]&&spells[1]>spells[2],'a Spell-heavy Graveyard makes Spell the likeliest call');
assert(spells[0]>0&&spells[2]>0,'Monster and Trap are still called sometimes');
const monsters=guesses(Array(8).fill(MONSTER));console.log('8 Monsters in the Graveyard:',monsters.join(' / '));
assert(monsters[0]>monsters[1]&&monsters[0]>monsters[2]);
console.log('PASS Ordeal of a Traveler calls vary and follow the public cards');
