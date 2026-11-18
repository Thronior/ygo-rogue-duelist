"""Duel option strings and hover texts in all 8 languages (2026-11-18; a Chinese player on itch.io saw card effect
options in English). Never overwrites an existing translation. Checked by tools/i18n/check_coverage.mjs.

CARD_STRINGS are the effect strings of in-game cards (content.json strings, shown as SELECT_OPTION buttons, Yes/No
questions and selection hints). The client takes a card string's translation from the official database of that
language (data/i18n/cards, matched by string index) unless the ui dictionary has the English text. A language gets an
entry here only when:
- the official database has no string for it in that language, or
- the language is listed in MISALIGNED: there the official string at that index says something else, because the
  game's EDOPro scripts number their strings differently from MyCard's database (Kunai with Chain's "Equip this card"
  showed "Use both effects", the Spirit monsters' effects showed "Return to hand", and so on).
HOVER texts are title attributes; they also get catalog rows (group ui).
"""
import json, re, runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()  # Errno 22 on memory-mapped JSON files
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
ALL = set(LANGS)
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
cards_loc = {l: json.loads((ROOT / f'data/i18n/cards/{l}.json').read_text(encoding='utf8')) for l in LANGS}
QUOTES = {'de': '„{}“', 'es': '"{}"', 'fr': '"{}"', 'it': '"{}"', 'pt': '"{}"', 'ja': '「{}」', 'ko': '「{}」', 'zh': '「{}」'}


def q(lang, cid):
    """The card's official name in that language, quoted the way the language's card texts quote names."""
    return QUOTES[lang].format(cards_loc[lang][str(cid)][0])


def per_lang(fn):
    return tuple(fn(l) for l in LANGS)


AFFECTED = {'de': 'Betroffen von {}', 'es': 'Afectado por {}', 'fr': 'Affecté par {}', 'it': 'Influenzato da {}',
            'ja': '{}の効果を受けている', 'ko': '{}의 효과를 받고 있다', 'pt': 'Afetado por {}', 'zh': '受到{}的影响'}


def affected(cid, rest=None):
    """'Affected by "Card"' and 'Affected by "Card": rest' (client hints of lingering effects)."""
    def one(l):
        head = AFFECTED[l].format(q(l, cid))
        return head if rest is None else head + ('：' if l in ('ja', 'zh') else ' : ' if l == 'fr' else ': ') + rest[LANGS.index(l)]
    return per_lang(one)


