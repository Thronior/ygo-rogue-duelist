export const relicEffectGroups=['Healing','Damage','Shop and Coins','ATK Increase','DEF Increase','Other'];
export function relicEffectGroup(id,text){
 const benefit=text.split('.')[0];
 if(/heal|your LP become 0|recover.*LP|gain [\d,]+ (?:additional )?LP/i.test(benefit))return 'Healing';
 if(/inflict|deal .*damage|opponent.*(?:takes?|loses?).*(?:damage|LP)|battle damage.*(?:double|increase)/i.test(benefit))return 'Damage';
 if(/shop|coin|booster|reroll|reveal|prices|refund|purchase/i.test(text))return 'Shop and Coins';
 if(/gains? [\d,]+ (?:additional )?ATK|ATK[^.]*(?:increase|gain)|increase[^.]*ATK/i.test(benefit))return 'ATK Increase';
 if(/gains? [\d,]+ (?:additional )?DEF|DEF[^.]*(?:increase|gain)|increase[^.]*DEF/i.test(benefit))return 'DEF Increase';
 if(/damage|opponent starts.*fewer LP/i.test(benefit))return 'Damage';
 return 'Other';
}
// Collection › Relics groups (2026-11-17): normal, then fused (every fusion, cursed pieces included), then cursed.
export const relicKinds=['Normal Relics','Fused Relics','Shadow Relics'];
export function sortRelicCollection(rows,artifacts,fused=[]){
 const fusedIds=new Set(fused),kind=id=>fusedIds.has(id)?'Fused Relics':id.startsWith('cursed_')?'Shadow Relics':'Normal Relics';
 return rows.map(row=>({...row,relicKind:kind(row.id),effectGroup:relicEffectGroup(row.id,artifacts[row.id][2])})).sort((a,b)=>relicKinds.indexOf(a.relicKind)-relicKinds.indexOf(b.relicKind)||relicEffectGroups.indexOf(a.effectGroup)-relicEffectGroups.indexOf(b.effectGroup)||a.name.localeCompare(b.name));
}
