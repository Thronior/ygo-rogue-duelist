"""Online failures that never reach the servers while GitHub answers (Discord, 2026-11-23: Windows app player whose cloud
save and Tag never connected). android/web/online-status.js blockedMessage(): one text for the Windows app, which
connects through msedgewebview2.exe, and one for every other device. All 8 languages (ui table, keyed by English);
the closing sentence reuses each language's existing "Your progress on this device is safe."."""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()

DESKTOP = ("Your internet works, but this PC can't reach the game's online servers. A firewall, antivirus web protection, "
           "VPN or DNS filter is probably blocking them. The Windows app connects through Microsoft Edge WebView2 "
           "(msedgewebview2.exe), so allow that program too, not only the game. Your progress on this device is safe.")
DEVICE = ("Your internet works, but this device can't reach the game's online servers. A firewall, antivirus web "
          "protection, VPN or DNS filter is probably blocking them. Your progress on this device is safe.")

T = {
 'de': ("Dein Internet funktioniert, aber dieser PC erreicht die Online-Server des Spiels nicht. Wahrscheinlich blockiert sie eine Firewall, der Web-Schutz eines Virenscanners, ein VPN oder ein DNS-Filter. Die Windows-App verbindet sich über Microsoft Edge WebView2 (msedgewebview2.exe). Gib also auch dieses Programm frei, nicht nur das Spiel. Dein Fortschritt auf diesem Gerät ist sicher.",
        "Dein Internet funktioniert, aber dieses Gerät erreicht die Online-Server des Spiels nicht. Wahrscheinlich blockiert sie eine Firewall, der Web-Schutz eines Virenscanners, ein VPN oder ein DNS-Filter. Dein Fortschritt auf diesem Gerät ist sicher."),
 'es': ("Tu conexión a internet funciona, pero este PC no puede conectar con los servidores en línea del juego. Probablemente los bloquea un firewall, la protección web de un antivirus, una VPN o un filtro DNS. La app de Windows se conecta a través de Microsoft Edge WebView2 (msedgewebview2.exe), así que permite también ese programa, no solo el juego. Tu progreso en este dispositivo está a salvo.",
        "Tu conexión a internet funciona, pero este dispositivo no puede conectar con los servidores en línea del juego. Probablemente los bloquea un firewall, la protección web de un antivirus, una VPN o un filtro DNS. Tu progreso en este dispositivo está a salvo."),
 'fr': ("Votre connexion internet fonctionne, mais ce PC ne parvient pas à joindre les serveurs en ligne du jeu. Un pare-feu, la protection web d'un antivirus, un VPN ou un filtre DNS les bloque probablement. L'application Windows se connecte via Microsoft Edge WebView2 (msedgewebview2.exe) : autorisez aussi ce programme, pas seulement le jeu. Votre progression sur cet appareil est en sécurité.",
        "Votre connexion internet fonctionne, mais cet appareil ne parvient pas à joindre les serveurs en ligne du jeu. Un pare-feu, la protection web d'un antivirus, un VPN ou un filtre DNS les bloque probablement. Votre progression sur cet appareil est en sécurité."),
 'it': ("La tua connessione a internet funziona, ma questo PC non riesce a raggiungere i server online del gioco. Probabilmente li blocca un firewall, la protezione web di un antivirus, una VPN o un filtro DNS. L'app per Windows si connette tramite Microsoft Edge WebView2 (msedgewebview2.exe), quindi consenti anche quel programma, non solo il gioco. I tuoi progressi su questo dispositivo sono al sicuro.",
        "La tua connessione a internet funziona, ma questo dispositivo non riesce a raggiungere i server online del gioco. Probabilmente li blocca un firewall, la protezione web di un antivirus, una VPN o un filtro DNS. I tuoi progressi su questo dispositivo sono al sicuro."),
 'ja': ("インターネットには接続されていますが、このPCからゲームのオンラインサーバーに接続できません。ファイアウォール、ウイルス対策ソフトのWeb保護、VPN、またはDNSフィルターがブロックしている可能性があります。Windowsアプリは Microsoft Edge WebView2（msedgewebview2.exe）を通じて接続するため、ゲームだけでなくこのプログラムも許可してください。この端末の進行状況は安全です。",
        "インターネットには接続されていますが、この端末からゲームのオンラインサーバーに接続できません。ファイアウォール、ウイルス対策ソフトのWeb保護、VPN、またはDNSフィルターがブロックしている可能性があります。この端末の進行状況は安全です。"),
 'ko': ("인터넷은 연결되어 있지만 이 PC에서 게임의 온라인 서버에 연결할 수 없습니다. 방화벽, 백신의 웹 보호, VPN 또는 DNS 필터가 차단하고 있을 가능성이 높습니다. Windows 앱은 Microsoft Edge WebView2(msedgewebview2.exe)를 통해 연결되므로 게임뿐 아니라 이 프로그램도 허용해 주세요. 이 기기의 진행 상황은 안전합니다.",
        "인터넷은 연결되어 있지만 이 기기에서 게임의 온라인 서버에 연결할 수 없습니다. 방화벽, 백신의 웹 보호, VPN 또는 DNS 필터가 차단하고 있을 가능성이 높습니다. 이 기기의 진행 상황은 안전합니다."),
 'pt': ("Sua internet funciona, mas este PC não consegue acessar os servidores online do jogo. Provavelmente um firewall, a proteção web de um antivírus, uma VPN ou um filtro de DNS está bloqueando o acesso. O app para Windows se conecta pelo Microsoft Edge WebView2 (msedgewebview2.exe), então permita também esse programa, não só o jogo. Seu progresso neste dispositivo está seguro.",
        "Sua internet funciona, mas este dispositivo não consegue acessar os servidores online do jogo. Provavelmente um firewall, a proteção web de um antivírus, uma VPN ou um filtro de DNS está bloqueando o acesso. Seu progresso neste dispositivo está seguro."),
 'zh': ("你的网络连接正常，但这台电脑无法连接游戏的在线服务器。可能是防火墙、杀毒软件的网页防护、VPN 或 DNS 过滤拦截了连接。Windows 应用通过 Microsoft Edge WebView2（msedgewebview2.exe）联网，因此除了游戏本身，也请允许这个程序。你在本设备上的进度是安全的。",
        "你的网络连接正常，但这台设备无法连接游戏的在线服务器。可能是防火墙、杀毒软件的网页防护、VPN 或 DNS 过滤拦截了连接。你在本设备上的进度是安全的。"),
}


def main():
    for lang, (desktop, device) in T.items():
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        table[DESKTOP] = desktop
        table[DEVICE] = device
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
