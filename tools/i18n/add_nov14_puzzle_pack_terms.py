"""Millennium Puzzle pack descriptions (Discord, 2026-11-14): one whole sentence per pack in all 8 languages.
Green every Spell, Red every Trap, Yellow every monster, Purple every card. Existing translations are never overwritten."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_bytes

LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'This pack includes all Spell cards in the game.': [
  'Dieser Booster enthält alle Zauberkarten des Spiels.',
  'Este sobre incluye todas las Cartas Mágicas del juego.',
  'Ce booster contient toutes les cartes Magie du jeu.',
  'Questa busta include tutte le carte Magia del gioco.',
  'このパックにはゲーム内の魔法カードがすべて含まれます。',
  '이 팩에는 게임의 모든 마법 카드가 들어 있습니다.',
  'Este pacote inclui todos os Cards de Magia do jogo.',
  '此补充包包含游戏中所有的魔法卡。'],
 'This pack includes all Trap cards in the game.': [
  'Dieser Booster enthält alle Fallenkarten des Spiels.',
  'Este sobre incluye todas las Cartas de Trampa del juego.',
  'Ce booster contient toutes les cartes Piège du jeu.',
  'Questa busta include tutte le carte Trappola del gioco.',
  'このパックにはゲーム内の罠カードがすべて含まれます。',
  '이 팩에는 게임의 모든 함정 카드가 들어 있습니다.',
  'Este pacote inclui todos os Cards de Armadilha do jogo.',
  '此补充包包含游戏中所有的陷阱卡。'],
 'This pack includes all Monster cards in the game.': [
  'Dieser Booster enthält alle Monsterkarten des Spiels.',
  'Este sobre incluye todas las cartas de Monstruo del juego.',
  'Ce booster contient toutes les cartes Monstre du jeu.',
  'Questa busta include tutte le carte Mostro del gioco.',
  'このパックにはゲーム内のモンスターカードがすべて含まれます。',
  '이 팩에는 게임의 모든 몬스터 카드가 들어 있습니다.',
  'Este pacote inclui todos os Cards de Monstro do jogo.',
  '此补充包包含游戏中所有的怪兽卡。'],
 'This pack includes all cards in the game.': [
  'Dieser Booster enthält alle Karten des Spiels.',
  'Este sobre incluye todas las cartas del juego.',
  'Ce booster contient toutes les cartes du jeu.',
  'Questa busta include tutte le carte del gioco.',
  'このパックにはゲーム内のすべてのカードが含まれます。',
  '이 팩에는 게임의 모든 카드가 들어 있습니다.',
  'Este pacote inclui todos os cards do jogo.',
  '此补充包包含游戏中的所有卡片。'],
}

def dump(path, data):
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=1) + '\n').encode('utf8'))

def main():
    for n, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        added = 0
        for key, text in TERMS.items():
            if key not in table: table[key] = text[n]; added += 1
        if added: dump(path, table)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    new = [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'pack-inspection.js'} for k in TERMS if k not in known]
    if new: dump(path, catalog + new)

if __name__ == '__main__':
    main()
