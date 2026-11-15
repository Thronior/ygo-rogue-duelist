"""Online limit messages without the "in about X h Y min" countdown (user, 2026-11-15: it was not accurate), all 8
languages. Each new text is the Nov 13 translation with its countdown clause removed. Never overwrites a translation."""
import json,re,sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/i18n'))
from add_nov13_online_status_terms import LANGS, LIMIT, UNREACH, TERMS
# The countdown clause as written in each language.
CLAUSE = {'de': r', in etwa \{0\} Std\. \{1\} Min\.', 'es': r', en unas \{0\} h \{1\} min', 'fr': r', dans environ \{0\} h \{1\} min',
          'it': r', tra circa \{0\} h \{1\} min', 'ja': r'（あと約\{0\}時間\{1\}分）', 'ko': r'\(약 \{0\}시간 \{1\}분 뒤\)',
          'pt': r', em cerca de \{0\} h \{1\} min', 'zh': r'，大约还有 \{0\} 小时 \{1\} 分钟'}
NEW = {old: old.replace(', in about {0} h {1} min', '') for old in (LIMIT, UNREACH)}

def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for old, new in NEW.items():
            text, n = re.subn(CLAUSE[lang], '', TERMS[old][i])
            assert n == 1 and '{0}' not in text, (lang, text)
            if lang == 'de': text = text.replace('wieder da Dein', 'wieder da. Dein')
            table.setdefault(new, text)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for new in NEW.values():
        if new not in known: catalog.append({'group': 'ui', 'en': new, 'kind': 'exact', 'ctx': 'online-status.js (2026-11-15)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__':
    main()
