"""Link devices codes last 24 hours instead of 10 minutes (user, 2026-11-23, after Sir Renity on Discord): the new line in
all 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Expires in 24 hours. Each code can be used once.': (
  'Läuft in 24 Stunden ab. Jeder Code kann nur einmal verwendet werden.',
  'Caduca en 24 horas. Cada código solo se puede usar una vez.',
  "Expire dans 24 heures. Chaque code ne peut être utilisé qu'une fois.",
  'Scade tra 24 ore. Ogni codice può essere usato una volta.',
  '有効期限は24時間です。各コードは1回だけ使えます。',
  '24시간 후 만료됩니다. 코드는 한 번만 사용할 수 있습니다.',
  'Expira em 24 horas. Cada código pode ser usado uma vez.',
  '24小时后失效。每个代码只能使用一次。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
