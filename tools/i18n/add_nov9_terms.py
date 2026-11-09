"""Adds the strings players found untranslated after v0.2.26 (Discord, 2026-11-09) to every language.

Duel action labels come from engine.js, which the string extractor skips; card kinds such as "Flip Effect Monster"
come from card data. Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    # Duel action labels (engine.js choices: "Summon · <card>", shown as "Summon").
    'Summon': ('Beschwören', 'Invocar', 'Invoquer', 'Evocare', 'Invocar', '召喚', '소환', '召唤'),
    'Special summon': ('Spezialbeschwörung', 'Invocar de Modo Especial', 'Invocation Spéciale', 'Evocazione Speciale', 'Invocação-Especial', '特殊召喚', '특수 소환', '特殊召唤'),
    'Change position': ('Position ändern', 'Cambiar posición', 'Changer de position', 'Cambia posizione', 'Mudar posição', '表示形式変更', '표시 형식 변경', '改变表示形式'),
    'Unselect': ('Abwählen', 'Deseleccionar', 'Désélectionner', 'Deseleziona', 'Desmarcar', '選択解除', '선택 해제', '取消选择'),
    'End turn →': ('Spielzug beenden →', 'Terminar turno →', 'Finir le tour →', 'Termina turno →', 'Encerrar turno →', 'ターン終了 →', '턴 종료 →', '结束回合 →'),
    'Enter battle phase →': ('Zur Battle Phase →', 'Ir a la Battle Phase →', 'Passer à la Battle Phase →', 'Vai alla Battle Phase →', 'Ir para a Fase de Batalha →', 'バトルフェイズへ →', '배틀 페이즈로 →', '进入战斗阶段 →'),
    'Main phase 2 →': ('Main Phase 2 →', 'Main Phase 2 →', 'Main Phase 2 →', 'Main Phase 2 →', 'Fase Principal 2 →', 'メインフェイズ２ →', '메인 페이즈 2 →', '主要阶段2 →'),
    'Keep this order': ('Diese Reihenfolge behalten', 'Mantener este orden', 'Garder cet ordre', "Mantieni quest'ordine", 'Manter esta ordem', 'この順番にする', '이 순서 유지', '保持此顺序'),
    # Card kinds from card data.
    'Flip Effect Monster': ('Flipp-Effektmonster', 'Monstruo de Efecto Volteo', 'Monstre à Effet FLIP', 'Mostro con Effetto Scoperta', 'Monstro de Efeito Virar', 'リバース効果モンスター', '리버스 효과 몬스터', '反转效果怪兽'),
    'Union Effect Monster': ('Union-Effektmonster', 'Monstruo de Efecto de Unión', 'Monstre à Effet Union', 'Mostro con Effetto Unione', 'Monstro de Efeito União', 'ユニオン効果モンスター', '유니온 효과 몬스터', '同盟效果怪兽'),
    'Spirit Monster': ('Spirit-Monster', 'Monstruo Spirit', 'Monstre Spirit', 'Mostro Spirit', 'Monstro Espírito', 'スピリットモンスター', '스피릿 몬스터', '灵魂怪兽'),
    'Toon Monster': ('Toon-Monster', 'Monstruo Toon', 'Monstre Toon', 'Mostro Toon', 'Monstro Toon', 'トゥーンモンスター', '툰 몬스터', '卡通怪兽'),
    'Ritual Effect Monster': ('Ritual-Effektmonster', 'Monstruo de Efecto de Ritual', 'Monstre à Effet Rituel', 'Mostro Rituale con Effetto', 'Monstro de Efeito de Ritual', '儀式効果モンスター', '의식 효과 몬스터', '仪式效果怪兽'),
    'Spell Card': ('Zauberkarte', 'Carta Mágica', 'Carte Magie', 'Carta Magia', 'Card de Magia', '魔法カード', '마법 카드', '魔法卡'),
    'Trap Card': ('Fallenkarte', 'Carta de Trampa', 'Carte Piège', 'Carta Trappola', 'Card de Armadilha', '罠カード', '함정 카드', '陷阱卡'),
    # Short fixed-size labels: the duel's TURN box, the run strip, the deck editor's NEW badge.
    'TURN': ('ZUG', 'TURNO', 'TOUR', 'TURNO', 'TURNO', 'ターン', '턴', '回合'),
    'VICTORIES': ('SIEGE', 'VICTORIAS', 'VICTOIRES', 'VITTORIE', 'VITÓRIAS', '勝利', '승리', '胜利'),
    'NEW': ('NEU', 'NUEVO', 'NOUVEAU', 'NUOVO', 'NOVO', '新規', '신규', '新'),
    # Settings > Display > Language (v0.2.26).
    'Interface and card texts.': ('Oberfläche und Kartentexte.', 'Interfaz y textos de cartas.', 'Interface et textes des cartes.', 'Interfaccia e testi delle carte.', 'Interface e textos dos cards.', '画面表示とカードテキスト。', '인터페이스와 카드 텍스트.', '界面与卡片文本。'),
    # Deck editor count line ("20 / 20+ minimum main · 0 Extra Deck · Maximum three copies."), translated part by part.
    '{0} / {1}+ minimum main': ('{0} / {1}+ mindestens im Main Deck', '{0} / {1}+ mínimo en el Deck Principal', '{0} / {1}+ minimum dans le Main Deck', '{0} / {1}+ minimo nel Main Deck', '{0} / {1}+ mínimo no Deck Principal', '{0} / {1}+ メインデッキ最低枚数', '{0} / {1}+ 메인 덱 최소', '{0} / {1}+ 主卡组最少'),
    '{0} Extra Deck': ('{0} Extra Deck', '{0} Deck Extra', '{0} Extra Deck', '{0} Extra Deck', '{0} Deck Adicional', 'エクストラデッキ {0}', '엑스트라 덱 {0}', '额外卡组 {0}'),
    # Screen-reader labels.
    'ATK {0}, DEF {1}': ('ATK {0}, DEF {1}', 'ATK {0}, DEF {1}', 'ATK {0}, DEF {1}', 'ATK {0}, DEF {1}', 'ATK {0}, DEF {1}', '攻撃力 {0}、守備力 {1}', '공격력 {0}, 수비력 {1}', '攻击力 {0}，守备力 {1}'),
    '{0} gold': ('{0} Gold', '{0} de oro', '{0} or', '{0} oro', '{0} de ouro', '{0}ゴールド', '{0} 골드', '{0} 金'),
    'coins': ('Münzen', 'monedas', 'pièces', 'monete', 'moedas', 'コイン', '코인', '金币'),
    '{0} coins': ('{0} Münzen', '{0} monedas', '{0} pièces', '{0} monete', '{0} moedas', '{0}コイン', '{0} 코인', '{0} 金币'),
    # Coin reward lines (juice.js): "+30 Victory"; the label is translated through the dictionary.
    '+{0} {1}': ('+{0} {1}',) * 8,
    # Shop boost label (Guardian equips added 2026-11-08).
    'Guardian monsters and equipment': ('„Wächter“-Monster und Ausrüstung', 'Monstruos "Guardián" y su equipo', 'Monstres Gardien et leur équipement', 'Mostri Guardiano e loro equipaggiamento', 'Monstros Guardião e seus equipamentos', '「ガーディアン」モンスターと装備', '가디언 몬스터와 장비', '守护者怪兽与装备'),
}
# Shop boost labels "<Type> monsters" / "<ATTRIBUTE> monsters": built from each language's own Type or Attribute name and
# the template its existing labels already use ("Dragon monsters", "DARK monsters").
DERIVED = (('Dragon', 'Dragon monsters'), ('DARK', 'DARK monsters'))


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    known = {(r['group'], r['en']) for r in catalog}
    for en in TERMS:
        if ('ui', en) not in known:
            catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'added 2026-11-09 (Discord)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        ui = json.loads(path.read_text(encoding='utf8'))
        added = 0
        for en, local in TERMS.items():
            if en not in ui:
                ui[en] = local[i]
                added += 1
        import shop_rewards
        for sample, sample_label in DERIVED:
            name, label = ui.get(sample), ui.get(sample_label)
            if not name or not label or name not in label:
                continue
            template = label.replace(name, '{X}', 1)
            for en in shop_rewards.LABELS.values():
                word = en[:-len(' monsters')] if en.endswith(' monsters') else None
                if not word or en in ui or not ui.get(word) or (word.isupper() != sample.isupper()):
                    continue
                ui[en] = template.replace('{X}', ui[word])
                added += 1
        path.write_text(json.dumps(ui, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
        print(lang, 'added', added)


if __name__ == '__main__':
    main()
