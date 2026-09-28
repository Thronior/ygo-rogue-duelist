// Public timing/chain context shared by local and remote duels.
export function promptContext(engine,message={}){
 const chain=engine.activeChain||[];
 const link=chain[chain.length-1];
 if(link)return `Chain onto ${engine.name(link.code)} · Link ${link.link}`;
 const timing=Number(message.hint_timing||0);
 if(timing&0x4000||engine.phase===64)return 'Battle Phase · Damage calculation';
 if(engine.inDamageStep||timing&0x2000||engine.phase===32)return 'Battle Phase · Damage Step';
 if(timing&0x1000)return 'Battle Phase · Attack declaration';
 return ({1:'Draw Phase',2:'Standby Phase',4:'Main Phase 1',8:'Battle Phase · Start Step',16:'Battle Phase · Battle Step',128:'Battle Phase · End Step',256:'Main Phase 2',512:'End Phase'})[engine.phase]||'Battle Phase';
}
