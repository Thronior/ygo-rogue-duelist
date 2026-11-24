"""Desktop app names and start-up advice (2026-11-24): the Linux and Windows apps were reported, labelled in cloud saves
and advised as "Android", because they provide the same ShadowNative bridge. All 8 languages; never overwrites an
existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Linux app': ('Linux-App', 'App de Linux', 'Appli Linux', 'App per Linux', 'Linux版アプリ', 'Linux 앱', 'App para Linux', 'Linux 应用'),
 'Windows app': ('Windows-App', 'App de Windows', 'Appli Windows', 'App per Windows', 'Windows版アプリ', 'Windows 앱', 'App para Windows', 'Windows 应用'),
 'Close the app and open it again. If it keeps happening, update your system (WebKitGTK), then press Copy details and send them to us on Discord.': (
  'Schließe die App und öffne sie erneut. Wenn es weiter passiert, aktualisiere dein System (WebKitGTK), drücke dann auf „Details kopieren“ und schick sie uns auf Discord.',
  'Cierra la app y vuelve a abrirla. Si sigue pasando, actualiza tu sistema (WebKitGTK), luego pulsa Copiar detalles y envíanoslos por Discord.',
  "Fermez l'appli et rouvrez-la. Si le problème persiste, mettez votre système à jour (WebKitGTK), puis appuyez sur Copier les détails et envoyez-les-nous sur Discord.",
  "Chiudi l'app e riaprila. Se succede ancora, aggiorna il sistema (WebKitGTK), poi premi Copia dettagli e mandaceli su Discord.",
  'アプリを閉じて、もう一度開いてください。それでも起きる場合は、システム（WebKitGTK）を更新してから「詳細をコピー」を押し、Discordで送ってください。',
  '앱을 닫고 다시 여세요. 계속 발생하면 시스템(WebKitGTK)을 업데이트한 뒤 세부 정보 복사를 눌러 Discord로 보내 주세요.',
  'Feche o app e abra de novo. Se continuar acontecendo, atualize o sistema (WebKitGTK), depois toque em Copiar detalhes e envie para nós no Discord.',
  '关闭应用后重新打开。如果仍然发生，请更新系统（WebKitGTK），然后点击“复制详情”并在 Discord 上发给我们。'),
 'Close the app and open it again. If it keeps happening, update Windows and Microsoft Edge WebView2, then press Copy details and send them to us on Discord.': (
  'Schließe die App und öffne sie erneut. Wenn es weiter passiert, aktualisiere Windows und Microsoft Edge WebView2, drücke dann auf „Details kopieren“ und schick sie uns auf Discord.',
  'Cierra la app y vuelve a abrirla. Si sigue pasando, actualiza Windows y Microsoft Edge WebView2, luego pulsa Copiar detalles y envíanoslos por Discord.',
  "Fermez l'appli et rouvrez-la. Si le problème persiste, mettez à jour Windows et Microsoft Edge WebView2, puis appuyez sur Copier les détails et envoyez-les-nous sur Discord.",
  "Chiudi l'app e riaprila. Se succede ancora, aggiorna Windows e Microsoft Edge WebView2, poi premi Copia dettagli e mandaceli su Discord.",
  'アプリを閉じて、もう一度開いてください。それでも起きる場合は、WindowsとMicrosoft Edge WebView2を更新してから「詳細をコピー」を押し、Discordで送ってください。',
  '앱을 닫고 다시 여세요. 계속 발생하면 Windows와 Microsoft Edge WebView2를 업데이트한 뒤 세부 정보 복사를 눌러 Discord로 보내 주세요.',
  'Feche o app e abra de novo. Se continuar acontecendo, atualize o Windows e o Microsoft Edge WebView2, depois toque em Copiar detalhes e envie para nós no Discord.',
  '关闭应用后重新打开。如果仍然发生，请更新 Windows 和 Microsoft Edge WebView2，然后点击“复制详情”并在 Discord 上发给我们。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
