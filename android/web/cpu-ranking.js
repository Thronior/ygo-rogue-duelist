// Original implementation inspired by TF3's score-first, shuffled-tie selector.
// No mutable RNG or persistent cache: identical public state gives identical choices.
export function rankedDecision(engine,prompt){
 const mix=n=>{n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0};
 const seed=mix((engine.reasoningSeed||0)^Math.imul(engine.turn||0,2654435761)^Math.imul(engine.phase||0,2246822519)^Math.imul(prompt.type||0,3266489917)^(prompt.player||0));
 const tie=x=>{const c=x.c||{};return mix(seed^Math.imul((c.controller??prompt.player??0)+1,73856093)^Math.imul((c.location||0)+1,19349663)^Math.imul((c.sequence??x.index??x.i??0)+1,83492791))};
 return (a,b)=>a.score===b.score?tie(a)-tie(b):a.score>b.score?-1:1;
}
