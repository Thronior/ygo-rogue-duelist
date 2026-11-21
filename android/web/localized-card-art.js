// Draws a card's own scan with its name, type line and text in the player's language (user, 2026-11-20). The scans are
// the English prints, so the name box, the [Spell Card] line and the text box are painted over with their own colour
// and written again, the way randomized-card-art.js redraws a randomized card. Art, stars, Attribute, ATK/DEF stay.
// Positions are fractions of the card (measured on the 288x420 game scans). Text is measured once at 100px and then
// scaled, so finding the size that fits costs arithmetic instead of a measureText pass per try.
const NAME=[0.062,0.043,0.828,0.1068];
const TEXT=[0.072,0.752,0.928,0.905];          // monster text box, above the ATK/DEF line
const TEXT_ST=[0.072,0.752,0.928,0.94];
const ST_LINE=[0.40,0.122,0.935,0.168];        // "[Spell Card ●]" under the name
const ICON=[0.851,0.144,0.0215];               // that line's sub-type icon: centre x, centre y, radius (of width)
const BRACKET_RIGHT=0.903;
const INK='#16110c';

// Japanese and Chinese wrap between any two characters, except before closing marks and after opening ones.
const NO_START='、。，．・：；？！ー）」』】〕〉》”’ぁぃぅぇぉっゃゅょァィゥェォッャュョ',NO_END='（「『【〔〈《“‘';
const CJK_FONT={
 ja:'"Noto Sans CJK JP","Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo",sans-serif',
 zh:'"Noto Sans CJK SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
 ko:'"Noto Sans CJK KR","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif'};

function median(ctx,x,y,w,h){
 const d=ctx.getImageData(x,y,w,h).data,ch=[[],[],[]];
 for(let i=0;i<d.length;i+=16)for(let k=0;k<3;k++)ch[k].push(d[i+k]);
 return ch.map(v=>v.sort((a,b)=>a-b)[v.length>>1]);
}
const colourOf=(ctx,W,H,[x0,y0,x1,y1])=>{const [r,g,b]=median(ctx,x0*W,y0*H,(x1-x0)*W,(y1-y0)*H);return `rgb(${r},${g},${b})`};
function fill(ctx,W,H,box){ctx.fillStyle=colourOf(ctx,W,H,box);ctx.fillRect(box[0]*W,box[1]*H,(box[2]-box[0])*W,(box[3]-box[1])*H)}
// The frame behind the [Spell Card] line is textured, so the patch has soft edges (a blurred shadow) instead of corners.
function softFill(ctx,W,H,[x0,y0,x1,y1]){
 const colour=colourOf(ctx,W,H,[x0,y0,x1,y1]),f=H*0.006,far=W*4;
 ctx.save();ctx.fillStyle=ctx.shadowColor=colour;ctx.shadowBlur=f*2;ctx.shadowOffsetX=far;
 ctx.fillRect(x0*W+f-far,y0*H+f,(x1-x0)*W-2*f,(y1-y0)*H-2*f);ctx.restore();
 ctx.save();ctx.globalAlpha=.85;ctx.fillStyle=colour;ctx.fillRect(x0*W+f,y0*H+f*.6,(x1-x0)*W-2*f,(y1-y0)*H-1.2*f);ctx.restore();
}
// Squeezed sideways when too long. stroke: a thin outline in the ink colour, so Spectral SemiBold reads as bold.
function squeezed(ctx,text,x,y,max,{right=false,stroke=0}={}){
 const w=ctx.measureText(text).width,k=w>max?max/w:1;
 ctx.save();ctx.textAlign='left';ctx.translate(right?x-Math.min(w,max):x,y);ctx.scale(k,1);ctx.fillText(text,0,0);
 if(stroke){ctx.lineWidth=stroke;ctx.strokeText(text,0,0)}
 ctx.restore();
}

// Text broken into paragraphs of pieces (words, or characters for ja/zh) with their width at 100px.
function measure(ctx,text,charWrap){
 const widths=new Map(),width=s=>{let w=widths.get(s);if(w===undefined){w=ctx.measureText(s).width;widths.set(s,w)}return w};
 const clean=text.replace(/[ \t]*\r?\n\s*/g,'\n').replace(/ {2,}/g,' ').trim();
 return {space:width(' '),paras:clean.split('\n').map(p=>(charWrap?[...p]:p.split(' ').filter(Boolean)).map(t=>({t,w:width(t)})))};
}
// Greedy lines at scale k (size/100). Each line keeps its pieces so it can be justified without measuring again.
function breakLines({space,paras},k,width,charWrap){
 const lines=[],gap=charWrap?0:space*k;
 for(const para of paras){
  let line=[],used=0;
  for(let i=0;i<para.length;i++){
   const piece=para[i],w=piece.w*k,add=line.length?gap+w:w;
   if(used+add>width&&line.length){
    if(charWrap&&NO_START.includes(piece.t)){line.push(piece);lines.push({pieces:line,used:used+add});line=[];used=0;continue}
    if(charWrap&&line.length>1&&NO_END.includes(line.at(-1).t)){const carry=line.pop();lines.push({pieces:line,used:used-carry.w*k});line=[carry,piece];used=(carry.w+piece.w)*k;continue}
    lines.push({pieces:line,used});line=[piece];used=w;
   }else{line.push(piece);used+=add}
  }
  lines.push({pieces:line,used,last:true});
 }
 return lines;
}
function drawLines(ctx,lines,k,x,y,lh,width,charWrap,space){
 lines.forEach((line,i)=>{
  const {pieces}=line,top=y+i*lh;
  if(!pieces.length)return;
  const natural=charWrap?0:space*k,inked=pieces.reduce((s,p)=>s+p.w*k,0);
  let gap=pieces.length>1?(width-inked)/(pieces.length-1):0;
  // Paragraph ends stay ragged, like the printed cards; so does a line that would need huge gaps.
  if(line.last||gap<natural*.5||gap>Math.max(natural*6,k*40))gap=natural;
  if(gap===natural&&!charWrap){ctx.fillText(pieces.map(p=>p.t).join(' '),x,top);return}
  let cx=x;for(const p of pieces){ctx.fillText(p.t,cx,top);cx+=p.w*k+gap}
 });
}

