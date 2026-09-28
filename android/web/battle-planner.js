// Bounded public-board search for the optional World Champion.
// Unknown set cards are never inspected; their tactical effects remain uncertain.
export function planBattle(e,p,L,prompt,smart){
 if(e.battleProtected?.[1-p])return null;
 const own=e.query(p,L.MZONE).filter(Boolean),enemy=e.query(1-p,L.MZONE).filter(Boolean);
 if(enemy.some(c=>!(c.position&5)))return null;
 const attackers=(prompt.attacks||[]).map((c,index)=>({c:own.find(a=>a.sequence===c.sequence)||c,index,direct:c.can_direct})).filter(a=>smart.attackAllowed(a.c,!enemy.length));
 if(attackers.length<2)return null;
 let visited=0;const maxNodes=14000,memo=new Map();
 const defense=t=>(t.position&1)?t.attack:t.defense;
 function walk(left,targets,damage){
  if(damage>=e.lp[1-p])return {score:1000000+damage,line:[]};
  if(!left.length||++visited>maxNodes)return {score:damage,line:[]};
  const key=left.map(a=>a.index).join(',')+'|'+targets.map(t=>t.sequence).join(',')+'|'+damage;if(memo.has(key))return memo.get(key);
  let best={score:damage,line:[]};
  for(const a of left){const rest=left.filter(x=>x!==a),power=Math.max(0,a.c.attack||0);
   for(const t of targets.length?(a.direct?[null,...targets]:targets):[null]){
    if(t&&power<=defense(t))continue;
    const dealt=smart.battleDamage(t?((t.position&1)?power-defense(t):smart.pierce(a.c)?Math.max(0,power-defense(t)):0):power);
    if(smart.attackScore(a.c,t,{dmg:dealt})<=-99999)continue;
    // Avoid assuming battle immunity or floating monsters vanish for a future direct attack.
    const text=t?e.cards.get(t.code)?.desc||'':'';
    const immune=t&&!t.is_disabled&&/cannot be destroyed (?:by|as a result of) battle/i.test(text);
    const floats=t&&!t.is_disabled&&/destroyed by battle.*(?:special summon|destroy|return)/is.test(text);
    const remaining=t&&!immune&&!floats?targets.filter(x=>x!==t):targets;
    const next=walk(rest,remaining,damage+dealt),gain=t&&!immune&&!floats?5000+Math.max(0,t.attack||0)*.3:0;
    const score=next.score+gain;
    if(score>best.score)best={score,line:[{index:a.index,target:t?.sequence??null,attacker:a.c.sequence},...next.line]};
   }
  }
  memo.set(key,best);return best;
 }
 const result=walk(attackers,enemy,0);return result.line[0]||null;
}
