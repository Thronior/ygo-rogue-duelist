// Private AI knowledge, separate from face-up status and player-facing snapshots.
export class FieldKnowledge {
 constructor(){this.seats=[new Map(),new Map()]}
 key(c){return `${c.controller}:${c.location}:${c.sequence}`}
 field(c,L){return !!c&&[L.MZONE,L.SZONE].includes(c.location)}
 known(viewer,c){
  if(!c)return 0;if(c.position&5)return c.code||0;
  const code=this.seats[viewer]?.get(this.key(c))||0;
  return !c.code||c.code===code?code:0;
 }
 observe(viewer,query,L){
  const memory=this.seats[viewer],present=new Set();
  for(const side of [0,1])for(const location of [L.MZONE,L.SZONE])for(const c of query(side,location)||[]){
   if(!c)continue;const key=this.key(c);present.add(key);
   if(c.position&5&&c.code)memory.set(key,c.code);
   else if(c.code&&memory.get(key)!==c.code)memory.delete(key);
  }
  for(const key of memory.keys())if(!present.has(key))memory.delete(key);
 }
 message(m,M,L){
  const remember=(c,code=c.code)=>{if(code&&this.field(c,L))for(const memory of this.seats)memory.set(this.key(c),code)};
  if(m.type===M.CONFIRM_CARDS){for(const c of m.cards||[])if(c.code&&this.field(c,L))this.seats[m.player]?.set(this.key(c),c.code);}
  if(m.type===M.POS_CHANGE){if((m.position|m.prev_position)&5)remember(m);}
  if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING,M.CHAINING].includes(m.type)&&m.position&5)remember(m);
  if(m.type===M.MOVE){
   const from=m.from,to=m.to,old=this.key(from),next=this.key(to);
   for(const memory of this.seats){
    const known=memory.get(old);memory.delete(old);memory.delete(next);
    const publicOrigin=this.field(from,L)&&!!(from.position&5)||from.location===L.GRAVE;
    if(this.field(to,L)){
     const code=(to.position&5||publicOrigin)?m.card:this.field(from,L)?known:0;
     if(code)memory.set(next,code);
    }
   }
  }
  if(m.type===M.SET){for(const memory of this.seats)if(memory.get(this.key(m))!==m.code)memory.delete(this.key(m));}
  if(m.type===M.SHUFFLE_SET_CARD){
   for(const memory of this.seats)for(const c of m.cards||[]){memory.delete(this.key(c.from));memory.delete(this.key(c.to));}
  }
  if(m.type===M.SWAP){
   const a=this.key(m.card1),b=this.key(m.card2);
   for(const memory of this.seats){const ca=memory.get(a),cb=memory.get(b);memory.delete(a);memory.delete(b);if(ca)memory.set(b,ca);if(cb)memory.set(a,cb);}
  }
 }
}
