"""Genetic Override (user, 2026-11-24): Attribute Mutation + Unstable DNA fused. Its name and text in all 8 languages,
worded like Unstable DNA's and Attribute Mutation's translations. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TEXT = ("All your monsters are treated as having every Type and Attribute. Monsters you control gain 300 ATK for each monster "
        "on the field. At the start of each Duel, select 1 Type and 1 Attribute. All of your opponent's monsters everywhere "
        "become the selected Type and Attribute.")
TERMS = {
 'Genetic Override': ('Genetische Vorherrschaft', 'Dominio Genético', 'Domination Génétique', 'Dominio Genetico', '遺伝子支配', '유전자 지배', 'Domínio Genético', '基因支配'),
 TEXT: (
  'Alle deine Monster werden so behandelt, als hätten sie jeden Typ und jede Eigenschaft. Monster, die du kontrollierst, erhalten 300 ATK für jedes Monster auf dem Spielfeld. Wähle zu Beginn jedes Duells 1 Typ und 1 Eigenschaft. Alle Monster deines Gegners werden überall zum gewählten Typ und zur gewählten Eigenschaft.',
  'Todos tus monstruos se tratan como si tuvieran todos los Tipos y Atributos. Los monstruos que controlas ganan 300 ATK por cada monstruo en el Campo. Al comienzo de cada Duelo, selecciona 1 Tipo y 1 Atributo. Todos los monstruos de tu adversario, en cualquier lugar, pasan a ser del Tipo y Atributo seleccionados.',
  "Tous vos monstres sont considérés comme possédant tous les Types et tous les Attributs. Les monstres que vous contrôlez gagnent 300 ATK pour chaque monstre sur le Terrain. Au début de chaque Duel, sélectionnez 1 Type et 1 Attribut. Tous les monstres de votre adversaire, où qu'ils soient, deviennent du Type et de l'Attribut sélectionnés.",
  "Tutti i tuoi mostri vengono considerati come aventi ogni Tipo e ogni Attributo. I mostri che controlli guadagnano 300 ATK per ogni mostro sul Terreno. All'inizio di ogni Duello, seleziona 1 Tipo e 1 Attributo. Tutti i mostri del tuo avversario, ovunque si trovino, diventano del Tipo e dell'Attributo selezionati.",
  '自分のモンスターは全ての種族・属性を持つものとして扱う。自分フィールドのモンスターの攻撃力は、フィールドのモンスターの数×300アップする。各デュエルの開始時に、種族と属性を1つずつ選択する。全ての場所の相手のモンスターは選択した種族・属性になる。',
  '자신의 몬스터는 모든 종족 / 속성을 가진 것으로 취급한다. 자신이 컨트롤하는 몬스터의 공격력은, 필드의 몬스터의 수 × 300 올린다. 각 듀얼 개시시에, 종족과 속성을 1개씩 선택한다. 모든 장소에 있는 상대의 몬스터는 선택한 종족 / 속성이 된다.',
  'Todos os seus monstros são tratados como se tivessem todos os Tipos e Atributos. Os monstros que você controla ganham 300 de ATK para cada monstro no campo. No início de cada Duelo, selecione 1 Tipo e 1 Atributo. Todos os monstros do seu oponente, onde quer que estejam, passam a ser do Tipo e do Atributo selecionados.',
  '自己的怪兽当作持有所有种族和属性使用。自己场上的怪兽的攻击力上升场上的怪兽数量×300。每场决斗开始时，选择1个种族和1个属性。对方所有位置的怪兽都变成所选的种族和属性。'),
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
