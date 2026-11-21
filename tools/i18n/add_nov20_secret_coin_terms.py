"""Hidden coin feats of 2026-11-20 (duel_rewards.SECRET), in all 8 languages. Never overwrites an existing translation.
Labels show only once a player earns the feat: on the victory coin lines ('Hidden feat!'), in the in-duel bonus list and,
from then on, in the shop Coin scorecard's 'Hidden feats' section. 'Beat them with their own monster' is in
add_nov20_coin_terms.py. Exodia limbs follow each language's official 'of the Forbidden One' wording; tribute terms
follow the existing 'Tribute Summons' translations (fr Sacrifice, ja/ko release, zh 解放)."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Slapped by the Forbidden One': ('Ohrfeige von der Verbotenen', 'Abofeteado por el Prohibido', "Giflé par l'Interdit",
  'Schiaffeggiato dal Proibito', '封印されし者の平手打ち', '봉인된 자의 따귀', 'Esbofeteado pelo Proibido', '被封印者一巴掌'),
 'Little but mighty': ('Klein, aber oho', 'Pequeño pero poderoso', 'Petit mais costaud', 'Piccolo ma potente',
  '小さくても強い', '작지만 강하다', 'Pequeno, mas poderoso', '小身材大能量'),
 'One Turn Kill': ('One Turn Kill', 'One Turn Kill', 'One Turn Kill', 'One Turn Kill', 'ワンターンキル', '원턴킬', 'One Turn Kill', '一回合击杀'),
 "That's Godlike": ('Göttlich!', '¡Divino!', 'Divin !', 'Divino!', '神の一撃', '신급이다', 'Divino!', '神级一击'),
 'Hanging by a thread': ('Am seidenen Faden', 'Pendiendo de un hilo', "Ne tenir qu'à un fil", 'Appeso a un filo',
  '首の皮一枚', '간신히 버텼다', 'Por um fio', '命悬一线'),
 'Back from the brink': ('Vom Abgrund zurück', 'De vuelta del abismo', 'Revenu du bord du gouffre', "Ritorno dall'orlo del baratro",
  '崖っぷちからの逆転', '벼랑 끝에서 역전', 'De volta da beira do abismo', '绝境逆转'),
 'Against all odds': ('Allen Widrigkeiten zum Trotz', 'Contra todo pronóstico', 'Envers et contre tout', 'Contro ogni pronostico',
  '数の不利を覆して', '수적 열세를 딛고', 'Contra todas as probabilidades', '以寡敌众'),
 'The last draw': ('Die letzte Karte', 'La última carta', 'La dernière pioche', "L'ultima pescata", 'ラストドロー', '마지막 드로우',
  'A última compra', '最后的抽卡'),
 'No monsters needed': ('Ganz ohne Monster', 'Sin necesidad de monstruos', 'Pas besoin de monstres', 'Nessun mostro necessario',
  'モンスターいらず', '몬스터 없이도', 'Nem precisa de monstros', '无需怪兽'),
 'Total annihilation': ('Totale Vernichtung', 'Aniquilación total', 'Anéantissement total', 'Annientamento totale',
  '完全殲滅', '완전 섬멸', 'Aniquilação total', '全面歼灭'),
 'Three tributes for a god': ('Drei Tribute für einen Gott', 'Tres sacrificios para un dios', 'Trois Sacrifices pour un dieu',
  'Tre Tributi per un dio', '神へ捧げる3体のリリース', '신에게 바치는 3체 릴리스', 'Três Tributos para um deus', '为神解放3只怪兽'),
 'Triple threat': ('Dreifache Bedrohung', 'Triple amenaza', 'Triple menace', 'Tripla minaccia', 'トリプルスレット', '트리플 위협',
  'Ameaça tripla', '三重威胁'),
 'The gods walk the earth': ('Die Götter wandeln auf Erden', 'Los dioses caminan sobre la tierra', 'Les dieux foulent la terre',
  'Gli dèi camminano sulla terra', '三幻神降臨', '삼환신 강림', 'Os deuses caminham sobre a terra', '三幻神降临'),
 'Lady Luck': ('Fortuna lächelt', 'La diosa fortuna', 'Dame Chance', 'Dea bendata', '幸運の女神', '행운의 여신', 'Dona Sorte', '幸运女神'),
 # The marks around them ('Feats' is Leistungen / Hazañas / Exploits / Imprese / 功績 / 위업 / Façanhas / 壮举).
 'Hidden feats': ('Versteckte Leistungen', 'Hazañas ocultas', 'Exploits cachés', 'Imprese nascoste', '隠し功績', '숨겨진 위업',
  'Façanhas ocultas', '隐藏壮举'),
 'Hidden feat!': ('Versteckte Leistung!', '¡Hazaña oculta!', 'Exploit caché !', 'Impresa nascosta!', '隠し功績！', '숨겨진 위업!',
  'Façanha oculta!', '隐藏壮举！'),
 'Found': ('Gefunden', 'Descubierta', 'Découvert', 'Scoperta', '発見済み', '발견함', 'Descoberta', '已发现'),
}
CONTEXT = {en: ('rules', 'hidden coin feat label, shown only once earned, 2026-11-20') for en in TERMS}
CONTEXT['Hidden feats'] = ('rules', 'shop Coin scorecard section listing the hidden coin feats the player has found')
CONTEXT['Hidden feat!'] = ('rules', 'mark above a hidden coin feat on the victory coin lines and in-duel bonus list')
CONTEXT['Found'] = ('rules', 'tag on a hidden coin feat the player has discovered (a feat, feminine in es/it/pt)')


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
        group, ctx = CONTEXT[en]
        if en not in known: catalog.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': ctx})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
