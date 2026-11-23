"""Narrow Gate now closes the first and last Main Monster Zone and Spell & Trap Zone of both players (user, 2026-11-23;
approved_relic_effects.py), not the fourth and fifth. Wording follows the earlier translation of the same text.
All 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Neither player can use the leftmost or rightmost Main Monster Zone or Spell & Trap Zone. Field Zones are unaffected.': (
  'Kein Spieler kann die äußerste linke oder rechte Main-Monsterzone oder Zauber- & Fallenzone verwenden. Spielfeldzonen sind nicht betroffen.',
  'Ningún jugador puede usar la Zona de Monstruos Principal ni la Zona de Magia y Trampas del extremo izquierdo o derecho. Las Zonas de Campo no se ven afectadas.',
  'Aucun joueur ne peut utiliser la Zone Monstre Principale ou Zone Magie & Piège la plus à gauche ou la plus à droite. Les Zones Terrain ne sont pas affectées.',
  'Nessun giocatore può usare la Zona Mostri Principale o Zona Magie & Trappole più a sinistra o più a destra. Le Zone Terreno non sono interessate.',
  'お互いは一番左と一番右のメインモンスターゾーンおよび魔法＆罠ゾーンを使用できない。フィールドゾーンには影響しない。',
  '서로 가장 왼쪽과 가장 오른쪽의 메인 몬스터 존 및 마법 & 함정 존을 사용할 수 없다. 필드 존은 영향을 받지 않는다.',
  'Nenhum duelista pode usar a Zona de Monstros Principal ou Zona de Magias & Armadilhas mais à esquerda ou mais à direita. As Zonas de Campo não são afetadas.',
  '双方都不能使用最左边和最右边的主要怪兽区域以及魔法与陷阱区域。场地区域不受影响。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
