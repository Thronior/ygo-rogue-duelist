"""Ra support (user, 2026-11-25): the Sun's Judgment, Desert Sunlight and Seal of the Sun relics and the fused Sun God's
Ascension and Solar Covenant. Name and text in all
8 languages, plus the catalog rows. Desert Sunlight takes each language's official name of the card "Desert Sunlight".
Never overwrites an existing translation."""
import json, re, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']

JUDGE, JUDGE_TEXT = "Sun's Judgment", 'Each time you pay LP for an effect, inflict damage to your opponent equal to half the LP you paid (rounded down).'
SUN, SUN_TEXT = 'Desert Sunlight', ('Once per turn, during your Standby Phase, if you control a face-up Divine-Beast monster: '
                                    'Gain 1,000 LP for each face-up Divine-Beast monster you control.')
SEAL, SEAL_TEXT = 'Seal of the Sun', ('Each time a Divine-Beast monster is Summoned to your field, it cannot be destroyed by card '
                                      'effects until the end of your next Standby Phase.')
ASCEND, ASCEND_TEXT = "Sun God's Ascension", ('Divine-Beast monsters you control gain 1,500 ATK and cannot be destroyed by card effects. '
                                             'Once per turn, during your Standby Phase, if you control a face-up Divine-Beast monster: '
                                             'Gain 1,000 LP for each face-up Divine-Beast monster you control.')
COVENANT, COVENANT_TEXT = 'Solar Covenant', ('Each time you pay LP for an effect, inflict damage to your opponent equal to half the LP '
                                             'you paid (rounded down), then gain LP equal to half the LP you paid (rounded down). '
                                             'The first time you pay LP each Duel, gain LP equal to all the LP you paid instead.')
