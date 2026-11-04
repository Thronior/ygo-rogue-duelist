"""Relic fusions: owning every piece of a set fuses them into one stronger relic (2026-11-03).

Recipes are a secret for players to stumble on, so no relic text, shop or collection screen names its pieces.
The pieces are used up. A fused relic is never stocked or offered; it only appears by fusing, and sells for
half of what its pieces cost together.
"""
import approved_relics as ar

# key, name, rules text, illustration (card name, or a custom image in data/relic-custom-art.json), pieces
FUSED=[
 ('chaos_orb','Chaos Orb','LIGHT and DARK monsters you control gain 400 ATK.','Black Luster Soldier - Envoy of the Beginning',('light','dark')),
 ('four_elements','Four Elements','Monsters you control gain 200 ATK for each different Attribute among monsters you control.','Doriado',('ember','tide','gale','earth')),
 ('harpie_nest',"Harpie Lady Sisters' Nest",'Your Harpie monsters gain 400 ATK. The first time each turn that one of your Harpie monsters would be destroyed by battle, it is not.','Harpie Girl',('harpie_feather','harpies_of_a_feather')),
 ('zaloog_hideout',"Don Zaloog's Hideout",'Your Dark Scorpion monsters and Don Zaloog can attack your opponent directly.','Don Zaloog',('scorpion_emblem','dark_scorpion_squad')),
 ('amazoness_village','Amazoness Village','Your Amazoness monsters gain 400 ATK and inflict piercing battle damage.','Amazoness Village',('amazoness_standard','amazoness_hunters')),
 ('necrovalley_throne','Necrovalley Throne',"Your Gravekeeper's monsters gain 400 ATK/DEF. Your Field Spell cannot be destroyed.",'Necrovalley',('necrovalley_tablet','gravekeepers_union')),
 ('fusion_gate','Fusion Gate','During your Standby Phase, if you control no monsters, Special Summon 1 monster from your Fusion Deck.','Fusion Gate',('fusion_chamber','fusion_insignia','fusion_time','machine_foundry')),
 ('jar_of_greed','Jar of Greed','Gain 1 free reroll in each shop and 1 additional reroll for each cursed relic choice. Gain 1 free opponent reveal per encounter and 1 free boss reroll per boss encounter. Shop rerolls restock your character booster pack. Draw 1 additional card during your first turn. 1 relic in each shop costs 0 coins.','Jar Robber',('dice_jar','cyber_jar','morphing_jar_2')),
 ('second_coin_toss','Second Coin Toss','Each turn, you choose the result of your first coin toss and of your first die roll.','Lucky Chance',('lets_go_gambling','weighted_coins','weighted_dice')),
 ('scapegoat_pasture','Scapegoat Pasture',"During your opponent's Standby Phase, Special Summon 1 Sheep Token in Defense Position. Once per turn, during your Standby Phase, select 1 face-up monster on either side of the field. All Tokens you control receive the same Type, Level, Attribute, name, and original ATK and DEF as that monster until the End Phase.",'Sogen',('token_defender','token_martyrs','token_regiment','token_resonance')),
 ('sacred_phoenix','Sacred Phoenix','Once per Duel, if your LP become 0, your LP become 1,000 instead and you do not lose the Duel for having 0 LP. If you win a Duel in which this saved you, earn 40 additional coins.','Sacred Phoenix of Nephthys',('phoenix_rebirth','phoenix_debt','second_wind')),
 ('gold_sarcophagus',"Pharaoh's Hoard",'Shop prices are reduced by 50%. Earn 50 additional coins after each victory.',"Pharaoh's Treasure",('bargain','urn','receipt','interest')),
 ('invincible','Invincible',"Monsters you control cannot be targeted or destroyed by your opponent's Spell and Trap effects.",'Royal Decree',('spells_no_more','traps_no_more')),
]
RECIPES={key:pieces for key,_,_,_,pieces in FUSED}
KEYS=frozenset(RECIPES)
# Jar of Greed keeps its jars' shop and encounter effects; every other fused relic replaces its pieces.
INCLUDES={'jar_of_greed':('dice_jar','cyber_jar','morphing_jar_2')}
# Fused relics whose rules live with the base effect they share (passives.py or the shop/coin code).
SHARED_EFFECT={'gold_sarcophagus':('discount',50),'sacred_phoenix':('phoenix',1000)}
SHEEP_TOKEN=73915052

def install(artifact):
 from content import ARTIFACTS,ART_INFO
 for key,name,text,art,pieces in FUSED:
  effect,amount=SHARED_EFFECT.get(key,('fused_'+key,0))
  tag=next((ART_INFO[p]['tag'] for p in pieces if ART_INFO[p]['tag']!='economy'),'economy')
  artifact(key,name,sum(ARTIFACTS[p][1] for p in pieces),text,art,effect,amount,tag)

