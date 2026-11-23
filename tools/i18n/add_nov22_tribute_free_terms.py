"""Tribute Free and Titan's Covenant now take 1 Tribute off every Level 7 or higher monster, the 3-Tribute Gods
included (user, 2026-11-22, Discord: Gods still needed 3). Their text says "1 less Tribute" in all 8 languages.
Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
LESS = ('Monster der Stufe 7 oder höher, die du als Tributbeschwörung beschwörst, benötigen 1 Tribut weniger.',
        'Los monstruos de Nivel 7 o mayor que Invoques por Sacrificio requieren 1 Sacrificio menos.',
        'Les monstres de min. Niveau 7 que vous Invoquez par Sacrifice requièrent 1 Sacrifice de moins.',
        'I mostri di Livello 7 o superiore che Evochi tramite Tributo richiedono 1 Tributo in meno.',
        '自分がアドバンス召喚するレベル7以上のモンスターは、必要なリリースが1体少なくなる。',
        '자신이 어드밴스 소환하는 레벨 7 이상의 몬스터는 필요한 릴리스가 1장 줄어든다.',
        'Os monstros de Nível 7 ou mais que você Invocar por Invocação-Tributo exigem 1 Tributo a menos.',
        '自己上级召唤的7星以上的怪兽需要的解放减少1只。')
ATK = ('Alle Monster der Stufe 5 oder höher, die du kontrollierst, erhalten 1200 ATK. ',
       'Los monstruos de Nivel 5 o mayor que controles ganan 1200 ATK. ',
       'Les monstres de min. Niveau 5 que vous contrôlez gagnent 1200 ATK. ',
       'I mostri di Livello 5 o superiore che controlli guadagnano 1200 ATK. ',
       '自分フィールドのレベル5以上のモンスターの攻撃力は1,200アップする。',
       '자신 필드의 레벨 5 이상의 몬스터의 공격력은 1,200 올린다. ',
       'Os monstros de Nível 5 ou mais que você controla ganham 1200 de ATK. ',
       '①：自己场上的5星以上的怪兽的攻击力上升1,200。②：')
TERMS = {
 'Level 7 or higher monsters you Tribute Summon require 1 less Tribute.': LESS,
 'Level 5 or higher monsters you control gain 1,200 ATK. Level 7 or higher monsters you Tribute Summon require 1 less Tribute.':
  tuple(a + b for a, b in zip(ATK, LESS)),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
