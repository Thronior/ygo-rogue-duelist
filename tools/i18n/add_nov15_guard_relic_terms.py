"""Protect the Weak / Sacrifice the Weak say which monster they guard (Discord, 2026-11-15: "strongest" was unclear;
it is the face-up monster with the highest ATK, and "weakest" the one with the lowest). All 8 languages. Updates the
catalog entries of both relic effects. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
STRONG = 'While you control 2 or more monsters, your face-up monster with the highest ATK cannot be attacked.'
WEAK = 'While you control 2 or more monsters, your face-up monster with the lowest ATK cannot be attacked.'
TERMS = {
 STRONG: ('Solange du 2 oder mehr Monster kontrollierst, kann dein offenes Monster mit der höchsten ATK nicht angegriffen werden.',
  'Mientras controles 2 o más monstruos, tu monstruo boca arriba con más ATK no puede ser atacado.',
  "Tant que vous contrôlez 2 monstres ou plus, votre monstre face recto avec le plus d'ATK ne peut pas être attaqué.",
  "Mentre controlli 2 o più mostri, il tuo mostro scoperto con l'ATK più alto non può essere attaccato.",
  '自分フィールドにモンスターが2体以上存在する限り、自分の表側表示モンスターの内、攻撃力が最も高いモンスターは攻撃対象にされない。',
  '자신 필드에 몬스터가 2장 이상 존재하는 경우, 자신의 앞면 표시 몬스터 중 공격력이 가장 높은 몬스터를 공격할 수 없다.',
  'Enquanto você controlar 2 ou mais monstros, seu monstro com a face para cima com o maior ATK não pode ser atacado.',
  '自己场上有2只以上的怪兽存在的场合，对方不能选择自己场上表侧表示的攻击力最高的怪兽作为攻击对象。'),
 WEAK: ('Solange du 2 oder mehr Monster kontrollierst, kann dein offenes Monster mit der niedrigsten ATK nicht angegriffen werden.',
  'Mientras controles 2 o más monstruos, tu monstruo boca arriba con menos ATK no puede ser atacado.',
  "Tant que vous contrôlez 2 monstres ou plus, votre monstre face recto avec le moins d'ATK ne peut pas être attaqué.",
  "Mentre controlli 2 o più mostri, il tuo mostro scoperto con l'ATK più basso non può essere attaccato.",
  '自分フィールドにモンスターが2体以上存在する限り、自分の表側表示モンスターの内、攻撃力が最も低いモンスターは攻撃対象にされない。',
  '자신 필드에 몬스터가 2장 이상 존재하는 경우, 자신의 앞면 표시 몬스터 중 공격력이 가장 낮은 몬스터를 공격할 수 없다.',
  'Enquanto você controlar 2 ou mais monstros, seu monstro com a face para cima com o menor ATK não pode ser atacado.',
  '自己场上有2只以上的怪兽存在的场合，对方不能选择自己场上表侧表示的攻击力最低的怪兽作为攻击对象。'),
}
CTX = {'relic effect (sacrifice_the_weak)': STRONG, 'relic effect (protect_the_weak)': WEAK}

def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    for row in catalog:
        if row.get('ctx') in CTX: row['en'] = CTX[row['ctx']]
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__':
    main()
