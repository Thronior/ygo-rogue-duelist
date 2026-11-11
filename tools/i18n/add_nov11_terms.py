"""Adds the texts of 2026-11-11 to every language: six relics from Discord suggestions, the opening hand that can now
reach 0 cards, Empty-Hand Pact's "(min. 0)" and Faulty Printer at 20%.

New relic texts are written here. Changed texts reuse the translation of the old sentence with its number replaced, so
the wording stays as it was. Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
BURN = "Each time you destroy an opponent's monster by card effect, inflict damage to your opponent equal to half its ATK."
NO_DIRECT = 'Monsters you control cannot attack directly.'
TERMS = {
    'Illusionary Tribute': ('Illusorischer Tribut', 'Sacrificio Ilusorio', 'Sacrifice Illusoire', 'Tributo Illusorio', 'Tributo Ilusório', '幻影のリリース', '환영의 릴리스', '幻影的解放'),
    'Overkill Bounty': ('Overkill-Prämie', 'Recompensa por Exceso', "Prime d'Acharnement", "Taglia dell'Overkill", 'Recompensa de Overkill', 'オーバーキルの報酬', '오버킬 보상', '过量击杀赏金'),
    'Parting Gift': ('Abschiedsgeschenk', 'Regalo de Despedida', "Cadeau d'Adieu", "Dono d'Addio", 'Presente de Despedida', '別れの贈り物', '이별의 선물', '临别赠礼'),
    'Tactical Espionage': ('Taktische Spionage', 'Espionaje Táctico', 'Espionnage Tactique', 'Spionaggio Tattico', 'Espionagem Tática', '戦術的諜報', '전술 첩보', '战术谍报'),
    'Stars Aligned': ('Sternenkonstellation', 'Estrellas Alineadas', 'Étoiles Alignées', 'Stelle Allineate', 'Estrelas Alinhadas', '星の整列', '별들의 정렬', '群星连珠'),
    'Anime Rule #2': ('Anime-Regel #2', 'Regla del Anime #2', "Règle de l'Anime N°2", 'Regola Anime #2', 'Regra do Anime #2', 'アニメルール #2', '애니메이션 룰 #2', '动画规则#2'),
    'Once per Duel, you can Tribute Spells and Traps you control for a Tribute Summon in place of monsters.': (
        'Einmal pro Duell kannst du für eine Tributbeschwörung Zauber und Fallen, die du kontrollierst, anstelle von Monstern als Tribut anbieten.',
        'Una vez por Duelo, puedes Sacrificar Mágicas y Trampas que controles para una Invocación por Sacrificio en lugar de monstruos.',
        'Une fois par Duel, vous pouvez Sacrifier des Magies et Pièges que vous contrôlez pour une Invocation Sacrifice à la place de monstres.',
        "Una volta per Duello, puoi offrire come Tributo Magie e Trappole che controlli per un'Evocazione tramite Tributo al posto di mostri.",
        'Uma vez por Duelo, você pode oferecer como Tributo Magias e Armadilhas que você controla para uma Invocação-Tributo no lugar de monstros.',
        'デュエル中に1度、自分はアドバンス召喚のためにモンスターの代わりに自分フィールドの魔法・罠カードをリリースできる。',
        '듀얼 중에 1번, 자신은 어드밴스 소환을 위해 몬스터 대신에 자신 필드의 마법 / 함정 카드를 릴리스할 수 있다.',
        '每场决斗1次，自己上级召唤时可以把自己场上的魔法·陷阱卡代替怪兽解放。'),
    "If you win the Duel, earn 20 additional coins for each 1000 damage the final blow dealt beyond your opponent's remaining LP.": (
        'Falls du das Duell gewinnst, erhältst du 20 zusätzliche Münzen für je 1000 Schaden, um die der letzte Treffer die verbleibenden LP deines Gegners übersteigt.',
        'Si ganas el Duelo, gana 20 monedas adicionales por cada 1000 de daño con que el golpe final supere los LP restantes de tu adversario.',
        'Si vous gagnez le Duel, gagnez 20 pièces supplémentaires pour chaque tranche de 1000 dommages du coup final au-delà des LP restants de votre adversaire.',
        'Se vinci il Duello, guadagni 20 monete aggiuntive per ogni 1000 danni con cui il colpo finale supera i LP rimanenti del tuo avversario.',
        'Se você vencer o Duelo, ganhe 20 moedas adicionais para cada 1000 de dano que o golpe final causou além dos {LP} restantes do seu oponente.',
        'デュエルに勝利した場合、最後の一撃が相手の残りLPを超えたダメージ1000につき20コインを追加で得る。',
        '듀얼에서 승리했을 경우, 마지막 일격이 상대의 남은 LP를 넘은 데미지 1000당 코인을 20 추가로 얻는다.',
        '赢得决斗的场合，最后一击超出对方剩余LP的伤害每有1000，额外获得20金币。'),
    "Once per turn, when a monster you own is sent to your GY by an opponent's card effect: draw 1 card.": (
        'Einmal pro Spielzug, wenn ein Monster, das dir gehört, durch einen Karteneffekt deines Gegners auf deinen Friedhof gelegt wird: Ziehe 1 Karte.',
        'Una vez por turno, cuando un monstruo de tu propiedad es mandado a tu Cementerio por un efecto de carta de tu adversario: roba 1 carta.',
        "Une fois par tour, lorsqu'un monstre que vous possédez est envoyé à votre Cimetière par un effet de carte de votre adversaire : piochez 1 carte.",
        "Una volta per turno, quando un mostro di tua proprietà viene mandato al tuo Cimitero dall'effetto di una carta del tuo avversario: pesca 1 carta.",
        'Uma vez por turno, quando um monstro que você possui for enviado para o seu Cemitério por um efeito de card do seu oponente: compre 1 card.',
        '1ターンに1度、自分のモンスターが相手のカードの効果で自分の墓地へ送られた場合、自分はデッキから1枚ドローする。',
        '1턴에 1번, 자신의 몬스터가 상대 카드의 효과로 자신의 묘지로 보내졌을 경우, 자신은 덱에서 1장 드로우한다.',
        '1回合1次，自己的怪兽因对方的卡的效果送去自己墓地的场合，自己从卡组抽1张。'),
    'When you Normal Summon a monster, no Trap Cards can be activated.': (
        'Wenn du ein Monster als Normalbeschwörung beschwörst, können keine Fallenkarten aktiviert werden.',
        'Cuando Invocas de Modo Normal un monstruo, no se pueden activar Cartas de Trampa.',
        'Lorsque vous Invoquez Normalement un monstre, aucune Carte Piège ne peut être activée.',
        'Quando Evochi Normalmente un mostro, non può essere attivata nessuna Carta Trappola.',
        'Quando você Invocar um monstro por Invocação-Normal, nenhum Card de Armadilha pode ser ativado.',
        '自分がモンスターの召喚に成功した時、罠カードは発動できない。',
        '자신이 몬스터의 일반 소환에 성공했을 때, 함정 카드는 발동할 수 없다.',
        '自己通常召唤怪兽成功时，不能发动陷阱卡。'),
    'Once per turn, during your End Phase, if all monsters in your GY and on your field have the same Level: Special Summon 1 monster of that Level from your hand.': (
        'Einmal pro Spielzug, während deiner End Phase, falls alle Monster in deinem Friedhof und auf deiner Spielfeldseite dieselbe Stufe haben: Beschwöre 1 Monster dieser Stufe von deiner Hand als Spezialbeschwörung.',
        'Una vez por turno, durante tu End Phase, si todos los monstruos en tu Cementerio y en tu Campo tienen el mismo Nivel: Invoca de Modo Especial, desde tu mano, 1 monstruo de ese Nivel.',
        'Une fois par tour, durant votre End Phase, si tous les monstres dans votre Cimetière et sur votre Terrain ont le même Niveau : Invoquez Spécialement 1 monstre de ce Niveau depuis votre main.',
        'Una volta per turno, durante la tua End Phase, se tutti i mostri nel tuo Cimitero e sul tuo Terreno hanno lo stesso Livello: Evoca Specialmente 1 mostro di quel Livello dalla tua mano.',
        'Uma vez por turno, durante sua Fase Final, se todos os monstros no seu Cemitério e no seu campo tiverem o mesmo Nível: Invoque por Invocação-Especial 1 monstro desse Nível da sua mão.',
        '1ターンに1度、自分エンドフェイズに、自分の墓地と自分フィールドのモンスターが全て同じレベルの場合、そのレベルのモンスター1体を手札から特殊召喚する。',
        '1턴에 1번, 자신 엔드 페이즈에, 자신의 묘지와 자신 필드의 몬스터가 전부 같은 레벨일 경우, 그 레벨의 몬스터 1장을 패에서 특수 소환한다.',
        '1回合1次，自己结束阶段，自己墓地和自己场上的怪兽全部是相同等级的场合，从手卡把1只那个等级的怪兽特殊召唤。'),
    # Run History > Records.
    'Records': ('Bilanz', 'Historial', 'Bilan', 'Bilancio', 'Histórico', '戦績', '전적', '战绩'),
    'Highest level cleared': ('Höchste geschaffte Stufe', 'Nivel más alto superado', 'Plus haut niveau terminé', 'Livello più alto completato', 'Nível mais alto concluído', 'クリアした最高レベル', '클리어한 최고 레벨', '已通关的最高等级'),
    BURN: (
        'Jedes Mal, wenn du ein Monster deines Gegners durch einen Karteneffekt zerstörst: Füge deinem Gegner Schaden in Höhe der Hälfte seiner ATK zu.',
        'Cada vez que destruyas un monstruo de tu adversario por efecto de una carta, inflige a tu adversario daño igual a la mitad de su ATK.',
        'Chaque fois que vous détruisez un monstre de votre adversaire par un effet de carte, infligez à votre adversaire des dommages égaux à la moitié de son ATK.',
        "Ogni volta che distruggi un mostro del tuo avversario con l'effetto di una carta, infliggi al tuo avversario danni pari a metà del suo ATK.",
        'Cada vez que você destruir um monstro do seu oponente por um efeito de card, cause ao seu oponente dano igual à metade do ATK dele.',
        '自分がカードの効果で相手モンスターを破壊する度に、そのモンスターの攻撃力の半分のダメージを相手に与える。',
        '자신이 카드의 효과로 상대 몬스터를 파괴할 때마다, 그 몬스터의 공격력의 절반만큼의 데미지를 상대에게 준다.',
        '每次自己用卡的效果破坏对方怪兽，给与对方那只怪兽攻击力一半数值的伤害。'),
    NO_DIRECT: (
        'Alle Monster, die du kontrollierst, können nicht direkt angreifen.',
        'Los monstruos que controles no pueden atacar directamente.',
        'Les monstres que vous contrôlez ne peuvent pas attaquer directement.',
        'I mostri che controlli non possono attaccare direttamente.',
        'Os monstros que você controla não podem atacar diretamente.',
        '自分フィールドのモンスターは直接攻撃できない。',
        '자신 필드의 몬스터는 직접 공격할 수 없다.',
        '自己场上的怪兽不能直接攻击。'),
}
# (new English, old English, how to turn the old translation into the new one)
last_one_to_zero = lambda t: re.sub(r'1(?=[^0-9]*$)', '0', t)
DERIVED = [
    ('You always go first. Your opening hand contains 2 fewer cards (min. 0).', 'You always go first. Your opening hand contains 2 fewer cards (min. 1).', last_one_to_zero),
    ('Your opening hand contains 2 fewer cards (min. 0).', 'Your opening hand contains 2 fewer cards (min. 1).', last_one_to_zero),
    ('Start this duel with 2 fewer cards in your hand, minimum 0.', 'Start this duel with 2 fewer cards in your hand, minimum 1.', last_one_to_zero),
    ('Start this duel with 3 fewer cards in your hand, minimum 0.', 'Start this duel with 3 fewer cards in your hand, minimum 1.', last_one_to_zero),
]
PRINTER_OLD = 'has a 15% chance to become a misprint.'


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    rows = catalog if isinstance(catalog, list) else catalog.get('strings', catalog.get('entries'))
    known = {r['en'] for r in rows}
    added = {}
    english = set()
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        lp = 'PV' if lang == 'pt' and any(' PV' in v for v in table.values()) else 'LP'
        new = {key: values[index].replace('{LP}', lp) for key, values in TERMS.items()}
        join = '' if lang in ('ja', 'zh') else ' '
        new[BURN + ' ' + NO_DIRECT] = new[BURN] + join + new[NO_DIRECT]
        for fresh, old, change in DERIVED:
            if old in table: new[fresh] = change(table[old])
        pact, limit = 'While your hand is empty, monsters you control gain 1000 ATK.', 'Your hand size limit is reduced by 2 (min. 0).'
        if pact in table and limit in table: new[pact + ' ' + limit] = table[pact] + join + table[limit]
        for old, text in list(table.items()):
            if PRINTER_OLD in old or old.startswith('Each purchased card has a 15% chance of misprinted'):
                new[old.replace('15%', '20%')] = re.sub(r'15(?=\s*[%％])', '20', text)
        count = 0
        for key, text in new.items():
            english.add(key)
            if key not in table: table[key] = text; count += 1
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
        if '--show' in sys.argv:
            for key in new:
                if key not in TERMS: print(lang, '|', key[:70], '=>', table[key])
    fresh_rows = 0
    for key in sorted(english):
        if key not in known:
            rows.append({'group': 'ui' if key in ('Records', 'Highest level cleared') else 'relic', 'en': key, 'kind': 'exact', 'ctx': 'text added 2026-11-11'}); fresh_rows += 1
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', fresh_rows)


if __name__ == '__main__':
    main()
