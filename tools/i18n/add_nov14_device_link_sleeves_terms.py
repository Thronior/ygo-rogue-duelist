"""Link Devices also shares card sleeves (user, 2026-11-14). Replaces the two Link Devices sentences in 8 languages,
using each language's existing word for card sleeves."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OLD = ['Link Devices shares unlocks, achievements and challenge levels between your devices.',
       'Sync unlocked characters, completed achievements, challenge levels and secret unlocks. Runs, cards, Ultimate Collector duelists and device statistics stay on this device.']
TERMS = {
 'Link Devices shares unlocks, achievements, card sleeves and challenge levels between your devices.': {
  'de': '„Geräte verknüpfen“ teilt Freischaltungen, Erfolge, Kartenhüllen und Schwierigkeitsgrade zwischen deinen Geräten.',
  'es': 'Vincular dispositivos comparte desbloqueos, logros, fundas de cartas y niveles de desafío entre tus dispositivos.',
  'fr': 'Lier des appareils partage les déblocages, les succès, les protège-cartes et les niveaux de défi entre vos appareils.',
  'it': 'Collega dispositivi condivide sblocchi, obiettivi, bustine protettive e Livelli di sfida tra i tuoi dispositivi.',
  'ja': '「端末をリンク」で、解放要素・実績・スリーブ・チャレンジレベルを端末間で共有できます。',
  'ko': '기기 연결은 해금 항목, 업적, 카드 슬리브, 도전 레벨을 기기 간에 공유합니다.',
  'pt': 'Vincular Dispositivos compartilha desbloqueios, conquistas, protetores de cards e Níveis de Desafio entre seus dispositivos.',
  'zh': '“连接设备”会在你的设备之间共享解锁内容、成就、卡套和挑战等级。'},
 'Sync unlocked characters, completed achievements, card sleeves, challenge levels and secret unlocks. Runs, cards, Ultimate Collector duelists and device statistics stay on this device.': {
  'de': 'Synchronisiere freigeschaltete Charaktere, abgeschlossene Erfolge, Kartenhüllen, Schwierigkeitsgrade und geheime Freischaltungen. Durchläufe, Karten, Duellanten des Ultimativen Sammlers und Gerätestatistiken bleiben auf diesem Gerät.',
  'es': 'Sincroniza personajes desbloqueados, logros completados, fundas de cartas, niveles de desafío y desbloqueos secretos. Las partidas, las cartas, los duelistas de Coleccionista Definitivo y las estadísticas del dispositivo se quedan en este dispositivo.',
  'fr': "Synchronisez les personnages débloqués, les succès accomplis, les protège-cartes, les niveaux de défi et les déblocages secrets. Les parties, les cartes, les duellistes Collectionneur Ultime et les statistiques de l'appareil restent sur cet appareil.",
  'it': 'Sincronizza personaggi sbloccati, obiettivi completati, bustine protettive, Livelli di sfida e sblocchi segreti. Partite, carte, duellanti di Collezionista Supremo e statistiche del dispositivo restano su questo dispositivo.',
  'ja': '解放したキャラクター、達成した実績、スリーブ、チャレンジレベル、シークレット解放要素を同期します。ラン、カード、アルティメット・コレクターのデュエリスト、端末の統計はこの端末に残ります。',
  'ko': '해금한 캐릭터, 달성한 업적, 카드 슬리브, 도전 레벨, 비밀 해금 항목을 동기화합니다. 런, 카드, 얼티밋 컬렉터 듀얼리스트, 기기 통계는 이 기기에만 남습니다.',
  'pt': 'Sincronize personagens desbloqueados, conquistas concluídas, protetores de cards, Níveis de Desafio e desbloqueios secretos. Jornadas, cards, duelistas do Colecionador Supremo e estatísticas do dispositivo ficam neste dispositivo.',
  'zh': '同步已解锁的角色、已完成的成就、卡套、挑战等级和秘密解锁内容。冒险、卡片、终极收藏家决斗者和设备统计会保留在此设备上。'},
}
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key in OLD: table.pop(key, None)
        for key, text in TERMS.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    for row in catalog:
        if row.get('en') in OLD: row['en'] = list(TERMS)[OLD.index(row['en'])]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()
