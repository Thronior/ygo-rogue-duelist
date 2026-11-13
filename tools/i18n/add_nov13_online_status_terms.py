"""Plain-language online failure messages (android/web/online-status.js, user 2026-11-13), all 8 languages.
Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
LIMIT = "The online servers have reached today's free usage limit, so online play, cloud saves and global stats are paused. They come back after the daily reset at 00:00 UTC, in about {0} h {1} min. Your progress on this device is safe."
UNREACH = "Can't reach the online servers right now. If they have reached today's usage limit, they come back after the daily reset at 00:00 UTC, in about {0} h {1} min. Your progress on this device is safe."
OFFLINE = "You're offline. Online play needs an internet connection."
TERMS = {
 LIMIT: ('Die Online-Server haben ihr kostenloses Tageslimit erreicht, daher sind Online-Spiel, Cloud-Speicherstände und globale Statistiken pausiert. Sie sind nach dem täglichen Reset um 00:00 UTC wieder da, in etwa {0} Std. {1} Min. Dein Fortschritt auf diesem Gerät ist sicher.',
  'Los servidores en línea han alcanzado su límite gratuito de uso de hoy, así que el juego en línea, el guardado en la nube y las estadísticas globales están en pausa. Vuelven tras el reinicio diario a las 00:00 UTC, en unas {0} h {1} min. Tu progreso en este dispositivo está a salvo.',
  "Les serveurs en ligne ont atteint leur limite d'utilisation gratuite du jour : le jeu en ligne, la sauvegarde cloud et les statistiques globales sont en pause. Ils reviennent après la réinitialisation quotidienne à 00:00 UTC, dans environ {0} h {1} min. Votre progression sur cet appareil est en sécurité.",
  'I server online hanno raggiunto il limite di utilizzo gratuito di oggi, quindi gioco online, salvataggi cloud e statistiche globali sono in pausa. Tornano dopo il ripristino giornaliero alle 00:00 UTC, tra circa {0} h {1} min. I tuoi progressi su questo dispositivo sono al sicuro.',
  'オンラインサーバーが本日の無料利用上限に達したため、オンライン対戦・クラウドセーブ・グローバル統計は一時停止中です。毎日00:00 UTCのリセット後（あと約{0}時間{1}分）に復旧します。この端末の進行状況は安全です。',
  '온라인 서버가 오늘의 무료 사용 한도에 도달해 온라인 플레이, 클라우드 저장, 전체 통계가 일시 중지되었습니다. 매일 00:00 UTC 초기화 후(약 {0}시간 {1}분 뒤) 다시 이용할 수 있습니다. 이 기기의 진행 상황은 안전합니다.',
  'Os servidores online atingiram o limite gratuito de uso de hoje, então o jogo online, o salvamento na nuvem e as estatísticas globais estão pausados. Eles voltam após a redefinição diária às 00:00 UTC, em cerca de {0} h {1} min. Seu progresso neste dispositivo está seguro.',
  '在线服务器已达到今日的免费使用上限，在线对战、云存档和全球统计暂停。它们会在每日 00:00 UTC 重置后恢复，大约还有 {0} 小时 {1} 分钟。你在本设备上的进度是安全的。'),
 UNREACH: ('Die Online-Server sind gerade nicht erreichbar. Falls sie ihr Tageslimit erreicht haben, sind sie nach dem täglichen Reset um 00:00 UTC wieder da, in etwa {0} Std. {1} Min. Dein Fortschritt auf diesem Gerät ist sicher.',
  'Ahora mismo no se puede conectar con los servidores en línea. Si han alcanzado su límite de uso de hoy, vuelven tras el reinicio diario a las 00:00 UTC, en unas {0} h {1} min. Tu progreso en este dispositivo está a salvo.',
  "Impossible de joindre les serveurs en ligne pour le moment. S'ils ont atteint leur limite d'utilisation du jour, ils reviennent après la réinitialisation quotidienne à 00:00 UTC, dans environ {0} h {1} min. Votre progression sur cet appareil est en sécurité.",
  'Al momento non è possibile raggiungere i server online. Se hanno raggiunto il limite di utilizzo di oggi, tornano dopo il ripristino giornaliero alle 00:00 UTC, tra circa {0} h {1} min. I tuoi progressi su questo dispositivo sono al sicuro.',
  '現在オンラインサーバーに接続できません。本日の利用上限に達している場合は、毎日00:00 UTCのリセット後（あと約{0}時間{1}分）に復旧します。この端末の進行状況は安全です。',
  '지금은 온라인 서버에 연결할 수 없습니다. 오늘의 사용 한도에 도달한 경우 매일 00:00 UTC 초기화 후(약 {0}시간 {1}분 뒤) 다시 이용할 수 있습니다. 이 기기의 진행 상황은 안전합니다.',
  'Não foi possível acessar os servidores online agora. Se eles atingiram o limite de uso de hoje, voltam após a redefinição diária às 00:00 UTC, em cerca de {0} h {1} min. Seu progresso neste dispositivo está seguro.',
  '目前无法连接在线服务器。如果它们已达到今日的使用上限，会在每日 00:00 UTC 重置后恢复，大约还有 {0} 小时 {1} 分钟。你在本设备上的进度是安全的。'),
 OFFLINE: ('Du bist offline. Online-Spiel braucht eine Internetverbindung.', 'Estás sin conexión. El juego en línea necesita conexión a internet.', 'Vous êtes hors ligne. Le jeu en ligne nécessite une connexion internet.', 'Sei offline. Il gioco online richiede una connessione a internet.', 'オフラインです。オンライン対戦にはインターネット接続が必要です。', '오프라인 상태입니다. 온라인 플레이에는 인터넷 연결이 필요합니다.', 'Você está offline. O jogo online precisa de conexão com a internet.', '你已离线。在线对战需要网络连接。'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'online-status.js (2026-11-13)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__':
    main()
