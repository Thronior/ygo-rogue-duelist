"""Moth LV line (user design, 2026-11-23): names and card text of Moth LV1/LV2/LV6/LV8, Cocoon of Evolution - S and the
Moth Token in all 8 languages, in each language's card wording (the official Silent Swordsman LV3, Insect Queen and
Marshmallow texts were the models; "Moth" follows each language's Petit Moth name). Custom cards are translated in the ui
dictionary, like Gate Guardian-F. The English keys come from data/custom-cards.json and data/custom-tokens.json, so they
always match the game text. Never overwrites an existing translation."""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
MOTH = dict(de='Motte', es='Moth', fr='Papillon', it='Falena', ja='モス', ko='모스', pt='Moth', zh='飞蛾')
LV = dict(ja=lambda n: f'モス ＬＶ{chr(0xFF10 + n)}')


def lv(lang, n):
    return LV[lang](n) if lang in LV else f'{MOTH[lang]} LV{n}'


TOKEN = dict(de='Motten-Spielmarke', es='Ficha Moth', fr='Jeton Papillon', it='Segna-Falena', ja='モストークン', ko='모스 토큰', pt='Ficha de Moth', zh='飞蛾衍生物')
COCOON = dict(de='Kokon der Evolution - S', es='Capullo Evolutivo - S', fr="Cocon d'Évolution - S", it="Bozzolo dell'Evoluzione - S",
              ja='進化の繭－Ｓ', ko='진화의 고치 - S', pt='Casulo de Evolução - S', zh='进化之茧-S')


