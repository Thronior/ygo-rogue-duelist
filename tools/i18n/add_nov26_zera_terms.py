"""Serenity's Zera's Sanctuary loadout (user, 2026-11-26): the loadout title and the Herald of Heaven relic, in all
8 languages, plus the catalog rows. Card names and wording follow each language's Sanctuary Hymn and Black Chaos Rite
texts. Never overwrites an existing translation."""
import json, re, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']

ZERA = "Zera's Sanctuary"
HERALD, HERALD_TEXT = 'Herald of Heaven', ('Once per Duel, while "The Sanctuary in the Sky" is face-up on the field: You can Tribute 1 '
                                           'Fairy monster; Special Summon 1 Level 7 or higher Fairy monster from your hand or Deck, '
                                           'ignoring its Summoning conditions.')
TERMS = {
 ZERA: ('Zeras Zuflucht', 'Santuario de Zera', 'Sanctuaire de Zera', 'Santuario di Zera', 'ゼラの聖域', '제라의 성역', 'Santuário de Zera', '杰拉的圣域'),
 HERALD: ('Herold des Himmels', 'Heraldo del Cielo', 'Héraut du Ciel', 'Araldo del Cielo', '天界の使者', '천계의 사자', 'Arauto do Céu', '天界使者'),
 HERALD_TEXT: (
  'Einmal pro Duell, solange „Die Zuflucht im Himmel“ offen auf dem Spielfeld liegt: Du kannst 1 Fee-Monster als Tribut anbieten; beschwöre 1 Fee-Monster der Stufe 7 oder höher als Spezialbeschwörung von deiner Hand oder deinem Deck, wobei du seine Beschwörungsbedingungen ignorierst.',
  'Una vez por Duelo, mientras "El Santuario en el Cielo" esté boca arriba en el Campo: puedes Sacrificar 1 monstruo Hada; Invoca de Modo Especial 1 monstruo Hada de Nivel 7 o mayor desde tu mano o Deck, ignorando sus condiciones de Invocación.',
  "Une fois par Duel, tant que \"Le Sanctuaire Céleste\" est face recto sur le Terrain : vous pouvez Sacrifier 1 monstre Elfe ; Invoquez Spécialement 1 monstre Elfe de Niveau 7 ou plus depuis votre main ou Deck, en ignorant ses conditions d'Invocation.",
  'Una volta per Duello, finché "Il Santuario nel Cielo" è scoperto sul Terreno: puoi offrire come Tributo 1 mostro Fata; Evoca Specialmente 1 mostro Fata di Livello 7 o superiore dalla tua mano o dal tuo Deck, ignorando le sue condizioni di Evocazione.',
  '1デュエルに1度、「天空の聖域」がフィールドに表側表示で存在する場合、自分フィールドの天使族モンスター1体をリリースして発動できる。手札・デッキからレベル7以上の天使族モンスター1体を召喚条件を無視して特殊召喚する。',
  '1듀얼에 1번, 「천공의 성역」이 필드에 앞면 표시로 존재할 경우, 자신 필드의 천사족 몬스터 1장을 릴리스하고 발동할 수 있다. 패 / 덱에서 레벨 7 이상의 천사족 몬스터 1장을 소환 조건을 무시하고 특수 소환한다.',
  'Uma vez por Duelo, enquanto "O Santuário no Céu" estiver com a face para cima no campo: você pode oferecer como Tributo 1 monstro Fada; Invoque por Invocação-Especial 1 monstro Fada de Nível 7 ou mais da sua mão ou Deck, ignorando as condições de Invocação dele.',
  '1场决斗1次，「天空的圣域」在场上表侧表示存在的场合，把自己场上1只天使族怪兽解放才能发动。从手卡·卡组把1只7星以上的天使族怪兽无视召唤条件特殊召唤。'),
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
    for group, en, ctx in (('character', ZERA, 'variant title of Serenity Wheeler'),
                           ('relic', HERALD, 'relic name (herald_of_heaven)'),
                           ('relic', HERALD_TEXT, 'relic effect (herald_of_heaven)')):
        en = re.sub(r'\s+', ' ', en).strip()
        if (group, en) not in have:
            rows.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': ctx})
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
