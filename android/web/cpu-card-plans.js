// Small bounded planners shared by both CPU seats.
export function tributeSelection(candidates,need){
 // Tribute credit is not monster count: a double-tribute must not cost an extra body.
 let plans=new Map([[0,{cost:0,indices:[]}]]);
 for(const {c,i,score} of candidates){const next=new Map(plans);
  for(const [credit,plan] of plans){if(credit>=need)continue;
   const total=Math.min(need,credit+(c.release_param||1)),cost=plan.cost+Math.max(1,-score),indices=[...plan.indices,i],old=next.get(total);
   if(!old||cost<old.cost||cost===old.cost&&indices.length<old.indices.length)next.set(total,{cost,indices});
  }plans=next;
 }return plans.get(need)?.indices;
}
export function ritualMatches(spell,monster){
 if(!spell||!monster||!(monster.data?.type&1)||!(monster.data?.type&128))return false;
 if(spell.name==='Contract with the Abyss')return monster.attribute==='DARK';
 if(spell.name==='Earth Chant')return monster.attribute==='EARTH';
 if(spell.name==='Advanced Ritual Art')return true;
 return (spell.desc||'').includes('"'+monster.name+'"');
}
export function ritualLevelsReady(levels,target,exact=false){
 if(target<=0)return false;
 if(!exact)return levels.reduce((a,b)=>a+b,0)>=target;
 let sums=new Set([0]);for(const level of levels){for(const sum of [...sums])if(level>0&&sum+level<=target)sums.add(sum+level);if(sums.has(target))return true;}return false;
}
