"""First-visit shop tour (user, 2026-11-23; android/web/shop-tour.js). Button names follow each language's existing
shop labels (Buy, Reroll, Booster packs, Relics, Edit deck). All 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Shop tour': ('Shop-Rundgang', 'Guía de la tienda', 'Visite de la boutique', 'Guida al negozio', 'ショップ案内', '상점 안내', 'Guia da loja', '商店导览'),
 'Close the shop tour': ('Shop-Rundgang schließen', 'Cerrar la guía de la tienda', 'Fermer la visite de la boutique', 'Chiudi la guida al negozio', 'ショップ案内を閉じる', '상점 안내 닫기', 'Fechar o guia da loja', '关闭商店导览'),
 'Welcome to the shop': ('Willkommen im Shop', 'Bienvenido a la tienda', 'Bienvenue à la boutique', 'Benvenuto nel negozio', 'ショップへようこそ', '상점에 오신 것을 환영합니다', 'Bem-vindo à loja', '欢迎光临商店'),
 'Tick the box on anything you want, then press BUY to buy it all at once. Tap a picture to read the card.': (
  'Hake alles an, was du willst, und drücke dann KAUFEN, um alles auf einmal zu kaufen. Tippe auf ein Bild, um die Karte zu lesen.',
  'Marca la casilla de todo lo que quieras y pulsa COMPRAR para comprarlo todo de una vez. Toca una imagen para leer la carta.',
  'Coche la case de tout ce que tu veux, puis appuie sur ACHETER pour tout acheter en une fois. Touche une image pour lire la carte.',
  'Spunta la casella di ciò che vuoi, poi premi COMPRA per comprare tutto in una volta. Tocca un\'immagine per leggere la carta.',
  '欲しいものにチェックを入れて「購入」を押すと、まとめて購入できます。画像をタップするとカードを確認できます。',
  '원하는 것에 체크한 뒤 구매를 누르면 한 번에 모두 구매합니다. 그림을 탭하면 카드를 읽을 수 있습니다.',
  'Marque a caixa de tudo o que quiser e toque em COMPRAR para comprar tudo de uma vez. Toque numa imagem para ler a carta.',
  '勾选想要的东西，然后按“购买”一次买下全部。点击图片可以查看卡片。'),
 'Booster packs and decks': ('Booster und Decks', 'Sobres y decks', 'Boosters et decks', 'Buste e Deck', 'ブースターパックとデッキ', '부스터 팩과 덱', 'Pacotes e decks', '补充包与卡组'),
 'Booster packs open into random cards for your collection. Decks add all of their cards.': (
  'Booster enthalten zufällige Karten für deine Sammlung. Decks fügen alle ihre Karten hinzu.',
  'Los sobres dan cartas aleatorias para tu colección. Los decks añaden todas sus cartas.',
  'Les boosters donnent des cartes aléatoires pour ta collection. Les decks ajoutent toutes leurs cartes.',
  'Le buste danno carte casuali per la tua collezione. I Deck aggiungono tutte le loro carte.',
  'ブースターパックからはランダムなカードがコレクションに加わります。デッキはそのカードをすべて加えます。',
  '부스터 팩은 컬렉션에 무작위 카드를 줍니다. 덱은 들어 있는 카드를 모두 추가합니다.',
  'Os pacotes dão cartas aleatórias para a sua coleção. Os decks adicionam todas as suas cartas.',
  '补充包会为你的收藏带来随机卡片。卡组会加入其中的全部卡片。'),
 'Relics help you for the rest of the run. Tap one to read it. The Relics button lists the ones you own, and you can sell them there.': (
  'Relikte helfen dir für den Rest des Laufs. Tippe auf eines, um es zu lesen. Die Schaltfläche Relikte zeigt deine Relikte, und dort kannst du sie verkaufen.',
  'Las reliquias te ayudan durante el resto de la partida. Toca una para leerla. El botón Reliquias muestra las tuyas, y ahí puedes venderlas.',
  'Les reliques t\'aident pour le reste de la partie. Touche-en une pour la lire. Le bouton Reliques affiche les tiennes, et tu peux les y vendre.',
  'Le reliquie ti aiutano per il resto della partita. Toccane una per leggerla. Il pulsante Reliquie mostra le tue, e lì puoi venderle.',
  'レリックはこのランの間ずっと役立ちます。タップすると効果を確認できます。「レリック」ボタンで所持しているものを確認でき、そこで売ることもできます。',
  '유물은 이번 런 내내 도움이 됩니다. 탭하면 내용을 읽을 수 있습니다. 유물 버튼에서 가진 유물을 보고 팔 수 있습니다.',
  'As relíquias ajudam você pelo resto da partida. Toque numa para ler. O botão Relíquias mostra as suas, e lá você pode vendê-las.',
  '遗物会在本次冒险的剩余时间里帮助你。点击即可查看。“遗物”按钮列出你拥有的遗物，也可以在那里出售。'),
 'Reroll': ('Aktualisieren', 'Renovar', 'Relancer', 'Cambia', 'リロール', '리롤', 'Atualizar', '刷新'),
 'REROLL replaces everything on sale with new stock.': (
  'AKTUALISIEREN ersetzt das gesamte Angebot durch neue Ware.',
  'RENOVAR cambia todo lo que está a la venta por género nuevo.',
  'RELANCER remplace tout ce qui est en vente par un nouveau stock.',
  'CAMBIA sostituisce tutto ciò che è in vendita con nuova merce.',
  'リロールすると、売り物がすべて新しい品ぞろえに入れ替わります。',
  '리롤하면 판매 중인 모든 상품이 새 상품으로 바뀝니다.',
  'ATUALIZAR troca tudo o que está à venda por novos itens.',
  '刷新会把所有在售商品换成新的。'),
 "Change your deck between duels. Card stats there include your relics, and before a boss duel also the boss's known curses.": (
  'Ändere dein Deck zwischen den Duellen. Die Kartenwerte dort enthalten deine Relikte und vor einem Bossduell auch die bekannten Flüche des Bosses.',
  'Cambia tu deck entre duelos. Los valores de las cartas ahí incluyen tus reliquias y, antes de un duelo contra un jefe, también sus maldiciones conocidas.',
  'Modifie ton deck entre les duels. Les statistiques des cartes y incluent tes reliques et, avant un duel de boss, aussi les malédictions connues du boss.',
  'Modifica il tuo Deck tra un duello e l\'altro. Le statistiche delle carte lì includono le tue reliquie e, prima di un duello col boss, anche le maledizioni note del boss.',
  'デュエルの合間にデッキを変更できます。そこでのカードの数値にはレリックが反映され、ボス戦の前は判明しているボスの呪いも反映されます。',
  '듀얼 사이에 덱을 바꿀 수 있습니다. 거기서 보이는 카드 수치에는 유물이 반영되며, 보스 듀얼 전에는 알려진 보스의 저주도 반영됩니다.',
  'Mude o seu deck entre os duelos. Os valores das cartas ali incluem as suas relíquias e, antes de um duelo contra um chefe, também as maldições conhecidas do chefe.',
  '在决斗之间修改你的卡组。那里显示的卡片数值包含你的遗物，在首领决斗之前还包含首领已知的诅咒。'),
 'Your run': ('Dein Lauf', 'Tu partida', 'Ta partie', 'La tua partita', 'あなたのラン', '나의 런', 'A sua partida', '你的冒险'),
 'This track shows your duels: bosses are diamonds and the next duel is ringed in gold. Tap it to see the next boss and its curses.': (
  'Diese Leiste zeigt deine Duelle: Bosse sind Rauten, und das nächste Duell ist golden umrandet. Tippe darauf, um den nächsten Boss und seine Flüche zu sehen.',
  'Esta barra muestra tus duelos: los jefes son rombos y el siguiente duelo tiene un aro dorado. Tócala para ver el siguiente jefe y sus maldiciones.',
  'Cette piste montre tes duels : les boss sont des losanges et le prochain duel est cerclé d\'or. Touche-la pour voir le prochain boss et ses malédictions.',
  'Questa barra mostra i tuoi duelli: i boss sono rombi e il prossimo duello è cerchiato d\'oro. Toccala per vedere il prossimo boss e le sue maledizioni.',
  'このトラックはデュエルの進行を表します。ボスはひし形、次のデュエルは金色の輪で示されます。タップすると次のボスとその呪いを確認できます。',
  '이 트랙은 듀얼 진행을 보여 줍니다. 보스는 마름모, 다음 듀얼은 금색 고리로 표시됩니다. 탭하면 다음 보스와 그 저주를 볼 수 있습니다.',
  'Esta trilha mostra os seus duelos: os chefes são losangos e o próximo duelo tem um anel dourado. Toque nela para ver o próximo chefe e as suas maldições.',
  '这条轨道显示你的决斗进度：首领是菱形，下一场决斗带有金色圆环。点击即可查看下一个首领及其诅咒。'),
 'Next duel': ('Nächstes Duell', 'Siguiente duelo', 'Duel suivant', 'Prossimo duello', '次のデュエル', '다음 듀얼', 'Próximo duelo', '下一场决斗'),
 'When you are done, choose your next opponent here.': (
  'Wenn du fertig bist, wähle hier deinen nächsten Gegner.',
  'Cuando termines, elige aquí a tu siguiente rival.',
  'Quand tu as fini, choisis ici ton prochain adversaire.',
  'Quando hai finito, scegli qui il tuo prossimo avversario.',
  '準備ができたら、ここで次の対戦相手を選びます。',
  '준비가 끝나면 여기서 다음 상대를 고르세요.',
  'Quando terminar, escolha aqui o seu próximo oponente.',
  '准备好后，在这里选择下一个对手。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