def texts(lang):
    m, t = MOTH[lang], TOKEN[lang]
    l2, l6, l8 = lv(lang, 2), lv(lang, 6), lv(lang, 8)
    if lang == 'ja':
        l2, l6, l8 = 'モス ＬＶ２', 'モス ＬＶ６', 'モス ＬＶ８'
    return {
        'de': {
            52: f'Während deiner Standby Phase: Biete diese Karte als Tribut an; beschwöre 1 „{l2}“ als Spezialbeschwörung von deiner Hand oder deinem Deck. Du kannst diesen Effekt nicht in dem Spielzug aktivieren, in dem diese Karte beschworen wird.',
            53: f'Kann nicht als Normalbeschwörung beschworen/gesetzt werden. Kann nicht durch Kampf zerstört werden. Während deiner Standby Phase: Biete diese Karte als Tribut an; beschwöre 1 „{l6}“ als Spezialbeschwörung von deiner Hand oder deinem Deck. Du kannst diesen Effekt nicht in dem Spielzug aktivieren, in dem diese Karte beschworen wird.',
            54: f'Kann nicht als Normalbeschwörung beschworen/gesetzt werden. Kann nicht durch Kampf zerstört werden. Während deiner Standby Phase: Du kannst diese Karte als Tribut anbieten; beschwöre 1 „{l8}“ als Spezialbeschwörung von deiner Hand oder deinem Deck. Du kannst diesen Effekt nicht in dem Spielzug aktivieren, in dem diese Karte beschworen wird. Falls diese Karte ein Monster durch Kampf zerstört: Beschwöre 1 „{t}“ (Insekt/ERDE/Stufe 3/ATK 1000/DEF 1000) als Spezialbeschwörung.',
            55: f'Kann nicht als Normalbeschwörung beschworen/gesetzt werden. Kann nicht durch Kampf zerstört werden. Falls diese Karte ein Monster durch Kampf zerstört: Beschwöre 1 „{t}“ (Insekt/ERDE/Stufe 3/ATK ?/DEF ?) als Spezialbeschwörung. Ihre ATK/DEF entsprechen den ATK/DEF, die das zerstörte Monster auf dem Spielfeld hatte.',
            56: f'Biete 1 „{m}“-Monster als Tribut an; beschwöre 1 Insekt-Monster als Spezialbeschwörung von deiner Hand, wobei du seine Beschwörungsbedingungen ignorierst.',
            57: f'Als Spezialbeschwörung durch den Effekt von „{l6}“ oder „{l8}“ beschworen.',
        },
        'es': {
            52: f'Durante tu Standby Phase: Sacrifica esta carta; Invoca de Modo Especial, desde tu mano o Deck, 1 "{l2}". No puedes activar este efecto en el turno en el que esta carta es Invocada.',
            53: f'No puede ser Invocada de Modo Normal/Colocada. No puede ser destruida en batalla. Durante tu Standby Phase: Sacrifica esta carta; Invoca de Modo Especial, desde tu mano o Deck, 1 "{l6}". No puedes activar este efecto en el turno en el que esta carta es Invocada.',
            54: f'No puede ser Invocada de Modo Normal/Colocada. No puede ser destruida en batalla. Durante tu Standby Phase: puedes Sacrificar esta carta; Invoca de Modo Especial, desde tu mano o Deck, 1 "{l8}". No puedes activar este efecto en el turno en el que esta carta es Invocada. Si esta carta destruye un monstruo en batalla: Invoca de Modo Especial 1 "{t}" (Insecto/TIERRA/Nivel 3/ATK 1000/DEF 1000).',
            55: f'No puede ser Invocada de Modo Normal/Colocada. No puede ser destruida en batalla. Si esta carta destruye un monstruo en batalla: Invoca de Modo Especial 1 "{t}" (Insecto/TIERRA/Nivel 3/ATK ?/DEF ?). Su ATK/DEF son iguales al ATK/DEF que el monstruo destruido tenía en el Campo.',
            56: f'Sacrifica 1 monstruo "{m}"; Invoca de Modo Especial, desde tu mano, 1 monstruo Insecto, ignorando sus condiciones de Invocación.',
            57: f'Invocada de Modo Especial con el efecto de "{l6}" o "{l8}".',
        },
        'fr': {
            52: f'Durant votre Standby Phase: Sacrifiez cette carte; Invoquez Spécialement 1 "{l2}" depuis votre main ou Deck. Vous ne pouvez pas activer cet effet le tour où cette carte est Invoquée.',
            53: f'Ni Invocable Normalement ni Posable. Non destructible au combat. Durant votre Standby Phase: Sacrifiez cette carte; Invoquez Spécialement 1 "{l6}" depuis votre main ou Deck. Vous ne pouvez pas activer cet effet le tour où cette carte est Invoquée.',
            54: f'Ni Invocable Normalement ni Posable. Non destructible au combat. Durant votre Standby Phase: vous pouvez Sacrifier cette carte; Invoquez Spécialement 1 "{l8}" depuis votre main ou Deck. Vous ne pouvez pas activer cet effet le tour où cette carte est Invoquée. Si cette carte détruit un monstre au combat: Invoquez Spécialement 1 "{t}" (Insecte/TERRE/Niveau 3/ATK 1000/DEF 1000).',
            55: f"Ni Invocable Normalement ni Posable. Non destructible au combat. Si cette carte détruit un monstre au combat: Invoquez Spécialement 1 \"{t}\" (Insecte/TERRE/Niveau 3/ATK ?/DEF ?). Son ATK/DEF est égale à l'ATK/DEF que le monstre détruit avait sur le Terrain.",
            56: f"Sacrifiez 1 monstre \"{m}\"; Invoquez Spécialement 1 monstre Insecte depuis votre main, en ignorant ses conditions d'Invocation.",
            57: f"Invoqué Spécialement avec l'effet de \"{l6}\" ou \"{l8}\".",
        },
        'it': {
            52: f'Durante la tua Standby Phase: offri come Tributo questa carta; Evoca Specialmente 1 "{l2}" dalla tua mano o Deck. Non puoi attivare questo effetto nel turno in cui questa carta è stata Evocata.',
            53: f'Non può essere Evocata Normalmente/Posizionata. Non può essere distrutta in battaglia. Durante la tua Standby Phase: offri come Tributo questa carta; Evoca Specialmente 1 "{l6}" dalla tua mano o Deck. Non puoi attivare questo effetto nel turno in cui questa carta è stata Evocata.',
            54: f'Non può essere Evocata Normalmente/Posizionata. Non può essere distrutta in battaglia. Durante la tua Standby Phase: puoi offrire come Tributo questa carta; Evoca Specialmente 1 "{l8}" dalla tua mano o Deck. Non puoi attivare questo effetto nel turno in cui questa carta è stata Evocata. Se questa carta distrugge un mostro in battaglia: Evoca Specialmente 1 "{t}" (Insetto/TERRA/Livello 3/ATK 1000/DEF 1000).',
            55: f'Non può essere Evocata Normalmente/Posizionata. Non può essere distrutta in battaglia. Se questa carta distrugge un mostro in battaglia: Evoca Specialmente 1 "{t}" (Insetto/TERRA/Livello 3/ATK ?/DEF ?). I suoi ATK/DEF sono uguali agli ATK/DEF che il mostro distrutto aveva sul Terreno.',
            56: f'Offri come Tributo 1 mostro "{m}"; Evoca Specialmente 1 mostro Insetto dalla tua mano, ignorando le sue condizioni di Evocazione.',
            57: f"Evocato Specialmente con l'effetto di \"{l6}\" o \"{l8}\".",
        },
        'ja': {
            52: f'①：自分スタンバイフェイズに、このターンに召喚・特殊召喚されていないこのカードをリリースして発動する。手札・デッキから「{l2}」１体を特殊召喚する。',
            53: f'このカードは通常召喚できない。①：このカードは戦闘では破壊されない。②：自分スタンバイフェイズに、このターンに召喚・特殊召喚されていないこのカードをリリースして発動する。手札・デッキから「{l6}」１体を特殊召喚する。',
            54: f'このカードは通常召喚できない。①：このカードは戦闘では破壊されない。②：自分スタンバイフェイズに、このターンに召喚・特殊召喚されていないこのカードをリリースして発動できる。手札・デッキから「{l8}」１体を特殊召喚する。③：このカードが戦闘でモンスターを破壊した時に発動する。自分フィールドに「{t}」（昆虫族・地・星３・攻／守１０００）１体を特殊召喚する。',
            55: f'このカードは通常召喚できない。①：このカードは戦闘では破壊されない。②：このカードが戦闘でモンスターを破壊した時に発動する。自分フィールドに「{t}」（昆虫族・地・星３・攻／守？）１体を特殊召喚する。このトークンの攻撃力・守備力は、破壊されたモンスターがフィールドで持っていた攻撃力・守備力と同じになる。',
            56: f'①：自分フィールドの「{m}」モンスター１体をリリースして発動できる。手札から昆虫族モンスター１体を召喚条件を無視して特殊召喚する。',
            57: f'「{l6}」または「{l8}」の効果で特殊召喚される。',
        },
        'ko': {
            52: f'①: 자신 스탠바이 페이즈에, 이 턴에 소환 / 특수 소환되지 않은 이 카드를 릴리스하고 발동한다. 패 / 덱에서 "{l2}" 1장을 특수 소환한다.',
            53: f'이 카드는 일반 소환 / 세트할 수 없다. ①: 이 카드는 전투로는 파괴되지 않는다. ②: 자신 스탠바이 페이즈에, 이 턴에 소환 / 특수 소환되지 않은 이 카드를 릴리스하고 발동한다. 패 / 덱에서 "{l6}" 1장을 특수 소환한다.',
            54: f'이 카드는 일반 소환 / 세트할 수 없다. ①: 이 카드는 전투로는 파괴되지 않는다. ②: 자신 스탠바이 페이즈에, 이 턴에 소환 / 특수 소환되지 않은 이 카드를 릴리스하고 발동할 수 있다. 패 / 덱에서 "{l8}" 1장을 특수 소환한다. ③: 이 카드가 전투로 몬스터를 파괴했을 때에 발동한다. 자신 필드에 "{t}"(곤충족 / 땅 / 레벨 3 / 공 1000 / 수 1000) 1장을 특수 소환한다.',
            55: f'이 카드는 일반 소환 / 세트할 수 없다. ①: 이 카드는 전투로는 파괴되지 않는다. ②: 이 카드가 전투로 몬스터를 파괴했을 때에 발동한다. 자신 필드에 "{t}"(곤충족 / 땅 / 레벨 3 / 공 ? / 수 ?) 1장을 특수 소환한다. 이 토큰의 공격력 / 수비력은 파괴된 몬스터가 필드에서 가지고 있던 공격력 / 수비력과 같다.',
            56: f'①: 자신 필드의 "{m}" 몬스터 1장을 릴리스하고 발동할 수 있다. 패에서 곤충족 몬스터 1장을 소환 조건을 무시하고 특수 소환한다.',
            57: f'"{l6}" 또는 "{l8}"의 효과로 특수 소환된다.',
        },
        'pt': {
            52: f'Durante sua Fase de Apoio: ofereça este card como Tributo; Invoque por Invocação-Especial 1 "{l2}" da sua mão ou Deck. Você não pode ativar este efeito no turno em que este card for Invocado.',
            53: f'Não pode ser Invocado por Invocação-Normal/Baixado. Não pode ser destruído em batalha. Durante sua Fase de Apoio: ofereça este card como Tributo; Invoque por Invocação-Especial 1 "{l6}" da sua mão ou Deck. Você não pode ativar este efeito no turno em que este card for Invocado.',
            54: f'Não pode ser Invocado por Invocação-Normal/Baixado. Não pode ser destruído em batalha. Durante sua Fase de Apoio: você pode oferecer este card como Tributo; Invoque por Invocação-Especial 1 "{l8}" da sua mão ou Deck. Você não pode ativar este efeito no turno em que este card for Invocado. Se este card destruir um monstro em batalha: Invoque por Invocação-Especial 1 "{t}" (Inseto/TERRA/Nível 3/ATK 1000/DEF 1000).',
            55: f'Não pode ser Invocado por Invocação-Normal/Baixado. Não pode ser destruído em batalha. Se este card destruir um monstro em batalha: Invoque por Invocação-Especial 1 "{t}" (Inseto/TERRA/Nível 3/ATK ?/DEF ?). O ATK/DEF dela é igual ao ATK/DEF que o monstro destruído tinha no campo.',
            56: f'Ofereça 1 monstro "{m}" como Tributo; Invoque por Invocação-Especial 1 monstro Inseto da sua mão, ignorando as condições de Invocação dele.',
            57: f'Invocada por Invocação-Especial com o efeito de "{l6}" ou "{l8}".',
        },
        'zh': {
            52: f'①：自己准备阶段，把这个回合没有召唤·特殊召唤的这张卡解放发动。从手卡·卡组把1只「{l2}」特殊召唤。',
            53: f'这张卡不能通常召唤。①：这张卡不会被战斗破坏。②：自己准备阶段，把这个回合没有召唤·特殊召唤的这张卡解放发动。从手卡·卡组把1只「{l6}」特殊召唤。',
            54: f'这张卡不能通常召唤。①：这张卡不会被战斗破坏。②：自己准备阶段，把这个回合没有召唤·特殊召唤的这张卡解放才能发动。从手卡·卡组把1只「{l8}」特殊召唤。③：这张卡战斗破坏怪兽时发动。在自己场上把1只「{t}」（昆虫族·地·3星·攻/守1000）特殊召唤。',
            55: f'这张卡不能通常召唤。①：这张卡不会被战斗破坏。②：这张卡战斗破坏怪兽时发动。在自己场上把1只「{t}」（昆虫族·地·3星·攻/守?）特殊召唤。这衍生物的攻击力·守备力变成和被破坏的怪兽在场上时的攻击力·守备力相同。',
            56: f'①：把自己场上1只「{m}」怪兽解放才能发动。从手卡把1只昆虫族怪兽无视召唤条件特殊召唤。',
            57: f'用「{l6}」或「{l8}」的效果特殊召唤。',
        },
    }[lang]


def names(lang):
    return {52: lv(lang, 1), 53: lv(lang, 2), 54: lv(lang, 6), 55: lv(lang, 8), 56: COCOON[lang], 57: TOKEN[lang]}


def main():
    english = {c['id'] - 190000000: c for c in json.loads((ROOT / 'data/custom-cards.json').read_text(encoding='utf8'))
               + json.loads((ROOT / 'data/custom-tokens.json').read_text(encoding='utf8'))}
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key, local in names(lang).items():
            table.setdefault(english[key]['name'], local)
        for key, local in texts(lang).items():
            table.setdefault(english[key]['desc'], local)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
