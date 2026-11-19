""""Could not start" after the automatic retry (2026-11-19): what the player should do, all 8 languages.
Python still failed after the retry's unpacked standard library (android/web/boot-diagnostics.js). The technical error
stays in Details, in English, for Discord reports. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'The game engine could not start on this device. Your saves are safe.': (
  'Die Spiel-Engine konnte auf diesem Gerät nicht starten. Deine Spielstände sind sicher.',
  'El motor del juego no pudo iniciarse en este dispositivo. Tus partidas guardadas están a salvo.',
  "Le moteur du jeu n'a pas pu démarrer sur cet appareil. Vos sauvegardes sont intactes.",
  "Il motore di gioco non è riuscito ad avviarsi su questo dispositivo. I tuoi salvataggi sono al sicuro.",
  'このデバイスではゲームエンジンを起動できませんでした。セーブデータは無事です。',
  '이 기기에서 게임 엔진을 시작하지 못했습니다. 저장 데이터는 안전합니다.',
  'O motor do jogo não conseguiu iniciar neste dispositivo. Seus saves estão seguros.',
  '游戏引擎无法在此设备上启动。你的存档是安全的。'),
 'Close the app fully and open it again. If it keeps happening, update Android System WebView and Chrome from the Play Store, then press Copy details and send them to us on Discord.': (
  'Schließe die App vollständig und öffne sie erneut. Wenn es weiterhin passiert, aktualisiere Android System WebView und Chrome im Play Store, tippe dann auf „Details kopieren“ und schick sie uns auf Discord.',
  'Cierra la app por completo y ábrela de nuevo. Si sigue pasando, actualiza Android System WebView y Chrome desde Play Store; después pulsa «Copiar detalles» y envíanoslos por Discord.',
  "Fermez complètement l'application et rouvrez-la. Si le problème continue, mettez à jour Android System WebView et Chrome depuis le Play Store, puis appuyez sur « Copier les détails » et envoyez-les-nous sur Discord.",
  "Chiudi completamente l'app e riaprila. Se continua a succedere, aggiorna Android System WebView e Chrome dal Play Store, poi premi «Copia dettagli» e inviaceli su Discord.",
  'アプリを完全に終了してから、もう一度開いてください。それでも続く場合は、Play ストアで Android System WebView と Chrome を更新し、「詳細をコピー」を押して Discord で送ってください。',
  '앱을 완전히 종료한 뒤 다시 여세요. 계속 발생하면 Play 스토어에서 Android System WebView와 Chrome을 업데이트한 다음 "세부 정보 복사"를 눌러 Discord로 보내 주세요.',
  'Feche o app por completo e abra-o de novo. Se continuar acontecendo, atualize o Android System WebView e o Chrome pela Play Store, depois toque em "Copiar detalhes" e envie para nós no Discord.',
  '请完全关闭应用后重新打开。如果问题仍然存在，请在 Play 商店更新 Android System WebView 和 Chrome，然后点击“复制详细信息”并在 Discord 上发给我们。'),
 'Close this tab and open the game again. If it keeps happening, update your browser or try another one, then press Copy details and send them to us on Discord.': (
  'Schließe diesen Tab und öffne das Spiel erneut. Wenn es weiterhin passiert, aktualisiere deinen Browser oder probiere einen anderen, klicke dann auf „Details kopieren“ und schick sie uns auf Discord.',
  'Cierra esta pestaña y abre el juego de nuevo. Si sigue pasando, actualiza tu navegador o prueba otro; después pulsa «Copiar detalles» y envíanoslos por Discord.',
  "Fermez cet onglet et rouvrez le jeu. Si le problème continue, mettez à jour votre navigateur ou essayez-en un autre, puis appuyez sur « Copier les détails » et envoyez-les-nous sur Discord.",
  "Chiudi questa scheda e riapri il gioco. Se continua a succedere, aggiorna il browser o provane un altro, poi premi «Copia dettagli» e inviaceli su Discord.",
  'このタブを閉じて、ゲームをもう一度開いてください。それでも続く場合は、ブラウザを更新するか別のブラウザを試し、「詳細をコピー」を押して Discord で送ってください。',
  '이 탭을 닫고 게임을 다시 여세요. 계속 발생하면 브라우저를 업데이트하거나 다른 브라우저를 사용해 본 다음 "세부 정보 복사"를 눌러 Discord로 보내 주세요.',
  'Feche esta aba e abra o jogo de novo. Se continuar acontecendo, atualize seu navegador ou tente outro, depois clique em "Copiar detalhes" e envie para nós no Discord.',
  '请关闭此标签页并重新打开游戏。如果问题仍然存在，请更新浏览器或换一个浏览器，然后点击“复制详细信息”并在 Discord 上发给我们。'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': '"Could not start" screen after the automatic retry (2026-11-19)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()
