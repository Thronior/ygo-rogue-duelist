export const monsterTypes=['Warrior','Spellcaster','Fairy','Fiend','Zombie','Machine','Aqua','Pyro','Rock','Winged Beast','Plant','Insect','Thunder','Dragon','Beast','Beast-Warrior','Dinosaur','Fish','Sea Serpent','Reptile','Psychic','Divine-Beast','Creator God','Wyrm','Cyberse','Illusion'];

export const attributes={1:'EARTH',2:'WATER',4:'FIRE',8:'WIND',16:'LIGHT',32:'DARK',64:'DIVINE'};

export function effectiveAttributes(c,run,index){
 if(!(c.data.type&1))return [];
 const base=attributes[run.card_mods?.[index]?.[3]]||c.attribute;
 const values=new Set(base?[base]:[]);
 for(const raw of run.artifacts||[]){const id=raw==='magic_mirror'?run.mirror_copy:raw;if(/^attribute_(light|dark|fire|water|wind|earth)$/.test(id||''))values.add(id.slice(10).toUpperCase());}
 return [...values];
}

export function frameLevelName(a,b){const frame=c=>{const t=c.data.type;return t&1?t&64?3:t&128?2:t&16?0:1:t&2?4:5};return frame(a)-frame(b)||(b.level||0)-(a.level||0)||a.name.localeCompare(b.name)||a.id-b.id;}

export function effectiveAttribute(c,run,index){
 return effectiveAttributes(c,run,index).join(' / ');
}
export function attributeOrder(indices,pool,lookup,run){
 const values=new Map(indices.map(i=>[i,lookup(pool[i]).data.type&1?effectiveAttribute(lookup(pool[i]),run,i):'~']));
 return indices.sort((a,b)=>Number(!(lookup(pool[a]).data.type&1))-Number(!(lookup(pool[b]).data.type&1))||values.get(a).localeCompare(values.get(b))||frameLevelName(lookup(pool[a]),lookup(pool[b]))||a-b);
}

export function modifiedCard(c,run,index){const m=run.card_mods?.[index];let race=m?.[2]?monsterTypes[Math.log2(m[2])]:c.race;return {...c,atk:Math.max(0,c.atk+(m?.[0]||0)),defense:Math.max(0,c.defense+(m?.[1]||0)),race:run.artifacts?.includes('dna_rewrite')&&run.monster_type||race,attribute:effectiveAttribute(c,run,index)};}

// Preview permanent modifiers. Field/turn-dependent effects are evaluated by the duel core.

export function deckStats(card,run,index,info){let c=modifiedCard(card,run,index),a=c.atk,d=c.defense;if(run.challenge_level===-1){a=card.atk;d=card.defense;if(run.artifacts?.includes('sword_and_shield'))[a,d]=[d,a];return [a,d]}if(run.artifacts?.includes('sword_and_shield'))[a,d]=[d,a];const t=c.data.type,l=c.level,cardAttributes=effectiveAttributes(card,run,index);

 for(const raw of run.artifacts||[]){const id=raw==='magic_mirror'?run.mirror_copy:raw,r=info[id];if(!r)continue;const k=r.effect,n=Number(r.amount)||0,f=r.filter||'';const matches=!f||f.split('/').includes(c.race)||cardAttributes.includes(f)||(c.race==='Beast-Warrior'&&['Warrior','Beast'].includes(f));

 if(k==='atk'&&matches)a+=n;else if(k==='def')d+=n;else if(k==='both'&&matches){a+=n;d+=n;}else if(k==='normal'&&(t&16)||k==='tribute'&&l>=5||k==='small'&&l<=3)a+=n;



 else if(k==='variant_chitin_carapace'&&c.race==='Insect')d+=400;

 else if(k==='variant_village_banner'&&l===4&&(t&16)){a+=200;d+=200;}

 else if(k==='approved_ritual_vestment'&&(t&128)||k==='approved_fusion_insignia'&&(t&64)){a+=300;d+=300;}

 else if(k==='approved_blood_crown')a+=500;

 else if(k==='approved_brittle_armor'){a-=300;d+=900;}

 else if(k==='approved_cracked_sword'){a+=300;d-=1000;}

 else if(k==='approved_ashen_nursery')a+=l<=3?700:l>=5?-700:0;

 else if(k==='approved_giants_oath')a+=l>=5?800:l<=4?-400:0;
 else if(k==='approved_commoners_chain'){const v=t&16?300:t&32?-200:0;a+=v;d+=v;}
 else if(k==='approved_zombies_bargain')a+=800;
 else if(k==='approved_warriors_vow')a+=200;
 else if(k==='approved_ritual_scar'&&(t&128))a+=1000;
 else if(k==='approved_fusion_fever'&&(t&64))a+=800;
 else if(k==='variant_swordsman_oath'&&c.data.setcodes?.some(code=>(Number(code)&0xfff)===0x41))a+=400;
 else if(k==='approved_golden_grave')d-=200;

 else if(k==='approved_iron_silence'){a+=600;d+=600;}

 }

 return [Math.max(0,a),Math.max(0,d)];

}

export function deckCardMarkup(html,c,r,i,info){const fresh=i>=(r.new_cards_from??r.pool.length),stats=c.data.type&1?deckStats(c,r,i,info):null;return html.replace('</button>',`${fresh?'<b class="new-card-marker">NEW</b>':''}${stats?`<span class="deck-card-stats" aria-label="ATK ${stats[0]}, DEF ${stats[1]}">${stats[0]} / ${stats[1]}</span>`:''}</button>`);}