TERMS = {
 ASCEND: ('Aufstieg des Sonnengottes', 'Ascensión del Dios Sol', 'Ascension du Dieu Soleil', 'Ascensione del Dio Sole', '太陽神の降臨', '태양신의 강림', 'Ascensão do Deus Sol', '太阳神的降临'),
 ASCEND_TEXT: (
  'Alle Monster vom Typ Göttliches Ungeheuer, die du kontrollierst, erhalten 1500 ATK und können nicht durch Karteneffekte zerstört werden. Einmal pro Spielzug, während deiner Standby Phase, falls du ein offenes Monster vom Typ Göttliches Ungeheuer kontrollierst: Erhalte 1000 LP für jedes offene Monster vom Typ Göttliches Ungeheuer, das du kontrollierst.',
  'Los monstruos Bestia Divina que controles ganan 1500 ATK y no pueden ser destruidos por efectos de cartas. Una vez por turno, durante tu Standby Phase, si controlas un monstruo Bestia Divina boca arriba: Ganas 1000 LP por cada monstruo Bestia Divina boca arriba que controles.',
  'Les monstres Bête Divine que vous contrôlez gagnent 1500 ATK et ne peuvent pas être détruits par des effets de carte. Une fois par tour, durant votre Standby Phase, si vous contrôlez un monstre Bête Divine face recto : Gagnez 1000 LP pour chaque monstre Bête Divine face recto que vous contrôlez.',
  'I mostri Divinità-Bestia che controlli guadagnano 1500 ATK e non possono essere distrutti da effetti di carte. Una volta per turno, durante la tua Standby Phase, se controlli un mostro Divinità-Bestia scoperto: Guadagni 1000 LP per ogni mostro Divinità-Bestia scoperto che controlli.',
  '自分フィールドの幻神獣族モンスターの攻撃力は1,500アップし、カードの効果では破壊されない。1ターンに1度、自分スタンバイフェイズに、自分フィールドに表側表示の幻神獣族モンスターが存在する場合に発動する。自分フィールドの表側表示の幻神獣族モンスターの数×1,000LP回復する。',
  '자신 필드의 환신야수족 몬스터의 공격력은 1,500 올리며, 카드의 효과로는 파괴되지 않는다. 1턴에 1번, 자신 스탠바이 페이즈에, 자신 필드에 앞면 표시 환신야수족 몬스터가 존재할 경우에 발동한다. 자신 필드의 앞면 표시 환신야수족 몬스터의 수 × 1,000 LP를 회복한다.',
  'Os monstros Besta-Divina que você controla ganham 1500 de ATK e não podem ser destruídos por efeitos de card. Uma vez por turno, durante sua Fase de Apoio, se você controlar um monstro Besta-Divina com a face para cima: Ganhe 1000 LP para cada monstro Besta-Divina com a face para cima que você controla.',
  '自己场上的幻神兽族怪兽的攻击力上升1,500，不会被卡的效果破坏。1回合1次，自己准备阶段，自己场上有表侧表示的幻神兽族怪兽存在的场合发动。自己回复自己场上的表侧表示幻神兽族怪兽数量×1,000基本分。'),
 COVENANT: ('Sonnenpakt', 'Pacto Solar', 'Pacte Solaire', 'Patto Solare', '太陽の契約', '태양의 계약', 'Pacto Solar', '太阳之契'),
 COVENANT_TEXT: (
  'Jedes Mal, wenn du LP für einen Effekt zahlst, füge deinem Gegner Schaden in Höhe der Hälfte der gezahlten LP zu (abgerundet) und erhalte danach LP in Höhe der Hälfte der gezahlten LP (abgerundet). Wenn du in einem Duell zum ersten Mal LP zahlst, erhältst du stattdessen LP in Höhe aller gezahlten LP.',
  'Cada vez que pagues LP por un efecto, inflige a tu adversario daño igual a la mitad de los LP que pagaste (redondeado hacia abajo) y, después, gana LP iguales a la mitad de los LP que pagaste (redondeado hacia abajo). La primera vez en cada Duelo que pagues LP, gana en su lugar LP iguales a todos los LP que pagaste.',
  "Chaque fois que vous payez des LP pour un effet, infligez à votre adversaire des dommages égaux à la moitié des LP payés (arrondis à l'inférieur), puis gagnez des LP égaux à la moitié des LP payés (arrondis à l'inférieur). La première fois que vous payez des LP à chaque Duel, gagnez à la place des LP égaux à la totalité des LP payés.",
  'Ogni volta che paghi LP per un effetto, infliggi al tuo avversario danni pari alla metà dei LP che hai pagato (arrotondati per difetto), poi guadagni LP pari alla metà dei LP che hai pagato (arrotondati per difetto). La prima volta in ogni Duello che paghi LP, guadagni invece LP pari a tutti i LP che hai pagato.',
  '自分が効果のためにLPを払う度に、払ったLPの半分のダメージを相手に与え（端数切り捨て）、その後払ったLPの半分の数値分のLPを回復する（端数切り捨て）。各デュエルで自分が初めてLPを払った時は、代わりに払ったLPと同じ数値分のLPを回復する。',
  '자신이 효과를 위해 LP를 지불할 때마다, 지불한 LP의 절반만큼 상대에게 데미지를 주고(소수점 이하 버림), 그 후 지불한 LP의 절반만큼 LP를 회복한다(소수점 이하 버림). 각 듀얼에서 처음으로 LP를 지불했을 때는, 대신 지불한 LP만큼 LP를 회복한다.',
  'Sempre que você pagar LP por um efeito, cause dano ao seu oponente igual à metade dos LP que você pagou (arredondado para baixo) e, depois, ganhe LP iguais à metade dos LP que você pagou (arredondado para baixo). Na primeira vez que você pagar LP em cada Duelo, ganhe, em vez disso, LP iguais a todos os LP que você pagou.',
  '每次自己为效果支付基本分，给与对方支付数值一半的伤害（小数点以下舍去），那之后自己回复支付数值一半的基本分（小数点以下舍去）。每场决斗中自己第一次支付基本分时，作为代替回复支付数值的基本分。'),
 JUDGE: ('Urteil der Sonne', 'Juicio del Sol', 'Jugement du Soleil', 'Giudizio del Sole', '太陽の裁き', '태양의 심판', 'Julgamento do Sol', '太阳的审判'),
 JUDGE_TEXT: (
  'Jedes Mal, wenn du LP für einen Effekt zahlst, füge deinem Gegner Schaden in Höhe der Hälfte der gezahlten LP zu (abgerundet).',
  'Cada vez que pagues LP por un efecto, inflige a tu adversario daño igual a la mitad de los LP que pagaste (redondeado hacia abajo).',
  "Chaque fois que vous payez des LP pour un effet, infligez à votre adversaire des dommages égaux à la moitié des LP payés (arrondis à l'inférieur).",
  'Ogni volta che paghi LP per un effetto, infliggi al tuo avversario danni pari alla metà dei LP che hai pagato (arrotondati per difetto).',
  '自分が効果のためにLPを払う度に、払ったLPの半分のダメージを相手に与える（端数切り捨て）。',
  '자신이 효과를 위해 LP를 지불할 때마다, 지불한 LP의 절반만큼 상대에게 데미지를 준다(소수점 이하 버림).',
  'Sempre que você pagar LP por um efeito, cause dano ao seu oponente igual à metade dos LP que você pagou (arredondado para baixo).',
  '每次自己为效果支付基本分，给与对方支付数值一半的伤害（小数点以下舍去）。'),
 SUN: ('Sonnenlicht der Wüste', 'Luz Solar del Desierto', 'Soleil du Désert', 'Sole del Deserto', '砂漠の光', '사막의 빛', 'Sol do Deserto', '沙漠之光'),
 SUN_TEXT: (
  'Einmal pro Spielzug, während deiner Standby Phase, falls du ein offenes Monster vom Typ Göttliches Ungeheuer kontrollierst: Erhalte 1000 LP für jedes offene Monster vom Typ Göttliches Ungeheuer, das du kontrollierst.',
  'Una vez por turno, durante tu Standby Phase, si controlas un monstruo Bestia Divina boca arriba: Ganas 1000 LP por cada monstruo Bestia Divina boca arriba que controles.',
  'Une fois par tour, durant votre Standby Phase, si vous contrôlez un monstre Bête Divine face recto : Gagnez 1000 LP pour chaque monstre Bête Divine face recto que vous contrôlez.',
  'Una volta per turno, durante la tua Standby Phase, se controlli un mostro Divinità-Bestia scoperto: Guadagni 1000 LP per ogni mostro Divinità-Bestia scoperto che controlli.',
  '1ターンに1度、自分スタンバイフェイズに、自分フィールドに表側表示の幻神獣族モンスターが存在する場合に発動する。自分フィールドの表側表示の幻神獣族モンスターの数×1,000LP回復する。',
  '1턴에 1번, 자신 스탠바이 페이즈에, 자신 필드에 앞면 표시 환신야수족 몬스터가 존재할 경우에 발동한다. 자신 필드의 앞면 표시 환신야수족 몬스터의 수 × 1,000 LP를 회복한다.',
  'Uma vez por turno, durante sua Fase de Apoio, se você controlar um monstro Besta-Divina com a face para cima: Ganhe 1000 LP para cada monstro Besta-Divina com a face para cima que você controla.',
  '1回合1次，自己准备阶段，自己场上有表侧表示的幻神兽族怪兽存在的场合发动。自己回复自己场上的表侧表示幻神兽族怪兽数量×1,000基本分。'),
 SEAL: ('Siegel der Sonne', 'Sello del Sol', 'Sceau du Soleil', 'Sigillo del Sole', '太陽の封印', '태양의 봉인', 'Selo do Sol', '太阳的封印'),
 SEAL_TEXT: (
  'Jedes Mal, wenn ein Monster vom Typ Göttliches Ungeheuer auf deine Spielfeldseite beschworen wird, kann es bis zum Ende deiner nächsten Standby Phase nicht durch Karteneffekte zerstört werden.',
  'Cada vez que un monstruo Bestia Divina sea Invocado a tu Campo, no puede ser destruido por efectos de cartas hasta el final de tu próxima Standby Phase.',
  "Chaque fois qu'un monstre Bête Divine est Invoqué sur votre Terrain, il ne peut pas être détruit par des effets de carte jusqu'à la fin de votre prochaine Standby Phase.",
  'Ogni volta che un mostro Divinità-Bestia viene Evocato sul tuo Terreno, non può essere distrutto da effetti di carte fino alla fine della tua prossima Standby Phase.',
  '幻神獣族モンスターが自分フィールドに召喚・反転召喚・特殊召喚される度に、そのモンスターは次の自分スタンバイフェイズ終了時までカードの効果では破壊されない。',
  '환신야수족 몬스터가 자신 필드에 소환 / 반전 소환 / 특수 소환될 때마다, 그 몬스터는 다음 자신 스탠바이 페이즈 종료시까지 카드의 효과로는 파괴되지 않는다.',
  'Sempre que um monstro Besta-Divina for Invocado no seu campo, ele não pode ser destruído por efeitos de card até o final da sua próxima Fase de Apoio.',
  '每次幻神兽族怪兽在自己场上召唤·反转召唤·特殊召唤，那只怪兽直到下次的自己准备阶段结束时不会被卡的效果破坏。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(path.read_text(encoding='utf-8-sig'))
    have = {(r['group'], r['en']) for r in rows}
    for en, ctx in ((JUDGE, 'relic name (sun_judgment)'), (JUDGE_TEXT, 'relic effect (sun_judgment)'),
                    (SUN, 'relic name (desert_sunlight)'), (SUN_TEXT, 'relic effect (desert_sunlight)'),
                    (SEAL, 'relic name (seal_of_the_sun)'), (SEAL_TEXT, 'relic effect (seal_of_the_sun)'),
                    (ASCEND, 'relic name (sun_gods_ascension)'), (ASCEND_TEXT, 'relic effect (sun_gods_ascension)'),
                    (COVENANT, 'relic name (solar_covenant)'), (COVENANT_TEXT, 'relic effect (solar_covenant)')):
        en = re.sub(r'\s+', ' ', en).strip()
        if ('relic', en) not in have:
            rows.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': ctx})
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
