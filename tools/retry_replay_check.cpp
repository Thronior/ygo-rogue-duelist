#include <fstream>
#include <iostream>
#include <map>
#include <vector>
#include <string>
#include <cstring>
#include <nlohmann/json.hpp>
#include "ocgapi.h"
#include "../edopro-source/gframe/campaign_response_guard.h"
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

    json fixture;std::ifstream input("../temp/retry-replay.json");input>>fixture;
    OCG_DuelOptions options{};for(int i=0;i<4;i++)options.seed[i]=fixture["seed"][i].get<uint64_t>();
    options.flags=fixture["flags"].get<uint64_t>();options.team1=options.team2={fixture["lp"],fixture["draw"],fixture["per"]};
    options.cardReader=reader;options.scriptReader=script;options.logHandler=logger;options.enableUnsafeLibraries=1;
    OCG_Duel duel{};if(OCG_CreateDuel(&duel,&options))return 2;
    script(nullptr,duel,"constant.lua");script(nullptr,duel,"utility.lua");std::string lua=fixture["script"];
    if(!OCG_LoadScript(duel,lua.data(),uint32_t(lua.size()),"repro.lua"))return 3;
    OCG_StartDuel(duel);int index=0;json prompts=json::array();json last;
    for(int step=0;step<3000;step++){
      auto status=OCG_DuelProcess(duel);uint32_t len=0;auto p=(const uint8_t*)OCG_DuelGetMessage(duel,&len);auto end=p+len;
      while(p<end){auto size=read32(p);auto next=p+size;auto msg=*p;
       if(msg==MSG_RETRY){std::cerr<<"RETRY response "<<index-1<<" last "<<last.dump()<<std::endl;std::ofstream("../temp/retry-prompts.json")<<prompts.dump();return 4;}
       bool choice=false;switch(msg){
        case MSG_SELECT_BATTLECMD:case MSG_SELECT_IDLECMD:case MSG_SELECT_EFFECTYN:case MSG_SELECT_YESNO:case MSG_SELECT_OPTION:case MSG_SELECT_CARD:case MSG_SELECT_TRIBUTE:case MSG_SELECT_UNSELECT_CARD:case MSG_SELECT_CHAIN:case MSG_SELECT_PLACE:case MSG_SELECT_DISFIELD:case MSG_SELECT_POSITION:case MSG_SELECT_COUNTER:case MSG_SELECT_SUM:case MSG_SORT_CARD:case MSG_SORT_CHAIN:case MSG_ROCK_PAPER_SCISSORS:case MSG_ANNOUNCE_RACE:case MSG_ANNOUNCE_ATTRIB:case MSG_ANNOUNCE_CARD:case MSG_ANNOUNCE_NUMBER:choice=true;break;
       }
       if(choice){if(index>=fixture["responses"].size()){std::cerr<<"END responses; next prompt "<<int(msg)<<std::endl;std::ofstream("../temp/retry-prompts.json")<<prompts.dump();return 0;}
        auto response=fixture["responses"][index++].get<std::vector<uint8_t>>();last={{"index",index-1},{"prompt",std::vector<uint8_t>(p,next)},{"response",response}};prompts.push_back(last);if(argc>1 && NormalizeCampaignChainResponse(std::vector<uint8_t>(p,next),response))std::cerr<<"REPAIRED mandatory response "<<index-1<<std::endl;OCG_DuelSetResponse(duel,response.data(),response.size());
       }p=next;
      }if(!status)break;
    }std::ofstream("../temp/retry-prompts.json")<<prompts.dump();OCG_DestroyDuel(duel);return 0;
}
