"""Deck building filters (2026-11-24): the split deck editor's Extra Deck pane (Nori), and the pack filters CITYDRIVER
asked for: "card draw" and "Equip Spells" as pack Support themes, and the Collection › Packs "Cards" filter (Support
themes and Types, with the count of matching cards on each pack). All 8 languages; never overwrites an existing
translation. Rerun tools/i18n/add_nov18_pack_summary_terms.mjs afterwards: the pack summaries name the new themes."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 # Pack summary Support themes (pack-summary.js PACK_THEMES), lower case like "removal and control".
 'card draw': (
  'Kartenziehen', 'robo de cartas', 'pioche de cartes', 'pescaggio di carte',
  'ドロー', '드로우', 'compra de cards', '抽卡'),
 'Equip Spells': (
  'Ausrüstungszauber', 'Mágicas de Equipo', "Magies d'Équipement", 'Magie Equipaggiamento',
  '装備魔法', '장착 마법', 'Magias de Equipamento', '装备魔法'),
 # Collection › Packs "Cards" filter (mobile.js packCardsFilter).
 'Support': (
  'Unterstützung', 'Apoyo', 'Soutien', 'Supporto',
  'サポート', '서포트', 'Suporte', '支援'),
 'Removal and control': (
  'Entfernung und Kontrolle', 'Eliminación y control', 'Élimination et contrôle', 'Rimozione e controllo',
  '除去とコントロール', '제거와 컨트롤', 'Remoção e controle', '除去与控制'),
 'Matching cards in this pack': (
  'Passende Karten in diesem Pack', 'Cartas que coinciden en este sobre', 'Cartes correspondantes dans ce booster', 'Carte corrispondenti in questa bustina',
  'このパックの該当カード', '이 팩에서 조건에 맞는 카드', 'Cards correspondentes neste pacote', '此卡包中符合条件的卡'),
 # Split deck editor, empty Extra Deck pane (card-search.js splitDeckMarkup).
 'Tap a Fusion Monster in your collection to add it.': (
  'Tippe auf ein Fusionsmonster in deiner Sammlung, um es hinzuzufügen.',
  'Toca un Monstruo de Fusión de tu colección para añadirlo.',
  'Touchez un Monstre Fusion de votre collection pour l\'ajouter.',
  'Tocca un Mostro Fusione nella tua collezione per aggiungerlo.',
  'コレクションの融合モンスターをタップすると追加します。',
  '컬렉션의 융합 몬스터를 탭하면 추가됩니다.',
  'Toque em um Monstro de Fusão da sua coleção para adicioná-lo.',
  '点按收藏中的融合怪兽即可加入。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
