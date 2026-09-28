from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
src = ROOT/'edopro-source'

# Keep every SDK header, library and build artifact on D:.
sdk = ROOT/'dependencies/sdk'
inc = sdk/'microsoft.windows.sdk.cpp/c/Include/10.0.26100.0'
lib = sdk/'microsoft.windows.sdk.cpp.x86/c'
for path in (src/'build').glob('*.vcxproj'):
    text = path.read_text(encoding='utf-8-sig')
    if '<ShadowRunSDK>' in text: continue
    block = f'''<PropertyGroup><ShadowRunSDK>true</ShadowRunSDK>
    <IncludePath>{inc}/ucrt;{inc}/shared;{inc}/um;{inc}/winrt;$(IncludePath)</IncludePath>
    <LibraryPath>{lib}/ucrt/x86;{lib}/um/x86;$(LibraryPath)</LibraryPath>
    <ExecutablePath>{sdk}/microsoft.windows.sdk.cpp/c/bin/10.0.26100.0/x64;$(ExecutablePath)</ExecutablePath>
    <WindowsSdkDir>{sdk}/microsoft.windows.sdk.cpp/c/</WindowsSdkDir>
    <WindowsSDKVersion>10.0.26100.0/</WindowsSDKVersion>
    </PropertyGroup>'''
    text = text.replace('<PropertyGroup Label="UserMacros" />', '<PropertyGroup Label="UserMacros" />'+block)
    path.write_text(text, encoding='utf-8')

p = src/'ocgcore/playerop.cpp'
t = p.read_text()
if '// Shadow Run battle policy' not in t:
    anchor = 'bool field::process(Processors::SelectBattleCmd& arg) {\n\tauto playerid = arg.playerid;\n\tif(arg.step == 0) {'
    t = t.replace(anchor, anchor+'''
        // Shadow Run battle policy: attack only a beatable public target.
        if(playerid == 1 && is_flag(DUEL_SIMPLE_AI)) {
            int best = -1, power = -1;
            for(size_t i = 0; i < core.attackable_cards.size(); ++i) {
                auto* c = core.attackable_cards[i];
                bool safe = c->direct_attackable;
                for(auto* target : player[0].list_mzone) if(target) {
                    int strength = (target->current.position & POS_FACEDOWN) ? 1500 :
                        ((target->current.position & POS_ATTACK) ? target->get_attack() : target->get_defense());
                    if(c->get_attack() > strength) safe = true;
                }
                if(safe && c->get_attack() > power) { best = int(i); power = c->get_attack(); }
            }
            returns.set<int32_t>(0, best >= 0 ? (best << 16) | 1 : (core.to_m2 ? 2 : 3));
            return TRUE;
        }
''')
    anchor = 'bool field::process(Processors::SelectIdleCmd& arg) {\n\tauto playerid = arg.playerid;\n\tif(arg.step == 0) {'
    t = t.replace(anchor, anchor+'''
        // Shadow Run: legal moves are supplied by the core, never guessed by the UI.
        if(playerid == 1 && is_flag(DUEL_SIMPLE_AI)) {
            int threat = 0;
            for(auto* c : player[0].list_mzone) if(c && (c->current.position & POS_FACEUP))
                threat = std::max(threat, (c->current.position & POS_ATTACK) ? c->get_attack() : c->get_defense());
            auto choose = [&](const auto& cards, bool defense) {
                int best = -1, value = -1;
                for(size_t i = 0; i < cards.size(); ++i) {
                    int v = defense ? cards[i]->get_defense() : cards[i]->get_attack();
                    if(v > value && (defense || v > threat)) { best = int(i); value = v; }
                }
                return best;
            };
            int index = choose(core.spsummonable_cards, false);
            if(index >= 0) { returns.set<int32_t>(0, (index << 16) | 1); return TRUE; }
            index = choose(core.summonable_cards, false);
            if(index >= 0) { returns.set<int32_t>(0, index << 16); return TRUE; }
            index = choose(core.msetable_cards, true);
            if(index >= 0) { returns.set<int32_t>(0, (index << 16) | 3); return TRUE; }
            for(size_t i = 0; i < core.ssetable_cards.size(); ++i)
                if(core.ssetable_cards[i]->data.type & TYPE_TRAP) {
                    returns.set<int32_t>(0, (int(i) << 16) | 4); return TRUE;
                }
            core.select_chains.sort(chain::chain_operation_sort);
            int i = 0;
            for(const auto& ch : core.select_chains) {
                auto* c = ch.triggering_effect->get_handler();
                // Opponent decks contain safe, useful draw/heal/removal spells.
                if((c->data.type & TYPE_SPELL) && ch.triggering_effect->is_flag(EFFECT_FLAG_CARD_TARGET) == false) {
                    returns.set<int32_t>(0, (i << 16) | 5); return TRUE;
                }
                ++i;
            }
            for(size_t i = 0; i < core.repositionable_cards.size(); ++i) {
                auto* c = core.repositionable_cards[i];
                if((c->current.position & POS_DEFENSE) && c->get_attack() > threat) {
                    returns.set<int32_t>(0, (int(i) << 16) | 2); return TRUE;
                }
            }
            returns.set<int32_t>(0, infos.phase == PHASE_MAIN1 && core.to_bp ? 6 : 7);
            return TRUE;
        }
''')
    p.write_text(t)

p = src/'gframe/game.cpp'
t = p.read_text()
if '// Shadow Run startup' not in t:
    t = '#include <fstream>\n'+t
    t = t.replace('\twhile(!restart && device->run()) {', '''
    // Shadow Run startup: fixed local request written atomically by the launcher.
    bool shadowRunStarted = false;
    while(!restart && device->run()) {
        if(!shadowRunStarted) {
            shadowRunStarted = true;
            std::ifstream campaign("campaign-request.json");
            if(campaign.good()) {
                try {
                    nlohmann::json request; campaign >> request;
                    if(request.value("protocol", 0) == 1) {
                        wMainMenu->setVisible(false);
                        SingleMode::DuelOptions options("./puzzles/shadow-run.lua");
                        options.duelFlags = DUEL_MODE_MR1 | DUEL_SIMPLE_AI;
                        options.startingLP = request.value("lp", 8000u);
                        SingleMode::StartPlay(std::move(options));
                    }
                } catch(...) {}
            }
        }
''')
    p.write_text(t)

p = src/'gframe/single_mode.cpp'
t = p.read_text()
bridge=(Path(__file__).resolve().parent/'campaign_bridge.txt').read_text(encoding='utf8')
if '// Shadow Run result bridge' not in t:
    t = '#include <fstream>\n#include <cstdio>\n#include <nlohmann/json.hpp>\n'+t
    anchor = 'bool SingleMode::SinglePlayAnalyze(CoreUtils::Packet& packet) {'
    t = t.replace(anchor,anchor+'\n'+bridge)
else:
    a=t.index('    // Shadow Run result bridge.');b=t.index('\n\tauto Analyze',a)
    t=t[:a]+bridge+t[b:]
p.write_text(t,encoding='utf8')
print('Native campaign integration patched.')
