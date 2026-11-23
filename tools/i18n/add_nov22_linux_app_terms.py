"""The Linux app (user, 2026-11-22): its download link and note in the webapp's "Download the app" window, in all 8
languages. The Android and Windows link labels in the same row had no translation yet, so the row is translated as a
whole. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Download for Android (APK)': ('Für Android herunterladen (APK)', 'Descargar para Android (APK)', 'Télécharger pour Android (APK)', 'Scarica per Android (APK)', 'Android版をダウンロード（APK）', 'Android용 다운로드 (APK)', 'Baixar para Android (APK)', '下载 Android 版（APK）'),
 'Download for Windows': ('Für Windows herunterladen', 'Descargar para Windows', 'Télécharger pour Windows', 'Scarica per Windows', 'Windows版をダウンロード', 'Windows용 다운로드', 'Baixar para Windows', '下载 Windows 版'),
 'Download for Linux': ('Für Linux herunterladen', 'Descargar para Linux', 'Télécharger pour Linux', 'Scarica per Linux', 'Linux版をダウンロード', 'Linux용 다운로드', 'Baixar para Linux', '下载 Linux 版'),
 'Linux (64-bit): extract the download and open ygo-rogue-duelist. The first start downloads the game (about 240 MB). It needs WebKitGTK 4.1, adds itself to your app menu and updates itself.': (
  'Linux (64-Bit): Entpacke den Download und öffne ygo-rogue-duelist. Beim ersten Start wird das Spiel heruntergeladen (etwa 240 MB). Es braucht WebKitGTK 4.1, fügt sich deinem App-Menü hinzu und aktualisiert sich selbst.',
  'Linux (64 bits): descomprime la descarga y abre ygo-rogue-duelist. El primer inicio descarga el juego (unos 240 MB). Necesita WebKitGTK 4.1, se añade a tu menú de aplicaciones y se actualiza solo.',
  'Linux (64 bits) : extrais le téléchargement et ouvre ygo-rogue-duelist. Le premier lancement télécharge le jeu (environ 240 Mo). Il nécessite WebKitGTK 4.1, s’ajoute à ton menu d’applications et se met à jour tout seul.',
  'Linux (64 bit): estrai il download e apri ygo-rogue-duelist. Il primo avvio scarica il gioco (circa 240 MB). Richiede WebKitGTK 4.1, si aggiunge al menu delle app e si aggiorna da solo.',
  'Linux（64ビット）：ダウンロードしたファイルを展開して ygo-rogue-duelist を開いてください。初回起動時にゲーム（約240 MB）をダウンロードします。WebKitGTK 4.1 が必要です。アプリメニューに自動で追加され、自動で更新されます。',
  'Linux(64비트): 다운로드한 파일의 압축을 풀고 ygo-rogue-duelist를 여세요. 처음 실행할 때 게임(약 240MB)을 내려받습니다. WebKitGTK 4.1이 필요하며, 앱 메뉴에 자동으로 추가되고 스스로 업데이트됩니다.',
  'Linux (64 bits): extraia o download e abra o ygo-rogue-duelist. A primeira abertura baixa o jogo (cerca de 240 MB). Precisa do WebKitGTK 4.1, se adiciona ao menu de apps e se atualiza sozinho.',
  'Linux（64 位）：解压下载的文件并打开 ygo-rogue-duelist。首次启动会下载游戏（约 240 MB）。需要 WebKitGTK 4.1，会自动添加到应用菜单并自动更新。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
