"""Settings descriptions trimmed (user, 2026-11-21: remove the explanations that are obvious, simplify the rest), in all
8 languages. Reduce Motion now ignores the device setting and has no description. Never overwrites an existing
translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Summons, finishers and taunts.': ('Beschwörungen, Finisher und Sprüche.', 'Invocaciones, remates y burlas.', 'Invocations, coups de grâce et moqueries.', 'Evocazioni, colpi finali e frecciatine.', '召喚、とどめ、煽りボイス。', '소환, 마무리 일격, 도발.', 'Invocações, golpes finais e provocações.', '召唤、终结一击和嘲讽。'),
 'Cards per row in the deck editor.': ('Karten pro Reihe im Deck-Editor.', 'Cartas por fila en el editor de mazos.', "Cartes par ligne dans l'éditeur de deck.", "Carte per riga nell'editor del deck.", 'デッキ編集での1行のカード数。', '덱 편집기의 한 줄당 카드 수.', 'Cards por linha no editor de deck.', '卡组编辑器中每行的卡片数。'),
 'Deck and collection side by side.': ('Deck und Sammlung nebeneinander.', 'Mazo y colección lado a lado.', 'Deck et collection côte à côte.', 'Deck e collezione affiancati.', 'デッキとコレクションを並べて表示。', '덱과 컬렉션을 나란히 표시.', 'Deck e coleção lado a lado.', '卡组和收藏并排显示。'),
 'Time to chain on the opponent’s turn.': ('Zeit zum Verketten im Zug des Gegners.', 'Tiempo para encadenar en el turno del rival.', "Temps pour enchaîner pendant le tour de l'adversaire.", "Tempo per concatenare nel turno dell'avversario.", '相手ターンにチェーンできる時間。', '상대 턴에 체인할 수 있는 시간.', 'Tempo para encadear no turno do oponente.', '在对手回合连锁的时间。'),
 'Copies of a card show as one card in the deck editor.': ('Kopien einer Karte erscheinen im Deck-Editor als eine Karte.', 'Las copias de una carta se muestran como una en el editor de mazos.', "Les exemplaires d'une carte s'affichent comme une seule dans l'éditeur de deck.", "Le copie di una carta appaiono come una sola nell'editor del deck.", 'デッキ編集で同じカードを1枚にまとめて表示。', '덱 편집기에서 같은 카드를 한 장으로 묶어 표시.', 'Cópias de um card aparecem como um só no editor de deck.', '卡组编辑器中同名卡合并显示为一张。'),
 'Only your own actions.': ('Nur deine eigenen Aktionen.', 'Solo tus propias acciones.', 'Seulement tes propres actions.', 'Solo le tue azioni.', '自分の行動だけ。', '내 행동에만 적용.', 'Só as suas próprias ações.', '仅限你自己的操作。'),
 'Greyed-out Activate buttons tell you why.': ('Ausgegraute Aktivieren-Knöpfe zeigen dir den Grund.', 'Los botones de Activar en gris te dicen por qué.', 'Les boutons Activer grisés t’expliquent pourquoi.', 'I pulsanti Attiva in grigio ti dicono perché.', 'グレーの「発動」ボタンで理由が分かります。', '회색 발동 버튼이 이유를 알려 줍니다.', 'Botões de Ativar em cinza dizem o porquê.', '灰色的发动按钮会告诉你原因。'),
 'Picks the zone for your cards.': ('Wählt die Zone für deine Karten.', 'Elige la zona para tus cartas.', 'Choisit la zone de tes cartes.', 'Sceglie la zona per le tue carte.', 'カードを置くゾーンを自動で選びます。', '카드를 놓을 존을 자동으로 고릅니다.', 'Escolhe a zona para seus cards.', '自动为你的卡选择区域。'),
 'Lower uses less power.': ('Niedriger braucht weniger Strom.', 'Más bajo gasta menos energía.', "Plus bas consomme moins d'énergie.", 'Più basso consuma meno energia.', '低いほど電力を節約できます。', '낮을수록 전력을 덜 씁니다.', 'Menor gasta menos energia.', '越低越省电。'),
 'Fewer decorative effects.': ('Weniger dekorative Effekte.', 'Menos efectos decorativos.', 'Moins d’effets décoratifs.', 'Meno effetti decorativi.', '装飾エフェクトを減らします。', '장식 효과를 줄입니다.', 'Menos efeitos decorativos.', '减少装饰效果。'),
 'Uses less battery.': ('Braucht weniger Akku.', 'Gasta menos batería.', 'Consomme moins de batterie.', 'Consuma meno batteria.', 'バッテリーを節約します。', '배터리를 덜 씁니다.', 'Gasta menos bateria.', '更省电。'),
 'Fixes flickering in some browsers.': ('Behebt Flackern in manchen Browsern.', 'Corrige el parpadeo en algunos navegadores.', 'Corrige le scintillement dans certains navigateurs.', 'Corregge lo sfarfallio in alcuni browser.', '一部のブラウザーのちらつきを直します。', '일부 브라우저의 깜빡임을 고칩니다.', 'Corrige a cintilação em alguns navegadores.', '修复部分浏览器的闪烁。'),
 'Loads music and artwork at startup.': ('Lädt Musik und Bilder beim Start.', 'Carga música e imágenes al iniciar.', 'Charge la musique et les images au démarrage.', "Carica musica e immagini all'avvio.", '起動時に音楽と画像を読み込みます。', '시작할 때 음악과 그림을 불러옵니다.', 'Carrega música e imagens ao iniciar.', '启动时加载音乐和图片。'),
 'Anonymous totals only.': ('Nur anonyme Summen.', 'Solo totales anónimos.', 'Totaux anonymes uniquement.', 'Solo totali anonimi.', '匿名の合計だけ。', '익명 합계만.', 'Só totais anônimos.', '仅匿名汇总。'),
 'Your last 100 duels. Uploading them helps improve the CPU; no account details are sent.': (
  'Deine letzten 100 Duelle. Das Hochladen hilft, die CPU zu verbessern; Kontodaten werden nicht gesendet.',
  'Tus últimos 100 duelos. Subirlos ayuda a mejorar la CPU; no se envían datos de tu cuenta.',
  'Tes 100 derniers duels. Les envoyer aide à améliorer le CPU ; aucune donnée de compte n’est envoyée.',
  'I tuoi ultimi 100 duelli. Caricarli aiuta a migliorare la CPU; non vengono inviati dati dell’account.',
  '直近100回のデュエル。アップロードするとCPUの改善に役立ちます。アカウント情報は送られません。',
  '최근 듀얼 100회. 업로드하면 CPU 개선에 도움이 되며, 계정 정보는 보내지 않습니다.',
  'Seus últimos 100 duelos. Enviá-los ajuda a melhorar a CPU; nenhum dado da conta é enviado.',
  '你最近的100场决斗。上传有助于改进CPU；不会发送账号信息。'),
 'Behind monsters with 2000 or more ATK.': ('Hinter Monstern mit 2000 oder mehr ATK.', 'Detrás de monstruos con 2000 ATK o más.', "Derrière les monstres de 2000 ATK ou plus.", 'Dietro i mostri con 2000 ATK o più.', '攻撃力2000以上のモンスターの後ろに。', '공격력 2000 이상 몬스터 뒤에.', 'Atrás de monstros com 2000 de ATK ou mais.', '在攻击力2000以上的怪兽身后。'),
 'On heavy hits and big summons.': ('Bei schweren Treffern und großen Beschwörungen.', 'En golpes fuertes e invocaciones grandes.', 'Sur les gros coups et les grandes invocations.', 'Sui colpi pesanti e le grandi evocazioni.', '大ダメージや大型召喚のとき。', '강한 공격과 큰 소환 때.', 'Em golpes fortes e grandes invocações.', '重击和大型召唤时。'),
 'Flashes, sparkles and big damage numbers.': ('Blitze, Funkeln und große Schadenszahlen.', 'Destellos, chispas y números de daño grandes.', 'Éclairs, étincelles et gros chiffres de dégâts.', 'Lampi, scintille e numeri di danno grandi.', 'フラッシュ、きらめき、大きなダメージ表示。', '섬광, 반짝임, 큰 피해 숫자.', 'Clarões, brilhos e números de dano grandes.', '闪光、光点和大号伤害数字。'),
 'OVERKILL, PERFECT and the others.': ('OVERKILL, PERFECT und die anderen.', 'OVERKILL, PERFECT y los demás.', 'OVERKILL, PERFECT et les autres.', 'OVERKILL, PERFECT e gli altri.', 'OVERKILL、PERFECTなど。', 'OVERKILL, PERFECT 등.', 'OVERKILL, PERFECT e os outros.', 'OVERKILL、PERFECT等。'),
 'Red field and heartbeat at low LP.': ('Rotes Feld und Herzschlag bei wenig LP.', 'Campo rojo y latido con pocos LP.', 'Terrain rouge et battements de cœur à bas LP.', 'Terreno rosso e battito con pochi LP.', 'LPが少ないとフィールドが赤くなり鼓動が鳴ります。', 'LP가 낮으면 필드가 붉어지고 심장 소리가 납니다.', 'Campo vermelho e batimentos com pouco LP.', 'LP低时场地变红并有心跳声。'),
 'Chain badges and a darker field.': ('Ketten-Abzeichen und ein dunkleres Feld.', 'Insignias de cadena y un campo más oscuro.', 'Badges de chaîne et terrain assombri.', 'Badge di catena e un terreno più scuro.', 'チェーンのバッジと暗くなるフィールド。', '체인 배지와 어두워지는 필드.', 'Selos de corrente e campo mais escuro.', '连锁标记和变暗的场地。'),
 'When high-Level monsters land.': ('Wenn hochstufige Monster landen.', 'Cuando aterrizan monstruos de Nivel alto.', 'Quand des monstres de haut Niveau arrivent.', 'Quando arrivano mostri di Livello alto.', '高レベルモンスターが着地したとき。', '고레벨 몬스터가 등장할 때.', 'Quando monstros de Nível alto chegam.', '高等级怪兽登场时。'),
 'The "+500 ATK" texts.': ('Die „+500 ATK“-Texte.', 'Los textos de "+500 ATK".', 'Les textes « +500 ATK ».', 'I testi "+500 ATK".', '「+500 ATK」の表示。', '"+500 ATK" 표시.', 'Os textos "+500 ATK".', '"+500 ATK"字样。'),
 'Full hand and low Deck.': ('Volle Hand und knappes Deck.', 'Mano llena y Deck escaso.', 'Main pleine et Deck presque vide.', 'Mano piena e Deck quasi vuoto.', '手札上限と残り少ないデッキ。', '꽉 찬 패와 얼마 안 남은 덱.', 'Mão cheia e Deck quase vazio.', '手牌满和卡组将空。'),
 'Coin bursts and shop reels.': ('Münzregen und Shop-Walzen.', 'Lluvias de monedas y rodillos de la tienda.', 'Pluies de pièces et rouleaux de la boutique.', 'Pioggia di monete e rulli del negozio.', 'コインの演出とショップのリール。', '코인 연출과 상점 릴.', 'Chuvas de moedas e rolos da loja.', '金币特效和商店转轴。'),
 'The "+15 Tribute Summon" texts.': ('Die „+15 Tributbeschwörung“-Texte.', 'Los textos de "+15 Invocación por Sacrificio".', 'Les textes « +15 Invocation Sacrifice ».', 'I testi "+15 Evocazione tramite Tributo".', '「+15 アドバンス召喚」などの表示。', '"+15 어드밴스 소환" 같은 표시.', 'Os textos "+15 Invocação-Tributo".', '"+15 上级召唤"等字样。'),
 'On big hits and chain prompts.': ('Bei großen Treffern und Ketten-Abfragen.', 'En golpes grandes y avisos de cadena.', 'Sur les gros coups et les demandes de chaîne.', 'Sui colpi grandi e le richieste di catena.', '大きな攻撃とチェーン確認のとき。', '큰 공격과 체인 확인 때.', 'Em golpes grandes e avisos de corrente.', '重击和连锁提示时。'),
 'Backs up after each duel; a code restores it on any device.': ('Sichert nach jedem Duell; ein Code stellt es auf jedem Gerät wieder her.', 'Guarda una copia tras cada duelo; un código la recupera en cualquier dispositivo.', 'Sauvegarde après chaque duel ; un code la restaure sur tout appareil.', 'Salva dopo ogni duello; un codice la ripristina su qualsiasi dispositivo.', 'デュエルごとにバックアップし、コードでどの端末にも復元できます。', '듀얼마다 백업하고, 코드로 어느 기기에서나 복원합니다.', 'Faz backup após cada duelo; um código restaura em qualquer dispositivo.', '每场决斗后备份；用代码可在任何设备恢复。'),

}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
