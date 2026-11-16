"""Discord review of 2026-11-16, all 8 languages: Set monster face-up stats, LP and coins on the cursed relic screen,
the main-menu cloud save notices, the Windows app's Quit game button and Twin Eyes (hand or Deck). Never overwrites an
existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Face-up: ATK {0} / DEF {1}': ('Offen: ATK {0} / DEF {1}', 'Boca arriba: ATK {0} / DEF {1}', 'Face recto : ATK {0} / DEF {1}', 'Scoperto: ATK {0} / DEF {1}',
                               '表側表示：攻撃力{0} / 守備力{1}', '앞면: 공격력 {0} / 수비력 {1}', 'Com a face para cima: ATK {0} / DEF {1}', '表侧表示：攻击力 {0} / 守备力 {1}'),
 '{0} LP · {1} coins': ('{0} LP · {1} Münzen', '{0} LP · {1} monedas', '{0} LP · {1} pièces', '{0} LP · {1} monete', '{0} LP · {1} コイン', '{0} LP · {1} 코인', '{0} LP · {1} moedas', '{0} LP · {1} 金币'),
 "Cloud save is paused: the online servers are at today's limit. Your progress is saved on this device only for now.": (
  'Cloud-Speicherung pausiert: Die Online-Server haben ihr heutiges Limit erreicht. Dein Fortschritt ist vorerst nur auf diesem Gerät gespeichert.',
  'Guardado en la nube en pausa: los servidores en línea han llegado al límite de hoy. Por ahora tu progreso solo se guarda en este dispositivo.',
  "Sauvegarde cloud en pause : les serveurs en ligne ont atteint la limite du jour. Votre progression n'est enregistrée que sur cet appareil pour l'instant.",
  'Salvataggio cloud in pausa: i server online hanno raggiunto il limite di oggi. Per ora i tuoi progressi sono salvati solo su questo dispositivo.',
  'クラウドセーブは一時停止中です：オンラインサーバーが本日の上限に達しました。今のところ進行状況はこの端末にのみ保存されます。',
  '클라우드 저장이 일시 중지되었습니다: 온라인 서버가 오늘의 한도에 도달했습니다. 지금은 진행 상황이 이 기기에만 저장됩니다.',
  'Salvamento na nuvem pausado: os servidores online atingiram o limite de hoje. Por enquanto, seu progresso está salvo só neste dispositivo.',
  '云存档已暂停：在线服务器已达到今日上限。目前你的进度只保存在此设备上。'),
 'Cloud save could not upload. Your progress is saved on this device; it will retry.': (
  'Cloud-Speicherung konnte nicht hochladen. Dein Fortschritt ist auf diesem Gerät gespeichert; es wird erneut versucht.',
  'No se pudo subir el guardado en la nube. Tu progreso está guardado en este dispositivo; se volverá a intentar.',
  "La sauvegarde cloud n'a pas pu être envoyée. Votre progression est enregistrée sur cet appareil ; un nouvel essai aura lieu.",
  'Impossibile caricare il salvataggio cloud. I tuoi progressi sono salvati su questo dispositivo; verrà ritentato.',
  'クラウドセーブをアップロードできませんでした。進行状況はこの端末に保存されています。再試行します。',
  '클라우드 저장을 업로드하지 못했습니다. 진행 상황은 이 기기에 저장되어 있으며 다시 시도합니다.',
  'Não foi possível enviar o salvamento na nuvem. Seu progresso está salvo neste dispositivo; haverá nova tentativa.',
  '云存档上传失败。你的进度已保存在此设备上，稍后会重试。'),
 'Quit game': ('Spiel beenden', 'Salir del juego', 'Quitter le jeu', 'Esci dal gioco', 'ゲームを終了', '게임 종료', 'Sair do jogo', '退出游戏'),
 'Once per Duel, during your first Standby Phase: Special Summon 1 "Blue-Eyes" or "Red-Eyes" monster from your hand or Deck in Attack Position.': (
  'Einmal pro Duell, während deiner ersten Standby Phase: Beschwöre 1 „Blauäugiger“- oder „Rotäugiger“-Monster als Spezialbeschwörung in Angriffsposition von deiner Hand oder deinem Deck.',
  'Una vez por Duelo, durante tu primera Standby Phase: Invoca de Modo Especial 1 monstruo "Ojos Azules" u "Ojos Rojos" desde tu mano o Deck en Posición de Ataque.',
  "Une fois par Duel, durant votre première Standby Phase : Invoquez Spécialement 1 monstre « aux Yeux Bleus » ou « aux Yeux Rouges » depuis votre main ou Deck en Position d'Attaque.",
  'Una volta per Duello, durante la tua prima Standby Phase: Evoca Specialmente 1 mostro "Occhi Blu" o "Occhi Rossi" dalla tua mano o dal tuo Deck in Posizione di Attacco.',
  '1デュエルに1度、自分の最初のスタンバイフェイズに、手札かデッキから「ブルーアイズ」または「レッドアイズ」モンスター1体を攻撃表示で特殊召喚する。',
  '1듀얼에 1번, 자신의 첫 스탠바이 페이즈에, 패 또는 덱에서 "블루아이즈" 또는 "레드아이즈" 몬스터 1장을 공격 표시로 특수 소환한다.',
  'Uma vez por Duelo, durante a sua primeira Fase de Apoio: Invoque por Invocação-Especial 1 monstro "Olhos Azuis" ou "Olhos Vermelhos" da sua mão ou Deck em Posição de Ataque.',
  '1场决斗1次，自己的最初的准备阶段，从手卡或卡组把1只「青眼」或「真红眼」怪兽以攻击表示特殊召唤。'),
}
PATTERNS = {'Face-up: ATK {0} / DEF {1}', '{0} LP · {1} coins'}

def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, local in TERMS.items(): table.setdefault(en, local[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known:
            catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if en in PATTERNS else 'exact', 'ctx': 'Discord review 2026-11-16'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__': main()
