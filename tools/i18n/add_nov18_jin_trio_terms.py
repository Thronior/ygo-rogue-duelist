"""Adds Jin Trio and its fusion Ultimate Gate Combination (the user's design, 2026-11-18) to every language: names and
rules text. Card names use each language's official card name (data/i18n/cards). Existing translations are never
overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_text  # a plain write fails while a scanner maps the file (Errno 22)

LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
JIN = ('Your "Sanga of the Thunder", "Kazejin" and "Suijin" gain effects for each of them you control. 1 or more: When one of '
       "them attacks an opponent's monster, that monster's ATK becomes 0 in the Damage Step, until the End Phase. 2 or more: "
       "Once per turn each, during your opponent's turn, when your opponent activates a monster effect or a Spell, you can "
       'negate that effect, then return that card to the hand. 3: Once per turn, you can Special Summon "Gate Guardian" from '
       'your Deck, ignoring its Summoning conditions.')
GATE = ('At the start of each Duel, add "Sanga of the Thunder", "Kazejin" and "Suijin" to your hand. Your "Gate Guardian", '
        '"Sanga of the Thunder", "Kazejin" and "Suijin" gain these effects, whatever else you control: When it attacks an '
        "opponent's monster, that monster's ATK becomes 0 in the Damage Step, until the End Phase. Once per turn each, during "
        "your opponent's turn, when your opponent activates a monster effect or a Spell, you can negate that effect, then "
        'return that card to the hand. Once per turn, you can Special Summon "Gate Guardian" from your Deck, ignoring its '
        'Summoning conditions.')
TERMS = {
    'Jin Trio': ('Jin-Trio', 'Trío Jin', 'Trio Jin', 'Trio Jin', 'Trio Jin', '魔神トリオ', '마신 트리오', '魔神三人组'),
    'Ultimate Gate Combination': ('Ultimative Torkombination', 'Combinación Definitiva de la Puerta', 'Combinaison Ultime de la Porte',
                                  'Combinazione Definitiva del Cancello', 'Combinação Suprema do Portão', '究極ゲート・コンビネーション',
                                  '궁극의 게이트 콤비네이션', '究极门之组合'),
    JIN: (
        'Deine „Sanga des Donners“, „Kazejin“ und „Suijin“ erhalten Effekte, je nachdem, wie viele von ihnen du kontrollierst. 1 oder mehr: Wenn eines von ihnen ein Monster deines Gegners angreift, wird die ATK jenes Monsters im Damage Step bis zur End Phase 0. 2 oder mehr: Jedes einmal pro Spielzug, während des Spielzugs deines Gegners, wenn dein Gegner einen Monstereffekt oder eine Zauberkarte aktiviert, kannst du jenen Effekt annullieren und jene Karte dann auf die Hand zurückgeben. 3: Einmal pro Spielzug kannst du „Torwächter“ als Spezialbeschwörung von deinem Deck beschwören, wobei du seine Beschwörungsbedingungen ignorierst.',
        'Tus "Sanga del Trueno", "Kazejin" y "Suijin" obtienen efectos según cuántos de ellos controles. 1 o más: Cuando uno de ellos ataque a un monstruo de tu adversario, el ATK de ese monstruo pasa a ser 0 en el Damage Step, hasta la End Phase. 2 o más: Una vez por turno cada uno, durante el turno de tu adversario, cuando tu adversario active un efecto de monstruo o una Carta Mágica, puedes negar ese efecto y, después, devolver esa carta a la mano. 3: Una vez por turno, puedes Invocar de Modo Especial "Guardián de la Puerta" desde tu Deck, ignorando sus condiciones de Invocación.',
        "Vos « Sanga du Tonnerre », « Kazejin » et « Suijin » gagnent des effets selon le nombre d'entre eux que vous contrôlez. 1 ou plus : Lorsque l'un d'eux attaque un monstre de votre adversaire, l'ATK de ce monstre devient 0 durant la Damage Step, jusqu'à la End Phase. 2 ou plus : Une fois par tour chacun, durant le tour de votre adversaire, lorsque votre adversaire active un effet de monstre ou une Carte Magie, vous pouvez annuler cet effet, puis renvoyer cette carte dans la main. 3 : Une fois par tour, vous pouvez Invoquer Spécialement « Gardien de la Porte » depuis votre Deck, en ignorant ses conditions d'Invocation.",
        'I tuoi "Sanga del Tuono", "Kazejin" e "Suijin" ottengono effetti in base a quanti di essi controlli. 1 o più: Quando uno di essi attacca un mostro del tuo avversario, l\'ATK di quel mostro diventa 0 durante il Damage Step, fino alla End Phase. 2 o più: Una volta per turno ciascuno, durante il turno del tuo avversario, quando il tuo avversario attiva un effetto di un mostro o una Carta Magia, puoi annullare quell\'effetto, poi far ritornare quella carta nella mano. 3: Una volta per turno, puoi Evocare Specialmente "Guardiano del Cancello" dal tuo Deck, ignorando le sue condizioni di Evocazione.',
        'Seus "Sanga do Trovão", "Kazejin" e "Suijin" ganham efeitos de acordo com quantos deles você controla. 1 ou mais: Quando um deles atacar um monstro do seu oponente, o ATK desse monstro se torna 0 na Etapa de Dano, até a Fase Final. 2 ou mais: Uma vez por turno cada um, durante o turno do seu oponente, quando seu oponente ativar um efeito de monstro ou um Card de Magia, você pode negar esse efeito e, depois, devolver esse card para a mão. 3: Uma vez por turno, você pode fazer a Invocação-Especial de "Guardião do Portão" do seu Deck, ignorando as condições de Invocação dele.',
        '自分の「雷魔神－サンガ」「風魔神－ヒューガ」「水魔神－スーガ」は、自分がコントロールするそれらの数に応じて効果を得る。1体以上：それらが相手モンスターに攻撃する場合、ダメージステップにその相手モンスターの攻撃力はエンドフェイズまで０になる。2体以上：それぞれ1ターンに1度、相手ターンに相手がモンスターの効果または魔法カードを発動した時、その効果を無効にし、そのカードを手札に戻す事ができる。3体：1ターンに1度、デッキから「ゲート・ガーディアン」1体を召喚条件を無視して特殊召喚できる。',
        '자신의 "번개 마신－썬가", "풍 마신－휴가", "수 마신－스가"는 자신이 컨트롤하는 그것들의 수에 따라 효과를 얻는다. 1장 이상: 그것들이 상대 몬스터를 공격할 경우, 데미지 스텝에 그 상대 몬스터의 공격력은 엔드 페이즈까지 0이 된다. 2장 이상: 각각 1턴에 1번, 상대 턴에 상대가 몬스터의 효과 또는 마법 카드를 발동했을 때, 그 효과를 무효로 하고, 그 카드를 패로 되돌릴 수 있다. 3장: 1턴에 1번, 덱에서 "게이트 가디언" 1장을 소환 조건을 무시하고 특수 소환할 수 있다.',
        '自己的「雷魔神-桑迦」「风魔神-修迦」「水魔神-斯迦」根据自己控制的这些怪兽数量得到效果。1只以上：这些怪兽攻击对方怪兽的场合，伤害步骤中那只对方怪兽的攻击力直到结束阶段变成0。2只以上：各自1回合1次，对方回合中对方把怪兽的效果或魔法卡发动时，可以把那个效果无效，那张卡回到手卡。3只：1回合1次，可以从卡组把1只「门之守护神」无视召唤条件特殊召唤。'),
    GATE: (
        'Füge zu Beginn jedes Duells „Sanga des Donners“, „Kazejin“ und „Suijin“ deiner Hand hinzu. Deine „Torwächter“, „Sanga des Donners“, „Kazejin“ und „Suijin“ erhalten diese Effekte, unabhängig davon, was du sonst kontrollierst: Wenn eines von ihnen ein Monster deines Gegners angreift, wird die ATK jenes Monsters im Damage Step bis zur End Phase 0. Jedes einmal pro Spielzug, während des Spielzugs deines Gegners, wenn dein Gegner einen Monstereffekt oder eine Zauberkarte aktiviert, kannst du jenen Effekt annullieren und jene Karte dann auf die Hand zurückgeben. Einmal pro Spielzug kannst du „Torwächter“ als Spezialbeschwörung von deinem Deck beschwören, wobei du seine Beschwörungsbedingungen ignorierst.',
        'Al principio de cada Duelo, añade "Sanga del Trueno", "Kazejin" y "Suijin" a tu mano. Tus "Guardián de la Puerta", "Sanga del Trueno", "Kazejin" y "Suijin" obtienen estos efectos, controles lo que controles: Cuando ataque a un monstruo de tu adversario, el ATK de ese monstruo pasa a ser 0 en el Damage Step, hasta la End Phase. Una vez por turno cada uno, durante el turno de tu adversario, cuando tu adversario active un efecto de monstruo o una Carta Mágica, puedes negar ese efecto y, después, devolver esa carta a la mano. Una vez por turno, puedes Invocar de Modo Especial "Guardián de la Puerta" desde tu Deck, ignorando sus condiciones de Invocación.',
        "Au début de chaque Duel, ajoutez « Sanga du Tonnerre », « Kazejin » et « Suijin » à votre main. Vos « Gardien de la Porte », « Sanga du Tonnerre », « Kazejin » et « Suijin » gagnent ces effets, quoi que vous contrôliez d'autre : Lorsqu'il attaque un monstre de votre adversaire, l'ATK de ce monstre devient 0 durant la Damage Step, jusqu'à la End Phase. Une fois par tour chacun, durant le tour de votre adversaire, lorsque votre adversaire active un effet de monstre ou une Carte Magie, vous pouvez annuler cet effet, puis renvoyer cette carte dans la main. Une fois par tour, vous pouvez Invoquer Spécialement « Gardien de la Porte » depuis votre Deck, en ignorant ses conditions d'Invocation.",
        'All\'inizio di ogni Duello, aggiungi "Sanga del Tuono", "Kazejin" e "Suijin" alla tua mano. I tuoi "Guardiano del Cancello", "Sanga del Tuono", "Kazejin" e "Suijin" ottengono questi effetti, qualunque altra cosa tu controlli: Quando attacca un mostro del tuo avversario, l\'ATK di quel mostro diventa 0 durante il Damage Step, fino alla End Phase. Una volta per turno ciascuno, durante il turno del tuo avversario, quando il tuo avversario attiva un effetto di un mostro o una Carta Magia, puoi annullare quell\'effetto, poi far ritornare quella carta nella mano. Una volta per turno, puoi Evocare Specialmente "Guardiano del Cancello" dal tuo Deck, ignorando le sue condizioni di Evocazione.',
        'No começo de cada Duelo, adicione "Sanga do Trovão", "Kazejin" e "Suijin" à sua mão. Seus "Guardião do Portão", "Sanga do Trovão", "Kazejin" e "Suijin" ganham estes efeitos, independentemente do que mais você controle: Quando ele atacar um monstro do seu oponente, o ATK desse monstro se torna 0 na Etapa de Dano, até a Fase Final. Uma vez por turno cada um, durante o turno do seu oponente, quando seu oponente ativar um efeito de monstro ou um Card de Magia, você pode negar esse efeito e, depois, devolver esse card para a mão. Uma vez por turno, você pode fazer a Invocação-Especial de "Guardião do Portão" do seu Deck, ignorando as condições de Invocação dele.',
        '各デュエル開始時に、「雷魔神－サンガ」「風魔神－ヒューガ」「水魔神－スーガ」を手札に加える。自分の「ゲート・ガーディアン」「雷魔神－サンガ」「風魔神－ヒューガ」「水魔神－スーガ」は、他に何をコントロールしていても以下の効果を得る。そのモンスターが相手モンスターに攻撃する場合、ダメージステップにその相手モンスターの攻撃力はエンドフェイズまで０になる。それぞれ1ターンに1度、相手ターンに相手がモンスターの効果または魔法カードを発動した時、その効果を無効にし、そのカードを手札に戻す事ができる。1ターンに1度、デッキから「ゲート・ガーディアン」1体を召喚条件を無視して特殊召喚できる。',
        '각 듀얼 개시시에, "번개 마신－썬가", "풍 마신－휴가", "수 마신－스가"를 패에 넣는다. 자신의 "게이트 가디언", "번개 마신－썬가", "풍 마신－휴가", "수 마신－스가"는 그 밖에 무엇을 컨트롤하든 이하의 효과를 얻는다. 그 몬스터가 상대 몬스터를 공격할 경우, 데미지 스텝에 그 상대 몬스터의 공격력은 엔드 페이즈까지 0이 된다. 각각 1턴에 1번, 상대 턴에 상대가 몬스터의 효과 또는 마법 카드를 발동했을 때, 그 효과를 무효로 하고, 그 카드를 패로 되돌릴 수 있다. 1턴에 1번, 덱에서 "게이트 가디언" 1장을 소환 조건을 무시하고 특수 소환할 수 있다.',
        '每场决斗开始时，把「雷魔神-桑迦」「风魔神-修迦」「水魔神-斯迦」加入手卡。自己的「门之守护神」「雷魔神-桑迦」「风魔神-修迦」「水魔神-斯迦」不论自己还控制什么都得到以下效果。那只怪兽攻击对方怪兽的场合，伤害步骤中那只对方怪兽的攻击力直到结束阶段变成0。各自1回合1次，对方回合中对方把怪兽的效果或魔法卡发动时，可以把那个效果无效，那张卡回到手卡。1回合1次，可以从卡组把1只「门之守护神」无视召唤条件特殊召唤。'),
}


def main():
    sys.path.insert(0, str(ROOT))
    import content
    # The keys must be exactly the game's English texts.
    assert content.ARTIFACTS['jin_trio'][2] == JIN and content.ARTIFACTS['ultimate_gate_combination'][2] == GATE
    catalog_path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(catalog_path.read_text(encoding='utf8'))
    known = {r['en'] for r in rows}
    added = {}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        count = 0
        for key, values in TERMS.items():
            if key not in table: table[key] = values[index]; count += 1
        write_text(path, json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    fresh = 0
    for key in TERMS:
        if key not in known:
            rows.append({'group': 'relic', 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-18 (Jin Trio, Ultimate Gate Combination)'}); fresh += 1
    write_text(catalog_path, json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh)


if __name__ == '__main__':
    main()
