// Read the live core relation, independent of the equipped card's printed type.
export function equippedTarget(snapshot, source){
 if(!source||![4,8].includes(source.location))return null;
 const cardAt=({controller,location,sequence})=>snapshot?.players?.[controller]?.[location===4?'monsters':location===8?'spells':'']?.[sequence];
 const card=cardAt(source),target=card?.equipCard;
 if(!card||card.code!==source.code||!(card.position&5)||!target||![4,8].includes(target.location))return null;
 const destination=cardAt(target);
 return destination&&(destination.position&5)?{controller:target.controller,location:target.location,sequence:target.sequence}:null;
}