CARD_STRINGS = {
 'Pay Life Points': ('LP zahlen', 'Pagar LP', 'Payer des LP', 'Paga LP', 'ライフポイントを払う', 'LP를 지불한다', 'Pagar PV', '支付基本分'),
 'Destroy and inflict damage': ('Zerstören und Schaden zufügen', 'Destruir e infligir daño', 'Détruire et infliger des dommages',
  'Distruggi e infliggi danno', '破壊してダメージを与える', '파괴하고 데미지를 준다', 'Destruir e causar dano', '破坏并给予伤害'),
 'Affected by "Chaos Emperor Dragon - Envoy of the End": cannot activate other cards or effects': affected(82301904, (
  'kann keine anderen Karten oder Effekte aktivieren', 'no puede activar otras cartas o efectos', "ne peut pas activer d'autres cartes ou effets",
  'non può attivare altre carte o effetti', '他のカードや効果を発動できない', '다른 카드나 효과를 발동할 수 없다', 'não pode ativar outros cards ou efeitos',
  '不能发动其他的卡和效果')),
 'Affected by "Cold Wave": cannot activate or Set any Spell/Trap Cards': affected(60682203, (
  'kann keine Zauber-/Fallenkarten aktivieren oder setzen', 'no puede activar ni colocar Cartas Mágicas/de Trampa',
  'ne peut pas activer ni Poser de cartes Magie/Piège', 'non può attivare né posizionare Carte Magia/Trappola', '魔法・罠カードの発動・セットができない',
  '마법 / 함정 카드를 발동하거나 세트할 수 없다', 'não pode ativar nem Baixar Cards de Magia/Armadilha', '不能把魔法·陷阱卡发动和盖放')),
 'Make your attacked monster gain ATK': ('Dein angegriffenes Monster erhält ATK dazu', 'Tu monstruo atacado gana ATK',
  "Votre monstre attaqué gagne de l'ATK", 'Il tuo mostro attaccato guadagna ATK', '攻撃された自分のモンスターの攻撃力をアップする',
  '공격받은 자신의 몬스터의 공격력을 올린다', 'Seu monstro atacado ganha ATK', '被攻击的自己怪兽的攻击力上升'),
 'Double the battle damage and destroy the attacking monster': ('Kampfschaden verdoppeln und das angreifende Monster zerstören',
  'Duplicar el daño de batalla y destruir al monstruo atacante', 'Doubler les dommages de combat et détruire le monstre attaquant',
  'Raddoppia il danno da combattimento e distruggi il mostro attaccante', '戦闘ダメージを倍にし、攻撃モンスターを破壊する',
  '전투 데미지를 배로 하고, 공격 몬스터를 파괴한다', 'Dobrar o dano de batalha e destruir o monstro atacante', '战斗伤害变成2倍，并破坏攻击怪兽'),
 'Affected by "Crush Card Virus"': affected(57728570),
 'Affected by "Cursed Seal of the Forbidden Spell"': affected(58851034),
 'Affected by "Deck Devastation Virus"': affected(35027493),
 'Affected by "Forced Ceasefire"': affected(97806240),
 'Affected by "Gamble"': affected(37313786),
 'Affected by "Limiter Removal"': affected(23171610),
 'Affected by "Sasuke Samurai #2"': affected(11760174),
 'Affected by "Sonic Jammer"': affected(84550200),
 'Affected by "Soul Charge"': affected(54447022),
 'Affected by "Soul Exchange"': affected(68005187),
 'Affected by "Spirit Elimination"': affected(69832741),
 'Affected by "Hieroglyph Lithograph": hand size limit has been changed to 7': affected(10248192, (
  'Handkartenlimit wurde auf 7 geändert', 'el límite de cartas en la mano cambió a 7', 'la limite de cartes en main est passée à 7',
  'il limite di carte in mano è diventato 7', '手札制限枚数が7枚になっている', '패 매수 제한이 7장이 되었다', 'o limite de cards na mão mudou para 7',
  '手卡数量上限变成了7张')),
 'Affected by "Judgment of the Pharaoh": cannot activate or Set Spells/Traps and their Spell/Trap effects are negated': affected(55948544, (
  'kann keine Zauber/Fallen aktivieren oder setzen, und deren Zauber-/Falleneffekte werden annulliert',
  'no puede activar ni colocar Mágicas/Trampas y sus efectos de Mágica/Trampa son negados',
  'ne peut pas activer ni Poser de Magies/Pièges et leurs effets de Magie/Piège sont annulés',
  'non può attivare né posizionare Magie/Trappole e i loro effetti di Magia/Trappola sono annullati',
  '魔法・罠カードの発動・セットができず、その魔法・罠の効果は無効化される', '마법 / 함정 카드를 발동하거나 세트할 수 없으며, 그 마법 / 함정의 효과는 무효화된다',
  'não pode ativar nem Baixar Magias/Armadilhas e os efeitos de Magia/Armadilha dele são negados', '不能把魔法·陷阱卡发动和盖放，其魔法·陷阱的效果无效化')),
 'Affected by "The Agent of Judgment - Saturn": cannot conduct a Battle Phase': affected(91345518, (
  'kann keine Battle Phase durchführen', 'no puede realizar la Battle Phase', 'ne peut pas effectuer de Battle Phase', 'non può effettuare la Battle Phase',
  'バトルフェイズを行えない', '배틀 페이즈를 실행할 수 없다', 'não pode realizar a Fase de Batalha', '不能进行战斗阶段')),
 'Affected by "Maharaghi": will look at top card next Draw Phase': affected(40695128, (
  'sieht sich in der nächsten Draw Phase die oberste Karte an', 'mirará la carta superior en la próxima Draw Phase',
  'regardera la carte du dessus lors de la prochaine Draw Phase', 'guarderà la prima carta nella prossima Draw Phase',
  '次のドローフェイズにデッキの一番上のカードを確認する', '다음 드로우 페이즈에 덱 맨 위의 카드를 확인한다',
  'vai olhar o card do topo na próxima Fase de Compra', '下次的抽卡阶段确认卡组最上面的卡')),
 'Destroy 1 card': ('Zerstöre 1 Karte', 'Destruir 1 carta', 'Détruire 1 carte', 'Distruggi 1 carta', 'カードを1枚破壊する', '카드를 1장 파괴한다',
  'Destruir 1 card', '破坏1张卡'),
 "Attacks all monsters on your opponent's field once each": ('Greift jedes Monster deines Gegners je einmal an',
  'Ataca una vez a cada monstruo en el Campo de tu adversario', 'Attaque une fois chaque monstre sur le Terrain de votre adversaire',
  'Attacca una volta ogni mostro sul Terreno del tuo avversario', '相手フィールドのモンスター全てに1回ずつ攻撃する', '상대 필드의 몬스터 전부에 1번씩 공격한다',
  'Ataca uma vez cada monstro no campo do seu oponente', '向对方场上的全部怪兽各作1次攻击'),
 'Exchange GYs and Decks': ('Friedhöfe und Decks tauschen', 'Intercambiar Cementerios y Decks', 'Échanger Cimetières et Decks', 'Scambia Cimiteri e Deck',
  '墓地とデッキを入れ替える', '묘지와 덱을 바꾼다', 'Trocar Cemitérios e Decks', '墓地和卡组交换'),
 'Please select Head or Tails': ('Wähle Kopf oder Zahl', 'Elige cara o cruz', 'Choisissez Face ou Pile', 'Scegli testa o croce', 'コインの表か裏を選んでください',
  '앞면 또는 뒷면을 선택해 주십시오', 'Escolha cara ou coroa', '请选择硬币的正面或反面'),
 'Destroy all Spells/Traps your opponent controls.': ('Zerstöre alle Zauber/Fallen, die dein Gegner kontrolliert.',
  'Destruye todas las Mágicas/Trampas que controle tu adversario.', 'Détruisez toutes les Magies/Pièges contrôlées par votre adversaire.',
  'Distruggi tutte le Magie/Trappole controllate dal tuo avversario.', '相手フィールドの魔法・罠カードを全て破壊する。', '상대 필드의 마법 / 함정 카드를 전부 파괴한다.',
  'Destrua todas as Magias/Armadilhas que seu oponente controla.', '对方场上的魔法·陷阱卡全部破坏。'),
 'Discards 1 random card': ('Wirft 1 zufällige Karte ab', 'Descarta 1 carta al azar', 'Défausse 1 carte au hasard', 'Scarta 1 carta a caso',
  '手札をランダムに1枚捨てる', '패를 무작위로 1장 버린다', 'Descarta 1 card aleatório', '随机丢弃1张手卡'),
 'Increase your hand size limit to 7': ('Erhöhe dein Handkartenlimit auf 7', 'Aumenta tu límite de cartas en la mano a 7',
  'Augmenter votre limite de cartes en main à 7', 'Aumenta il tuo limite di carte in mano a 7', '手札制限枚数を7枚にする', '패 매수 제한을 7장으로 한다',
  'Aumentar seu limite de cards na mão para 7', '手卡数量上限变成7张'),
 '● "Unity"': per_lang(lambda l: '●' + ('' if l in ('ja', 'ko', 'zh') else ' ') + q(l, 14731897)),
 '● "Yu-Jo Friendship"': per_lang(lambda l: '●' + ('' if l in ('ja', 'ko', 'zh') else ' ') + q(l, 81332143)),
 'Activate both of these effects': ('Beide Effekte aktivieren', 'Activar ambos efectos', 'Activer les deux effets', 'Attiva entrambi gli effetti',
  '両方の効果を発動する', '2가지 효과를 모두 발동한다', 'Ativar ambos os efeitos', '两个效果都发动'),
 'Activate 1 or both of these effects': ('1 oder beide dieser Effekte aktivieren', 'Activar 1 o ambos de estos efectos', 'Activer 1 de ces effets ou les deux',
  'Attiva 1 o entrambi questi effetti', 'これらの効果の1つまたは両方を発動する', '이 효과 중 1개 또는 2개 모두 발동한다', 'Ativar 1 ou ambos estes efeitos',
  '发动这些效果的1个或者两个'),
 'Change the attacking monster to Defense Position': ('Das angreifende Monster in die Verteidigungsposition ändern',
  'Cambiar el monstruo atacante a Posición de Defensa', 'Mettre le monstre attaquant en Position de Défense', 'Cambiare il mostro attaccante in Posizione di Difesa',
  '攻撃モンスター１体を守備表示にする', '공격 몬스터를 수비 표시로 한다', 'Mudar o monstro atacante para a Posição de Defesa', '把攻击怪兽变成守备表示'),
 'Equip this card to a face-up monster you control': ('Rüste diese Karte an ein offenes Monster, das du kontrollierst',
  'Equipa esta carta a un monstruo boca arriba que controles', 'Équiper cette carte à un monstre face recto que vous contrôlez',
  'Equipaggia questa carta a un mostro scoperto che controlli', 'このカードを自分フィールドの表側表示モンスターに装備する',
  '이 카드를 자신 필드의 앞면 표시 몬스터에 장착한다', 'Equipar este card a um monstro com a face para cima que você controla', '把这张卡给自己场上的表侧表示怪兽装备'),
 'Double the ATK of all Machine monsters you control': ('Verdopple die ATK aller Maschinen-Monster, die du kontrollierst',
  'Duplica el ATK de todos los monstruos Máquina que controles', "Doubler l'ATK de tous les monstres Machine que vous contrôlez",
  "Raddoppia l'ATK di tutti i mostri Macchina che controlli", '自分フィールドの機械族モンスターの攻撃力を倍にする', '자신 필드의 기계족 몬스터의 공격력을 배로 한다',
  'Dobrar o ATK de todos os monstros Máquina que você controla', '自己场上的机械族怪兽的攻击力变成2倍'),
 'Destroy 1 monster?': ('1 Monster zerstören?', '¿Destruir 1 monstruo?', 'Détruire 1 monstre ?', 'Distruggere 1 mostro?', 'モンスター1体を破壊しますか？',
  '몬스터 1장을 파괴하겠습니까?', 'Destruir 1 monstro?', '是否破坏1只怪兽？'),
 'Return 1 monster to the Deck and 1 to the hand': ('1 Monster ins Deck und 1 auf die Hand zurückgeben', 'Devolver 1 monstruo al Deck y 1 a la mano',
  'Renvoyer 1 monstre au Deck et 1 à la main', 'Rimanda 1 mostro nel Deck e 1 in mano', 'モンスター1体をデッキに、1体を手札に戻す',
  '몬스터 1장을 덱으로, 1장을 패로 되돌린다', 'Devolver 1 monstro ao Deck e 1 para a mão', '1只怪兽回到卡组，1只回到手卡'),
 'Activate effect': ('Effekt aktivieren', 'Activar efecto', "Activer l'effet", "Attiva l'effetto", '効果を発動する', '효과를 발동한다', 'Ativar efeito', '发动效果'),
 'Place 1 face-up monster to the top of the Deck': ('Lege 1 offenes Monster oben auf das Deck', 'Coloca 1 monstruo boca arriba en la parte superior del Deck',
  'Placer 1 monstre face recto au-dessus du Deck', 'Metti 1 mostro scoperto in cima al Deck', '表側表示モンスター1体をデッキの一番上に置く',
  '앞면 표시 몬스터 1장을 덱 맨 위에 놓는다', 'Colocar 1 monstro com a face para cima no topo do Deck', '把1只表侧表示怪兽放到卡组最上面'),
 'Make 1 "Ninja" monster you control indestructible by battle': ('Mache 1 „Ninja“-Monster, das du kontrollierst, unzerstörbar durch Kampf',
  'Haz que 1 monstruo "Ninja" que controles no pueda ser destruido en batalla', 'Rendre 1 monstre "Ninja" que vous contrôlez indestructible au combat',
  'Rendi 1 mostro "Ninja" che controlli indistruttibile in battaglia', '自分の「忍者」モンスター1体を戦闘では破壊されないようにする',
  '자신의 「닌자」 몬스터 1장을 전투로 파괴되지 않게 한다', 'Torne 1 monstro "Ninja" que você controla indestrutível em batalha', '自己的1只「忍者」怪兽不会被战斗破坏'),
 'Destroy all cards your opponent controls': ('Zerstöre alle Karten, die dein Gegner kontrolliert', 'Destruye todas las cartas que controle tu adversario',
  'Détruisez toutes les cartes contrôlées par votre adversaire', 'Distruggi tutte le carte controllate dal tuo avversario', '相手フィールドのカードを全て破壊する',
  '상대 필드의 카드를 전부 파괴한다', 'Destrua todos os cards que seu oponente controla', '对方场上的卡全部破坏'),
 'Return Monster Cards to hand?': ('Monsterkarten auf die Hand zurückgeben?', '¿Devolver Cartas de Monstruo a la mano?', 'Renvoyer des cartes Monstre à la main ?',
  'Far tornare Carte Mostro in mano?', 'モンスターを手札に戻しますか？', '몬스터 카드를 패로 되돌리겠습니까?', 'Devolver Cards de Monstro para a mão?', '是否让怪兽卡回到手卡？'),
 "Destroy your opponent's monsters": ('Zerstöre Monster deines Gegners', 'Destruir monstruos de tu adversario', 'Détruire les monstres de votre adversaire',
  'Distruggi i mostri del tuo avversario', '相手のモンスターを破壊する', '상대의 몬스터를 파괴한다', 'Destruir os monstros do seu oponente', '破坏对方的怪兽'),
 'All results become head': ('Alle Ergebnisse werden Kopf', 'Todos los resultados son cara', 'Tous les résultats deviennent Face', 'Tutti i risultati diventano testa',
  '全ての結果が表になる', '모든 결과가 앞면이 된다', 'Todos os resultados viram cara', '所有结果都变成正面'),
 # The English string is the script's; the card searches a Level 4 or lower Warrior.
 'Search 1 Level 4 or Warrior monster': ('Suche 1 Krieger-Monster der Stufe 4 oder niedriger', 'Busca 1 monstruo Guerrero de Nivel 4 o menor',
  'Chercher 1 monstre Guerrier de Niveau 4 ou moins', 'Cerca 1 mostro Guerriero di Livello 4 o inferiore', 'レベル4以下の戦士族モンスター1体をサーチする',
  '레벨 4 이하의 전사족 몬스터 1장을 서치한다', 'Procurar 1 monstro Guerreiro de Nível 4 ou menos', '检索1只4星以下的战士族怪兽'),
 'Draw 1 card?': ('1 Karte ziehen?', '¿Robar 1 carta?', 'Piocher 1 carte ?', 'Pescare 1 carta?', 'カードを1枚ドローしますか？', '1장 드로우하겠습니까?',
  'Comprar 1 card?', '是否抽1张卡？'),
 'Return 1 Spell/Trap your opponent controls to the hand': ('Gib 1 Zauber/Falle, die dein Gegner kontrolliert, auf die Hand zurück',
  'Devuelve a la mano 1 Mágica/Trampa que controle tu adversario', 'Renvoyer à la main 1 Magie/Piège contrôlée par votre adversaire',
  'Fai tornare in mano 1 Magia/Trappola controllata dal tuo avversario', '相手フィールドの魔法・罠カード1枚を手札に戻す', '상대 필드의 마법 / 함정 카드 1장을 패로 되돌린다',
  'Devolva para a mão 1 Magia/Armadilha que seu oponente controla', '对方场上1张魔法·陷阱卡回到手卡'),
 'Please declare type': ('Bitte deklariere eine Kartenart', 'Declara un tipo de carta', 'Déclarez un type de carte', 'Dichiara un tipo di carta',
  'カードの種類を宣言してください', '카드의 종류를 선언해 주십시오', 'Declare um tipo de card', '请宣言卡的种类'),
 'Roll die': ('Würfeln', 'Lanzar el dado', 'Lancer le dé', 'Tira il dado', 'サイコロを振る', '주사위를 굴린다', 'Rolar o dado', '掷骰子'),
 'Halves DEF': ('Halbiert die DEF', 'Reduce a la mitad la DEF', 'Divise la DEF par deux', 'Dimezza la DEF', '守備力は半分になる', '수비력을 절반으로 한다',
  'Reduz a DEF pela metade', '守备力变成一半'),
 'Destroy all other face-up monsters': ('Zerstöre alle anderen offenen Monster', 'Destruye todos los demás monstruos boca arriba',
  'Détruire tous les autres monstres face recto', 'Distruggi tutti gli altri mostri scoperti', 'このカード以外の表側表示モンスターを全て破壊する',
  '이 카드 이외의 앞면 표시 몬스터를 전부 파괴한다', 'Destruir todos os outros monstros com a face para cima', '这张卡以外的表侧表示怪兽全部破坏'),
 "Take control of an opponent's monster": ('Übernimm die Kontrolle über ein Monster deines Gegners', 'Toma el control de un monstruo de tu adversario',
  "Prendre le contrôle d'un monstre de votre adversaire", "Prendi il controllo di un mostro dell'avversario", '相手モンスターのコントロールを得る',
  '상대 몬스터의 컨트롤을 얻는다', 'Tomar o controle de um monstro do seu oponente', '得到对方怪兽的控制权'),
 "Change the battle position of an opponent's monster": ('Ändere die Kampfposition eines Monsters deines Gegners',
  'Cambia la posición de batalla de un monstruo de tu adversario', "Changer la position de combat d'un monstre de votre adversaire",
  'Cambia la posizione di battaglia di un mostro del tuo avversario', '相手モンスターの表示形式を変更する', '상대 몬스터의 표시 형식을 변경한다',
  'Mudar a posição de batalha de um monstro do seu oponente', '改变对方怪兽的表示形式'),
 'Banish 1 Fish, Sea Serpent, or Aqua you control': ('Verbanne 1 Fisch-, Seeschlangen- oder Aqua-Monster, das du kontrollierst',
  'Destierra 1 monstruo Pez, Serpiente Marina o Aqua que controles', 'Bannir 1 monstre Poisson, Serpent de Mer ou Aqua que vous contrôlez',
  'Bandisci 1 mostro Pesce, Serpente Marino o Aqua che controlli', '自分の魚族・海竜族・水族モンスター1体を除外する', '자신의 어류족 / 해룡족 / 물족 몬스터 1장을 제외한다',
  'Banir 1 monstro Peixe, Serpente Marinha ou Aqua que você controla', '把自己的1只鱼族·海龙族·水族怪兽除外'),
 'Special Summon the monster(s) banished by this card': ('Beschwöre das/die durch diese Karte verbannte(n) Monster als Spezialbeschwörung',
  'Invoca de Modo Especial el/los monstruo(s) desterrado(s) por esta carta', 'Invoquer Spécialement le(s) monstre(s) banni(s) par cette carte',
  'Evoca Specialmente il/i mostro/i banditi da questa carta', 'このカードの効果で除外したモンスターを特殊召喚する', '이 카드의 효과로 제외한 몬스터를 특수 소환한다',
  'Invocar por Invocação Especial o(s) monstro(s) banido(s) por este card', '把这张卡的效果除外的怪兽特殊召唤'),
 'Gain LP equal to battle damage': ('Erhalte LP in Höhe des Kampfschadens', 'Gana LP iguales al daño de batalla', 'Gagner des LP égaux aux dommages de combat',
  'Guadagna LP pari al danno da combattimento', '与えた戦闘ダメージの数値分ライフポイントを回復する', '준 전투 데미지만큼 LP를 회복한다',
  'Ganhar PV iguais ao dano de batalha', '回复给予的战斗伤害数值的基本分'),
 'Head': ('Kopf', 'Cara', 'Face', 'Testa', '表', '앞면', 'Cara', '正面'),
 'Tail': ('Zahl', 'Cruz', 'Pile', 'Croce', '裏', '뒷면', 'Coroa', '反面'),
 'Make your opponent skip their next Battle Phase': ('Dein Gegner überspringt seine nächste Battle Phase', 'Tu adversario se salta su próxima Battle Phase',
  'Votre adversaire passe sa prochaine Battle Phase', 'Il tuo avversario salta la sua prossima Battle Phase', '相手は次のバトルフェイズをスキップする',
  '상대는 다음 배틀 페이즈를 스킵한다', 'Seu oponente pula a próxima Fase de Batalha dele', '对方跳过下次的战斗阶段'),
 'Make your opponent skip their next Draw Phase': ('Dein Gegner überspringt seine nächste Draw Phase', 'Tu adversario se salta su próxima Draw Phase',
  'Votre adversaire passe sa prochaine Draw Phase', 'Il tuo avversario salta la sua prossima Draw Phase', '相手は次のドローフェイズをスキップする',
  '상대는 다음 드로우 페이즈를 스킵한다', 'Seu oponente pula a próxima Fase de Compra dele', '对方跳过下次的抽卡阶段'),
 'Make your opponent discard their hand in their next Draw Phase': ('Dein Gegner wirft in seiner nächsten Draw Phase seine Hand ab',
  'Tu adversario descarta su mano en su próxima Draw Phase', 'Votre adversaire défausse sa main lors de sa prochaine Draw Phase',
  'Il tuo avversario scarta la sua mano nella sua prossima Draw Phase', '相手は次のドローフェイズに手札を全て捨てる', '상대는 다음 드로우 페이즈에 패를 전부 버린다',
  'Seu oponente descarta a mão dele na próxima Fase de Compra', '对方在下次的抽卡阶段丢弃全部手卡'),
 'Look at your top card next Draw Phase': ('Sieh dir in der nächsten Draw Phase die oberste Karte deines Decks an',
  'Mira la carta superior de tu Deck en tu próxima Draw Phase', 'Regarder la carte du dessus de votre Deck lors de la prochaine Draw Phase',
  'Guarda la prima carta del tuo Deck nella prossima Draw Phase', '次のドローフェイズにデッキの一番上のカードを確認する',
  '다음 드로우 페이즈에 덱 맨 위의 카드를 확인한다', 'Olhar o card do topo do seu Deck na próxima Fase de Compra', '下次的抽卡阶段确认卡组最上面的卡'),
 'Pay 700LP?': ('700 LP zahlen?', '¿Pagar 700 LP?', 'Payer 700 LP ?', 'Pagare 700 LP?', '７００ライフポイントを払いますか？', '700 LP를 지불하시겠습니까?',
  'Pagar 700 PV?', '是否支付700基本分？'),
 'Activate the effect of "Needle Ball"?': per_lang(lambda l: {'de': 'Den Effekt von {} aktivieren?', 'es': '¿Activar el efecto de {}?',
  'fr': "Activer l'effet de {} ?", 'it': "Attivare l'effetto di {}?", 'ja': '{}の効果を発動しますか？', 'ko': '{}의 효과를 발동하겠습니까?',
  'pt': 'Ativar o efeito de {}?', 'zh': '是否发动{}的效果？'}[l].format(q(l, 94230224))),
 **{en: per_lang(lambda l, cid=cid, ask=ask: {'de': 'Den Effekt von {} aktivieren?', 'es': ('¿Quieres activar el efecto de {}?' if ask else '¿Activar el efecto de {}?'),
  'fr': "Activer l'effet de {} ?", 'it': "Attivare l'effetto di {}?", 'ja': '{}の効果を発動しますか？', 'ko': '{}의 효과를 발동하겠습니까?',
  'pt': 'Ativar o efeito de {}?', 'zh': '是否发动{}的效果？'}[l].format(q(l, cid))) for en, cid, ask in [
  ('Activate effect of "Royal Oppression"?', 93016201, False), ('Activate the effect of "Skull Lair"?', 6733059, False),
  ('Do you want to activate the effect of "Soul Demolition"?', 76297408, True), ('Activate the effect of "The Dragon\'s Bead"?', 92408984, False),
  ('Activate the effect of "Type Zero Magic Crusher"?', 21237481, False), ('Use the effect of "Ordeal of a Traveler"?', 39537362, False)]},
 'Do you want to change attack target?':('Angriffsziel ändern?', '¿Quieres cambiar el objetivo del ataque?', "Changer la cible de l'attaque ?",
  "Cambiare il bersaglio dell'attacco?", '攻撃対象を変更しますか？', '공격 대상을 변경하겠습니까?', 'Mudar o alvo do ataque?', '是否要改变攻击对象？'),
 'Reflect damage': ('Schaden zurückwerfen', 'Reflejar el daño', 'Renvoyer les dommages', 'Rifletti il danno', 'ダメージを跳ね返す', '데미지를 되돌린다',
  'Refletir o dano', '反弹伤害'),
 'Flip 1 monster face-down': ('1 Monster verdeckt drehen', 'Pon boca abajo 1 monstruo', 'Mettre 1 monstre face verso', 'Gira coperto 1 mostro',
  'モンスター1体を裏側守備表示にする', '몬스터 1장을 뒷면 수비 표시로 한다', 'Virar 1 monstro com a face para baixo', '把1只怪兽变成里侧守备表示'),
 'Set monster': ('Monster setzen', 'Colocar monstruo', 'Poser un monstre', 'Posiziona un mostro', 'モンスターをセット', '몬스터를 세트', 'Baixar monstro', '盖放怪兽'),
 'Monster card': ('Monsterkarte', 'Carta de Monstruo', 'Carte Monstre', 'Carta Mostro', 'モンスターカード', '몬스터 카드', 'Card de Monstro', '怪兽卡'),
 'Spell card': ('Zauberkarte', 'Carta Mágica', 'Carte Magie', 'Carta Magia', '魔法カード', '마법 카드', 'Card de Magia', '魔法卡'),
 'Trap card': ('Fallenkarte', 'Carta de Trampa', 'Carte Piège', 'Carta Trappola', '罠カード', '함정 카드', 'Card de Armadilha', '陷阱卡'),
 'Please declare the type of card': ('Bitte deklariere einen Kartentyp', 'Declara el tipo de carta', 'Déclarez le type de carte', 'Dichiara il tipo di carta',
  'カードの種類を宣言して下さい', '카드의 종류를 선언해 주십시오', 'Declare o tipo de card', '请宣言卡的种类'),
 'Rearrange': ('Neu anordnen', 'Reordenar', 'Réorganiser', 'Riordina', '並べ替える', '재배치한다', 'Reorganizar', '重新排列'),
 'Add to hand?': ('Der Hand hinzufügen?', '¿Añadir a la mano?', 'Ajouter à la main ?', 'Aggiungere alla mano?', 'カードを手札に加えますか？', '패에 넣겠습니까?',
  'Adicionar à mão?', '是否加入手卡？'),
 'Destroy 1 Spell/Trap on the field': ('Zerstöre 1 Zauber/Falle auf dem Spielfeld', 'Destruir 1 carta Mágica/Trampa en el Campo',
  'Détruire 1 Magie/Piège sur le Terrain', 'Distruggi 1 Magia/Trappola sul Terreno', 'フィールドの魔法・罠カード1枚を破壊する', '필드의 마법 / 함정 카드 1장을 파괴한다',
  'Destruir 1 Magia/Armadilha no campo', '破坏场上1张魔法·陷阱卡'),
 'Destroy as many WATER monsters you control as possible': ('Zerstöre so viele WASSER-Monster, die du kontrollierst, wie möglich',
  'Destruye tantos monstruos de AGUA que controles como sea posible', 'Détruire autant de monstres EAU que vous contrôlez que possible',
  'Distruggi quanti più mostri ACQUA che controlli possibile', '自分フィールドの水属性モンスターをできる限り破壊する', '자신 필드의 물 속성 몬스터를 가능한 한 파괴한다',
  'Destruir o máximo possível de monstros de ÁGUA que você controla', '尽可能破坏自己场上的水属性怪兽'),
 'Equip 1 Union monster to an appropriate monster': ('Rüste 1 Union-Monster an ein passendes Monster', 'Equipa 1 monstruo de Unión a un monstruo apropiado',
  'Équiper 1 monstre Union à un monstre approprié', 'Equipaggia 1 mostro Unione a un mostro appropriato', 'ユニオンモンスターを装備する',
  '유니온 몬스터 1장을 알맞은 몬스터에 장착한다', 'Equipar 1 monstro União a um monstro apropriado', '把1只同盟怪兽给适当的怪兽装备'),
 'FLIP': ('FLIPP', 'VOLTEO', 'FLIP', 'SCOPRI', 'リバース', '리버스', 'VIRE', '反转'),
 'FLIP: Draw 1 card': ('FLIPP: Ziehe 1 Karte', 'VOLTEO: Roba 1 carta', 'FLIP : Piochez 1 carte', 'SCOPRI: Pesca 1 carta', 'リバース：カードを1枚ドローする',
  '리버스: 1장 드로우한다', 'VIRE: Compre 1 card', '反转：抽1张卡'),
 'Halve the ATK of a monster and increase the ATK of another': ('Halbiere die ATK eines Monsters und erhöhe die ATK eines anderen',
  'Reduce a la mitad el ATK de un monstruo y aumenta el ATK de otro', "Diviser par deux l'ATK d'un monstre et augmenter l'ATK d'un autre",
  "Dimezza l'ATK di un mostro e aumenta l'ATK di un altro", 'モンスター1体の攻撃力を半分にし、別のモンスターの攻撃力をアップする',
  '몬스터 1장의 공격력을 절반으로 하고, 다른 몬스터의 공격력을 올린다', 'Reduzir pela metade o ATK de um monstro e aumentar o ATK de outro',
  '1只怪兽的攻击力变成一半，另1只怪兽的攻击力上升'),
 'Select the monster to halve its ATK': ('Wähle das Monster, dessen ATK halbiert wird', 'Selecciona el monstruo cuyo ATK se reduce a la mitad',
  "Sélectionnez le monstre dont l'ATK est divisée par deux", "Seleziona il mostro il cui ATK viene dimezzato", '攻撃力を半分にするモンスターを選択してください',
  '공격력이 절반이 될 몬스터를 선택해 주십시오', 'Escolha o monstro cujo ATK é reduzido pela metade', '请选择攻击力变成一半的怪兽'),
 'Reduce DEF to 0': ('DEF auf 0 senken', 'Reducir la DEF a 0', 'Réduire la DEF à 0', 'Riduci la DEF a 0', '守備力を０にする', '수비력을 0으로 한다',
  'Reduzir a DEF para 0', '守备力变成0'),
 'Reveal 1 Set card': ('Eine gesetzte Karte vorzeigen', 'Revelar 1 carta colocada', 'Révéler une carte Posée', 'Rivelare una carta Posizionata',
  'セットされたカード1枚を確認する', '세트된 카드를 확인', 'Revelar um card Baixado', '确认盖卡'),
 'Normal Summon ("Legion the Fiend Jester")': per_lang(lambda l: {'de': 'Normalbeschwörung ({})', 'es': 'Invocar de Modo Normal ({})',
  'fr': 'Invocation Normale ({})', 'it': 'Evocazione Normale ({})', 'ja': '通常召喚（{}）', 'ko': '일반 소환 ({})', 'pt': 'Invocação-Normal ({})',
  'zh': '通常召唤（{}）'}[l].format(q(l, 25280974))),
 'Special Summon ("Megarock Dragon")': per_lang(lambda l: {'de': 'Spezialbeschwörung ({})', 'es': 'Invocar de Modo Especial ({})',
  'fr': 'Invocation Spéciale ({})', 'it': 'Evocazione Speciale ({})', 'ja': '特殊召喚（{}）', 'ko': '특수 소환 ({})', 'pt': 'Invocação-Especial ({})',
  'zh': '特殊召唤（{}）'}[l].format(q(l, 71544954))),
 'Activate using "Makyura the Destructor"': per_lang(lambda l: {'de': 'Aktiviere, indem du den Effekt von {} anwendest.',
  'es': 'Activar aplicando el efecto de {}', 'fr': "Activer en appliquant l'effet de {}", 'it': "Attiva applicando l'effetto di {}",
  'ja': '{}の効果で発動する', 'ko': '{}의 효과로 발동한다', 'pt': 'Ativar aplicando o efeito de {}', 'zh': '适用{}的效果来发动'}[l].format(q(l, 21593977))),
}
# Official strings in the language's card database are absent (the rule above), or say something else at that index.
MISALIGNED = {
 'Activate 1 or both of these effects': ALL, 'Activate effect': ALL, 'Change the attacking monster to Defense Position': ALL,
 'Equip this card to a face-up monster you control': ALL, "Change the battle position of an opponent's monster": ALL,
 "Take control of an opponent's monster": ALL, 'Destroy all other face-up monsters': ALL, 'Destroy as many WATER monsters you control as possible': ALL,
 'FLIP: Draw 1 card': ALL, 'Flip 1 monster face-down': ALL, 'Gain LP equal to battle damage': ALL, 'Look at your top card next Draw Phase': ALL,
 'Make your opponent discard their hand in their next Draw Phase': ALL, 'Make your opponent skip their next Battle Phase': ALL,
 'Make your opponent skip their next Draw Phase': ALL, 'Place 1 face-up monster to the top of the Deck': ALL, 'Rearrange': ALL,
 'Select the monster to halve its ATK': ALL, 'Special Summon the monster(s) banished by this card': ALL, '● "Yu-Jo Friendship"': ALL,
 'Halve the ATK of a monster and increase the ATK of another': ALL, 'Banish 1 Fish, Sea Serpent, or Aqua you control': ALL,
 'Add to hand?': ALL - {'es', 'ja'}, 'Destroy 1 Spell/Trap on the field': ALL - {'es'}, 'Equip 1 Union monster to an appropriate monster': ALL - {'ja'},
 'Halves DEF': ALL - {'ja'}, 'Reduce DEF to 0': ALL - {'es', 'ja'}, 'FLIP': {'es', 'ja'}, 'Reveal 1 Set card': {'ja'},
 'Affected by "Maharaghi": will look at top card next Draw Phase': {'ja'},
 'Normal Summon ("Legion the Fiend Jester")': ALL, 'Special Summon ("Megarock Dragon")': ALL - {'es'},
}

