"""Ritual Scar says it only counts Ritual Summons made after you get it, and its relic window shows the current ATK
change (Discord, 2026-11-15, CITYDRIVER), all 8 languages. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
FULL = 'Monsters you control lose 500 ATK. They gain 100 ATK for each time you Ritual Summon a monster after getting this relic, across all Duels.'
HALF = 'Monsters you control gain 100 ATK for each time you Ritual Summon a monster after getting this relic, across all Duels.'
STATUS = 'Currently {0} ATK'
TERMS = {
 FULL: ('Alle Monster, die du kontrollierst, verlieren 500 ATK. Sie erhalten 100 ATK für jedes Mal, das du nach Erhalt dieses Relikts ein Monster als Ritualbeschwörung beschworen hast, über alle Duelle hinweg.',
  'Los monstruos que controlas pierden 500 ATK. Ganan 100 ATK por cada vez que hayas Invocado por Ritual un monstruo después de obtener esta reliquia, en todos los Duelos.',
  'Les monstres que vous contrôlez perdent 500 ATK. Ils gagnent 100 ATK pour chaque fois que vous avez Invoqué Rituellement un monstre après avoir obtenu cette relique, tous Duels confondus.',
  'I mostri che controlli perdono 500 ATK. Guadagnano 100 ATK per ogni volta che hai Evocato tramite Rituale un mostro dopo aver ottenuto questa reliquia, in tutti i Duelli.',
  '自分フィールドのモンスターの攻撃力は500ダウンする。このレリックを入手してから自分が儀式召喚した回数（全デュエル合計）×100、それらの攻撃力はアップする。',
  '자신이 컨트롤하는 몬스터의 공격력은 500 내려간다. 이 유물을 얻은 뒤 의식 소환한 횟수(모든 듀얼 합계) × 100만큼 공격력이 올라간다.',
  'Os monstros que você controla perdem 500 ATK. Eles ganham 100 ATK para cada vez que você Invocou por Ritual um monstro depois de obter esta relíquia, em todos os Duelos.',
  '自己场上的怪兽攻击力下降500。获得此遗物后每进行1次仪式召唤（所有决斗合计），它们的攻击力上升100。'),
 HALF: ('Alle Monster, die du kontrollierst, erhalten 100 ATK für jedes Mal, das du nach Erhalt dieses Relikts ein Monster als Ritualbeschwörung beschworen hast, über alle Duelle hinweg.',
  'Los monstruos que controlas ganan 100 ATK por cada vez que hayas Invocado por Ritual un monstruo después de obtener esta reliquia, en todos los Duelos.',
  'Les monstres que vous contrôlez gagnent 100 ATK pour chaque fois que vous avez Invoqué Rituellement un monstre après avoir obtenu cette relique, tous Duels confondus.',
  'I mostri che controlli guadagnano 100 ATK per ogni volta che hai Evocato tramite Rituale un mostro dopo aver ottenuto questa reliquia, in tutti i Duelli.',
  'このレリックを入手してから自分が儀式召喚した回数（全デュエル合計）×100、自分フィールドのモンスターの攻撃力はアップする。',
  '이 유물을 얻은 뒤 의식 소환한 횟수(모든 듀얼 합계) × 100만큼 자신이 컨트롤하는 몬스터의 공격력이 올라간다.',
  'Os monstros que você controla ganham 100 ATK para cada vez que você Invocou por Ritual um monstro depois de obter esta relíquia, em todos os Duelos.',
  '获得此遗物后每进行1次仪式召唤（所有决斗合计），自己场上的怪兽攻击力上升100。'),
 STATUS: ('Aktuell {0} ATK', 'Actualmente {0} ATK', 'Actuellement {0} ATK', 'Attualmente {0} ATK', '現在 攻撃力{0}', '현재 공격력 {0}', 'Atualmente {0} ATK', '当前攻击力 {0}'),
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
        if en not in known: catalog.append({'group': 'relic' if en != STATUS else 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'Ritual Scar (2026-11-15)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__':
    main()
