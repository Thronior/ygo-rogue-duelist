"""Relic text changes of 2026-11-25 (user): Exile Standard counts every banished monster (no longer only face-up ones), and
Boss Monster negates and destroys the card that targets a Level 7 or higher monster you control. Both new English texts in
all 8 languages, worded like the old translations and real card text. The shop banish price and slot, Tag's character packs
and Champion Trophy's reroll changed no player text. Never overwrites an existing translation; the catalog row of each old
text is renamed to the new one."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
EXILE_OLD = 'Monsters you control gain 50 ATK for each face-up banished monster belonging to either player.'
EXILE = 'Monsters you control gain 50 ATK for each banished monster belonging to either player.'
BOSS_OLD = "Once per Duel, negate the first opponent's effect that targets a Level 7 or higher monster you control."
BOSS = ('Once per Duel, when your opponent activates a card or effect that targets a Level 7 or higher monster you control: '
        'Negate that effect, and if you do, destroy that card.')
TERMS = {
 EXILE: (
  'Alle Monster, die du kontrollierst, erhalten 50 ATK für jedes verbannte Monster beider Spieler.',
  'Los monstruos que controles ganan 50 ATK por cada monstruo desterrado de cualquier jugador.',
  "Les monstres que vous contrôlez gagnent 50 ATK pour chaque monstre banni appartenant à l'un ou l'autre joueur.",
  'I mostri che controlli guadagnano 50 ATK per ogni mostro bandito appartenente a uno qualsiasi dei giocatori.',
  '自分フィールドのモンスターの攻撃力は、お互いの除外されているモンスターの数×50アップする。',
  '자신 필드의 몬스터의 공격력은, 서로의 제외된 몬스터의 수 × 50 올린다.',
  'Os monstros que você controla ganham 50 de ATK para cada monstro banido pertencente a qualquer duelista.',
  '自己场上的怪兽的攻击力上升双方被除外的怪兽数量×50。'),
 BOSS: (
  'Einmal pro Duell, wenn dein Gegner eine Karte oder einen Effekt aktiviert, die bzw. der ein Monster der Stufe 7 oder höher, '
  'das du kontrollierst, als Ziel wählt: Annulliere jenen Effekt und falls du dies tust, zerstöre jene Karte.',
  'Una vez por Duelo, cuando tu adversario active una carta o efecto que seleccione un monstruo de Nivel 7 o mayor que '
  'controles: niega ese efecto y, si lo haces, destruye esa carta.',
  'Une fois par Duel, lorsque votre adversaire active une carte ou un effet qui cible un monstre de min. Niveau 7 que vous '
  'contrôlez : annulez cet effet, et si vous le faites, détruisez cette carte.',
  "Una volta per Duello, quando il tuo avversario attiva una carta o un effetto che sceglie come bersaglio un mostro di "
  "Livello 7 o superiore che controlli: annulla quell'effetto e, se lo fai, distruggi quella carta.",
  'デュエル中に1度、相手が自分フィールドのレベル7以上のモンスターを対象とするカード・効果を発動した時、その効果を無効にし、そのカードを破壊する。',
  '듀얼 중에 1번, 상대가 자신 필드의 레벨 7 이상의 몬스터를 대상으로 하는 카드 / 효과를 발동했을 때, 그 효과를 무효로 하고, 그 카드를 파괴한다.',
  'Uma vez por Duelo, quando seu oponente ativar um card ou efeito que escolha como alvo um monstro de Nível 7 ou mais que '
  'você controla: negue esse efeito e, se isso acontecer, destrua esse card.',
  '每场决斗1次，对方把以自己场上7星以上的怪兽为对象的卡·效果发动时，那个效果无效，并把那张卡破坏。'),
}
RENAMED = {EXILE_OLD: (EXILE, 'relic effect (exile_standard)'), BOSS_OLD: (BOSS, 'relic effect (boss_monster)')}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for old, (new, ctx) in RENAMED.items():
        if new in known: continue
        row = next((r for r in catalog if r['en'] == old), None)
        if row: row['en'] = new
        else: catalog.append({'group': 'relic', 'en': new, 'kind': 'exact', 'ctx': ctx})
        known.add(new)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
