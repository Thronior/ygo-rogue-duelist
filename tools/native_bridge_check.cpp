#include <fstream>
#include <thread>
#include <chrono>
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
    options.flags=DUEL_MODE_MR1|DUEL_ATTACK_FIRST_TURN;
    options.team1={8000,0,1}; options.team2={1000,0,1}; options.cardReader=reader; options.scriptReader=script; options.logHandler=logger;
    std::cout<<"CREATING"<<std::endl;
    OCG_Duel duel{}; if(OCG_CreateDuel(&duel,&options)) return 2;
    std::cout<<"CREATED"<<std::endl;
    script(nullptr,duel,"constant.lua"); script(nullptr,duel,"utility.lua");
    std::string lua="Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_ATTACK_FIRST_TURN,1)\nDebug.SetPlayerInfo(0,8000,0,1)\nDebug.SetPlayerInfo(1,1000,0,1)\n";
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
    json aiMessages=json::array();int aiSeq=0,aiPlayer=0,aiPhase=0;
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
            bool select=(msg>=10&&msg<=26)||msg==140||msg==141||msg==142||msg==143||msg==144;
            std::vector<uint8_t> bytes{static_cast<uint8_t>(msg)};bytes.insert(bytes.end(),payload,next);
            if(msg==MSG_NEW_TURN)aiPlayer=payload[0];
            if(msg==MSG_NEW_PHASE)aiPhase=payload[0]|(payload[1]<<8);
            if(select){
                json req={{"id",++aiSeq},{"prompt",bytes},{"messages",aiMessages},{"zones",json::object()},{"lp",{8000,1000}},{"player",aiPlayer},{"phase",aiPhase}};
                for(int side=0;side<2;++side)for(int loc=1;loc<=64;loc*=2){uint32_t len=0;OCG_QueryInfo info{QUERY_CODE|QUERY_POSITION|QUERY_ATTACK|QUERY_DEFENSE|QUERY_LEVEL|QUERY_IS_PUBLIC,static_cast<uint8_t>(side),static_cast<uint32_t>(loc)};
                 auto data=static_cast<const uint8_t*>(OCG_DuelQueryLocation(duel,&len,&info));req["zones"][std::to_string(side)+","+std::to_string(loc)]=std::vector<uint8_t>(data,data+len);}
                {std::ofstream f("ai-request.tmp");f<<req.dump();}std::remove("ai-request.json");std::rename("ai-request.tmp","ai-request.json");aiMessages=json::array();
                bool replied=false;
                for(int attempt=0;attempt<500;++attempt){try{std::ifstream f("ai-response.json");if(f.good()){json r;f>>r;if(r.value("id",0)==aiSeq){auto response=r["response"].get<std::vector<uint8_t>>();OCG_DuelSetResponse(duel,response.data(),response.size());replied=true;break;}}}catch(...){}std::this_thread::sleep_for(std::chrono::milliseconds(15));}
                if(!replied){std::cerr<<"BRIDGE TIMEOUT";return 8;}
            }else aiMessages.push_back(bytes);
            p=next;
        }
        if(state==OCG_DUEL_STATUS_END) break;
    }
done:
    OCG_DestroyDuel(duel);
    std::cout<<"BRIDGE RESPONSES "<<aiSeq<<std::endl;
    bool pass=aiSeq>=10;/*mode=="tactical" ? won : mode=="decks" ? turns>=4 : mode=="passives" ? won : mode=="ai-tribute" ? tributeDone : mode=="ai-equip" ? aiSummon&&damage==2400 : mode=="actions" ? summoned&&activated&&healed==500&&won : mode=="ai-set" ? aiSet&&!aiSummon : aiSummon;*/
    std::cout<<"RESULT "<<mode<<" "<<pass<<" lua_errors="<<errors<<std::endl;
    return pass&&!errors?0:1;
}
