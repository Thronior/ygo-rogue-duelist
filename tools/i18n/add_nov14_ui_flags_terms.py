"""UI fixes from Discord and behaviour flags (2026-11-14): the zone choice line, the Trapbound Idol LP-cost note in a
card's action menu, and the Windows download note in the web "Download the app" window. All 8 languages.
Existing translations are never overwritten."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from safe_write import write_bytes

LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Choose a Monster Zone.': ['Wähle eine Monsterzone.', 'Elige una Zona de Monstruos.', 'Choisissez une Zone Monstre.', 'Scegli una Zona Mostri.', 'モンスターゾーンを選んでください。', '몬스터 존을 선택하세요.', 'Escolha uma Zona de Monstros.', '请选择一个怪兽区域。'],
 'Choose a Spell & Trap Zone.': ['Wähle eine Zauber- & Fallenzone.', 'Elige una Zona de Magia y Trampas.', 'Choisissez une Zone Magie & Piège.', 'Scegli una Zona Magie & Trappole.', '魔法＆罠ゾーンを選んでください。', '마법 & 함정 존을 선택하세요.', 'Escolha uma Zona de Magias & Armadilhas.', '请选择一个魔法与陷阱区域。'],
 'Choose a zone.': ['Wähle eine Zone.', 'Elige una zona.', 'Choisissez une zone.', 'Scegli una zona.', 'ゾーンを選んでください。', '존을 선택하세요.', 'Escolha uma zona.', '请选择一个区域。'],
 'The Windows download is large (about 240 MB) and appears in your browser’s downloads list. If the browser says the file isn’t commonly downloaded, choose Keep. If Windows warns when you open it, choose More info, then Run anyway.': [
  'Der Windows-Download ist groß (etwa 240 MB) und erscheint in der Downloadliste deines Browsers. Meldet der Browser, dass die Datei selten heruntergeladen wird, wähle „Behalten“. Warnt Windows beim Öffnen, wähle „Weitere Informationen“ und dann „Trotzdem ausführen“.',
  'La descarga para Windows es grande (unos 240 MB) y aparece en la lista de descargas del navegador. Si el navegador dice que el archivo no se descarga con frecuencia, elige «Conservar». Si Windows muestra un aviso al abrirlo, elige «Más información» y luego «Ejecutar de todas formas».',
  'Le téléchargement Windows est volumineux (environ 240 Mo) et apparaît dans la liste des téléchargements de votre navigateur. Si le navigateur indique que le fichier est rarement téléchargé, choisissez « Conserver ». Si Windows affiche un avertissement à l’ouverture, choisissez « Informations complémentaires », puis « Exécuter quand même ».',
  'Il download per Windows è grande (circa 240 MB) e compare nell’elenco dei download del browser. Se il browser dice che il file non viene scaricato spesso, scegli “Mantieni”. Se Windows mostra un avviso all’apertura, scegli “Ulteriori informazioni”, poi “Esegui comunque”.',
  'Windows 版のダウンロードは大きく（約 240 MB）、ブラウザーのダウンロード一覧に表示されます。ブラウザーが「一般的にダウンロードされていない」と表示した場合は「保存」を選んでください。開くときに Windows が警告した場合は「詳細情報」、次に「実行」を選んでください。',
  'Windows 다운로드는 용량이 크며(약 240MB) 브라우저의 다운로드 목록에 표시됩니다. 브라우저가 자주 다운로드되지 않는 파일이라고 하면 "유지"를 선택하세요. 파일을 열 때 Windows가 경고하면 "추가 정보"를 누른 뒤 "실행"을 선택하세요.',
  'O download para Windows é grande (cerca de 240 MB) e aparece na lista de downloads do navegador. Se o navegador disser que o arquivo não é baixado com frequência, escolha "Manter". Se o Windows avisar ao abrir, escolha "Mais informações" e depois "Executar assim mesmo".',
  'Windows 版下载文件较大（约 240 MB），会显示在浏览器的下载列表中。如果浏览器提示该文件不常被下载，请选择“保留”。如果打开时 Windows 发出警告，请选择“更多信息”，然后选择“仍要运行”。'],
}
PATTERNS = {
 'Choose {0} zones.': ['Wähle {0} Zonen.', 'Elige {0} zonas.', 'Choisissez {0} zones.', 'Scegli {0} zone.', 'ゾーンを{0}つ選んでください。', '존을 {0}개 선택하세요.', 'Escolha {0} zonas.', '请选择 {0} 个区域。'],
 '{0}: activating a Spell costs 300 LP, and you have {1} LP.': [
  '{0}: Einen Zauber zu aktivieren kostet 300 LP, und du hast {1} LP.',
  '{0}: activar una Mágica cuesta 300 LP y tienes {1} LP.',
  '{0} : activer une Magie coûte 300 LP, et vous avez {1} LP.',
  '{0}: attivare una Magia costa 300 LP e hai {1} LP.',
  '{0}：魔法の発動には 300 LP が必要ですが、LP は {1} です。',
  '{0}: 마법을 발동하려면 300 LP가 필요하지만 LP가 {1}입니다.',
  '{0}: ativar uma Magia custa 300 PV, e você tem {1} PV.',
  '{0}：发动魔法卡需要支付 300 LP，而你只有 {1} LP。'],
}

def dump(path, data):
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=1) + '\n').encode('utf8'))

def main():
    rows = {**TERMS, **PATTERNS}
    for n, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        added = 0
        for key, text in rows.items():
            if key not in table: table[key] = text[n]; added += 1
        if added: dump(path, table)
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    ctx = lambda k: 'tools/pwa/pwa.js' if k.startswith('The Windows download') else 'mobile.js'
    new = [{'group': 'ui', 'en': k, 'kind': 'pattern' if k in PATTERNS else 'exact', 'ctx': ctx(k)} for k in rows if k not in known]
    if new: dump(path, catalog + new)

if __name__ == '__main__':
    main()
