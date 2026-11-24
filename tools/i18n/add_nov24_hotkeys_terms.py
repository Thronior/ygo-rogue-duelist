"""Settings > Hotkeys (2026-11-24): the rebinding window, every action of the keymap (android/web/hotkeys.js), its
hints and messages. All 8 languages; never overwrites an existing translation. Rules terms follow docs/i18n/TERMS.md
(Battle Phase, Main Phase 2, Chain) and the words the game already uses (Chain mode, Duel log, Reroll, Edit deck)."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Hotkeys': ('Tastenkürzel', 'Atajos de teclado', 'Raccourcis clavier', 'Tasti rapidi', 'ホットキー', '단축키', 'Teclas de atalho', '快捷键'),
 'Click a key, then press the new one. Esc cancels and Delete clears it. If another action already uses that key, the two swap.': (
  'Klicke auf eine Taste und drücke dann die neue. Esc bricht ab, Entf leert sie. Nutzt schon eine andere Aktion diese Taste, tauschen die beiden.',
  'Haz clic en una tecla y pulsa la nueva. Esc cancela y Supr la borra. Si otra acción ya usa esa tecla, las dos se intercambian.',
  'Cliquez sur une touche, puis appuyez sur la nouvelle. Échap annule et Suppr l’efface. Si une autre action utilise déjà cette touche, les deux s’échangent.',
  'Fai clic su un tasto, poi premi quello nuovo. Esc annulla e Canc lo cancella. Se un’altra azione usa già quel tasto, i due si scambiano.',
  'キーをクリックしてから新しいキーを押してください。Escでキャンセル、Deleteで解除します。そのキーを別の操作が使っている場合は入れ替わります。',
  '키를 클릭한 뒤 새 키를 누르세요. Esc는 취소, Delete는 지웁니다. 다른 동작이 이미 그 키를 쓰고 있으면 서로 바뀝니다.',
  'Clique em uma tecla e pressione a nova. Esc cancela e Delete a apaga. Se outra ação já usa essa tecla, as duas trocam.',
  '点击一个按键，然后按下新的按键。Esc 取消，Delete 清除。如果该按键已被其他操作使用，两者会互换。'),
 'General': ('Allgemein', 'General', 'Général', 'Generale', '全般', '일반', 'Geral', '通用'),
 'Choices': ('Auswahl', 'Opciones a elegir', 'Choix', 'Scelte', '選択肢', '선택지', 'Escolhas', '选项'),
 'Shop and deck': ('Shop und Deck', 'Tienda y deck', 'Boutique et deck', 'Negozio e Deck', 'ショップとデッキ', '상점과 덱', 'Loja e deck', '商店与卡组'),
 'Menus': ('Menüs', 'Menús', 'Menus', 'Menu', 'メニュー', '메뉴', 'Menus', '菜单'),
 'Back / Close window': ('Zurück / Fenster schließen', 'Atrás / Cerrar ventana', 'Retour / Fermer la fenêtre', 'Indietro / Chiudi finestra', '戻る／ウィンドウを閉じる', '뒤로 / 창 닫기', 'Voltar / Fechar janela', '返回／关闭窗口'),
 'Inspect the card under the mouse': ('Karte unter der Maus ansehen', 'Inspeccionar la carta bajo el ratón', 'Examiner la carte sous la souris', 'Esamina la carta sotto il mouse', 'マウスの下のカードの詳細', '마우스 아래 카드 자세히 보기', 'Inspecionar o card sob o mouse', '查看鼠标下的卡片'),
 'Open Settings': ('Einstellungen öffnen', 'Abrir ajustes', 'Ouvrir les paramètres', 'Apri impostazioni', '設定を開く', '설정 열기', 'Abrir configurações', '打开设置'),
 'Restart the run (hold 3 seconds, before the first duel ends)': (
  'Run neu starten (3 Sekunden halten, bevor das erste Duell endet)',
  'Reiniciar la partida (mantener 3 segundos, antes de que acabe el primer duelo)',
  'Recommencer la partie (maintenir 3 secondes, avant la fin du premier duel)',
  'Ricomincia la run (tieni premuto 3 secondi, prima che finisca il primo duello)',
  'ランをやり直す（3秒長押し、最初のデュエルが終わる前のみ）',
  '런 다시 시작 (3초 누르기, 첫 듀얼이 끝나기 전까지)',
  'Recomeçar a run (segure 3 segundos, antes do fim do primeiro duelo)',
  '重新开始本局（按住 3 秒，仅限第一场决斗结束前）'),
 'Next phase (confirms a waiting selection first)': (
  'Nächste Phase (bestätigt zuerst eine offene Auswahl)',
  'Siguiente fase (antes confirma una selección pendiente)',
  'Phase suivante (confirme d’abord une sélection en attente)',
  'Fase successiva (prima conferma una selezione in attesa)',
  '次のフェイズ（選択待ちがあれば先に決定）',
  '다음 페이즈 (대기 중인 선택이 있으면 먼저 확정)',
  'Próxima fase (confirma antes uma seleção pendente)',
  '下一阶段（如有待确认的选择则先确认）'),
 'Confirm selection or activation': ('Auswahl oder Aktivierung bestätigen', 'Confirmar selección o activación', 'Confirmer la sélection ou l’activation', 'Conferma selezione o attivazione', '選択・発動を決定', '선택 또는 발동 확정', 'Confirmar seleção ou ativação', '确认选择或发动'),
 'Cancel / Do not chain': ('Abbrechen / Nicht anketten', 'Cancelar / No encadenar', 'Annuler / Ne pas chaîner', 'Annulla / Non concatenare', 'キャンセル／チェーンしない', '취소 / 체인하지 않음', 'Cancelar / Não encadear', '取消／不连锁'),
 'Go to the Battle Phase': ('Zur Battle Phase', 'Ir a la Battle Phase', 'Passer à la Battle Phase', 'Vai alla Battle Phase', 'バトルフェイズへ', '배틀 페이즈로', 'Ir para a Fase de Batalha', '进入战斗阶段'),
 'Go to Main Phase 2': ('Zur Main Phase 2', 'Ir a la Main Phase 2', 'Passer à la Main Phase 2', 'Vai alla Main Phase 2', 'メインフェイズ２へ', '메인 페이즈 2로', 'Ir para a Fase Principal 2', '进入主要阶段2'),
 'End turn': ('Zug beenden', 'Terminar turno', 'Finir le tour', 'Termina il turno', 'ターン終了', '턴 종료', 'Encerrar turno', '结束回合'),
 'Change chain mode': ('Kettenmodus wechseln', 'Cambiar el modo de Cadena', 'Changer le mode de Chaîne', 'Cambia modalità Catena', 'チェーン確認を切り替え', '체인 모드 변경', 'Mudar o modo de Corrente', '切换连锁模式'),
 'Open or close the duel log': ('Duell-Protokoll öffnen oder schließen', 'Abrir o cerrar el registro del duelo', 'Ouvrir ou fermer le journal du duel', 'Apri o chiudi il registro del duello', 'デュエルログを開く／閉じる', '듀얼 로그 열기/닫기', 'Abrir ou fechar o registro do duelo', '打开或关闭决斗记录'),
 'Duel options': ('Duell-Optionen', 'Opciones del duelo', 'Options du duel', 'Opzioni del duello', 'デュエルのオプション', '듀얼 옵션', 'Opções do duelo', '决斗选项'),
 'Choose option {0}': ('Option {0} wählen', 'Elegir la opción {0}', 'Choisir l’option {0}', 'Scegli l’opzione {0}', '選択肢{0}を選ぶ', '{0}번 선택지 고르기', 'Escolher a opção {0}', '选择第 {0} 项'),
 'Card menu, chain or selection choices in a duel; the opponents on the duel select screen.': (
  'Kartenmenü, Ketten- oder Auswahloptionen im Duell; die Gegner auf dem Gegner-Auswahlbildschirm.',
  'Menú de carta, opciones de Cadena o de selección en un duelo; los rivales en la pantalla de elegir duelo.',
  'Menu de la carte, choix de Chaîne ou de sélection en duel ; les adversaires sur l’écran de choix du duel.',
  'Menu della carta, scelte di Catena o di selezione in un duello; gli avversari nella schermata di scelta del duello.',
  'デュエル中のカードメニュー・チェーン・選択の選択肢、対戦相手選択画面の相手。',
  '듀얼 중 카드 메뉴, 체인이나 선택지, 상대 선택 화면의 상대.',
  'Menu do card, escolhas de Corrente ou de seleção no duelo; os oponentes na tela de escolher o duelo.',
  '决斗中的卡片菜单、连锁或选择项；选择对手界面中的对手。'),
 'Works on every screen with cards.': ('Funktioniert auf jedem Bildschirm mit Karten.', 'Funciona en todas las pantallas con cartas.', 'Fonctionne sur tous les écrans avec des cartes.', 'Funziona in ogni schermata con carte.', 'カードのある全画面で使えます。', '카드가 있는 모든 화면에서 작동합니다.', 'Funciona em toda tela com cards.', '在所有有卡片的界面中都可使用。'),
 'Buy the selected items': ('Ausgewählte Artikel kaufen', 'Comprar lo seleccionado', 'Acheter les articles choisis', 'Compra gli articoli selezionati', '選んだ商品を購入', '선택한 상품 구매', 'Comprar os itens selecionados', '购买所选商品'),
 'Reroll the shop': ('Shop aktualisieren', 'Renovar la tienda', 'Relancer la boutique', 'Cambia il negozio', 'ショップをリロール', '상점 리롤', 'Atualizar a loja', '刷新商店'),
 'Edit deck / Back to shop': ('Deck bearbeiten / Zurück zum Shop', 'Editar deck / Volver a la tienda', 'Modifier le deck / Retour à la boutique', 'Modifica Deck / Torna al negozio', 'デッキ編集／ショップに戻る', '덱 편집 / 상점으로 돌아가기', 'Editar deck / Voltar à loja', '编辑卡组／返回商店'),
 'Previous tab': ('Vorheriger Reiter', 'Pestaña anterior', 'Onglet précédent', 'Scheda precedente', '前のタブ', '이전 탭', 'Aba anterior', '上一个标签页'),
 'Next tab': ('Nächster Reiter', 'Pestaña siguiente', 'Onglet suivant', 'Scheda successiva', '次のタブ', '다음 탭', 'Próxima aba', '下一个标签页'),
 'Main menu: previous': ('Hauptmenü: zurück', 'Menú principal: anterior', 'Menu principal : précédent', 'Menu principale: precedente', 'メインメニュー：前へ', '메인 메뉴: 이전', 'Menu principal: anterior', '主菜单：上一项'),
 'Main menu: next': ('Hauptmenü: weiter', 'Menú principal: siguiente', 'Menu principal : suivant', 'Menu principale: successivo', 'メインメニュー：次へ', '메인 메뉴: 다음', 'Menu principal: próximo', '主菜单：下一项'),
 'Card window: previous card': ('Kartenfenster: vorherige Karte', 'Ventana de carta: carta anterior', 'Fenêtre de carte : carte précédente', 'Finestra carta: carta precedente', 'カード画面：前のカード', '카드 창: 이전 카드', 'Janela do card: card anterior', '卡片窗口：上一张'),
 'Card window: next card': ('Kartenfenster: nächste Karte', 'Ventana de carta: carta siguiente', 'Fenêtre de carte : carte suivante', 'Finestra carta: carta successiva', 'カード画面：次のカード', '카드 창: 다음 카드', 'Janela do card: próximo card', '卡片窗口：下一张'),
 'Always Back': ('Immer Zurück', 'Siempre Atrás', 'Toujours Retour', 'Sempre Indietro', '常に「戻る」', '항상 뒤로', 'Sempre Voltar', '始终为返回'),
 'Click, then press a key': ('Klicken, dann eine Taste drücken', 'Haz clic y pulsa una tecla', 'Cliquez, puis appuyez sur une touche', 'Fai clic, poi premi un tasto', 'クリックしてからキーを押す', '클릭한 뒤 키를 누르세요', 'Clique e pressione uma tecla', '点击后按下一个按键'),
 'Reset to default': ('Auf Standard zurücksetzen', 'Restablecer', 'Rétablir par défaut', 'Ripristina predefinito', '初期設定に戻す', '기본값으로 되돌리기', 'Restaurar padrão', '恢复默认'),
 'Reset All Hotkeys': ('Alle Tastenkürzel zurücksetzen', 'Restablecer todos los atajos', 'Rétablir tous les raccourcis', 'Ripristina tutti i tasti rapidi', 'すべてのホットキーを初期化', '모든 단축키 초기화', 'Restaurar todas as teclas', '重置所有快捷键'),
 'Hotkeys reset to default': ('Tastenkürzel auf Standard zurückgesetzt', 'Atajos restablecidos', 'Raccourcis rétablis par défaut', 'Tasti rapidi ripristinati', 'ホットキーを初期設定に戻しました', '단축키를 기본값으로 되돌렸습니다', 'Teclas de atalho restauradas', '快捷键已恢复默认'),
 'Press a key…': ('Taste drücken …', 'Pulsa una tecla…', 'Appuyez sur une touche…', 'Premi un tasto…', 'キーを押してください…', '키를 누르세요…', 'Pressione uma tecla…', '请按下按键…'),
 'Same key as: {0}': ('Gleiche Taste wie: {0}', 'Misma tecla que: {0}', 'Même touche que : {0}', 'Stesso tasto di: {0}', '同じキー：{0}', '같은 키: {0}', 'Mesma tecla que: {0}', '与此按键相同：{0}'),
 'Swapped with: {0}': ('Getauscht mit: {0}', 'Intercambiada con: {0}', 'Échangée avec : {0}', 'Scambiato con: {0}', '入れ替えました：{0}', '서로 바꿈: {0}', 'Trocada com: {0}', '已与此互换：{0}'),
 "That key can't be used: Esc, Tab, Delete and the browser's F keys keep their own jobs.": (
  'Diese Taste geht nicht: Esc, Tab, Entf und die F-Tasten des Browsers behalten ihre Aufgabe.',
  'Esa tecla no se puede usar: Esc, Tab, Supr y las teclas F del navegador conservan su función.',
  'Cette touche est indisponible : Échap, Tab, Suppr et les touches F du navigateur gardent leur rôle.',
  'Quel tasto non si può usare: Esc, Tab, Canc e i tasti F del browser mantengono la loro funzione.',
  'そのキーは使えません。Esc・Tab・Delete・ブラウザのFキーは本来の機能のままです。',
  '그 키는 쓸 수 없습니다. Esc, Tab, Delete와 브라우저의 F 키는 원래 기능을 유지합니다.',
  'Essa tecla não pode ser usada: Esc, Tab, Delete e as teclas F do navegador mantêm suas funções.',
  '该按键无法使用：Esc、Tab、Delete 和浏览器的 F 键保留原有功能。'),
 'Space': ('Leertaste', 'Espacio', 'Espace', 'Spazio', 'スペース', '스페이스', 'Espaço', '空格'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