// info: {name, desc, line, kind: 'monster'|'spell'|'trap', flavor, icon}; lang: 'fr', 'ja', ...
// fonts: {name, text} CSS families for Latin scripts. Returns the canvas.
export function drawLocalizedCard(canvas,scan,info,{lang,scale=1.5,fonts={name:'YGO Card Name',text:'YGO Card Text'},locale}={}){
 const W=Math.round(scan.width*scale),H=Math.round(scan.height*scale);
 canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(locale&&'lang' in ctx)ctx.lang=locale;   // picks the right CJK glyph forms where the browser supports it
 ctx.imageSmoothingQuality='high';ctx.drawImage(scan,0,0,W,H);
 const cjk=CJK_FONT[lang],charWrap=lang==='ja'||lang==='zh',isMon=info.kind==='monster';
 const nameFont=cjk||`"${fonts.name}",sans-serif`,textFont=cjk||`"${fonts.text}",serif`,heavy=cjk?700:600;
 ctx.textBaseline='alphabetic';

 // Name: monsters print it dark on a light box, Spells and Traps light on their coloured box.
 fill(ctx,W,H,NAME);
 ctx.fillStyle=isMon?INK:'#fdfbf4';
 ctx.font=`${heavy} ${Math.round(H*(cjk?0.042:0.046))}px ${nameFont}`;
 if(!isMon){ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=H*0.004}
 squeezed(ctx,info.name,NAME[0]*W+W*0.012,H*0.0915,(NAME[2]-NAME[0])*W-W*0.03);
 ctx.shadowBlur=0;ctx.shadowColor='transparent';

 // [Spell Card] / [Trap Card], with the sub-type icon (Continuous, Equip, ...) cut out first and put back before "]".
 if(!isMon){
  let icon=null;const [cx,cy,r]=ICON,size=Math.ceil(r*2*W);
  if(info.icon){icon=document.createElement('canvas');icon.width=icon.height=size;icon.getContext('2d').drawImage(canvas,cx*W-r*W,cy*H-r*W,size,size,0,0,size,size)}
  softFill(ctx,W,H,ST_LINE);
  const open=cjk?'【':'[',close=cjk?'】':']',base=H*0.157,right=BRACKET_RIGHT*W;
  ctx.fillStyle=ctx.strokeStyle=INK;ctx.font=`${heavy} ${Math.round(H*0.03)}px ${nameFont}`;
  const stroke=cjk?0:H*0.0014;
  squeezed(ctx,close,right,base,W,{right:true,stroke});
  let end=right-ctx.measureText(close).width;
  if(icon){
   const x=end-W*0.004-2*r*W;
   ctx.save();ctx.beginPath();ctx.arc(x+r*W,cy*H,r*W,0,Math.PI*2);ctx.clip();ctx.drawImage(icon,x,cy*H-r*W);ctx.restore();
   end=x-W*0.004;
  }
  squeezed(ctx,open+info.line,end,base,end-ST_LINE[0]*W,{right:true,stroke});
 }

 // Text box: the monster type line, then the text at the largest size that fits.
 const box=isMon?TEXT:TEXT_ST;fill(ctx,W,H,box);
 ctx.fillStyle=ctx.strokeStyle=INK;
 let top=box[1]*H+H*0.004;const left=box[0]*W+W*0.007;
 if(isMon){
  ctx.font=`${heavy} ${Math.round(H*0.0215)}px ${nameFont}`;
  const line=cjk?`【${info.line}】`:`[${info.line}]`;
  squeezed(ctx,line,box[0]*W+W*0.006,top+H*0.019,(box[2]-box[0])*W-W*0.014,{stroke:cjk?0:H*0.001});
  top+=H*0.026;
 }
 const width=(box[2]-box[0])*W-W*0.014,room=box[3]*H-top-H*0.004,lineFactor=cjk?1.18:1.12;
 const style=`${info.flavor&&!cjk?'italic ':''}500`;
 ctx.font=`${style} 100px ${textFont}`;
 const measured=measure(ctx,info.desc||'',charWrap);
 const fits=size=>breakLines(measured,size/100,width*.99,charWrap).length*size*lineFactor<=room;
 let lo=H*0.008,hi=H*0.0215;
 if(fits(hi))lo=hi;else for(let i=0;i<9;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid}
 const size=lo;
 ctx.font=`${style} ${size}px ${textFont}`;
 drawLines(ctx,breakLines(measured,size/100,width*.99,charWrap),size/100,left,top+size,size*lineFactor,width*.99,charWrap,measured.space);
 return canvas;
}
