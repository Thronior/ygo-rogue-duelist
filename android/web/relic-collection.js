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
export function sortRelicCollection(rows,artifacts){
 return rows.map(row=>({...row,relicKind:row.id.startsWith('cursed_')?'Cursed Relics':'Normal Relics',effectGroup:relicEffectGroup(row.id,artifacts[row.id][2])})).sort((a,b)=>Number(a.relicKind==='Cursed Relics')-Number(b.relicKind==='Cursed Relics')||relicEffectGroups.indexOf(a.effectGroup)-relicEffectGroups.indexOf(b.effectGroup)||a.name.localeCompare(b.name));
}
