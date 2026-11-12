"""Adds the texts of 2026-11-12 to every language: Champion Trophy now grants a second cursed relic pick after each
boss fight (cursed_relics.choose/skip), and the cursed relic screen's second/third-pick headings, hint and skip buttons (each trophy copy adds a pick).

Existing translations are never overwritten. Run once; re-running changes nothing.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
TERMS = {
    'You can select a second cursed relic after each boss fight.': (
        'Nach jedem Boss-Kampf kannst du ein zweites Verfluchtes Relikt wählen.',
        'Después de cada combate contra un jefe, puedes elegir una segunda reliquia maldita.',
        'Après chaque combat contre un boss, vous pouvez choisir une deuxième relique maudite.',
        'Dopo ogni scontro contro un Boss, puoi scegliere una seconda reliquia maledetta.',
        'Após cada luta contra chefe, você pode escolher uma segunda relíquia amaldiçoada.',
        'ボス戦の後、2つ目の呪いのレリックを選択できる。',
        '보스전 후에, 2번째 저주받은 유물을 고를 수 있다.',
        '每次首领战后，可以选择第2个诅咒遗物。'),
    'Choose a second cursed relic': (
        'Wähle ein zweites Verfluchtes Relikt',
        'Elige una segunda reliquia maldita',
        'Choisir une deuxième relique maudite',
        'Scegli una seconda reliquia maledetta',
        'Escolha uma segunda relíquia amaldiçoada',
        '2つ目の呪いのレリックを選択',
        '2번째 저주받은 유물 선택',
        '选择第2个诅咒遗物'),
    'Champion Trophy: choose 1 more, or skip it.': (
        'Champion-Trophäe: Wähle 1 weiteres oder überspringe es.',
        'Trofeo de Campeón: elige 1 más o sáltalo.',
        "Trophée du Champion : choisissez-en 1 de plus, ou passez.",
        'Trofeo del Campione: scegline 1 in più, oppure salta.',
        'Troféu do Campeão: escolha mais 1 ou pule.',
        'チャンピオントロフィー：もう1つ選ぶか、スキップできます。',
        '챔피언 트로피: 1개를 더 고르거나 건너뛰세요.',
        '冠军奖杯：再选择1个，或跳过。'),
    'Skip second relic': (
        'Zweites Relikt überspringen',
        'Saltar la segunda reliquia',
        'Passer la deuxième relique',
        'Salta la seconda reliquia',
        'Pular a segunda relíquia',
        '2つ目のレリックをスキップ',
        '2번째 유물 건너뛰기',
        '跳过第2个遗物'),
    'Choose a third cursed relic': (
        'Wähle ein drittes Verfluchtes Relikt',
        'Elige una tercera reliquia maldita',
        'Choisir une troisième relique maudite',
        'Scegli una terza reliquia maledetta',
        'Escolha uma terceira relíquia amaldiçoada',
        '3つ目の呪いのレリックを選択',
        '3번째 저주받은 유물 선택',
        '选择第3个诅咒遗物'),
    'Skip third relic': (
        'Drittes Relikt überspringen',
        'Saltar la tercera reliquia',
        'Passer la troisième relique',
        'Salta la terza reliquia',
        'Pular a terceira relíquia',
        '3つ目のレリックをスキップ',
        '3번째 유물 건너뛰기',
        '跳过第3个遗物'),
}
CATALOG = (
    ('relic', 'You can select a second cursed relic after each boss fight.', 'relic effect (champion_trophy)'),
    ('ui', 'Choose a second cursed relic', 'mobile.js, tag-ui.js'),
    ('ui', 'Champion Trophy: choose 1 more, or skip it.', 'mobile.js, tag-ui.js'),
    ('ui', 'Skip second relic', 'mobile.js, tag-ui.js'),
    ('ui', 'Choose a third cursed relic', 'mobile.js, tag-ui.js'),
    ('ui', 'Skip third relic', 'mobile.js, tag-ui.js'),
)


def save(path, data):
    # Keep each file's own line endings so the diff shows only the new texts.
    crlf = b'\r\n' in path.read_bytes()[:4096]
    text = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
    path.write_bytes((text.replace('\n', '\r\n') if crlf else text).encode('utf8'))


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        data = json.loads(path.read_text(encoding='utf8'))
        added = 0
        for en, values in TERMS.items():
            if en not in data:
                data[en] = values[i]
                added += 1
        save(path, data)
        print(lang, 'added', added)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf8'))
    rows = catalog if isinstance(catalog, list) else catalog['strings']
    # The old coin text is no longer a Champion Trophy effect.
    for row in rows:
        if row.get('ctx') == 'relic effect (champion_trophy)':
            row['en'] = CATALOG[0][1]
    known = {row.get('en') for row in rows}
    for group, en, ctx in CATALOG:
        if en not in known:
            rows.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': ctx})
    save(path, catalog)


if __name__ == '__main__':
    main()
