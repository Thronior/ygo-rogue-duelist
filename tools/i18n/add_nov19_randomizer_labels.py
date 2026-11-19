"""Randomized card button labels from randomizer.py ACTS (2026-11-19 release). Never overwrites an existing translation."""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Target': ('Anvisieren', 'Seleccionar objetivo', 'Cibler', 'Scegli bersaglio', '対象を取る', '대상 지정', 'Escolher alvo', '取对象'),
 'Change stats': ('Werte ändern', 'Cambiar valores', 'Modifier les stats', 'Cambia valori', 'ステータス変更', '스탯 변경', 'Alterar valores', '改变数值'),
}

def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))

if __name__ == '__main__':
    main()
