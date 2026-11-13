import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

const { MobileDuel, M, R, I, B, L } = await import(new URL('./web/duel.js', import.meta.url));
const json = file => JSON.parse(fs.readFileSync(path.join(root,file), 'utf8').replace(/^\uFEFF/, ''));
const meta = json('android/web/content.json');
const data = json('android/web/engine-data.json');
const scripts = json('android/web/scripts.json');
const id = name => {
  const card = meta.cards.find(c => c.name === name);
  assert(card, name);
  return card.id;
};
const lua = (keys, side = 0) => execFileSync(fs.existsSync(path.join(root,'python/python.exe')) ? path.join(root,'python/python.exe') : 'python', [
  '-B', '-c', 'import passives,sys,json; print(passives.multiplayer_script(dict(curses=[],artifacts=json.loads(sys.argv[1])),int(sys.argv[2])))',
  JSON.stringify(keys), String(side),
], { cwd: root, encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } }).trim();
const setup = (body, flags = 'EVENT_PHASE_START|PHASE_DRAW') => `do local e=Effect.GlobalEffect()
 e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(${flags})
 e:SetOperation(function(e) e:Reset() ${body} end) Duel.RegisterEffect(e,0) end`;
const move = (name, player=0, zone='LOCATION_MZONE') => `Duel.MoveToField(Duel.CreateToken(${player},${id(name)}),${player},${player},${zone},POS_FACEUP_ATTACK,true)`;
const fill = name => Array(40).fill(id(name));
const idle = { type: R.SELECT_IDLECMD, action: I.TO_EP, index: null };
const battle = { type: R.SELECT_BATTLECMD, action: B.TO_EP, index: null };
const query = (e,p,zone,code=0) => e.query(p,zone).filter(c=>c&&(!code||c.code===code));
async function duel({keys, script='', decks=[fill('Waboku'), fill('Waboku')], side=0, turns=1, driver}) {
  const e = await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
  let state = e.start(...decks,8000,8000,5,7,[],[],lua(keys,side)+'\n'+script);
  let steps = 0;
  while (!state.finished && e.pending && e.turn<=turns && ++steps<3000) {
    const m = e.pending;
    const answer = driver?.(e,m) || (m.type===M.SELECT_IDLECMD && m.to_ep ? idle : m.type===M.SELECT_BATTLECMD && m.to_ep ? battle : null);
    state=e.respond(answer||e.auto());
  }
  assert(steps<3000,'duel failed to progress');
  assert.deepEqual(e.errors||[],[],'script errors');
  return e;
}

const OOKAZI=id('Ookazi');
const activate=(m,code)=>{
  const index=m.activates?.findIndex(c=>c.code===code)??-1;
  return index>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index}:null;
};
for (const side of [0,1]) {
  let played=0;
  const decks=[fill('Waboku'),fill('Waboku')];
  decks[side]=fill('Ookazi');
  const script=move('Dark Room of Nightmare',side,'LOCATION_SZONE');
  const e=await duel({keys:['scorched_hourglass'],side,decks,turns:side+1,script:setup(script),driver(e,m){
    if(m.player===side&&m.type===M.SELECT_IDLECMD&&played<2){
      const response=activate(m,OOKAZI);
      if(response){played++;return response}
    }
  }});
  assert.equal(played,2);
  assert.equal(e.lp[1-side],3300,'standby 500 plus twice (Ookazi 800 + Dark Room 300 + two 500 bonuses)');
  e.destroy();
}
console.log('PASS Scorched Hourglass on both sides, two burns per turn with Dark Room of Nightmare');

{
  const breaker=id('Breaker the Magical Warrior'), maiden=id('Maiden of the Aqua');
  const e=await duel({keys:['spell_counter_engine'],
    script:setup(move('Breaker the Magical Warrior')+' '+move('Tower of Babel',0,'LOCATION_SZONE')+' '+move('Maiden of the Aqua')),
    driver(e,m){
      if(m.player===0&&m.type===M.SELECT_CARD&&m.selects?.some(c=>c.code===id('Tower of Babel')))
        return {type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.code===id('Tower of Babel'))]};
    }});
  assert.equal(query(e,0,L.MZONE,breaker)[0].attack,2000);
  assert.equal(query(e,0,L.MZONE,maiden)[0].attack,1100);
  e.destroy();
}
console.log('PASS Spell Counter Engine places two counters and buffs both monsters');

{
  const lv=id('Armed Dragon LV3'), up=id('Level Up!');
  const deck=fill('Waboku'); deck[20]=lv;
  let startingHand;
  const e=await duel({keys:['level_up_chain'],decks:[deck,fill('Waboku')],
    script:setup(move('Armed Dragon LV3')+`
      local c=Duel.CreateToken(1,${id('Command Knight')})
      Duel.MoveToField(c,1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
      local debuff=Effect.CreateEffect(c)
      debuff:SetType(EFFECT_TYPE_FIELD) debuff:SetCode(EFFECT_UPDATE_ATTACK)
      debuff:SetRange(LOCATION_MZONE) debuff:SetTargetRange(0,LOCATION_MZONE)
      debuff:SetValue(-1000) c:RegisterEffect(debuff)
      `+move('Maiden of the Aqua')),driver(e,m){
      if(m.player===0&&m.type===M.SELECT_IDLECMD)startingHand??=query(e,0,L.HAND).map(c=>c.code);
    }});
  assert(startingHand?.includes(lv),JSON.stringify(startingHand));
  assert(startingHand?.includes(up));
  assert.equal(query(e,0,L.MZONE,lv)[0].attack,1700);
  assert.equal(query(e,0,L.MZONE,id('Maiden of the Aqua'))[0].attack,0);
  e.destroy();
}
console.log('PASS Level Up Chain opening hand, ATK, and monster-effect immunity');

