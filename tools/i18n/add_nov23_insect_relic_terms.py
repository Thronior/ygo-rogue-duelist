"""Insect relics (user, 2026-11-23): Chitin Carapace now gives 800 DEF (its old 400 text keeps its translations), and the
new Moth Brood relic and the fused Insect Swarm make a "Moth Token" (names from tools/i18n/add_nov23_moth_lv_terms.py). Name and text in all 8
languages, plus the catalog rows. Never overwrites an existing translation."""
import json, re, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
OLD_CHITIN = 'Insect monsters you control gain 400 DEF.'
CHITIN = 'Insect monsters you control gain 800 DEF.'
BROOD = 'Moth Brood'
BROOD_TEXT = ('Once per turn, during your Standby Phase, if you control a face-up Insect monster: Special Summon 1 "Moth Token" '
              'with the same Level and Type as the face-up Insect monster you control with the highest ATK, and half its ATK/DEF.')
SWARM = 'Insect Swarm'
SWARM_TEXT = ('Insect monsters you control gain 800 ATK/DEF. Once per turn, during your Standby Phase, if you control a face-up Insect '
              'monster: Special Summon 1 "Moth Token" whose ATK/DEF are equal to the combined ATK/DEF of all face-up Insect monsters you control.')
TERMS = {
 SWARM: ('Insektenschwarm', 'Enjambre de Insectos', "Essaim d'Insectes", 'Sciame di Insetti', 'インセクト・スウォーム', '인섹트 스웜', 'Enxame de Insetos', '昆虫虫群'),
 SWARM_TEXT: (
  'Alle Insekt-Monster, die du kontrollierst, erhalten 800 ATK/DEF. Einmal pro Spielzug, während deiner Standby Phase, falls du ein offenes Insekt-Monster kontrollierst: Beschwöre 1 „Motten-Spielmarke“ als Spezialbeschwörung, deren ATK/DEF den zusammengerechneten ATK/DEF aller offenen Insekt-Monster entsprechen, die du kontrollierst.',
  'Los monstruos Insecto que controles ganan 800 ATK/DEF. Una vez por turno, durante tu Standby Phase, si controlas un monstruo Insecto boca arriba: Invoca de Modo Especial 1 "Ficha Moth" cuyo ATK/DEF sean iguales al ATK/DEF combinados de todos los monstruos Insecto boca arriba que controles.',
  "Les monstres Insecte que vous contrôlez gagnent 800 ATK/DEF. Une fois par tour, durant votre Standby Phase, si vous contrôlez un monstre Insecte face recto: Invoquez Spécialement 1 \"Jeton Papillon\" dont l'ATK/DEF est égale à l'ATK/DEF combinée de tous les monstres Insecte face recto que vous contrôlez.",
  'I mostri Insetto che controlli guadagnano 800 ATK/DEF. Una volta per turno, durante la tua Standby Phase, se controlli un mostro Insetto scoperto: Evoca Specialmente 1 "Segna-Falena" i cui ATK/DEF sono uguali alla somma degli ATK/DEF di tutti i mostri Insetto scoperti che controlli.',
  '自分フィールドの昆虫族モンスターの攻撃力・守備力は800アップする。1ターンに1度、自分スタンバイフェイズに、自分フィールドに表側表示の昆虫族モンスターが存在する場合、自分フィールドの表側表示の昆虫族モンスター全ての攻撃力・守備力の合計を攻撃力・守備力とする「モストークン」1体を特殊召喚する。',
  '자신 필드의 곤충족 몬스터의 공격력 / 수비력은 800 올린다. 1턴에 1번, 자신 스탠바이 페이즈에, 자신 필드에 앞면 표시 곤충족 몬스터가 존재할 경우, 자신 필드의 앞면 표시 곤충족 몬스터 전부의 공격력 / 수비력의 합계를 공격력 / 수비력으로 하는 "모스 토큰" 1장을 특수 소환한다.',
  'Os monstros Inseto que você controla ganham 800 de ATK/DEF. Uma vez por turno, durante sua Fase de Apoio, se você controlar um monstro Inseto com a face para cima: Invoque por Invocação-Especial 1 "Ficha de Moth" cujo ATK/DEF sejam iguais à soma do ATK/DEF de todos os monstros Inseto com a face para cima que você controla.',
  '自己场上的昆虫族怪兽的攻击力·守备力上升800。1回合1次，自己准备阶段，自己场上有表侧表示的昆虫族怪兽存在的场合，把1只攻击力·守备力为自己场上全部表侧表示昆虫族怪兽的攻击力·守备力合计数值的「飞蛾衍生物」特殊召唤。'),
 BROOD: ('Mottenbrut', 'Cría de Moth', 'Couvée de Papillons', 'Covata di Falene', 'モス・ブルード', '모스 브루드', 'Cria de Moth', '飞蛾幼群'),
 BROOD_TEXT: (
  'Einmal pro Spielzug, während deiner Standby Phase, falls du ein offenes Insekt-Monster kontrollierst: Beschwöre 1 „Motten-Spielmarke“ als Spezialbeschwörung mit derselben Stufe und demselben Typ wie das offene Insekt-Monster mit den höchsten ATK, das du kontrollierst, und der Hälfte seiner ATK/DEF.',
  'Una vez por turno, durante tu Standby Phase, si controlas un monstruo Insecto boca arriba: Invoca de Modo Especial 1 "Ficha Moth" con el mismo Nivel y Tipo que el monstruo Insecto boca arriba con más ATK que controles, y la mitad de su ATK/DEF.',
  "Une fois par tour, durant votre Standby Phase, si vous contrôlez un monstre Insecte face recto: Invoquez Spécialement 1 \"Jeton Papillon\" avec le même Niveau et le même Type que le monstre Insecte face recto avec le plus d'ATK que vous contrôlez, et la moitié de son ATK/DEF.",
  'Una volta per turno, durante la tua Standby Phase, se controlli un mostro Insetto scoperto: Evoca Specialmente 1 "Segna-Falena" con lo stesso Livello e Tipo del mostro Insetto scoperto con più ATK che controlli, e con metà dei suoi ATK/DEF.',
  '1ターンに1度、自分スタンバイフェイズに、自分フィールドに表側表示の昆虫族モンスターが存在する場合、自分フィールドの攻撃力が一番高い表側表示の昆虫族モンスターと同じレベル・種族で、その攻撃力・守備力の半分の数値を持つ「モストークン」1体を特殊召喚する。',
  '1턴에 1번, 자신 스탠바이 페이즈에, 자신 필드에 앞면 표시 곤충족 몬스터가 존재할 경우, 자신 필드의 공격력이 가장 높은 앞면 표시 곤충족 몬스터와 같은 레벨 / 종족이며, 그 공격력 / 수비력의 절반의 수치를 가진 "모스 토큰" 1장을 특수 소환한다.',
  'Uma vez por turno, durante sua Fase de Apoio, se você controlar um monstro Inseto com a face para cima: Invoque por Invocação-Especial 1 "Ficha de Moth" com o mesmo Nível e Tipo do monstro Inseto com a face para cima com mais ATK que você controla, e metade do ATK/DEF dele.',
  '1回合1次，自己准备阶段，自己场上有表侧表示的昆虫族怪兽存在的场合，把1只和自己场上攻击力最高的表侧表示昆虫族怪兽相同等级·种族，攻击力·守备力为其一半的「飞蛾衍生物」特殊召唤。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        old = table.get(OLD_CHITIN)
        assert old and '400' in old, (lang, old)
        table.setdefault(CHITIN, old.replace('400', '800'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    rows = json.loads(path.read_text(encoding='utf-8-sig'))
    have = {(r['group'], r['en']) for r in rows}
    for en, ctx in ((CHITIN, 'relic effect (chitin_carapace)'), (BROOD, 'relic name (moth_brood)'), (BROOD_TEXT, 'relic effect (moth_brood)'),
                    (SWARM, 'relic name (insect_swarm)'), (SWARM_TEXT, 'relic effect (insect_swarm)')):
        en = re.sub(r'\s+', ' ', en).strip()
        if ('relic', en) not in have:
            rows.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': ctx})
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
