"""Shop tour rework (user, 2026-11-23; android/web/shop-tour.js): one part per step, and the tips name the real gestures
(a tap ticks an item, a hold or right-click reads it). Button names follow add_nov23_shop_tour_terms.py (BUY, REROLL,
Relics). All 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'These cards are for sale. Tap a card to tick it. Hold it (right-click on a computer) to read it.': (
  'Diese Karten stehen zum Verkauf. Tippe auf eine Karte, um sie anzuhaken. Halte sie gedrückt (am Computer Rechtsklick), um sie zu lesen.',
  'Estas cartas están a la venta. Toca una carta para marcarla. Mantenla pulsada (clic derecho en un ordenador) para leerla.',
  'Ces cartes sont en vente. Touche une carte pour la cocher. Maintiens-la (clic droit sur ordinateur) pour la lire.',
  'Queste carte sono in vendita. Tocca una carta per spuntarla. Tienila premuta (clic destro su computer) per leggerla.',
  'これらのカードが売られています。タップするとチェックが入ります。長押し（パソコンでは右クリック）するとカードを確認できます。',
  '판매 중인 카드입니다. 카드를 탭하면 체크됩니다. 길게 누르면(컴퓨터에서는 오른쪽 클릭) 카드를 읽을 수 있습니다.',
  'Estas cartas estão à venda. Toque numa carta para marcá-la. Mantenha-a pressionada (clique direito no computador) para lê-la.',
  '这些卡片正在出售。点击卡片即可勾选。长按（电脑上右键）即可查看卡片。'),
 'BUY buys everything you ticked at once. The price is shown under it.': (
  'KAUFEN kauft alles Angehakte auf einmal. Der Preis steht darunter.',
  'COMPRAR compra todo lo que marcaste de una vez. El precio aparece debajo.',
  'ACHETER achète tout ce que tu as coché en une fois. Le prix est affiché en dessous.',
  'COMPRA compra tutto ciò che hai spuntato in una volta. Il prezzo è indicato sotto.',
  '「購入」を押すと、チェックしたものをまとめて購入します。価格はその下に表示されます。',
  '구매를 누르면 체크한 것을 한 번에 모두 구매합니다. 가격은 그 아래에 표시됩니다.',
  'COMPRAR compra de uma vez tudo o que você marcou. O preço aparece logo abaixo.',
  '“购买”会一次买下你勾选的全部物品。价格显示在按钮下方。'),
 'Relics help you for the rest of the run. Tap one to tick it. Hold it (right-click on a computer) to read it.': (
  'Relikte helfen dir für den Rest des Laufs. Tippe auf eines, um es anzuhaken. Halte es gedrückt (am Computer Rechtsklick), um es zu lesen.',
  'Las reliquias te ayudan durante el resto de la partida. Toca una para marcarla. Mantenla pulsada (clic derecho en un ordenador) para leerla.',
  'Les reliques t\'aident pour le reste de la partie. Touche-en une pour la cocher. Maintiens-la (clic droit sur ordinateur) pour la lire.',
  'Le reliquie ti aiutano per il resto della partita. Toccane una per spuntarla. Tienila premuta (clic destro su computer) per leggerla.',
  'レリックはこのランの間ずっと役立ちます。タップするとチェックが入ります。長押し（パソコンでは右クリック）すると効果を確認できます。',
  '유물은 이번 런 내내 도움이 됩니다. 탭하면 체크됩니다. 길게 누르면(컴퓨터에서는 오른쪽 클릭) 내용을 읽을 수 있습니다.',
  'As relíquias ajudam você pelo resto da partida. Toque numa para marcá-la. Mantenha-a pressionada (clique direito no computador) para lê-la.',
  '遗物会在本次冒险的剩余时间里帮助你。点击即可勾选。长按（电脑上右键）即可查看。'),
 'Your relics': ('Deine Relikte', 'Tus reliquias', 'Tes reliques', 'Le tue reliquie', '所持レリック', '나의 유물', 'As suas relíquias', '你的遗物'),
 'This button lists the relics you own. You can sell them there.': (
  'Diese Schaltfläche zeigt deine Relikte. Dort kannst du sie verkaufen.',
  'Este botón muestra las reliquias que tienes. Ahí puedes venderlas.',
  'Ce bouton affiche les reliques que tu possèdes. Tu peux les y vendre.',
  'Questo pulsante mostra le reliquie che possiedi. Lì puoi venderle.',
  'このボタンで所持しているレリックを確認できます。そこで売ることもできます。',
  '이 버튼에서 가진 유물을 볼 수 있습니다. 거기서 팔 수도 있습니다.',
  'Este botão mostra as relíquias que você tem. Lá você pode vendê-las.',
  '这个按钮列出你拥有的遗物，也可以在那里出售。'),
 'REROLL replaces everything on sale with new stock, for the coins shown on it.': (
  'AKTUALISIEREN ersetzt das gesamte Angebot durch neue Ware, für die darauf angezeigten Münzen.',
  'RENOVAR cambia todo lo que está a la venta por género nuevo, por las monedas que muestra.',
  'RELANCER remplace tout ce qui est en vente par un nouveau stock, pour les pièces affichées dessus.',
  'CAMBIA sostituisce tutto ciò che è in vendita con nuova merce, per le monete indicate sopra.',
  'リロールすると、表示されているコインを払って、売り物がすべて新しい品ぞろえに入れ替わります。',
  '리롤하면 표시된 코인을 내고 판매 중인 모든 상품이 새 상품으로 바뀝니다.',
  'ATUALIZAR troca tudo o que está à venda por novos itens, pelas moedas mostradas nele.',
  '刷新会花费上面显示的硬币，把所有在售商品换成新的。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