{
  const king=id('Terrorking Archfiend'), soldier=id('Archfiend Soldier');
  const e=await duel({keys:['terrorking_magnus'],script:setup(move('Terrorking Archfiend')+' '+move('Archfiend Soldier')+' '+move('Archfiend Soldier',1))});
  assert.equal(query(e,0,L.MZONE,king)[0].attack,2800);
  assert.equal(query(e,0,L.MZONE,soldier)[0].attack,2700);
  assert.equal(query(e,1,L.MZONE,soldier)[0].attack,1900);
  assert.equal(e.lp[0],8800);
  e.destroy();
}
console.log('PASS Terrorking Magnus counts itself and friendly Archfiends and refunds double actual LP');

{
  const spirit=id('Yamata Dragon'), ox=id('Battle Ox');
  const grave=Array.from({length:4},()=>`Duel.SendtoGrave(Duel.CreateToken(0,${ox}),REASON_RULE)`).join(' ');
  let seen=new Set(), attack=0;
  const e=await duel({keys:['spirit_sanctuary'],decks:[fill('Yamata Dragon'),fill('Waboku')],turns:3,script:setup(grave),driver(e,m){
    if(m.player!==0)return;
    if(m.type===M.SELECT_IDLECMD){
      attack=Math.max(attack,query(e,0,L.MZONE,spirit)[0]?.attack||0);
      const index=m.summons?.findIndex(c=>c.code===spirit)??-1;
      if(index>=0&&!seen.has(e.turn)){seen.add(e.turn);return {type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index};}
    }
    if(m.type===M.SELECT_CARD&&m.selects?.every(c=>c.location===L.GRAVE))return {type:R.SELECT_CARD,indicies:[0,1]};
    if(m.type===M.SELECT_EFFECTYN&&m.code===spirit&&e.phase===512)return {type:R.SELECT_EFFECTYN,yes:true};
  }});
  assert.deepEqual([...seen],[1,3]);
  assert.equal(attack,3100);
  assert.equal(query(e,0,L.REMOVED).length,4);
  assert.equal(e.lp[0],9000);
  e.destroy();
}
console.log('PASS Spirit Sanctuary repeated Tribute Summons, ATK, and return-to-hand LP');

{
  const apophis=id('Embodiment of Apophis'), zoma=id('Zoma the Spirit');
  const deck=fill('Waboku'); deck[20]=zoma;
  const e=await duel({keys:['living_traps'],decks:[deck,fill('Waboku')],script:setup(
    `local c=Duel.CreateToken(0,${apophis})
    Duel.MoveToField(c,0,0,LOCATION_SZONE,POS_FACEUP,true)
    c:AddMonsterAttribute(TYPE_NORMAL|TYPE_TRAP)
    Duel.SpecialSummonStep(c,0,0,0,true,false,POS_FACEUP_ATTACK)
    c:AddMonsterAttributeComplete()
    Duel.SpecialSummonComplete()`),driver(e,m){
      if(m.player===0&&m.type===M.SELECT_CARD&&m.selects?.some(c=>c.code===zoma))
        return {type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.code===zoma)]};
    }});
  assert.equal(query(e,0,L.SZONE,zoma).length,1,JSON.stringify({monsters:query(e,0,L.MZONE).map(c=>[c.code,c.attack]), spells:query(e,0,L.SZONE).map(c=>c.code), deck:query(e,0,L.DECK).length}));
  assert.equal(query(e,0,L.MZONE,apophis)[0].attack,2200);
  assert.equal(query(e,0,L.MZONE,apophis)[0].defense,2400);
  e.destroy();
}
console.log('PASS Living Traps sets a different Trap Monster from the Deck');

{
  const pairs=[
    ['Guardian Baou','Wicked-Breaking Flamberge - Baou'],['Guardian Ceal','Shooting Star Bow - Ceal'],
    ['Guardian Elma','Butterfly Dagger - Elma'],['Guardian Grarl','Gravity Axe - Grarl'],
    ["Guardian Kay'est","Rod of Silence - Kay'est"],['Guardian Tryce','Twin Swords of Flashing Light - Tryce'],
  ].map(pair=>pair.map(id));
  let hand;
  const e=await duel({keys:['guardians_armory'],driver(e,m){
    if(m.player===0&&m.type===M.SELECT_IDLECMD)hand??=query(e,0,L.HAND).map(c=>c.code);
  }});
  assert(pairs.some(pair=>pair.every(code=>hand?.includes(code))),JSON.stringify(hand));
  e.destroy();
}
console.log('PASS Guardian’s Armory starts with a matched pair');

for(const matched of [false,true]){
  const grarl=id('Guardian Grarl'), equip=matched?'Gravity Axe - Grarl':'Axe of Despair';
  const e=await duel({keys:['guardians_armory'],script:setup(move('Guardian Grarl')+`
    local guardian=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_MZONE,0,nil,${grarl}):GetFirst()
    ${move(equip,0,'LOCATION_SZONE')}
    if guardian:IsCanBeEffectTarget(e) then Duel.SetLP(0,7000) end
    Duel.Destroy(guardian,REASON_EFFECT)
  `)});
  assert.equal(query(e,0,L.MZONE,grarl).length,matched?1:0);
  assert.equal(e.lp[0],matched?8000:7000);
  e.destroy();
}
console.log('PASS Guardian’s Armory targeting and destruction protection only with the matching equip');
