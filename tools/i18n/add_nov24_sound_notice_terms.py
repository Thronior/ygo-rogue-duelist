"""The sound notice (2026-11-24): shown once when this device could not decode the sound effects, which used to stop
the game from starting (Linux app, WebKitGTK without GStreamer's plugins). All 8 languages; never overwrites an
existing translation. Package names stay in English."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Sound effects are off': (
  'Soundeffekte sind aus',
  'Los efectos de sonido están desactivados',
  'Les effets sonores sont désactivés',
  'Gli effetti sonori sono disattivati',
  '効果音がオフになっています',
  '효과음이 꺼져 있습니다',
  'Os efeitos sonoros estão desligados',
  '音效已关闭'),
 "This device could not play the game's sound effects, so the game runs without them.": (
  'Dieses Gerät konnte die Soundeffekte des Spiels nicht abspielen, daher läuft das Spiel ohne sie.',
  'Este dispositivo no pudo reproducir los efectos de sonido del juego, así que el juego funciona sin ellos.',
  "Cet appareil n'a pas pu lire les effets sonores du jeu : le jeu fonctionne donc sans eux.",
  'Questo dispositivo non è riuscito a riprodurre gli effetti sonori del gioco, quindi il gioco funziona senza.',
  'この端末ではゲームの効果音を再生できなかったため、効果音なしで動作します。',
  '이 기기에서 게임의 효과음을 재생할 수 없어 효과음 없이 실행됩니다.',
  'Este dispositivo não conseguiu tocar os efeitos sonoros do jogo, então o jogo funciona sem eles.',
  '此设备无法播放游戏的音效，因此游戏将在没有音效的情况下运行。'),
 'The Linux app plays sound through GStreamer. Install its "good" plugins and libav with your package manager, then restart the game:': (
  'Die Linux-App spielt Ton über GStreamer ab. Installiere dessen „good“-Plugins und libav mit deiner Paketverwaltung und starte das Spiel dann neu:',
  'La app de Linux reproduce el sonido con GStreamer. Instala sus plugins "good" y libav con tu gestor de paquetes y reinicia el juego:',
  "L'appli Linux joue le son via GStreamer. Installez ses plugins « good » et libav avec votre gestionnaire de paquets, puis relancez le jeu :",
  "L'app per Linux riproduce l'audio tramite GStreamer. Installa i suoi plugin \"good\" e libav con il gestore di pacchetti, poi riavvia il gioco:",
  'Linux版アプリはGStreamerで音を再生します。パッケージマネージャーでGStreamerの「good」プラグインとlibavをインストールし、ゲームを再起動してください：',
  'Linux 앱은 GStreamer로 소리를 재생합니다. 패키지 관리자로 GStreamer의 "good" 플러그인과 libav를 설치한 뒤 게임을 다시 시작하세요:',
  'O app para Linux toca o som pelo GStreamer. Instale os plugins "good" e o libav com seu gerenciador de pacotes e reinicie o jogo:',
  'Linux 应用通过 GStreamer 播放声音。请用包管理器安装它的 "good" 插件和 libav，然后重启游戏：'),
 'Music is off': ('Musik ist aus', 'La música está desactivada', 'La musique est désactivée', 'La musica è disattivata', 'BGMがオフになっています', '음악이 꺼져 있습니다', 'A música está desligada', '音乐已关闭'),
 "This device cannot play the game's music, so the game runs without it.": (
  'Dieses Gerät kann die Musik des Spiels nicht abspielen, daher läuft das Spiel ohne sie.',
  'Este dispositivo no puede reproducir la música del juego, así que el juego funciona sin ella.',
  "Cet appareil ne peut pas lire la musique du jeu : le jeu fonctionne donc sans elle.",
  'Questo dispositivo non riesce a riprodurre la musica del gioco, quindi il gioco funziona senza.',
  'この端末ではゲームのBGMを再生できないため、BGMなしで動作します。',
  '이 기기에서 게임 음악을 재생할 수 없어 음악 없이 실행됩니다.',
  'Este dispositivo não consegue tocar a música do jogo, então o jogo funciona sem ela.',
  '此设备无法播放游戏音乐，因此游戏将在没有音乐的情况下运行。'),
 'Updating your browser, or trying another one, usually fixes this.': (
  'Meist hilft es, den Browser zu aktualisieren oder einen anderen zu verwenden.',
  'Actualizar el navegador o probar otro suele solucionarlo.',
  'Mettre à jour votre navigateur, ou en essayer un autre, règle généralement le problème.',
  'Di solito si risolve aggiornando il browser o provandone un altro.',
  'ブラウザを更新するか、別のブラウザを試すと、たいてい解決します。',
  '브라우저를 업데이트하거나 다른 브라우저를 사용하면 대부분 해결됩니다.',
  'Atualizar o navegador, ou testar outro, normalmente resolve.',
  '更新浏览器或换一个浏览器，通常可以解决此问题。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