def includes(run,key):
 """Whether a fused relic the run owns carries this piece's own effect (Jar of Greed's jars)."""
 owned=run.get('artifacts',[])+[run.get('mirror_copy')]
 return any(fused in owned and key in pieces for fused,pieces in INCLUDES.items())

def absorbed(run,key):
 """A piece of a set this run already fused: it is not offered again."""
 owned=run.get('artifacts',[])
 return any(fused in owned and key in pieces for fused,pieces in RECIPES.items())

def fuse(run):
 """Fuse every complete set in the run's relics. Returns the fusions made, also queued for the shop animation."""
 made=[]
 for key,pieces in RECIPES.items():
  artifacts=run.get('artifacts',[])
  if key in artifacts or not all(p in artifacts for p in pieces):continue
  for p in pieces:artifacts.remove(p)
  artifacts.append(key)
  for p in pieces:
   if p in ('weighted_coins','weighted_dice'):
    import choice_relics
    choice_relics.clear_weight(run,p)
   if run.get('mirror_copy')==p:run.pop('mirror_copy',None)
  made.append(dict(relic=key,pieces=list(pieces)))
 if made:run.setdefault('fusion_events',[]).extend(made)
 return made

def greed_free_relic(run,rng):
 """Jar of Greed: one relic in each shop visit costs 0, until it is bought; rerolls move it to the new stock."""
 if not ar.has(run,'jar_of_greed') or run.get('stage')!='shop':return
 if run.get('greed_relic_taken')==ar.encounter_key(run):return
 stock=[item for item in run.get('shop',[]) if item['kind']=='artifact' and not item['sold']]
 if not stock or any(item.get('greed') for item in stock):return
 item=rng.choice(stock);item['price']=0;item['greed']=True

