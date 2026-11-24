"""Save failure message (Dartz deck editor report, 2026-11-24): mobile.js persist says what a refused save means. Its
text in all 8 languages. Never overwrites an existing translation. Then rebuild the bundles with build_bundles.py."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Could not save the game on this device, so your latest changes will be lost when you close it. Free up some storage space, then try again.': (
  'Das Spiel konnte auf diesem Gerät nicht gespeichert werden, deine letzten Änderungen gehen beim Schließen verloren. Gib etwas Speicherplatz frei und versuche es erneut.',
  'No se pudo guardar la partida en este dispositivo, así que tus últimos cambios se perderán al cerrarla. Libera algo de espacio de almacenamiento y vuelve a intentarlo.',
  "Impossible d'enregistrer la partie sur cet appareil : vos dernières modifications seront perdues à la fermeture. Libérez de l'espace de stockage, puis réessayez.",
  'Impossibile salvare la partita su questo dispositivo, quindi le ultime modifiche andranno perse alla chiusura. Libera un po\' di spazio di archiviazione e riprova.',
  'この端末にゲームを保存できませんでした。閉じると最新の変更は失われます。ストレージの空き容量を増やしてから、もう一度お試しください。',
  '이 기기에 게임을 저장하지 못했습니다. 닫으면 최근 변경 사항이 사라집니다. 저장 공간을 확보한 뒤 다시 시도하세요.',
  'Não foi possível salvar o jogo neste dispositivo, então suas últimas alterações serão perdidas ao fechá-lo. Libere espaço de armazenamento e tente novamente.',
  '无法在此设备上保存游戏，关闭后最近的更改将会丢失。请释放一些存储空间后重试。',
 ),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'android/web/mobile.js persist'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
