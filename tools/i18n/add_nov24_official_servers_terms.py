"""Messages from the official servers (multiplayer/shared/official-build.mjs, 2026-11-24): a build that isn't an official
release is refused, and one network flooding requests is told to wait. The client shows the server's text. All 8
languages; never overwrites an existing translation. SELF-HOSTING.md is a file name and stays as is."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Online play needs the latest official version of the game. Modified versions need their own servers: see SELF-HOSTING.md on GitHub.': (
  'Für das Online-Spiel brauchst du die neueste offizielle Version des Spiels. Veränderte Versionen brauchen eigene Server: siehe SELF-HOSTING.md auf GitHub.',
  'El juego en línea necesita la última versión oficial del juego. Las versiones modificadas necesitan sus propios servidores: consulta SELF-HOSTING.md en GitHub.',
  "Le jeu en ligne nécessite la dernière version officielle du jeu. Les versions modifiées ont besoin de leurs propres serveurs : voir SELF-HOSTING.md sur GitHub.",
  "Il gioco online richiede l'ultima versione ufficiale del gioco. Le versioni modificate hanno bisogno di server propri: vedi SELF-HOSTING.md su GitHub.",
  'オンラインプレイには最新の公式版が必要です。改造版は独自のサーバーが必要です。GitHubのSELF-HOSTING.mdを参照してください。',
  '온라인 플레이에는 게임의 최신 공식 버전이 필요합니다. 수정된 버전은 자체 서버가 필요합니다. GitHub의 SELF-HOSTING.md를 참고하세요.',
  'O jogo online precisa da versão oficial mais recente do jogo. Versões modificadas precisam de servidores próprios: veja SELF-HOSTING.md no GitHub.',
  '联机游戏需要最新的官方版本。修改版需要自己的服务器：请参阅 GitHub 上的 SELF-HOSTING.md。'),
 'Too many requests from your network. Wait a minute and try again.': (
  'Zu viele Anfragen aus deinem Netzwerk. Warte eine Minute und versuche es erneut.',
  'Demasiadas solicitudes desde tu red. Espera un minuto y vuelve a intentarlo.',
  'Trop de requêtes depuis votre réseau. Attendez une minute puis réessayez.',
  'Troppe richieste dalla tua rete. Aspetta un minuto e riprova.',
  'お使いのネットワークからのリクエストが多すぎます。1分待ってからもう一度お試しください。',
  '네트워크에서 요청이 너무 많습니다. 1분 기다린 뒤 다시 시도하세요.',
  'Muitas solicitações da sua rede. Espere um minuto e tente de novo.',
  '你的网络发出的请求过多。请等待一分钟后再试。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