def effect(kind):
 if not kind.startswith('fused_'):return None
 from approved_relic_effects import stat,phase
 key=kind[6:]
 both=lambda v,t:stat('EFFECT_UPDATE_ATTACK',v,t)+'\n'+stat('EFFECT_UPDATE_DEFENSE',v,t)
 if key=='chaos_orb':return stat('EFFECT_UPDATE_ATTACK',400,'c:IsAttribute(ATTRIBUTE_LIGHT|ATTRIBUTE_DARK)')
 if key=='four_elements':return stat('EFFECT_UPDATE_ATTACK','''function(e,c) local seen,n=0,0
 for m in Duel.GetMatchingGroup(Card.IsFaceup,0,LOCATION_MZONE,0,nil):Iter() do seen=seen|m:GetAttribute() end
 while seen>0 do n=n+(seen&1) seen=seen>>1 end return 200*n end''')
 if key=='harpie_nest':return stat('EFFECT_UPDATE_ATTACK',400,'c:IsSetCard(0x64)')+'''
do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_INDESTRUCTABLE_COUNT) e:SetTargetRange(LOCATION_MZONE,0)
e:SetTarget(function(e,c) return c:IsSetCard(0x64) end) e:SetCountLimit(1) e:SetValue(function(e,re,r) return (r&REASON_BATTLE)~=0 end) Duel.RegisterEffect(e,0) end'''
 if key=='zaloog_hideout':return stat('EFFECT_DIRECT_ATTACK',1,'c:IsSetCard(0x1a) or c:IsCode(76922029)')
 if key=='amazoness_village':return stat('EFFECT_UPDATE_ATTACK',400,'c:IsSetCard(0x4)')+'\n'+stat('EFFECT_PIERCE',1,'c:IsSetCard(0x4)')
 if key=='necrovalley_throne':return both(400,'c:IsSetCard(0x2e)')+'''
do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_INDESTRUCTABLE_EFFECT) e:SetTargetRange(LOCATION_SZONE,0)
e:SetTarget(function(e,c) return c:IsFaceup() and c:IsType(TYPE_FIELD) end) e:SetValue(1) Duel.RegisterEffect(e,0) end'''
 if key=='fusion_gate':
  # A proper Fusion Summon that ignores summoning conditions, so the monster can be revived later.
  can='function(c,e) return c:IsType(TYPE_FUSION) and c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_FUSION,0,true,false) end'
  return phase('STANDBY',f'--[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_SPSUMMON) local c=Duel.SelectMatchingCard(0,{can},0,LOCATION_EXTRA,0,1,1,nil,e):GetFirst() if c and Duel.SpecialSummon(c,SUMMON_TYPE_FUSION,0,0,true,false,POS_FACEUP)>0 then c:CompleteProcedure() end',
   f'Duel.GetFieldGroupCount(0,LOCATION_MZONE,0)==0 and Duel.GetLocationCount(0,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard({can},0,LOCATION_EXTRA,0,1,nil,e)')
 if key=='jar_of_greed':return 'do local used=false '+phase('STANDBY','used=true Duel.Draw(0,1,REASON_EFFECT)','not used')+' end'
 if key=='second_coin_toss':
  # Registered before rogue-rng.lua installs its own choose effects, so the core asks this one first.
  return '''do local coin_flag,dice_flag=0x7f34b1,0x7f34b2
local coin=Effect.GlobalEffect() coin:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) coin:SetCode(EFFECT_TOSS_COIN_CHOOSE)
coin:SetCondition(function(e,tp,eg,ep,ev) return ep==0 and Duel.GetFlagEffect(0,coin_flag)==0 end)
coin:SetOperation(function(e,tp,eg,ep,ev) Duel.RegisterFlagEffect(0,coin_flag,RESET_PHASE|PHASE_END,0,1) --[[relic-ask]] local face=Duel.AnnounceCoin(0) local r={} for i=1,ev&0xffff do r[i]=face end Duel.SetCoinResult(table.unpack(r)) end)
Duel.RegisterEffect(coin,0)
local dice=Effect.GlobalEffect() dice:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) dice:SetCode(EFFECT_TOSS_DICE_CHOOSE)
dice:SetCondition(function(e,tp,eg,ep,ev) return ep==0 and Duel.GetFlagEffect(0,dice_flag)==0 end)
dice:SetOperation(function(e,tp,eg,ep,ev) Duel.RegisterFlagEffect(0,dice_flag,RESET_PHASE|PHASE_END,0,1) --[[relic-ask]] local n=Duel.AnnounceNumber(0,1,2,3,4,5,6) local r={}
 for i=1,ev&0xffff do r[i]=n end for i=1,ev>>16 do r[#r+1]=Duel.GetRandomNumber(1,6) end Duel.SetDiceResult(table.unpack(r)) end)
Duel.RegisterEffect(dice,0) end'''
 if key=='scapegoat_pasture':
  mine='function(c) return c:IsFaceup() and c:IsType(TYPE_TOKEN) end'
  return phase('STANDBY',f'Duel.SpecialSummon(Duel.CreateToken(0,{SHEEP_TOKEN}),0,0,0,false,false,POS_FACEUP_DEFENSE)','true').replace('Duel.GetTurnPlayer()==0 and (true)','Duel.GetTurnPlayer()==1 and Duel.GetLocationCount(0,LOCATION_MZONE)>0')+'\n'+phase('STANDBY',f'''--[[relic-ask]] Duel.Hint(HINT_SELECTMSG,0,HINTMSG_FACEUP) local tc=Duel.SelectMatchingCard(0,Card.IsFaceup,0,LOCATION_MZONE,LOCATION_MZONE,1,1,nil):GetFirst()
 if not tc then return end
 local race,level,attribute,code,atk,def=tc:GetRace(),tc:GetLevel(),tc:GetAttribute(),tc:GetCode(),tc:GetBaseAttack(),tc:GetBaseDefense()
 for token in Duel.GetMatchingGroup({mine},0,LOCATION_MZONE,0,nil):Iter() do
  for _,row in ipairs({{{{EFFECT_CHANGE_RACE,race}},{{EFFECT_CHANGE_LEVEL,level}},{{EFFECT_CHANGE_ATTRIBUTE,attribute}},{{EFFECT_CHANGE_CODE,code}},{{EFFECT_SET_BASE_ATTACK,atk}},{{EFFECT_SET_BASE_DEFENSE,def}}}}) do
   local x=Effect.CreateEffect(token) x:SetType(EFFECT_TYPE_SINGLE) x:SetCode(row[1]) x:SetValue(row[2]) x:SetReset(RESET_EVENT|RESETS_STANDARD|RESET_PHASE|PHASE_END) token:RegisterEffect(x)
  end
 end''',f'Duel.IsExistingMatchingCard({mine},0,LOCATION_MZONE,0,1,nil)')
 if key=='invincible':return '''do local function spelltrap(e,re,rp) return rp==1 and re~=nil and re:IsActiveType(TYPE_SPELL|TYPE_TRAP) end
local t=Effect.GlobalEffect() t:SetType(EFFECT_TYPE_FIELD) t:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET) t:SetProperty(EFFECT_FLAG_SET_AVAILABLE) t:SetTargetRange(LOCATION_MZONE,0) t:SetValue(spelltrap) Duel.RegisterEffect(t,0)
local d=t:Clone() d:SetCode(EFFECT_INDESTRUCTABLE_EFFECT) Duel.RegisterEffect(d,0) end'''
 return None
