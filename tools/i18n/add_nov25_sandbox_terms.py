"""Sandbox duels (survey answers, 2026-11-25): menu card, setup screen, relic picker, duel options and result.
All 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
NOTHING = ('Nichts wird gespeichert', 'No se guarda nada', "Rien n'est sauvegardé", 'Non viene salvato nulla', '何も保存されません', '아무것도 저장되지 않습니다', 'Nada é salvo', '不会保存任何内容')
SAVED = ('Nichts wurde gespeichert.', 'No se guardó nada.', "Rien n'a été sauvegardé.", 'Non è stato salvato nulla.', '何も保存されていません。', '아무것도 저장되지 않았습니다.', 'Nada foi salvo.', '没有保存任何内容。')
DUEL = ('Sandbox-Duell', 'Duelo sandbox', 'Duel bac à sable', 'Duello sandbox', 'サンドボックスデュエル', '샌드박스 듀얼', 'Duelo sandbox', '沙盒决斗')
CHOOSE = ('Relikte wählen', 'Elegir reliquias', 'Choisir des reliques', 'Scegli reliquie', 'レリックを選ぶ', '유물 선택', 'Escolher relíquias', '选择遗物')
EACH = ('Je 8.000 LP', '8000 LP cada uno', '8000 LP chacun', '8.000 LP ciascuno', '各8000LP', '각 8000 LP', '8.000 LP cada', '各 8000 LP')
TERMS = {
 'Sandbox': ('Sandbox', 'Sandbox', 'Bac à sable', 'Sandbox', 'サンドボックス', '샌드박스', 'Sandbox', '沙盒'),
 'Any deck, any opponent, any relics. Nothing is saved.': (
  'Jedes Deck, jeder Gegner, alle Relikte. Nichts wird gespeichert.',
  'Cualquier deck, cualquier adversario, cualquier reliquia. No se guarda nada.',
  "N'importe quel Deck, adversaire ou relique. Rien n'est sauvegardé.",
  'Qualsiasi Deck, avversario e reliquia. Non viene salvato nulla.',
  '好きなデッキ、好きな相手、好きなレリック。何も保存されません。',
  '어떤 덱이든, 어떤 상대든, 어떤 유물이든. 아무것도 저장되지 않습니다.',
  'Qualquer Deck, qualquer oponente, qualquer relíquia. Nada é salvo.',
  '任意卡组、任意对手、任意遗物。不会保存任何内容。'),
 'Sandbox duel': DUEL,
 'Build any deck and duel any opponent. Nothing here changes your progress.': (
  'Baue ein beliebiges Deck und duelliere dich gegen jeden Gegner. Nichts hier verändert deinen Fortschritt.',
  'Crea cualquier deck y enfréntate a cualquier adversario. Nada de aquí cambia tu progreso.',
  "Construis n'importe quel Deck et affronte n'importe quel adversaire. Rien ici ne modifie ta progression.",
  'Crea qualsiasi Deck e sfida qualsiasi avversario. Nulla qui cambia i tuoi progressi.',
  '好きなデッキを組んで、どの相手ともデュエルできます。ここでの結果は進行状況に影響しません。',
  '원하는 덱을 만들고 어떤 상대와도 듀얼하세요. 여기서는 진행 상황이 바뀌지 않습니다.',
  'Monte qualquer Deck e duele contra qualquer oponente. Nada aqui altera seu progresso.',
  '构筑任意卡组，与任意对手决斗。这里的一切都不会改变你的进度。'),
 '8,000 LP each · Nothing is saved': tuple(f'{a} · {b}' for a,b in zip(EACH,NOTHING)),
 '8,000 LP each': EACH,
 'Nothing is saved': NOTHING,
 'Duel with this deck': ('Mit diesem Deck duellieren', 'Duelo con este deck', 'Duel avec ce Deck', 'Duella con questo Deck', 'このデッキでデュエル', '이 덱으로 듀얼', 'Duelar com este Deck', '用这副卡组决斗'),
 'Choose relics': CHOOSE,
 'Saved deck': ('Gespeichertes Deck', 'Deck guardado', 'Deck enregistré', 'Deck salvato', '保存したデッキ', '저장한 덱', 'Deck salvo', '已保存的卡组'),
 'Choose relics · {0}/{1}': tuple(c+' · {0}/{1}' for c in CHOOSE),
 'Relic name or effect': ('Reliktname oder Effekt', 'Nombre o efecto de la reliquia', 'Nom ou effet de la relique', 'Nome o effetto della reliquia', 'レリック名または効果', '유물 이름 또는 효과', 'Nome ou efeito da relíquia', '遗物名称或效果'),
 'Chosen only': ('Nur gewählte', 'Solo elegidas', 'Choisies seulement', 'Solo scelte', '選択中のみ', '선택한 것만', 'Só escolhidas', '仅已选'),
 '{0}/{1} chosen': ('{0}/{1} gewählt', '{0}/{1} elegidas', '{0}/{1} choisies', '{0}/{1} scelte', '{0}/{1} 選択中', '{0}/{1} 선택됨', '{0}/{1} escolhidas', '已选 {0}/{1}'),
 'Up to {0} relics per side.': ('Höchstens {0} Relikte pro Seite.', 'Hasta {0} reliquias por bando.', "Jusqu'à {0} reliques par camp.", 'Fino a {0} reliquie per lato.', 'レリックは片側{0}個までです。', '한쪽당 유물은 최대 {0}개입니다.', 'Até {0} relíquias por lado.', '每方最多 {0} 个遗物。'),
 'Both decks need at least one Main Deck card.': (
  'Beide Decks brauchen mindestens eine Karte im Main Deck.',
  'Ambos decks necesitan al menos una carta en el Deck Principal.',
  'Les deux Decks doivent avoir au moins une carte dans le Main Deck.',
  'Entrambi i Deck devono avere almeno una carta nel Main Deck.',
  '両方のデッキにメインデッキのカードが1枚以上必要です。',
  '두 덱 모두 메인 덱 카드가 1장 이상 필요합니다.',
  'Os dois Decks precisam de pelo menos um card no Deck Principal.',
  '双方的主卡组都至少需要 1 张卡。'),
 'Restart duel': ('Duell neu starten', 'Reiniciar duelo', 'Recommencer le duel', 'Ricomincia il duello', 'デュエルをやり直す', '듀얼 다시 시작', 'Reiniciar duelo', '重新开始决斗'),
 'Change setup': ('Aufstellung ändern', 'Cambiar configuración', 'Modifier la configuration', 'Cambia configurazione', '設定を変更', '설정 변경', 'Mudar configuração', '更改设置'),
 'Leave sandbox': ('Sandbox verlassen', 'Salir del sandbox', 'Quitter le bac à sable', 'Esci dalla sandbox', 'サンドボックスを終了', '샌드박스 나가기', 'Sair do sandbox', '离开沙盒'),
 'Rematch': ('Revanche', 'Revancha', 'Revanche', 'Rivincita', '再戦', '재대결', 'Revanche', '再战'),
 'Defeat': ('Niederlage', 'Derrota', 'Défaite', 'Sconfitta', '敗北', '패배', 'Derrota', '败北'),
 'The opponent has no relics.': ('Der Gegner hat keine Relikte.', 'El adversario no tiene reliquias.', "L'adversaire n'a aucune relique.", "L'avversario non ha reliquie.", '相手はレリックを持っていません。', '상대에게 유물이 없습니다.', 'O oponente não tem relíquias.', '对手没有遗物。'),
 'Nothing was saved.': SAVED,
 'Sandbox duel · Nothing was saved.': tuple(f'{a} · {b}' for a,b in zip(DUEL,SAVED)),
 'Sandbox duel could not start: {0}': ('Sandbox-Duell konnte nicht starten: {0}', 'No se pudo iniciar el duelo sandbox: {0}', "Le duel bac à sable n'a pas pu démarrer : {0}", 'Impossibile avviare il duello sandbox: {0}', 'サンドボックスデュエルを開始できませんでした：{0}', '샌드박스 듀얼을 시작할 수 없습니다: {0}', 'Não foi possível iniciar o duelo sandbox: {0}', '无法开始沙盒决斗：{0}'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
