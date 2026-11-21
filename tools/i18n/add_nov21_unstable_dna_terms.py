"""Unstable DNA (Eriko, Discord 2026-11-21): the fused relic's name and text in all 8 languages, in each language's
official card wording for Type and Attribute. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TEXT = ("At the start of each Duel, select one Type and one Attribute. All of both players' monsters everywhere become the "
        "selected Type and Attribute. Monsters you control gain 100 ATK for every face-up monster on the field with the "
        "selected Type and Attribute.")
TERMS = {
 'Unstable DNA': ('Instabile DNA', 'ADN Inestable', 'ADN Instable', 'DNA Instabile', '不安定なDNA', '불안정한 DNA', 'DNA Instável', '不稳定DNA'),
 TEXT: (
  'Wähle zu Beginn jedes Duells einen Typ und eine Eigenschaft. Alle Monster beider Spieler werden überall zum gewählten Typ und zur gewählten Eigenschaft. Monster, die du kontrollierst, erhalten 100 ATK für jedes offene Monster auf dem Spielfeld mit dem gewählten Typ und der gewählten Eigenschaft.',
  'Al comienzo de cada Duelo, selecciona un Tipo y un Atributo. Todos los monstruos de ambos jugadores, en cualquier lugar, pasan a ser del Tipo y Atributo seleccionados. Los monstruos que controlas ganan 100 ATK por cada monstruo boca arriba en el Campo con el Tipo y Atributo seleccionados.',
  "Au début de chaque Duel, sélectionnez un Type et un Attribut. Tous les monstres des deux joueurs, où qu'ils soient, deviennent du Type et de l'Attribut sélectionnés. Les monstres que vous contrôlez gagnent 100 ATK pour chaque monstre face recto sur le Terrain avec le Type et l'Attribut sélectionnés.",
  "All'inizio di ogni Duello, seleziona un Tipo e un Attributo. Tutti i mostri di entrambi i giocatori, ovunque si trovino, diventano del Tipo e dell'Attributo selezionati. I mostri che controlli guadagnano 100 ATK per ogni mostro scoperto sul Terreno con il Tipo e l'Attributo selezionati.",
  '各デュエルの開始時に、種族と属性を1つずつ選択する。全ての場所の双方のモンスターは選択した種族・属性になる。自分フィールドのモンスターの攻撃力は、フィールドの選択した種族・属性の表側表示モンスターの数×100アップする。',
  '각 듀얼 개시시에, 종족과 속성을 1개씩 선택한다. 모든 장소에 있는 양쪽 플레이어의 몬스터는 선택한 종족 / 속성이 된다. 자신이 컨트롤하는 몬스터의 공격력은, 필드의 선택한 종족 / 속성의 앞면 표시 몬스터의 수 × 100 올린다.',
  'No início de cada Duelo, selecione um Tipo e um Atributo. Todos os monstros de ambos os jogadores, onde quer que estejam, passam a ser do Tipo e do Atributo selecionados. Os monstros que você controla ganham 100 de ATK para cada monstro com a face para cima no campo com o Tipo e o Atributo selecionados.',
  '每场决斗开始时，选择1个种族和1个属性。双方所有位置的怪兽都变成所选的种族和属性。自己场上的怪兽的攻击力上升场上所选种族和属性的表侧表示怪兽数量×100。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'relic_fusions.py'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
