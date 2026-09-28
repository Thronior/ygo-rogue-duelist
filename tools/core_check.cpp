#include <fstream>
#include <iostream>
#include <map>
#include <vector>
#include <string>
#include <cstring>
#include <nlohmann/json.hpp>
#include "ocgapi.h"
#include "ocgapi_constants.h"
using json=nlohmann::json;
std::map<uint32_t,OCG_CardData> cards;
std::map<uint32_t,std::vector<uint16_t>> sets;
int errors=0;
void reader(void*,uint32_t code,OCG_CardData* out) { *out=cards[code]; }
int script(void*,OCG_Duel duel,const char* name) {
    std::cout<<"SCRIPT "<<name<<std::endl;
    for(auto prefix : {"script/","script/official/","script/goat/","script/pre-errata/",""}) {
        std::ifstream file(std::string(prefix)+name,std::ios::binary);
        if(file.good()) { std::string data((std::istreambuf_iterator<char>(file)),{}); return OCG_LoadScript(duel,data.data(),uint32_t(data.size()),name); }
    }
    return 0;
}
void logger(void*,const char* msg,int type) { std::cerr<<"CORE "<<type<<": "<<msg<<std::endl; if(type==0) ++errors; }
uint32_t read32(const uint8_t*& p) { uint32_t n; memcpy(&n,p,4); p+=4; return n; }
void answer(OCG_Duel d,int32_t n) { OCG_DuelSetResponse(d,&n,4); }
int main(int argc,char** argv) {
    json all; std::ifstream file("../data/era-cards.json"); file>>all;
    for(auto& c:all) {
        auto& d=c["data"]; uint32_t code=d["code"];
        auto& set=sets[code]; for(auto v:d["setcodes"]) set.push_back(v); set.push_back(0);
        cards[code]={code,d.value("alias",0u),set.data(),d["type"],d["level"],d["attribute"],std::stoull(d["race"].get<std::string>()),d["attack"],d["defense"],0,0,0};
    }
    std::string mode=argc>1?argv[1]:"actions";
    OCG_DuelOptions options{}; options.seed[0]=123; options.seed[1]=456; options.seed[2]=789; options.seed[3]=42;
    options.flags=DUEL_MODE_MR1|DUEL_SIMPLE_AI|DUEL_ATTACK_FIRST_TURN;
    options.team1={8000,0,1}; options.team2={1000,0,1}; options.cardReader=reader; options.scriptReader=script; options.logHandler=logger;
    std::cout<<"CREATING"<<std::endl;
    OCG_Duel duel{}; if(OCG_CreateDuel(&duel,&options)) return 2;
    std::cout<<"CREATED"<<std::endl;
    script(nullptr,duel,"constant.lua"); script(nullptr,duel,"utility.lua");
    std::string lua="Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI|DUEL_ATTACK_FIRST_TURN,1)\nDebug.SetPlayerInfo(0,8000,0,1)\nDebug.SetPlayerInfo(1,1000,0,1)\n";
    lua+="Debug.AddCard("+std::string(mode=="ai-attack" || mode=="ai-equip"?"40640057":mode=="ai-tribute"?"5053103":"89631139")+",0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)\n";
    if(mode=="actions") lua+="Debug.AddCard(40640057,0,0,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)\nDebug.AddCard(38199696,0,0,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)\nDebug.AddCard(5053103,1,1,LOCATION_MZONE,0,POS_FACEUP_ATTACK)\n";
    else if(mode=="ai-tribute") lua+="Debug.AddCard(70781052,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)\nDebug.AddCard(40640057,1,1,LOCATION_MZONE,0,POS_FACEUP_ATTACK)\nDebug.AddCard(89631139,1,1,LOCATION_MZONE,1,POS_FACEUP_ATTACK)\n";
    else lua+="Debug.AddCard(5053103,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)\n";
    if(mode=="ai-equip")lua+="Debug.AddCard(40619825,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)\n";
    for(int p=0;p<2;++p) for(int i=0;i<20;++i) lua+="Debug.AddCard(40640057,"+std::to_string(p)+","+std::to_string(p)+",LOCATION_DECK,0,POS_FACEDOWN_DEFENSE)\n";
    lua+="Debug.ReloadFieldEnd()";
    if(mode=="tactical") { std::ifstream fixture("../temp/tactical-fixture.lua");lua.assign((std::istreambuf_iterator<char>(fixture)),{}); }
    if(mode=="decks") { std::ifstream fixture("../temp/deck-fixture.lua");lua.assign((std::istreambuf_iterator<char>(fixture)),{}); }
    if(mode=="passives") { std::ifstream fixture("../temp/passive-fixture.lua");lua.assign((std::istreambuf_iterator<char>(fixture)),{}); }
    if(!OCG_LoadScript(duel,lua.data(),uint32_t(lua.size()),"check.lua")) return 3;
    std::cout<<"LOADED"<<std::endl;
    OCG_StartDuel(duel);
    bool summoned=false,activated=false,won=false,aiSet=false,aiSummon=false,tributeDone=false; int turns=0; uint32_t healed=0,damage=0;
    for(int step=0;step<1500;++step) {
        std::cout<<"STEP "<<step<<std::endl;
        int state=OCG_DuelProcess(duel); uint32_t length=0;
        const auto* p=(const uint8_t*)OCG_DuelGetMessage(duel,&length); const auto* end=p+length;
        while(p<end) {
            uint32_t size=read32(p); const auto* next=p+size; int msg=*p++; const auto* payload=p;
            std::cout<<"MSG "<<msg<<" SIZE "<<size<<std::endl;
            if(msg==MSG_RETRY) { std::cerr<<"RETRY"; return 4; }
            if(msg==MSG_WIN) { won=p[0]==0; std::cout<<"WIN "<<int(p[0])<<std::endl; goto done; }
            if(msg==MSG_NEW_TURN) ++turns;
            if(msg==MSG_RECOVER) { int who=*p++; auto value=read32(p); if(who==0) healed+=value; std::cout<<"RECOVER "<<who<<" "<<value<<std::endl; }
            if(msg==MSG_SUMMONING) { auto code=read32(p); if(p[0]==1) {aiSummon=true;if(code==70781052)tributeDone=true;} std::cout<<"SUMMON "<<code<<" player "<<int(p[0])<<std::endl; }
            if(msg==MSG_DAMAGE) {int who=*p++;auto val=read32(p);if(who==0)damage+=val;}
            if(msg>=MSG_SELECT_BATTLECMD && msg<=MSG_SELECT_UNSELECT_CARD && msg!=MSG_SELECT_POSITION && p[0]==1) {std::cerr<<"AI tribute leaked to player UI";return 5;}
            if(msg==MSG_MOVE) { auto code=read32(p); p+=10; int who=*p++; int loc=*p++; read32(p); auto pos=read32(p); if(who==1&&loc==LOCATION_MZONE&&pos==POS_FACEDOWN_DEFENSE) aiSet=true; }
            if(msg==MSG_SELECT_IDLECMD) {
                ++p; uint32_t normal=read32(p); p+=normal*10;
                for(int i=0;i<4;++i) { auto n=read32(p); p+=n*(i==1?7:10); }
                auto effects=read32(p); p+=effects*19; bool battle=*p;
                if(mode!="actions") {
                    if(turns>=(mode=="decks"?21:3)) goto done;
                    answer(duel,7);
                } else if(!summoned&&normal) { summoned=true; answer(duel,0); }
                else if(!activated&&effects) { activated=true; answer(duel,5); }
                else answer(duel,battle?6:7);
            } else if(msg==MSG_SELECT_BATTLECMD) {
                ++p; auto n=read32(p); p+=n*19; auto attacks=read32(p);
                answer(duel,attacks?1:3);
            } else if(msg==MSG_SELECT_PLACE || msg==MSG_SELECT_DISFIELD) {
                int who=*p++; int count=*p++; auto mask=~read32(p); uint8_t response[3]={uint8_t(who),0,0};
                for(int i=0;i<32;++i) if(mask & (1u<<i)) { response[0]=uint8_t(i>=16?1-who:who); response[1]=(i%16)<8?LOCATION_MZONE:LOCATION_SZONE; response[2]=i%8; break; }
                OCG_DuelSetResponse(duel,response,3);
            } else if(msg==MSG_SELECT_CHAIN) answer(duel,p[2]?0:-1);
            else if(msg==MSG_SELECT_YESNO || msg==MSG_SELECT_EFFECTYN) answer(duel,0);
            else if(msg==MSG_SELECT_POSITION) answer(duel,POS_FACEUP_ATTACK);
            else if(msg==MSG_SELECT_CARD) { p+=2;uint32_t n=read32(p);std::vector<int32_t> response{0,(int32_t)n};for(uint32_t i=0;i<n;++i)response.push_back(i);OCG_DuelSetResponse(duel,response.data(),uint32_t(response.size()*4)); }
            p=next;
        }
        if(state==OCG_DUEL_STATUS_END) break;
    }
done:
    OCG_DestroyDuel(duel);
    bool pass=mode=="tactical" ? won : mode=="decks" ? turns>=4 : mode=="passives" ? won : mode=="ai-tribute" ? tributeDone : mode=="ai-equip" ? aiSummon&&damage==2400 : mode=="actions" ? summoned&&activated&&healed==500&&won : mode=="ai-set" ? aiSet&&!aiSummon : aiSummon;
    std::cout<<"RESULT "<<mode<<" "<<pass<<" lua_errors="<<errors<<std::endl;
    return pass&&!errors?0:1;
}
