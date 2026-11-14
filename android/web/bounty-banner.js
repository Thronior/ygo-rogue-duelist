// Bounty List objective banner, shown above the deck editor in solo (mobile.js) and Tag (tag-ui.js).
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bountyBanner(r){
 if(!r?.artifacts?.includes('bounty_list')||!r.bounty_objective)return '';
 const b=r.bounty_objective,rawReward=Number(b.reward),reward=Number.isFinite(rawReward)?Math.max(50,Math.min(120,Math.trunc(rawReward))):50;
 return '<section class="bounty-banner" aria-label="Bounty objective"><strong>BOUNTY</strong><span>'+esc(b.title||'Objective')+'</span><p>'+esc(b.description||'Complete this Duel to earn coins.')+'</p><small>Reward: +'+reward+' coins</small></section>';
}
