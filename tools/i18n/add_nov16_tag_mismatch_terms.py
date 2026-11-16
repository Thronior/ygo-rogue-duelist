"""Tag version mismatch messages that name the out-of-date side (android/web/tag-session.js mismatchMessage,
Discord 2026-11-16), all 8 languages. Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
PARTNER_OLD = "Your partner's game is out of date. They need to update to v{0}: reload the page, or install the latest app."
PARTNER_OLDER = "Your partner's game is out of date (v{0}). They need to update to v{1}: reload the page, or install the latest app."
OWN_OLDER = "Your game is out of date (v{0}). Your partner has v{1}: reload the page, or install the latest app."
DATA = "You both have v{0}, but your card data does not match. Both players: reload the game, then try again."
TERMS = {
 PARTNER_OLD: (
  'Das Spiel deines Partners ist veraltet. Er muss auf v{0} aktualisieren: Seite neu laden oder die neueste App installieren.',
  'El juego de tu compañero está desactualizado. Debe actualizar a la v{0}: recarga la página o instala la última versión de la app.',
  "Le jeu de votre partenaire n'est pas à jour. Il doit passer à la v{0} : rechargez la page ou installez la dernière version de l'application.",
  "Il gioco del tuo compagno non è aggiornato. Deve aggiornare alla v{0}: ricarica la pagina o installa l'ultima versione dell'app.",
  'パートナーのゲームが古いバージョンです。v{0}に更新する必要があります。ページを再読み込みするか、最新のアプリをインストールしてください。',
  '파트너의 게임이 최신 버전이 아닙니다. v{0}(으)로 업데이트해야 합니다. 페이지를 새로고침하거나 최신 앱을 설치하세요.',
  'O jogo do seu parceiro está desatualizado. Ele precisa atualizar para a v{0}: recarregue a página ou instale o app mais recente.',
  '你的搭档的游戏版本过旧。需要更新到 v{0}：刷新页面，或安装最新版应用。'),
 PARTNER_OLDER: (
  'Das Spiel deines Partners ist veraltet (v{0}). Er muss auf v{1} aktualisieren: Seite neu laden oder die neueste App installieren.',
  'El juego de tu compañero está desactualizado (v{0}). Debe actualizar a la v{1}: recarga la página o instala la última versión de la app.',
  "Le jeu de votre partenaire n'est pas à jour (v{0}). Il doit passer à la v{1} : rechargez la page ou installez la dernière version de l'application.",
  "Il gioco del tuo compagno non è aggiornato (v{0}). Deve aggiornare alla v{1}: ricarica la pagina o installa l'ultima versione dell'app.",
  'パートナーのゲームが古いバージョンです（v{0}）。v{1}に更新する必要があります。ページを再読み込みするか、最新のアプリをインストールしてください。',
  '파트너의 게임이 최신 버전이 아닙니다(v{0}). v{1}(으)로 업데이트해야 합니다. 페이지를 새로고침하거나 최신 앱을 설치하세요.',
  'O jogo do seu parceiro está desatualizado (v{0}). Ele precisa atualizar para a v{1}: recarregue a página ou instale o app mais recente.',
  '你的搭档的游戏版本过旧（v{0}）。需要更新到 v{1}：刷新页面，或安装最新版应用。'),
 OWN_OLDER: (
  'Dein Spiel ist veraltet (v{0}). Dein Partner hat v{1}: Seite neu laden oder die neueste App installieren.',
  'Tu juego está desactualizado (v{0}). Tu compañero tiene la v{1}: recarga la página o instala la última versión de la app.',
  "Votre jeu n'est pas à jour (v{0}). Votre partenaire a la v{1} : rechargez la page ou installez la dernière version de l'application.",
  "Il tuo gioco non è aggiornato (v{0}). Il tuo compagno ha la v{1}: ricarica la pagina o installa l'ultima versione dell'app.",
  'あなたのゲームが古いバージョンです（v{0}）。パートナーはv{1}です。ページを再読み込みするか、最新のアプリをインストールしてください。',
  '내 게임이 최신 버전이 아닙니다(v{0}). 파트너는 v{1}입니다. 페이지를 새로고침하거나 최신 앱을 설치하세요.',
  'Seu jogo está desatualizado (v{0}). Seu parceiro tem a v{1}: recarregue a página ou instale o app mais recente.',
  '你的游戏版本过旧（v{0}）。你的搭档是 v{1}：刷新页面，或安装最新版应用。'),
 DATA: (
  'Ihr habt beide v{0}, aber eure Kartendaten stimmen nicht überein. Beide Spieler: Spiel neu laden und erneut versuchen.',
  'Ambos tenéis la v{0}, pero vuestros datos de cartas no coinciden. Ambos jugadores: recargad el juego y volved a intentarlo.',
  'Vous avez tous les deux la v{0}, mais vos données de cartes ne correspondent pas. Les deux joueurs : rechargez le jeu, puis réessayez.',
  'Avete entrambi la v{0}, ma i vostri dati delle carte non corrispondono. Entrambi i giocatori: ricaricate il gioco e riprovate.',
  '2人ともv{0}ですが、カードデータが一致しません。両方のプレイヤーがゲームを再読み込みしてから、もう一度お試しください。',
  '두 사람 모두 v{0}이지만 카드 데이터가 일치하지 않습니다. 두 플레이어 모두 게임을 새로고침한 뒤 다시 시도하세요.',
  'Vocês dois têm a v{0}, mas os dados das cartas não coincidem. Os dois jogadores: recarreguem o jogo e tentem de novo.',
  '你们都是 v{0}，但卡牌数据不一致。双方玩家：请刷新游戏后重试。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, local in TERMS.items(): table.setdefault(en, local[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        # The client bundle (tools/i18n/build_bundles.py writes it in full at build time).
        bundle_path = ROOT / f'android/web/i18n/{lang}.json'
        bundle = json.loads(bundle_path.read_text(encoding='utf8'))
        for en in TERMS: bundle['ui'].setdefault(en, table[en])
        bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern', 'ctx': 'tag-session.js mismatchMessage (2026-11-16)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')


if __name__ == '__main__': main()
