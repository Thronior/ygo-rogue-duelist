export const legendarySummons={
 38033121:{name:'Dark Magician Girl',color:'#ff72c2',hearts:true},
 10000000:{name:'Obelisk the Tormentor',color:'#499eff'},
 10000020:{name:'Slifer the Sky Dragon',color:'#ff493e'},
 10000010:{name:'The Winged Dragon of Ra',color:'#ffd65b'},
 23995346:{name:'Blue-Eyes Ultimate Dragon',color:'#a99aff'},
 53347303:{name:'Blue-Eyes Shining Dragon',color:'#8aeaff'},
 82301904:{"name": "Chaos Emperor Dragon - Envoy of the End", "color": "#bf66ff"},
 72989439:{"name": "Black Luster Soldier - Envoy of the Beginning", "color": "#ffe59b"},
 62873545:{"name": "Dragon Master Knight", "color": "#86cfff"},
 99267150:{"name": "Five-Headed Dragon", "color": "#f28b55"},
 25833572:{"name": "Gate Guardian", "color": "#6feda7"},
 75347539:{"name": "Valkyrion the Magna Warrior", "color": "#77bfee"},
 98502113:{"name": "Dark Paladin", "color": "#bf86ff"},
 48579379:{"name": "Perfectly Ultimate Great Moth", "color": "#b5ed77"},
 27134689:{"name":"Master of Oz","color":"#e5aa65"},
 12600382:{"name": "Exodia Necross", "color": "#d69c48"},
 31829185:{"name": "Dark Necrofear", "color": "#87d7c9"},
 48948935:{"name": "Masked Beast Des Gardius", "color": "#cf81ec"},
 85605684:{"name": "Berserk Dragon", "color": "#f05b45"},
 72443568:{"name": "Silent Magician LV8", "color": "#b6dfff"},
 87997872:{"name": "Theinen the Great Sphinx", "color": "#ffca65"}
};
export async function playLegendarySummon(code,{field,image,sound=()=>{},music=()=>{},active=()=>true,reduced=false}){
 const theme=legendarySummons[code];if(!theme||!field||!active())return false;
 const el=document.createElement('div');el.className='legendary-summon';el.style.setProperty('--summon-color',theme.color);el.setAttribute('role','status');el.setAttribute('aria-label',theme.name+' summoned');
 const light=document.createElement('div');light.className='legendary-summon-light';
 const art=document.createElement('div');art.className='legendary-summon-art';art.style.backgroundImage=`url("${image(code)}")`;
 const label=document.createElement('strong');label.textContent=theme.name;el.append(light,art,label);field.append(el);if(theme.hearts){for(let i=0;i<12;i++){const h=document.createElement('span');h.className='legendary-heart';h.textContent='♥';h.style.setProperty('--heart-x',(8+i*7.4)+'%');h.style.setProperty('--heart-delay',(i%4*.12)+'s');el.append(h)}}
 const animations=[];let timer,watch;
 try{
  music(theme.hearts?'summon-cute':'summon-epic');
  sound('specialsummon',.3);
  if(!reduced)animations.push(field.animate([{transform:'translate(0,0)'},{transform:'translate(-5px,2px)'},{transform:'translate(5px,-3px)'},{transform:'translate(-3px,-1px)'},{transform:'translate(3px,2px)'},{transform:'translate(0,0)'}],{duration:480}));
  animations.push(light.animate([{opacity:0},{opacity:.75,offset:.16},{opacity:.4,offset:.7},{opacity:0}],{duration:3000,fill:'both'}));
  animations.push(art.animate([{opacity:0,transform:reduced?'none':'scale(.72)'},{opacity:0,offset:.16},{opacity:1,transform:'scale(1)',offset:.32},{opacity:1,transform:reduced?'none':'scale(1.035)',offset:.78},{opacity:0,transform:reduced?'none':'scale(1.1)'}],{duration:3000,fill:'both',easing:'ease-out'}));
  animations.push(label.animate([{opacity:0},{opacity:0,offset:.25},{opacity:1,offset:.36},{opacity:1,offset:.8},{opacity:0}],{duration:3000,fill:'both'}));
  await new Promise(resolve=>{timer=setTimeout(resolve,3000);watch=setInterval(()=>{if(!active()||!field.isConnected||document.hidden)resolve()},100)});
 }finally{clearTimeout(timer);clearInterval(watch);for(const a of animations)a.cancel();el.remove()}
 return true;
}
