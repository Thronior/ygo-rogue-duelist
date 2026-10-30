import {wallMs} from './duel-motion.js';
export const legendarySummons={
 77585513:{name:'Jinzo',color:'#d85bff'},
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
 87997872:{"name": "Theinen the Great Sphinx", "color": "#ffca65"},
 89631139:{"name": "Blue-Eyes White Dragon", "color": "#68d0f3"},
 74677422:{"name": "Red-Eyes Black Dragon", "color": "#ff5252"},
 46986414:{"name": "Dark Magician", "color": "#a97bff"},
 40737112:{"name": "Dark Magician of Chaos", "color": "#f3d068"},
 30208479:{"name": "Magician of Black Chaos", "color": "#f3d068"},
 88619463:{"name": "Sorcerer of Dark Magic", "color": "#f38b68"},
 53183600:{"name": "Blue-Eyes Toon Dragon", "color": "#68d0f3"},
 96561011:{"name": "Red-Eyes Darkness Dragon", "color": "#f36868"},
 11901678:{"name": "Black Skull Dragon", "color": "#f36868"},
 90660762:{"name": "Meteor Black Dragon", "color": "#f38b68"},
 64681432:{"name": "Gandora the Dragon of Destruction", "color": "#f38b68"},
 51402177:{"name": "Sphinx Teleia", "color": "#f3688b"},
 15013468:{"name": "Andro Sphinx", "color": "#f3ad68"},
 48229808:{"name": "Horus the Black Flame Dragon LV8", "color": "#f36868"},
 73879377:{"name": "Armed Dragon LV7", "color": "#688bf3"},
 19877898:{"name": "Ultimate Insect LV7", "color": "#f3ad68"},
 94568601:{"name": "Tyrant Dragon", "color": "#f38b68"},
 61441708:{"name": "Sacred Phoenix of Nephthys", "color": "#f3f368"},
 76862289:{"name": "Yamata Dragon", "color": "#68adf3"},
 18891691:{"name": "Perfect Machine King", "color": "#688bf3"},
 91998119:{"name": "XYZ-Dragon Cannon", "color": "#f3d068"},
 87751584:{"name": "Gatling Dragon", "color": "#68adf3"},
 10485110:{"name": "Ocean Dragon Lord - Neo-Daedalus", "color": "#68adf3"},
 36354007:{"name": "Gilford the Lightning", "color": "#f38b68"},
 78193831:{"name": "Buster Blader", "color": "#68adf3"},
 38999506:{"name": "Cosmo Queen", "color": "#d08bff"},
 66889139:{"name": "Gaia the Dragon Champion", "color": "#68d0f3"},
 91512835:{"name": "Insect Queen", "color": "#adf368"},
 49064413:{"name": "The Masked Beast", "color": "#8b68f3"},
 39674352:{"name": "Gogiga Gagagigo", "color": "#f38b68"}
};
// Each monster's name is spoken as its art fades in. Long names and their echo may outlast the window.
const VOICE_AT=500;
export async function playLegendarySummon(code,{field,image,sound=()=>{},voice=()=>{},music=()=>{},active=()=>true,paused=()=>false,reduced=false}){
 const theme=legendarySummons[code];if(!theme||!field||!active())return false;
 const el=document.createElement('div');el.className='legendary-summon';el.style.setProperty('--summon-color',theme.color);el.setAttribute('role','status');el.setAttribute('aria-label',theme.name+' summoned');
 const light=document.createElement('div');light.className='legendary-summon-light';
 const art=document.createElement('div');art.className='legendary-summon-art';art.style.backgroundImage=`url("${image(code)}")`;
 const label=document.createElement('strong');label.textContent=theme.name;el.append(light,art,label);field.append(el);if(theme.hearts){for(let i=0;i<12;i++){const h=document.createElement('span');h.className='legendary-heart';h.textContent='♥';h.style.setProperty('--heart-x',(8+i*7.4)+'%');h.style.setProperty('--heart-delay',(i%4*.12)+'s');el.append(h)}}
 // The window is 3 s of wall time; fit the slowed animations inside it so nothing pops.
 const animations=[],span=wallMs(3000);let timer,watch;
 try{
  music(theme.hearts?'summon-cute':'summon-epic');
  sound('specialsummon',.3);
  timer=setTimeout(()=>voice(code),VOICE_AT);
  if(!reduced)animations.push(field.animate([{transform:'translate(0,0)'},{transform:'translate(-5px,2px)'},{transform:'translate(5px,-3px)'},{transform:'translate(-3px,-1px)'},{transform:'translate(3px,2px)'},{transform:'translate(0,0)'}],{duration:480}));
  animations.push(light.animate([{opacity:0},{opacity:.75,offset:.16},{opacity:.4,offset:.7},{opacity:0}],{duration:span,fill:'both'}));
  animations.push(art.animate([{opacity:0,transform:reduced?'none':'scale(.72)'},{opacity:0,offset:.16},{opacity:1,transform:'scale(1)',offset:.32},{opacity:1,transform:reduced?'none':'scale(1.035)',offset:.78},{opacity:0,transform:reduced?'none':'scale(1.1)'}],{duration:span,fill:'both',easing:'ease-out'}));
  animations.push(label.animate([{opacity:0},{opacity:0,offset:.25},{opacity:1,offset:.36},{opacity:1,offset:.8},{opacity:0}],{duration:span,fill:'both'}));
  await new Promise(resolve=>{let remaining=3000,last=performance.now();watch=setInterval(()=>{const now=performance.now();if(!paused())remaining-=now-last;last=now;if(remaining<=0||!active()||!field.isConnected||document.hidden)resolve()},50)});
 }finally{clearTimeout(timer);clearInterval(watch);for(const a of animations)a.cancel();el.remove()}
 return true;
}
