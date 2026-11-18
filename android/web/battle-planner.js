// Bounded public-board search for the optional World Champion.
// Unknown set cards are never inspected; their tactical effects remain uncertain.
export function planBattle(e,p,L,prompt,smart){
 if(e.battleProtected?.[1-p])return null;
 const own=e.query(p,L.MZONE).filter(Boolean),enemy=e.query(1-p,L.MZONE).filter(Boolean);
 // A monster that attacks twice (Hayabusa Knight) takes two places in the search.
 const attackers=(prompt.attacks||[]).map((c,index)=>({c:own.find(a=>a.sequence===c.sequence)||c,index,direct:c.can_direct})).filter(a=>smart.attackAllowed(a.c,!enemy.length)).flatMap(a=>(smart.swings?.(a.c)??1)-(a.c.attack_count||0)>1?[a,{...a}]:[a]);
 if(attackers.length<2)return null;
 let visited=0;const maxNodes=14000,memo=new Map();
 const defense=t=>{
  if(t.position&1)return t.attack;
  if(!(t.position&5))return smart.hiddenDefense(t);
  return t.defense??1000;
 };
 // A lethal line's score: fewest attacks first (each is a chance for a trap), then the most ATK to spare over the
 // guessed DEF of any face-down monster it attacks, then damage. Players send their biggest monster into an unknown
 // Set card and let the small one finish; the CPU sent the small one, the Set card was a wall and lethal was gone
 // (replay review 2026-11-18: bdb29027094e@13 Alpha into The Dragon Dwelling in the Cave, Suijin left to hit it).
 // Overkill counts too, plus 500: a Set floater (Giant Rat, Mystic Tomato) brings a fresh attacker that only the big
 // monster kept back gets through. On the 83 replay turns where the order mattered this won 54, the old order 42.
 const lethalScore=(left,margin,damage)=>1000000+left*10000+Math.min(margin,damage-e.lp[1-p]+500,4999)+damage/100000;
 function walk(left,targets,damage){
  if(damage>=e.lp[1-p])return {score:lethalScore(left.length,Infinity,damage),line:[],lethal:{left:left.length,damage},margin:Infinity};
  if(!left.length||++visited>maxNodes)return {score:damage,line:[],margin:Infinity};
  const key=left.map(a=>a.index).join(',')+'|'+targets.map(t=>t.sequence).join(',')+'|'+damage;if(memo.has(key))return memo.get(key);
  let best={score:damage,line:[],margin:Infinity};
  for(const a of left){const rest=left.filter(x=>x!==a),power=Math.max(0,a.c.attack||0);
   for(const t of targets.length?(a.direct?[null,...targets]:targets):[null]){
    if(t&&power<=defense(t))continue;
    const dealt=smart.battleDamage(t?((t.position&1)?power-defense(t):smart.pierce(a.c)?Math.max(0,power-defense(t)):0):power);
    if(smart.attackScore(a.c,t,{dmg:dealt})<=-99999)continue;
    // Avoid assuming battle immunity or floating monsters vanish for a future direct attack.
    const text=t&&(t.position&5)?e.cards.get(t.code)?.desc||'':'';
    const immune=t&&!t.is_disabled&&!!text&&smart.battleProof(t,a.c);
    const floats=t&&!t.is_disabled&&/destroyed by battle.*(?:special summon|destroy|return)/is.test(text);
    const remaining=t&&!immune&&!floats?targets.filter(x=>x!==t):targets;
    const next=walk(rest,remaining,damage+dealt),gain=t&&!immune&&!floats?5000+((t.position&5)?Math.max(0,t.attack||0):0)*.3:0;
    const margin=Math.min(next.margin,t&&!(t.position&5)?power-defense(t):Infinity);
    const score=next.lethal?lethalScore(next.lethal.left,margin,next.lethal.damage):next.score+gain;
    if(score>best.score)best={score,line:[{index:a.index,target:t?.sequence??null,attacker:a.c.sequence},...next.line],lethal:next.lethal,margin};
   }
  }
  memo.set(key,best);return best;
 }
 const result=walk(attackers,enemy,0);return result.line[0]?{...result.line[0],lethal:result.score>=1000000}:null;
}