HOVER = {
 '{0}: maximum {1} across all decks': ('{0}: höchstens {1} in allen Decks zusammen', '{0}: máximo {1} entre todos los Decks',
  "{0} : maximum {1} dans l'ensemble des Decks", '{0}: massimo {1} in tutti i Deck', '{0}：全デッキ合計で最大{1}枚', '{0}: 모든 덱 합계 최대 {1}장',
  '{0}: máximo de {1} somando todos os Decks', '{0}：所有卡组合计最多{1}张'),
 'Tap to remove; hold for details: {0}': ('Tippen zum Entfernen, halten für Details: {0}', 'Toca para quitar; mantén pulsado para ver detalles: {0}',
  'Touchez pour retirer, maintenez pour les détails : {0}', 'Tocca per rimuovere, tieni premuto per i dettagli: {0}', 'タップで外す・長押しで詳細：{0}',
  '탭하면 제거, 길게 누르면 상세: {0}', 'Toque para remover; segure para ver detalhes: {0}', '点击移除，长按查看详情：{0}'),
 '{0} from the top': ('Position {0} von oben', 'Posición {0} desde arriba', 'Position {0} depuis le dessus', "Posizione {0} dall'alto", '上から{0}枚目',
  '위에서 {0}번째', 'Posição {0} a partir do topo', '从上数第{0}张'),
 '{0} turns elapsed': ('{0} Spielzüge vergangen', '{0} turnos transcurridos', '{0} tours écoulés', '{0} turni trascorsi', '{0}ターン経過', '{0}턴 경과',
  '{0} turnos decorridos', '已经过{0}回合'),
 '{0} Spell Counters': ('{0} Zauberzählmarken', '{0} Contadores Mágicos', '{0} Compteurs Magie', '{0} Segnalini Magia', '魔力カウンター{0}個', '마력 카운터 {0}개',
  '{0} Marcadores de Magia', '{0}个魔力指示物'),
 '{0} win rate': ('Siegquote {0}', 'Porcentaje de victorias: {0}', 'Taux de victoire : {0}', 'Percentuale di vittorie: {0}', '勝率{0}', '승률 {0}',
  'Taxa de vitórias: {0}', '胜率{0}'),
 '{0} picked this': ('{0} hat das gewählt', '{0} eligió esto', '{0} a choisi ceci', '{0} ha scelto questo', '{0}が選択', '{0}님이 선택함', '{0} escolheu isto',
  '{0}选择了这个'),
 'Buy, Reroll and Next duel happen when both players press them': (
  'Kaufen, Aktualisieren und Nächstes Duell werden ausgeführt, wenn beide Spieler sie drücken',
  'Comprar, Renovar y Siguiente duelo se aplican cuando ambos jugadores los pulsan',
  'Acheter, Relancer et Duel suivant ont lieu quand les deux joueurs appuient dessus',
  'Compra, Cambia e Prossimo Duello avvengono quando entrambi i giocatori li premono',
  '購入・リロール・次のデュエルは両方のプレイヤーが押すと実行されます', '구매, 리롤, 다음 듀얼은 두 플레이어가 모두 눌러야 실행됩니다',
  'Comprar, Atualizar e Próximo duelo acontecem quando os dois jogadores os pressionam', '购买、刷新和下一场决斗需双方玩家都按下才会执行'),
 # shop-badges.js "You own {0} {1}" with copy/copies: the more specific patterns win.
 'You own {0} copy': ('Du besitzt {0} Exemplar', 'Tienes {0} copia', 'Vous possédez {0} exemplaire', 'Possiedi {0} copia', '{0}枚所持', '{0}장 보유 중',
  'Você tem {0} cópia', '你拥有{0}张'),
 'You own {0} copies': ('Du besitzt {0} Exemplare', 'Tienes {0} copias', 'Vous possédez {0} exemplaires', 'Possiedi {0} copie', '{0}枚所持', '{0}장 보유 중',
  'Você tem {0} cópias', '你拥有{0}张'),
}


