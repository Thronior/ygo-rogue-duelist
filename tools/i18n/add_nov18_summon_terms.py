"""Summoning words a Chinese player found untranslated (itch.io, 2026-11-18), all 8 languages.

- The position choice of a Summon (engine.js SELECT_POSITION: "Face-up attack" ...) and the plain Yes/No buttons of a
  confirmation (engine.js is skipped by extract_ui_strings.mjs, so these never reached the catalog).
- General summon words (Tribute Summon, Tribute Set, Summon procedure, Tribute/Tributes) and the "· N selected" count
  of the tribute/material picker, the zone choices of SELECT_PLACE.
- Card effect labels about summoning that the official databases have no translation for (Toon and Legion summon
  procedures, Polymerization, Ojama Trio, the "Affected by ...: cannot Summon" hints). Card names inside them stay
  {0} patterns, so the card's own official name is used.
- zh: "Use the effect of "{0}" from [{1}]?" and the Trigger Effect prompt put the card name ({0}) where the location
  ({1}) belongs (engine.js description() passes [card name, location]). Those two are replaced.
Never overwrites an existing translation except the two zh prompts.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']

T = {
 'Face-up attack': ('Offene Angriffsposition', 'Posición de Ataque boca arriba', "Position d'Attaque face recto", 'Posizione di Attacco scoperta',
  '表側攻撃表示', '앞면 공격 표시', 'Posição de Ataque com a face para cima', '表侧攻击表示'),
 'Face-up defense': ('Offene Verteidigungsposition', 'Posición de Defensa boca arriba', 'Position de Défense face recto', 'Posizione di Difesa scoperta',
  '表側守備表示', '앞면 수비 표시', 'Posição de Defesa com a face para cima', '表侧守备表示'),
 'Face-down defense': ('Verdeckte Verteidigungsposition', 'Posición de Defensa boca abajo', 'Position de Défense face verso', 'Posizione di Difesa coperta',
  '裏側守備表示', '뒷면 수비 표시', 'Posição de Defesa com a face para baixo', '里侧守备表示'),
 'Face-down attack': ('Verdeckte Angriffsposition', 'Posición de Ataque boca abajo', "Position d'Attaque face verso", 'Posizione di Attacco coperta',
  '裏側攻撃表示', '뒷면 공격 표시', 'Posição de Ataque com a face para baixo', '里侧攻击表示'),
 'Yes · activate / confirm': ('Ja · aktivieren / bestätigen', 'Sí · activar / confirmar', 'Oui · activer / confirmer', 'Sì · attiva / conferma',
  'はい · 発動 / 確認', '예 · 발동 / 확인', 'Sim · ativar / confirmar', '是 · 发动 / 确认'),
 'No · decline': ('Nein · ablehnen', 'No · rechazar', 'Non · refuser', 'No · rifiuta', 'いいえ · 見送る', '아니요 · 거절', 'Não · recusar', '否 · 拒绝'),
 'Confirm activation': ('Aktivierung bestätigen', 'Confirmar activación', "Confirmer l'activation", 'Conferma attivazione', '発動を確認', '발동 확인', 'Confirmar ativação', '确认发动'),
 'Tribute Summon': ('Tributbeschwörung', 'Invocación de Sacrificio', 'Invocation Sacrifice', 'Evocazione Tributo', 'アドバンス召喚', '어드밴스 소환', 'Invocação-Tributo', '上级召唤'),
 'Tribute Set': ('Tribut-Setzen', 'Colocación de Sacrificio', 'Pose Sacrifice', 'Posizionamento Tributo', 'アドバンスセット', '어드밴스 세트', 'Baixar por Tributo', '上级盖放'),
 'Summon procedure': ('Beschwörungsverfahren', 'Procedimiento de Invocación', "Procédure d'Invocation", 'Procedura di Evocazione', '召喚方法', '소환 방법', 'Procedimento de Invocação', '召唤方法'),
 'Tribute': ('Tribut', 'Sacrificio', 'Sacrifice', 'Tributo', 'リリース', '릴리스', 'Tributo', '解放'),
 'Tributes': ('Tribute', 'Sacrificios', 'Sacrifices', 'Tributi', 'リリース', '릴리스', 'Tributos', '解放'),
 # The picker's heading plus its count, one text run ("Choose tributes · 2 selected"); a bare "{0} selected" would
 # swallow the heading too.
 '{0} · {1} selected': ('{0} · {1} ausgewählt', '{0} · {1} seleccionadas', '{0} · {1} sélectionnée(s)', '{0} · {1} selezionate', '{0} · {1}枚選択中', '{0} · {1}개 선택됨', '{0} · {1} selecionadas', '{0} · 已选择{1}'),
 # Toon/Legion summon procedures and other card labels with no official translation.
 'Special Summon ("{0}")': ('Spezialbeschwörung („{0}“)', 'Invocar de Modo Especial ("{0}")', 'Invocation Spéciale ("{0}")', 'Evocazione Speciale ("{0}")',
  '特殊召喚（「{0}」）', '특수 소환 (「{0}」)', 'Invocação-Especial ("{0}")', '特殊召唤（「{0}」）'),
 'Normal Summon ("{0}")': ('Normalbeschwörung („{0}“)', 'Invocar de Modo Normal ("{0}")', 'Invocation Normale ("{0}")', 'Evocazione Normale ("{0}")',
  '通常召喚（「{0}」）', '일반 소환 (「{0}」)', 'Invocação-Normal ("{0}")', '通常召唤（「{0}」）'),
 'Special Summon this card as a Normal Monster': ('Diese Karte als Normales Monster als Spezialbeschwörung beschwören',
  'Invocar de Modo Especial esta carta como Monstruo Normal', 'Invoquer Spécialement cette carte comme Monstre Normal',
  'Evocare Specialmente questa carta come Mostro Normale', 'このカードを通常モンスターとして特殊召喚する', '이 카드를 일반 몬스터로 특수 소환한다',
  'Invocar por Invocação-Especial este card como Monstro Normal', '把这张卡作为通常怪兽特殊召唤'),
 'Fusion Summon 1 Fusion Monster from your Extra Deck': ('1 Fusionsmonster aus deinem Extra Deck als Fusionsbeschwörung beschwören',
  'Invocar por Fusión 1 Monstruo de Fusión de tu Deck Extra', 'Invoquer par Fusion 1 Monstre Fusion depuis votre Extra Deck',
  'Evocare tramite Fusione 1 Mostro Fusione dal tuo Extra Deck', 'エクストラデッキから融合モンスター1体を融合召喚する',
  '엑스트라 덱에서 융합 몬스터 1장을 융합 소환한다', 'Invocar por Fusão 1 Monstro de Fusão do seu Deck Adicional', '从额外卡组把1只融合怪兽融合召唤'),
 'Special Summon 1 "{0}" from your hand or Deck': ('Beschwöre 1 „{0}“ als Spezialbeschwörung aus deiner Hand oder deinem Deck',
  'Invoca de Modo Especial 1 "{0}" de tu mano o Deck', 'Invoquez Spécialement 1 "{0}" depuis votre main ou Deck',
  'Evoca Specialmente 1 "{0}" dalla tua mano o dal Deck', '手札・デッキから「{0}」1体を特殊召喚する', '패 / 덱에서 「{0}」 1장을 특수 소환한다',
  'Invoque por Invocação-Especial 1 "{0}" da sua mão ou Deck', '从手卡·卡组把1只「{0}」特殊召唤'),
 'Special Summon 1 Level 3 or lower Normal Monster from your Graveyard?': ('Ein Normales Monster der Stufe 3 oder niedriger als Spezialbeschwörung von deinem Friedhof beschwören?',
  '¿Invocar de Modo Especial 1 Monstruo Normal de Nivel 3 o menor de tu Cementerio?', 'Invoquer Spécialement 1 Monstre Normal de Niveau 3 ou moins depuis votre Cimetière ?',
  'Evocare Specialmente 1 Mostro Normale di Livello 3 o inferiore dal tuo Cimitero?', '自分の墓地からレベル3以下の通常モンスター1体を特殊召喚しますか？',
  '자신 묘지에서 레벨 3 이하의 일반 몬스터 1장을 특수 소환하시겠습니까?', 'Invocar por Invocação-Especial 1 Monstro Normal de Nível 3 ou menor do seu Cemitério?',
  '是否从自己墓地把1只3星以下的通常怪兽特殊召唤？'),
 'Special Summon WATER monsters from your hand, up to the number of monsters destroyed by this effect?': (
  'WASSER-Monster aus deiner Hand als Spezialbeschwörung beschwören, bis zur Anzahl der durch diesen Effekt zerstörten Monster?',
  '¿Invocar de Modo Especial monstruos de AGUA de tu mano, hasta el número de monstruos destruidos por este efecto?',
  "Invoquer Spécialement des monstres EAU depuis votre main, jusqu'au nombre de monstres détruits par cet effet ?",
  'Evocare Specialmente mostri ACQUA dalla tua mano, fino al numero di mostri distrutti da questo effetto?',
  '手札から、この効果で破壊したモンスターの数まで水属性モンスターを特殊召喚しますか？', '패에서 이 효과로 파괴한 몬스터의 수까지 물 속성 몬스터를 특수 소환하시겠습니까?',
  'Invocar por Invocação-Especial monstros de ÁGUA da sua mão, até o número de monstros destruídos por este efeito?', '是否从手卡把最多为这个效果破坏的怪兽数量的水属性怪兽特殊召唤？'),
 'Activate this card by targeting 1 monster in your GY; Special Summon that target in Attack Position': (
  'Aktiviere diese Karte, indem du 1 Monster in deinem Friedhof wählst; beschwöre es als Spezialbeschwörung in Angriffsposition',
  'Activa esta carta seleccionando 1 monstruo en tu Cementerio; Invoca de Modo Especial ese objetivo en Posición de Ataque',
  "Activez cette carte en ciblant 1 monstre dans votre Cimetière ; Invoquez Spécialement cette cible en Position d'Attaque",
  'Attiva questa carta scegliendo come bersaglio 1 mostro nel tuo Cimitero; Evoca Specialmente quel bersaglio in Posizione di Attacco',
  '自分の墓地のモンスター1体を対象としてこのカードを発動できる。そのモンスターを攻撃表示で特殊召喚する',
  '자신 묘지의 몬스터 1장을 대상으로 하여 이 카드를 발동할 수 있다. 그 몬스터를 공격 표시로 특수 소환한다',
  'Ative este card escolhendo 1 monstro no seu Cemitério como alvo; Invoque por Invocação-Especial esse alvo em Posição de Ataque',
  '以自己墓地1只怪兽为对象才能把这张卡发动。那只怪兽攻击表示特殊召唤'),
}
# "Affected by "X": ..." hints (Card of Demise, Dark Magic Curtain, Scapegoat, Stray Lambs, Lava Golem's typo, Tour of
# Doom, Judgment of the Pharaoh), written as prefix + restriction.
AFFECTED = ('Betroffen von „{0}“: ', 'Afectado por "{0}": ', 'Affecté par "{0}" : ', 'Influenzato da "{0}": ',
            '「{0}」の効果：', '「{0}」의 효과: ', 'Afetado por "{0}": ', '受「{0}」影响：')
RESTRICTIONS = {
 'cannot Special Summon': ('keine Spezialbeschwörung', 'no puede Invocar de Modo Especial', 'ne peut pas Invoquer Spécialement', 'non può Evocare Specialmente',
  '特殊召喚できない', '특수 소환할 수 없다', 'não pode Invocar por Invocação-Especial', '不能特殊召唤'),
 'cannot Summon': ('keine Beschwörung', 'no puede Invocar', 'ne peut pas Invoquer', 'non può Evocare', '召喚できない', '소환할 수 없다', 'não pode Invocar', '不能召唤'),
 'cannot Summon other monsters': ('keine anderen Monster beschwören', 'no puede Invocar otros monstruos', "ne peut pas Invoquer d'autres monstres",
  'non può Evocare altri mostri', '他のモンスターを召喚できない', '다른 몬스터를 소환할 수 없다', 'não pode Invocar outros monstros', '不能召唤其他怪兽'),
 'cannot Normal Summon/Set this turn': ('diesen Spielzug keine Normalbeschwörung und kein Setzen', 'no puede Invocar de Modo Normal/Colocar este turno',
  'ne peut pas Invoquer Normalement/Poser ce tour', 'non può Evocare Normalmente/Posizionare in questo turno', 'このターン通常召喚・セットできない',
  '이 턴에 일반 소환 / 세트할 수 없다', 'não pode Invocar-Normal/Baixar neste turno', '这个回合不能通常召唤·盖放'),
 'cannot Normal/Flip Summon': ('keine Normal- oder Flippbeschwörung', 'no puede Invocar de Modo Normal/por Volteo', 'ne peut pas Invoquer Normalement/par Flip',
  'non può Evocare Normalmente/tramite Scoperta', '通常召喚・反転召喚できない', '일반 소환 / 반전 소환할 수 없다', 'não pode Invocar-Normal/Virar', '不能通常召唤·反转召唤'),
 'cannot Normal Summon/Set, Flip Summon, Special Summon, Set, or activate monster effects and their monster effects are negated': (
  'keine Normalbeschwörung und kein Setzen, keine Flipp- oder Spezialbeschwörung, kein Setzen und keine Aktivierung von Monstereffekten; ihre Monstereffekte werden annulliert',
  'no puede Invocar de Modo Normal/Colocar, Invocar por Volteo, Invocar de Modo Especial, Colocar ni activar efectos de monstruo, y sus efectos de monstruo son negados',
  "ne peut pas Invoquer Normalement/Poser, Invoquer par Flip, Invoquer Spécialement, Poser ni activer d'effets de monstre, et leurs effets de monstre sont annulés",
  'non può Evocare Normalmente/Posizionare, Evocare tramite Scoperta, Evocare Specialmente, Posizionare o attivare effetti di mostri, e i loro effetti di mostro sono annullati',
  '通常召喚・セット、反転召喚、特殊召喚、セット、モンスター効果の発動ができず、そのモンスター効果は無効化される',
  '일반 소환 / 세트, 반전 소환, 특수 소환, 세트, 몬스터 효과의 발동을 할 수 없고, 그 몬스터 효과는 무효화된다',
  'não pode Invocar-Normal/Baixar, Invocar-Virar, Invocar-Especial, Baixar nem ativar efeitos de monstro, e seus efeitos de monstro são negados',
  '不能通常召唤·盖放、反转召唤、特殊召唤、盖放，也不能发动怪兽的效果，其怪兽效果无效化'),
}
for rest, values in RESTRICTIONS.items():
    # Lava Golem's label spells it "Afected" (its card string); the key must match the text as shown.
    head = 'Afected' if rest == 'cannot Normal Summon/Set this turn' else 'Affected'
    T[f'{head} by "{{0}}": {rest}'] = tuple(p + v for p, v in zip(AFFECTED, values))

# Labels only Spanish lacks (the other databases translate them).
ES_ONLY = {
 'Cannot be Special Summoned': 'No puede ser Invocado de Modo Especial',
 'Continue Special Summoning?': '¿Continuar con la Invocación Especial?',
 'Special Summon token': 'Invocar de Modo Especial una Ficha',
 'Treat as 2 Tributes': 'Considerar como 2 Sacrificios',
 'Normal Summon monster': 'Invocar de Modo Normal un monstruo',
 'Select 1 monster in your Graveyard and Special Summon it': 'Selecciona 1 monstruo en tu Cementerio e Invócalo de Modo Especial',
}
ZH_FIXED = {
 'Use the effect of "{0}" from [{1}]?': '是否在[{1}]发动「{0}」的效果？',
 'Activate the Trigger Effect of "{0}" from [{1}]?': '是否在[{1}]发动「{0}」的诱发类效果？',
}


def card_name(lang, cid):
    return json.loads((ROOT / f'data/i18n/cards/{lang}.json').read_text(encoding='utf8'))[str(cid)][0]


def table():
    rows = {lang: {en: v[i] for en, v in T.items()} for i, lang in enumerate(LANGS)}
    for lang in LANGS:
        ui = json.loads((ROOT / f'data/i18n/ui/{lang}.json').read_text(encoding='utf-8-sig'))
        # Zone choices of SELECT_PLACE ("Your monster zone 3"), built from the existing zone names.
        mz, st, opp = ui['Monster Zone'], ui['Spell & Trap Zone'], ui['Opponent']
        for kind, zone in (('monster', mz), ('spell / trap', st)):
            if lang in ('ja', 'zh'):
                you, them = ('自分の' if lang == 'ja' else '自己的') + zone + '{0}', ('相手の' if lang == 'ja' else '对方的') + zone + '{0}'
            elif lang == 'ko':
                you, them = f'자신의 {zone} {{0}}', f'상대의 {zone} {{0}}'
            else:
                mine = {'de': 'Deine', 'es': 'Tu', 'fr': 'Votre', 'it': 'La tua', 'pt': 'Sua'}[lang]
                of = {'de': 'des Gegners', 'es': 'del adversario', 'fr': "de l'adversaire", 'it': "dell'avversario", 'pt': 'do oponente'}[lang]
                you, them = f'{mine} {zone} {{0}}', f'{zone} {{0}} {of}'
            rows[lang][f'Your {kind} zone {{0}}'] = you
            rows[lang][f'Opponent’s {kind} zone {{0}}'] = them
        token = card_name(lang, 29843092)  # Ojama Token
        rows[lang]['Special Summon 3 "Ojama Tokens"'] = {
         'de': f'Beschwöre 3 „{token}“ als Spezialbeschwörung', 'es': f'Invoca de Modo Especial 3 "{token}"', 'fr': f'Invoquez Spécialement 3 "{token}"',
         'it': f'Evoca Specialmente 3 "{token}"', 'ja': f'「{token}」3体を特殊召喚する', 'ko': f'「{token}」 3장을 특수 소환한다',
         'pt': f'Invoque por Invocação-Especial 3 "{token}"', 'zh': f'把3只「{token}」特殊召唤'}[lang]
    rows['es'].update(ES_ONLY)
    rows['es']['Special Summon 1 "Bubonic Vermin" from your Deck?'] = f'¿Invocar de Modo Especial 1 "{card_name("es", 6104968)}" de tu Deck?'
    return rows


def main():
    rows = table()
    shared = set.intersection(*(set(r) for r in rows.values()))
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        ui = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, v in rows[lang].items(): ui.setdefault(en, v)
        if lang == 'zh': ui.update(ZH_FIXED)
        path.write_text(json.dumps(ui, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in sorted(shared):
        if en not in known:
            catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact',
                            'ctx': 'Summoning words, positions and card summon labels (2026-11-18)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', {lang: len(rows[lang]) for lang in LANGS})


if __name__ == '__main__':
    main()
