"""Spell Sanctuary, the user's cursed relic (2026-11-19): its name, its text, the two halves the cursed relic screen shows,
and the greyed Activate reasons it adds (android/web/activation-reasons.js), all 8 languages. Never overwrites an
existing translation. Then rebuilds the language bundles (android/web/i18n/<lang>.json) through tools/safe_write.py."""
import json,runpy,sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
UP = "You can activate Spell Cards during your opponent's turn."
DOWN = 'You cannot activate Spell Cards unless they are Set first. You cannot activate a Set Spell Card the turn it was Set.'
T = {
 'Spell Sanctuary': ('Zauberheiligtum', 'Santuario de Magia', 'Sanctuaire des Magies', 'Santuario delle Magie',
  '魔法の聖域', '마법의 성역', 'Santuário de Magias', '魔法圣域'),
 UP: ('Du kannst Zauberkarten während des Spielzugs deines Gegners aktivieren.',
  'Puedes activar Cartas Mágicas durante el turno de tu adversario.',
  'Vous pouvez activer des Cartes Magie durant le tour de votre adversaire.',
  'Puoi attivare Carte Magia durante il turno del tuo avversario.',
  '自分は相手ターン中に魔法カードを発動できる。',
  '자신은 상대 턴에 마법 카드를 발동할 수 있다.',
  'Você pode ativar Cards de Magia durante o turno do seu oponente.',
  '自己可以在对方回合中发动魔法卡。'),
 DOWN: ('Du kannst Zauberkarten nur aktivieren, wenn sie zuvor gesetzt wurden. Du kannst eine gesetzte Zauberkarte nicht in dem Spielzug aktivieren, in dem sie gesetzt wurde.',
  'No puedes activar Cartas Mágicas a menos que primero estén Colocadas. No puedes activar una Carta Mágica Colocada en el turno en que fue Colocada.',
  "Vous ne pouvez pas activer de Cartes Magie à moins qu'elles n'aient d'abord été Posées. Vous ne pouvez pas activer une Carte Magie Posée le tour où elle a été Posée.",
  'Non puoi attivare Carte Magia a meno che non siano prima state Posizionate. Non puoi attivare una Carta Magia Posizionata nel turno in cui è stata Posizionata.',
  '自分は魔法カードをセットしてからでないと発動できない。セットした魔法カードはセットしたターンには発動できない。',
  '자신은 마법 카드를 먼저 세트하지 않으면 발동할 수 없다. 세트한 마법 카드는 세트한 턴에는 발동할 수 없다.',
  'Você não pode ativar Cards de Magia a menos que eles sejam Baixados primeiro. Você não pode ativar um Card de Magia Baixado no turno em que ele foi Baixado.',
  '自己的魔法卡必须先盖放才能发动。盖放的魔法卡在盖放的回合不能发动。'),
}
T[UP + ' ' + DOWN] = tuple(a + ' ' + b if lang not in ('ja', 'zh') else a + b for lang, a, b in zip(LANGS, T[UP], T[DOWN]))
# {0} is the relic's (translated) name.
PATTERNS = {
 '{0}: Spells must be Set before they can be activated.': (
  '{0}: Zauber müssen gesetzt werden, bevor sie aktiviert werden können.',
  '{0}: las Mágicas deben Colocarse antes de poder activarse.',
  '{0} : les Magies doivent être Posées avant de pouvoir être activées.',
  '{0}: le Magie devono essere Posizionate prima di poter essere attivate.',
  '{0}：魔法はセットしてからでないと発動できません。',
  '{0}: 마법은 세트한 뒤에만 발동할 수 있습니다.',
  '{0}: Magias precisam ser Baixadas antes de poderem ser ativadas.',
  '{0}：魔法卡必须先盖放才能发动。'),
 '{0}: Spells can’t be activated the turn they’re Set.': (
  '{0}: Zauber können nicht in dem Spielzug aktiviert werden, in dem sie gesetzt wurden.',
  '{0}: las Mágicas no pueden activarse en el turno en que se Colocan.',
  '{0} : les Magies ne peuvent pas être activées le tour où elles sont Posées.',
  '{0}: le Magie non possono essere attivate nel turno in cui vengono Posizionate.',
  '{0}：魔法はセットしたターンには発動できません。',
  '{0}: 마법은 세트한 턴에는 발동할 수 없습니다.',
  '{0}: Magias não podem ser ativadas no turno em que são Baixadas.',
  '{0}：魔法卡在盖放的回合不能发动。'),
}


def main():
    rows = {**T, **PATTERNS}
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in rows.items():
            assert len(values) == len(LANGS), en
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in T:
        if en not in known: catalog.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': 'Spell Sanctuary cursed relic (2026-11-19)'})
    for en in PATTERNS:
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern', 'ctx': 'activation-reasons.js'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    sys.path.insert(0, str(ROOT / 'tools/i18n'))
    from build_bundles import build
    build()
    print('ok', len(rows))


if __name__ == '__main__':
    main()
