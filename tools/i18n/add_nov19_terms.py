"""Discord and flag fixes of 2026-11-19, in all 8 languages. Never overwrites an existing translation.
The deck-order prompt (Big Eye, behaviour flag 2026-11-19) now says to press ✓, the confirm button the player missed.
The old Windows launcher's reinstall notice (user, 2026-11-19)."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Top card first. Use the arrows to change the order, then press ✓.': (
  'Oberste Karte zuerst. Ändere die Reihenfolge mit den Pfeilen und drücke dann ✓.',
  'La carta superior primero. Usa las flechas para cambiar el orden y luego pulsa ✓.',
  "Carte du dessus en premier. Utilisez les flèches pour changer l'ordre, puis appuyez sur ✓.",
  "Prima la carta in cima. Usa le frecce per cambiare l'ordine, poi premi ✓.",
  '一番上のカードから順に並んでいます。矢印で順番を変更し、✓を押してください。',
  '맨 위 카드부터. 화살표로 순서를 바꾼 뒤 ✓를 누르세요.',
  'Card do topo primeiro. Use as setas para mudar a ordem e depois toque em ✓.',
  '最上面的卡排在最前。使用箭头更改顺序，然后按✓。'),
 # Old Windows launcher reinstall notice on the main menu (user, 2026-11-19).
 'New Windows app available': ('Neue Windows-App verfügbar', 'Nueva app de Windows disponible', 'Nouvelle application Windows disponible', 'Nuova app per Windows disponibile', '新しいWindowsアプリがあります', '새 Windows 앱이 있습니다', 'Novo app para Windows disponível', '有新的Windows应用'),
 'Download the installer again and run it. Your saves are kept, and from then on the app updates itself.': (
  'Lade das Installationsprogramm erneut herunter und führe es aus. Deine Spielstände bleiben erhalten, und danach aktualisiert sich die App selbst.',
  'Descarga de nuevo el instalador y ejecútalo. Tus partidas guardadas se conservan y, a partir de entonces, la app se actualiza sola.',
  "Téléchargez à nouveau le programme d'installation et lancez-le. Vos sauvegardes sont conservées, et ensuite l'application se met à jour toute seule.",
  "Scarica di nuovo il programma di installazione ed eseguilo. I tuoi salvataggi restano, e da quel momento l'app si aggiorna da sola.",
  'インストーラーをもう一度ダウンロードして実行してください。セーブデータはそのまま残り、以後アプリは自動で更新されます。',
  '설치 프로그램을 다시 내려받아 실행하세요. 저장 데이터는 그대로 유지되며, 이후로는 앱이 자동으로 업데이트됩니다.',
  'Baixe o instalador de novo e execute-o. Seus saves são mantidos e, a partir daí, o app se atualiza sozinho.',
  '请重新下载并运行安装程序。存档会保留，之后应用会自动更新。'),
 'Copy download link': ('Download-Link kopieren', 'Copiar enlace de descarga', 'Copier le lien de téléchargement', 'Copia link di download', 'ダウンロードリンクをコピー', '다운로드 링크 복사', 'Copiar link de download', '复制下载链接'),
 "Link copied. Paste it into your browser's address bar.": (
  'Link kopiert. Füge ihn in die Adressleiste deines Browsers ein.',
  'Enlace copiado. Pégalo en la barra de direcciones de tu navegador.',
  "Lien copié. Collez-le dans la barre d'adresse de votre navigateur.",
  'Link copiato. Incollalo nella barra degli indirizzi del browser.',
  'リンクをコピーしました。ブラウザのアドレスバーに貼り付けてください。',
  '링크를 복사했습니다. 브라우저 주소창에 붙여 넣으세요.',
  'Link copiado. Cole-o na barra de endereço do seu navegador.',
  '链接已复制。请粘贴到浏览器的地址栏。'),
 'Press Ctrl+C to copy the selected link.': (
  'Drücke Strg+C, um den markierten Link zu kopieren.',
  'Pulsa Ctrl+C para copiar el enlace seleccionado.',
  'Appuyez sur Ctrl+C pour copier le lien sélectionné.',
  'Premi Ctrl+C per copiare il link selezionato.',
  'Ctrl+Cで選択したリンクをコピーできます。',
  'Ctrl+C를 눌러 선택한 링크를 복사하세요.',
  'Pressione Ctrl+C para copiar o link selecionado.',
  '按Ctrl+C复制选中的链接。'),
 # A player's opponent name: kept whole, or the "Level {0}" pattern turns it into "Stufe 5 Survivor" / "レベル5 Survivor".
 'Level 5 Survivor': ('Level 5 Survivor',)*8,
 'Later': ('Später', 'Más tarde', 'Plus tard', 'Più tardi', 'あとで', '나중에', 'Mais tarde', '稍后'),
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
        if en not in known: catalog.append({'group': 'duel', 'en': en, 'kind': 'exact', 'ctx': 'deck order prompt, 2026-11-19'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
