"""New strings of 2026-11-26 in all 8 languages: Ultimate Collector siding Unready, the Tag team coin bonus, the pack window's Staples and other Types, and Name
Changer's Toon sentence (made from the existing relic translation). Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
TERMS = {
 'Unready': {'de': 'Nicht bereit', 'es': 'No listo', 'fr': 'Pas prêt', 'it': 'Non pronto', 'ja': '準備解除', 'ko': '준비 해제', 'pt': 'Não pronto', 'zh': '取消准备'},
 'Change your deck again': {'de': 'Deck erneut ändern', 'es': 'Cambiar tu Deck otra vez', 'fr': 'Modifier à nouveau votre Deck', 'it': 'Modifica di nuovo il tuo Deck', 'ja': 'デッキを再度変更する', 'ko': '덱 다시 변경하기', 'pt': 'Alterar o seu Deck novamente', 'zh': '再次修改卡组'},
 'You are ready. Press Unready to change your deck.': {'de': 'Du bist bereit. Drücke „Nicht bereit“, um dein Deck zu ändern.', 'es': 'Estás listo. Pulsa «No listo» para cambiar tu Deck.', 'fr': 'Vous êtes prêt. Appuyez sur « Pas prêt » pour modifier votre Deck.', 'it': 'Sei pronto. Premi «Non pronto» per modificare il tuo Deck.', 'ja': '準備完了です。デッキを変更するには「準備解除」を押してください。', 'ko': '준비되었습니다. 덱을 바꾸려면 "준비 해제"를 누르세요.', 'pt': 'Você está pronto. Toque em "Não pronto" para alterar o seu Deck.', 'zh': '你已准备。按“取消准备”以修改卡组。'},
 'Staples': {'de': 'Staples', 'es': 'Imprescindibles', 'fr': 'Incontournables', 'it': 'Carte essenziali', 'ja': '汎用カード', 'ko': '범용 카드', 'pt': 'Cartas essenciais', 'zh': '泛用卡'},
 'Other monster types:': {'de': 'Weitere Monstertypen:', 'es': 'Otros tipos de monstruo:', 'fr': 'Autres types de monstres :', 'it': 'Altri tipi di mostro:', 'ja': 'その他のモンスターの種族：', 'ko': '기타 몬스터 종족:', 'pt': 'Outros tipos de monstro:', 'zh': '其他怪兽种族：'},
 'Negate the effects of half of your relics (rounded up) during this Duel, including their benefits and drawbacks. Shop and post-duel effects are unaffected.': {
  'de': 'Annulliere während dieses Duells die Effekte der Hälfte deiner Relikte (aufgerundet), einschließlich ihrer Vorteile und Nachteile. Shop-Effekte und Effekte nach dem Duell sind nicht betroffen.',
  'es': 'Niega los efectos de la mitad de tus reliquias (redondeando hacia arriba) durante este Duelo, incluidos sus beneficios y desventajas. Los efectos de la tienda y de después del duelo no se ven afectados.',
  'fr': "Annulez les effets de la moitié de vos reliques (arrondie au supérieur) durant ce Duel, y compris leurs avantages et leurs inconvénients. Les effets de boutique et d'après-duel ne sont pas affectés.",
  'it': 'Annulla gli effetti di metà delle tue reliquie (arrotondata per eccesso) durante questo Duello, inclusi i loro vantaggi e svantaggi. Gli effetti del negozio e quelli dopo il Duello non sono interessati.',
  'ja': 'このデュエル中、自分のレリックの半分（端数切り上げ）の効果は、メリットもデメリットも無効になる。ショップとデュエル後の効果には影響しない。',
  'ko': '이 듀얼 동안, 자신의 유물 절반(올림)의 효과는 이점과 단점을 포함하여 무효가 된다. 상점 및 듀얼 후 효과는 영향을 받지 않는다.',
  'pt': 'Negue os efeitos de metade das suas relíquias (arredondando para cima) durante este Duelo, incluindo os benefícios e as desvantagens delas. Os efeitos de loja e pós-duelo não são afetados.',
  'zh': '这场决斗中，自己一半遗物（向上取整）的效果无效，包括其增益和代价。商店和决斗后的效果不受影响。'},
 'Relic Seal negates half of your relics until this duel ends.': {'de': 'Reliktsiegel annulliert die Hälfte deiner Relikte, bis dieses Duell endet.', 'es': 'Sello de Reliquias niega la mitad de tus reliquias hasta que termine este duelo.', 'fr': "Sceau des Reliques annule la moitié de vos reliques jusqu'à la fin de ce duel.", 'it': 'Sigillo delle Reliquie annulla metà delle tue reliquie fino alla fine di questo duello.', 'ja': 'レリック封印により、このデュエルが終わるまで自分のレリックの半分は無効になる。', 'ko': '유물 봉인이 이 듀얼이 끝날 때까지 자신의 유물 절반을 무효로 한다.', 'pt': 'Selo de Relíquias nega metade das suas relíquias até o fim deste duelo.', 'zh': '遗物封印使你一半的遗物无效，直到这场决斗结束。'},
 'Delete': {'de': 'Löschen', 'es': 'Eliminar', 'fr': 'Supprimer', 'it': 'Elimina', 'ja': '削除', 'ko': '삭제', 'pt': 'Excluir', 'zh': '删除'},
 "Delete \"{0}\"? This can't be undone.": {'de': '„{0}“ löschen? Das kann nicht rückgängig gemacht werden.', 'es': '¿Eliminar «{0}»? No se puede deshacer.', 'fr': 'Supprimer « {0} » ? Action irréversible.', 'it': 'Eliminare «{0}»? Non si può annullare.', 'ja': '「{0}」を削除しますか？元に戻せません。', 'ko': '"{0}"을(를) 삭제할까요? 되돌릴 수 없습니다.', 'pt': 'Excluir "{0}"? Não é possível desfazer.', 'zh': '删除“{0}”？此操作无法撤销。'},
 'Deleted "{0}".': {'de': '„{0}“ gelöscht.', 'es': '«{0}» eliminado.', 'fr': '« {0} » supprimé.', 'it': '«{0}» eliminato.', 'ja': '「{0}」を削除しました。', 'ko': '"{0}"을(를) 삭제했습니다.', 'pt': '"{0}" excluído.', 'zh': '已删除“{0}”。'},
 'Link ID {0} · Last sync {1}': {'de': 'Link-ID {0} · Letzte Synchronisierung {1}', 'es': 'ID de enlace {0} · Última sincronización {1}', 'fr': 'ID de liaison {0} · Dernière synchro {1}', 'it': 'ID collegamento {0} · Ultima sincronizzazione {1}', 'ja': 'リンクID {0} · 最終同期 {1}', 'ko': '연결 ID {0} · 마지막 동기화 {1}', 'pt': 'ID do vínculo {0} · Última sincronização {1}', 'zh': '关联 ID {0} · 上次同步 {1}'},
 'Last error: {0}': {'de': 'Letzter Fehler: {0}', 'es': 'Último error: {0}', 'fr': 'Dernière erreur : {0}', 'it': 'Ultimo errore: {0}', 'ja': '直近のエラー：{0}', 'ko': '마지막 오류: {0}', 'pt': 'Último erro: {0}', 'zh': '上次错误：{0}'},
 "Or join another device's link with its code": {'de': 'Oder mit dem Code eines anderen Geräts dessen Verknüpfung beitreten', 'es': 'O únete al enlace de otro dispositivo con su código', 'fr': "Ou rejoignez la liaison d'un autre appareil avec son code", 'it': "Oppure unisciti al collegamento di un altro dispositivo con il suo codice", 'ja': 'または、別の端末のコードでそのリンクに参加', 'ko': '또는 다른 기기의 코드로 그 연결에 참여', 'pt': 'Ou entre no vínculo de outro dispositivo com o código dele', 'zh': '或用另一台设备的代码加入它的关联'},
 'Deck Attribute and Type Counts': {'de': 'Attribut- und Typzählung im Deck', 'es': 'Recuento de Atributos y Tipos del Deck', 'fr': 'Décompte des Attributs et Types du Deck', 'it': 'Conteggio di Attributi e Tipi del Deck', 'ja': 'デッキの属性・種族の数', 'ko': '덱 속성 및 종족 수', 'pt': 'Contagem de Atributos e Tipos do Deck', 'zh': '卡组属性与种族统计'},
 'Show how many monsters of each Attribute and Type your Deck holds.': {'de': 'Zeigt, wie viele Monster jedes Attributs und Typs dein Deck enthält.', 'es': 'Muestra cuántos monstruos de cada Atributo y Tipo tiene tu Deck.', 'fr': "Affiche combien de monstres de chaque Attribut et Type contient votre Deck.", 'it': 'Mostra quanti mostri di ogni Attributo e Tipo contiene il tuo Deck.', 'ja': 'デッキに含まれる属性・種族ごとのモンスターの数を表示する。', 'ko': '덱에 속성과 종족별 몬스터가 몇 장 있는지 표시합니다.', 'pt': 'Mostra quantos monstros de cada Atributo e Tipo o seu Deck tem.', 'zh': '显示卡组中各属性和种族的怪兽数量。'},
 'Three of your duelists have beaten Level {0}, so every duelist can start there.': {'de': 'Drei deiner Duellanten haben Stufe {0} geschafft, daher kann jeder Duellant dort beginnen.', 'es': 'Tres de tus duelistas han superado el Nivel {0}, así que todos pueden empezar ahí.', 'fr': 'Trois de vos duellistes ont battu le Niveau {0} : tous peuvent commencer à ce niveau.', 'it': 'Tre dei tuoi duellanti hanno superato il Livello {0}, quindi tutti possono iniziare da lì.', 'ja': '3人のデュエリストがレベル{0}をクリアしたので、全員がそのレベルから始められる。', 'ko': '듀얼리스트 3명이 레벨 {0}을 클리어해서 모든 듀얼리스트가 그 레벨부터 시작할 수 있습니다.', 'pt': 'Três dos seus duelistas venceram o Nível {0}, então todos podem começar nele.', 'zh': '你已有三名决斗者通关等级{0}，所有决斗者都可以从该等级开始。'},
 'Tag team bonus': {'de': 'Tag-Team-Bonus', 'es': 'Bonificación de equipo Tag', 'fr': "Bonus d'équipe Tag", 'it': 'Bonus squadra Tag', 'ja': 'タッグチームボーナス', 'ko': '태그 팀 보너스', 'pt': 'Bônus de equipe Tag', 'zh': '双人组队奖励'},
}
OLD = 'When acquired, choose an archetype. Monsters in your hand, Deck, GY and on the field are also treated as that archetype.'
TOON = {'de': 'Wählst du Toon, werden sie auch zu Toon-Monstern.', 'es': 'Si eliges Toon, también se convierten en monstruos Toon.', 'fr': 'Choisir Toon en fait aussi des monstres Toon.', 'it': 'Scegliendo Toon diventano anche mostri Toon.', 'ja': 'トゥーンを選んだ場合、それらはトゥーンモンスターにもなる。', 'ko': '툰을 고르면 툰 몬스터도 된다.', 'pt': 'Escolher Toon também os torna monstros Toon.', 'zh': '选择卡通时，它们也成为卡通怪兽。'}
SEP = {'ja': '', 'zh': ''}


def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, tr in TERMS.items():table.setdefault(en, tr[lang])
        if OLD in table:table.setdefault(OLD + ' Choosing Toon also makes them Toon monsters.', table[OLD] + SEP.get(lang, ' ') + TOON[lang])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