def official_map(lang, ui):
    """English card string -> official string, the way i18n.js buildCardMaps() builds it (first card wins)."""
    content = json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf8'))
    out = {}
    for c in content['cards'] + content['tokenCards']:
        local = cards_loc[lang].get(str(c['id']))
        if not local or len(local) < 3:
            continue
        for i, s in enumerate(c.get('strings') or []):
            k = norm(s or '')
            if k and i < len(local[2]) and local[2][i] and k not in out and k not in ui:
                out[k] = local[2][i]
    return out


def main():
    added = {}
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        official = official_map(lang, table)
        n_opt = n_hover = 0
        for en, values in CARD_STRINGS.items():
            if en in table:
                continue
            if en not in official or lang in MISALIGNED.get(en, ()):
                table[en] = values[i]; n_opt += 1
        for en, values in HOVER.items():
            if en not in table:
                table[en] = values[i]; n_hover += 1
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = (n_opt, n_hover)
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in HOVER:
        if en not in known:
            catalog.append({'group': 'ui', 'en': en, 'kind': 'pattern' if '{0}' in en else 'exact', 'ctx': 'hover text (title), 2026-11-18'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    for lang, (o, h) in added.items():
        print(f'{lang}: {o} option strings, {h} hover texts added')


if __name__ == '__main__':
    main()
