"""Pack favourites per character (magna98, user 2026-11-21): the Collection's character list and the Favourite packs row
in a character's settings, in all 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Favourite for': ('Favorit für', 'Favorito para', 'Favori pour', 'Preferito per', 'お気に入りにするキャラ', '즐겨찾기 대상', 'Favorito para', '收藏给'),
 'Select all': ('Alle auswählen', 'Seleccionar todo', 'Tout sélectionner', 'Seleziona tutto', 'すべて選択', '모두 선택', 'Selecionar tudo', '全选'),
 'Favourite packs': ('Lieblingspacks', 'Sobres favoritos', 'Boosters favoris', 'Buste preferite', 'お気に入りのパック', '즐겨찾는 팩', 'Pacotes favoritos', '收藏的卡包'),
 'Packs starred for this character go first on its shop shelf. Star them in the shop or in Collection.': (
  'Für diesen Charakter markierte Packs stehen im Shop-Regal zuerst. Markiere sie im Shop oder in der Sammlung.',
  'Los sobres marcados para este personaje aparecen primero en su estante de la tienda. Márcalos en la tienda o en la Colección.',
  "Les boosters marqués pour ce personnage passent en premier dans son rayon de la boutique. Marquez-les dans la boutique ou dans la Collection.",
  'Le buste segnate per questo personaggio compaiono per prime sul suo scaffale del negozio. Segnale nel negozio o nella Collezione.',
  'このキャラ用に★を付けたパックはショップの棚で先頭に並びます。ショップかコレクションで★を付けてください。',
  '이 캐릭터용으로 별표한 팩은 상점 진열대 맨 앞에 놓입니다. 상점이나 컬렉션에서 별표하세요.',
  'Os pacotes marcados para este personagem aparecem primeiro na prateleira da loja. Marque-os na loja ou na Coleção.',
  '为该角色收藏的卡包会排在商店货架最前面。可在商店或收藏中加星。'),
 'None yet.': ('Noch keine.', 'Ninguno todavía.', 'Aucun pour le moment.', 'Ancora nessuno.', 'まだありません。', '아직 없습니다.', 'Nenhum ainda.', '暂无。'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'mobile.js, character-settings.js'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
