// Browser counterpart of sim-balance/render_decks.py: same grid, ordering and palette.
const CW=120,CH=175,COLS=8,PAD=10,TOP=150;
const load=src=>new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.onload=img.onerror=null;img.src='';reject(Error('Image loading timed out. Try again.'))},15000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(Error('Could not load image: '+src))};img.src=src});
export async function renderDeckImage({title,label,deck,cards,portrait}){
 const by=new Map(cards.map(c=>[c.id,c]));const kind=id=>{const c=by.get(id);return c.data.type&1?[0,-(c.atk||0)]:c.data.type&2?[1,0]:[2,0]};
 const ids=[...deck.main].sort((a,b)=>{const x=kind(a),y=kind(b);return x[0]-y[0]||x[1]-y[1]});const rows=Math.ceil(ids.length/COLS),extraRows=Math.ceil(deck.extra.length/13);
 const canvas=document.createElement('canvas');canvas.width=1050;canvas.height=TOP+rows*(CH+PAD)+PAD+extraRows*100;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#081418';ctx.fillRect(0,0,canvas.width,canvas.height);
 const images=new Map();await Promise.all([...new Set([...ids,...deck.extra])].map(async id=>images.set(id,await load(`assets/cards/${id}.jpg`))));
 let x=14;if(portrait){ctx.drawImage(await load('assets/'+portrait),x,10,130,130);x+=142}
 ctx.fillStyle='#ffe9a8';ctx.font='34px Arial';ctx.fillText(title,x,48,650);ctx.font='16px Arial';ctx.fillStyle='#a4e7e2';ctx.fillText(`${ids.length} cards · Extra ${deck.extra.length} · Deck suggestion`,x,82,700);
 ctx.fillStyle='#f8f275';ctx.font='28px Arial';ctx.textAlign='right';ctx.fillText(label,1036,120,870);ctx.textAlign='left';
 ids.forEach((id,k)=>ctx.drawImage(images.get(id),PAD+(k%COLS)*(CW+PAD),TOP+PAD+Math.floor(k/COLS)*(CH+PAD),CW,CH));
 if(deck.extra.length){const y=TOP+PAD+rows*(CH+PAD);ctx.font='16px Arial';ctx.fillStyle='#a4e7e2';ctx.fillText('EXTRA:',14,y+20);deck.extra.forEach((id,k)=>ctx.drawImage(images.get(id),100+(k%13)*70,y+Math.floor(k/13)*100,60,88))}
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image export failed.')),'image/png'));
}
