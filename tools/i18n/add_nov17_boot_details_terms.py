""""Could not start" screen: Details, Copy details and the automatic retry (2026-11-17), all 8 languages.
Never overwrites an existing translation. The details text itself stays English: players paste it into Discord."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Details': ('Details', 'Detalles', 'Détails', 'Dettagli', '詳細', '세부 정보', 'Detalhes', '详细信息'),
 'Copy details': ('Details kopieren', 'Copiar detalles', 'Copier les détails', 'Copia dettagli',
  '詳細をコピー', '세부 정보 복사', 'Copiar detalhes', '复制详细信息'),
 'Copied': ('Kopiert', 'Copiado', 'Copié', 'Copiato', 'コピーしました', '복사됨', 'Copiado', '已复制'),
 'Copy failed': ('Kopieren fehlgeschlagen', 'No se pudo copiar', 'Échec de la copie', 'Copia non riuscita',
  'コピーできませんでした', '복사 실패', 'Falha ao copiar', '复制失败'),
 'Retrying once…': ('Neuer Versuch…', 'Reintentando una vez…', 'Nouvelle tentative…', 'Nuovo tentativo…',
  'もう一度試しています…', '한 번 더 시도하는 중…', 'Tentando novamente…', '正在重试一次…'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': '"Could not start" screen diagnostics (2026-11-17)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
