"""Balance picks from the live stats (2026-11-16): changed relic texts and cursed relic halves, all 8 languages.
Never overwrites an existing translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
POOL = ' When acquired, add 1 random card from this pool to your card pool.'
# The pool sentence each archetype relic ends with, per language (added after the existing translation of its first sentence).
POOL_T = (' Wenn dieses Relikt erworben wird: Füge deinem Kartenvorrat 1 zufällige Karte aus diesem Vorrat hinzu.',
 ' Cuando obtengas esta reliquia, añade a tu reserva de cartas 1 carta aleatoria de este conjunto.',
 ' Lorsque cette relique est obtenue: ajoutez 1 carte aléatoire de cette liste à votre réserve de cartes.',
 ' Quando viene ottenuta, aggiungi alla tua riserva di carte 1 carta casuale da questa riserva.',
 '入手時、そのプールからランダムなカード1枚を自分のカードプールに加える。',
 ' 이 유물을 얻었을 때, 그 풀에서 무작위 카드 1장을 자신의 카드 풀에 넣는다.',
 ' Quando for adquirida, adicione 1 card aleatório deste acervo à sua reserva de cards.',
 '获得这个遗物时，从那个卡池中随机把1张卡加入自己的卡池。')
ARCHETYPE = [
 'Every shop and reroll offers one additional random card from this pool: Dark Scorpion cards and Don Zaloog.',
 'Every shop and reroll offers one additional random card from this pool: Ninja monsters and Ninjitsu support.',
 'Every shop and reroll offers one additional random card from this pool: Guardian monsters and their dedicated equipment.',
 'Every shop and reroll offers one additional random card from this pool: Destiny Board, Spirit Messages, or Final Countdown.',
]
TERMS = {
 'Dragon monsters you control gain 400 ATK/DEF.': (
  'Alle Drache-Monster, die du kontrollierst, erhalten 400 ATK/DEF.',
  'Los monstruos Dragón que controles ganan 400 ATK/DEF.',
  'Les monstres Dragon que vous contrôlez gagnent 400 ATK/DEF.',
  'I mostri Drago che controlli guadagnano 400 ATK/DEF.',
  '自分フィールドのドラゴン族モンスターの攻撃力・守備力は400アップする。',
  '자신 필드의 드래곤족 몬스터의 공격력 / 수비력은 400 올린다.',
  'Os monstros Dragão que você controla ganham 400 de ATK/DEF.',
  '自己场上的龙族怪兽的攻击力·守备力上升400。'),
 'Spellcaster monsters you control gain 300 ATK. "Dark Magician" monsters you control gain 300 more ATK.': (
  'Alle Hexer-Monster, die du kontrollierst, erhalten 300 ATK. Alle „Dunkler Magier“-Monster, die du kontrollierst, erhalten zusätzlich 300 ATK.',
  'Los monstruos Lanzador de Conjuros que controles ganan 300 ATK. Los monstruos "Mago Oscuro" que controles ganan 300 ATK adicionales.',
  'Les monstres Magicien que vous contrôlez gagnent 300 ATK. Les monstres « Magicien Sombre » que vous contrôlez gagnent 300 ATK supplémentaires.',
  'I mostri Incantatore che controlli guadagnano 300 ATK. I mostri "Mago Nero" che controlli guadagnano altri 300 ATK.',
  '自分フィールドの魔法使い族モンスターの攻撃力は300アップする。自分フィールドの「ブラック・マジシャン」モンスターの攻撃力はさらに300アップする。',
  '자신 필드의 마법사족 몬스터의 공격력은 300 올린다. 자신 필드의 "블랙 매지션" 몬스터의 공격력은 300 더 올린다.',
  'Os monstros Mago que você controla ganham 300 de ATK. Os monstros "Mago Negro" que você controla ganham mais 300 de ATK.',
  '自己场上的魔法师族怪兽的攻击力上升300。自己场上的「黑魔术师」怪兽的攻击力再上升300。'),
 'Adds one extra random Exodia piece you do not own yet to every shop and reroll. Once you own all five, it adds a random Exodia support card instead.': (
  'Fügt jedem Shop und jeder Aktualisierung 1 zusätzliches zufälliges Exodia-Teil hinzu, das du noch nicht besitzt. Sobald du alle fünf besitzt, wird stattdessen 1 zufällige Exodia-Unterstützungskarte hinzugefügt.',
  'Añade a cada tienda y renovación una pieza de Exodia aleatoria extra que aún no tengas. Cuando tengas las cinco, añade en su lugar una carta de apoyo de Exodia aleatoria.',
  "Ajoute à chaque boutique et à chaque relance 1 pièce d'Éxodia aléatoire supplémentaire que vous ne possédez pas encore. Une fois les cinq possédées, ajoute à la place 1 carte de soutien Éxodia aléatoire.",
  'Aggiunge a ogni negozio e cambio 1 pezzo di Exodia casuale extra che non possiedi ancora. Quando li possiedi tutti e cinque, aggiunge invece 1 carta di supporto a Exodia casuale.',
  'すべてのショップとリロールに、まだ持っていないランダムな「エクゾディア」のパーツが1枚追加される。5種類すべて持っている場合、代わりにランダムなエクゾディアのサポートカードが1枚追加される。',
  '모든 상점과 리롤에 아직 가지고 있지 않은 무작위 엑조디아 파츠가 1장 추가로 진열된다. 5종류를 모두 가지고 있다면, 대신 무작위 엑조디아 서포트 카드가 1장 추가로 진열된다.',
  'Adiciona a cada loja e atualização uma peça de Exodia aleatória extra que você ainda não tem. Quando você tiver as cinco, adiciona um card de suporte de Exodia aleatório em vez disso.',
  '每个商店以及每次刷新时，额外加入1张自己还没有的随机艾克佐迪亚部件。5种全部拥有后，改为加入1张随机的艾克佐迪亚支援卡。'),
 'Every shop and reroll offers one additional random card from this pool: Fusion support cards, and Fusion Monsters you own at least one Fusion Material for.': (
  'Jeder Shop und jede Aktualisierung bietet 1 zusätzliche zufällige Karte aus diesem Vorrat an: Fusions-Unterstützungskarten und Fusionsmonster, von deren Fusionsmaterialien du mindestens eines besitzt.',
  'Cada tienda y renovación ofrece una carta aleatoria adicional de este conjunto: cartas de apoyo de Fusión y Monstruos de Fusión de los que tengas al menos un Material de Fusión.',
  "Chaque boutique et chaque relance propose 1 carte aléatoire supplémentaire parmi: les cartes de soutien Fusion et les Monstres Fusion dont vous possédez au moins un Matériel de Fusion.",
  'Ogni negozio e cambio offre 1 carta casuale aggiuntiva da questa riserva: carte di supporto alla Fusione e Mostri Fusione di cui possiedi almeno un Materiale da Fusione.',
  'すべてのショップとリロールに、次のプールからランダムなカードが1枚追加される：融合サポートカードと、融合素材を1枚以上持っている融合モンスター。',
  '모든 상점과 리롤에 다음 풀에서 무작위 카드 1장이 추가로 진열된다: 융합 서포트 카드 및 융합 소재를 1장 이상 가지고 있는 융합 몬스터.',
  'Cada loja e atualização oferece um card aleatório adicional deste acervo: cards de suporte de Fusão e Monstros de Fusão dos quais você tenha pelo menos uma Matéria de Fusão.',
  '每个商店以及每次刷新时，额外从以下卡池中随机提供1张卡：融合支援卡，以及自己至少拥有1张融合素材的融合怪兽。'),
 'Your starting LP become 2,000 in each Duel, before boss LP penalties. Triple your victory coin rewards.': (
  'Deine Start-LP werden in jedem Duell zu 2000, vor LP-Abzügen durch Bosse. Verdreifache deine Münzbelohnungen für Siege.',
  'Tus LP iniciales pasan a ser 2000 en cada Duelo, antes de las penalizaciones de LP de los jefes. Triplica tus recompensas de monedas por victoria.',
  'Vos LP de départ deviennent 2000 dans chaque Duel, avant les pénalités de LP des boss. Triplez vos récompenses en pièces de victoire.',
  'I tuoi LP iniziali diventano 2000 in ogni Duello, prima delle penalità ai LP dei Boss. Triplica le tue ricompense in monete per la vittoria.',
  '各デュエルの自分の初期LPは2,000になる（ボスのLPペナルティの前に適用）。勝利時のコイン報酬は3倍になる。',
  '보스 LP 페널티를 적용하기 전에, 각 듀얼에서 자신의 시작 LP는 2,000이 된다. 승리 코인 보상이 3배가 된다.',
  'Seus PV iniciais se tornam 2000 em cada Duelo, antes das penalidades de PV de chefe. Triplique suas recompensas em moedas de vitória.',
  '①：每场决斗中，自己的初始基本分变成2,000（在首领基本分惩罚之前适用）。②：胜利的金币奖励变成3倍。'),
 'Coin rewards are tripled.': (
  'Münzbelohnungen werden verdreifacht.', 'Las recompensas de monedas se triplican.', 'Les récompenses en pièces sont triplées.',
  'Le ricompense in monete sono triplicate.', 'コイン報酬は3倍になる。', '코인 보상이 3배가 된다.', 'As recompensas em moedas são triplicadas.', '金币奖励变成3倍。'),
 'Once per turn, when you Tribute Summon or Special Summon "Sanga of the Thunder", "Kazejin" or "Suijin", you can Special Summon one of the other two from your hand.': (
  'Einmal pro Spielzug, wenn du „Sanga des Donners“, „Kazejin“ oder „Suijin“ als Tributbeschwörung oder Spezialbeschwörung beschwörst, kannst du eines der anderen beiden als Spezialbeschwörung von deiner Hand beschwören.',
  'Una vez por turno, cuando Invoques por Sacrificio o de Modo Especial "Sanga del Trueno", "Kazejin" o "Suijin", puedes Invocar de Modo Especial uno de los otros dos desde tu mano.',
  "Une fois par tour, lorsque vous Invoquez par Sacrifice ou Invoquez Spécialement « Sanga du Tonnerre », « Kazejin » ou « Suijin », vous pouvez Invoquer Spécialement l'un des deux autres depuis votre main.",
  'Una volta per turno, quando Evochi tramite Tributo o Evochi Specialmente "Sanga del Tuono", "Kazejin" o "Suijin", puoi Evocare Specialmente uno degli altri due dalla tua mano.',
  '1ターンに1度、「雷魔神－サンガ」「風魔神－ヒューガ」「水魔神－スーガ」のいずれかをアドバンス召喚または特殊召喚した時、残り2体のうち1体を手札から特殊召喚できる。',
  '1턴에 1번, "번개 마신－썬가", "풍 마신－휴가", "수 마신－스가" 중 하나를 어드밴스 소환 또는 특수 소환했을 때, 나머지 2장 중 1장을 패에서 특수 소환할 수 있다.',
  'Uma vez por turno, quando você fizer a Invocação-Tributo ou a Invocação-Especial de "Sanga do Trovão", "Kazejin" ou "Suijin", você pode fazer a Invocação-Especial de um dos outros dois da sua mão.',
  '1回合1次，把「雷魔神-桑迦」「风魔神-修迦」「水魔神-斯迦」的其中1只上级召唤或特殊召唤时，可以从手卡把剩下2只的其中1只特殊召唤。'),
 'Once per turn, if you Normal or Special Summon a "Dark Magician" monster: You can add 1 card that mentions "Dark Magician" from your Deck to your hand.': (
  'Einmal pro Spielzug, falls du ein „Dunkler Magier“-Monster als Normal- oder Spezialbeschwörung beschwörst: Du kannst 1 Karte, die „Dunkler Magier“ nennt, von deinem Deck deiner Hand hinzufügen.',
  'Una vez por turno, si Invocas de Modo Normal o Especial un monstruo "Mago Oscuro": puedes añadir a tu mano 1 carta de tu Deck que mencione "Mago Oscuro".',
  'Une fois par tour, si vous Invoquez Normalement ou Spécialement un monstre « Magicien Sombre » : vous pouvez ajouter 1 carte qui mentionne « Magicien Sombre » depuis votre Deck à votre main.',
  'Una volta per turno, se Evochi Normalmente o Specialmente un mostro "Mago Nero": puoi aggiungere alla tua mano 1 carta dal tuo Deck che menziona "Mago Nero".',
  '1ターンに1度、「ブラック・マジシャン」モンスターを通常召喚または特殊召喚した場合に発動できる。「ブラック・マジシャン」のカード名が記されたカード1枚をデッキから手札に加える。',
  '1턴에 1번, "블랙 매지션" 몬스터를 일반 소환 또는 특수 소환했을 경우에 발동할 수 있다. "블랙 매지션"의 카드명이 쓰여진 카드 1장을 덱에서 패에 넣는다.',
  'Uma vez por turno, se você fizer a Invocação-Normal ou a Invocação-Especial de um monstro "Mago Negro": você pode adicionar 1 card que mencione "Mago Negro" do seu Deck à sua mão.',
  '1回合1次，「黑魔术师」怪兽通常召唤或特殊召唤的场合才能发动。从卡组把1张有「黑魔术师」的卡名记述的卡加入手卡。'),
 "Level 5 or higher monsters you control gain 800 ATK. Level 4 or lower monsters you control lose 300 ATK.": (
  'Alle Monster der Stufe 5 oder höher, die du kontrollierst, erhalten 800 ATK. Alle Monster der Stufe 4 oder niedriger, die du kontrollierst, verlieren 300 ATK.',
  'Los monstruos de Nivel 5 o mayor que controles ganan 800 ATK. Los monstruos de Nivel 4 o menor que controles pierden 300 ATK.',
  'Les monstres de min. Niveau 5 que vous contrôlez gagnent 800 ATK. Les monstres de max. Niveau 4 que vous contrôlez perdent 300 ATK.',
  'I mostri di Livello 5 o superiore che controlli guadagnano 800 ATK. I mostri di Livello 4 o inferiore che controlli perdono 300 ATK.',
  '自分フィールドのレベル5以上のモンスターの攻撃力は800アップする。自分フィールドのレベル4以下のモンスターの攻撃力は300ダウンする。',
  '자신 필드의 레벨 5 이상의 몬스터의 공격력은 800 올린다. 자신 필드의 레벨 4 이하의 몬스터의 공격력은 300 내린다.',
  'Os monstros de Nível 5 ou mais que você controla ganham 800 de ATK. Os monstros de Nível 4 ou menos que você controla perdem 300 de ATK.',
  '自己场上的5星以上的怪兽的攻击力上升800。自己场上的4星以下的怪兽的攻击力下降300。'),
 'Level 4 or lower monsters you control lose 300 ATK.': (
  'Alle Monster der Stufe 4 oder niedriger, die du kontrollierst, verlieren 300 ATK.',
  'Los monstruos de Nivel 4 o menor que controles pierden 300 ATK.',
  'Les monstres de max. Niveau 4 que vous contrôlez perdent 300 ATK.',
  'I mostri di Livello 4 o inferiore che controlli perdono 300 ATK.',
  '自分フィールドのレベル4以下のモンスターの攻撃力は300ダウンする。',
  '자신 필드의 레벨 4 이하의 몬스터의 공격력은 300 내린다.',
  'Os monstros de Nível 4 ou menos que você controla perdem 300 de ATK.',
  '自己场上的4星以下的怪兽的攻击力下降300。'),
 'While you control exactly 1 monster, it gains 600 ATK. While you control 2 or more monsters, they lose 400 ATK.': (
  'Solange du genau 1 Monster kontrollierst, erhält es 600 ATK. Solange du 2 oder mehr Monster kontrollierst, verlieren sie 400 ATK.',
  'Mientras controles exactamente 1 monstruo, éste gana 600 ATK. Mientras controles 2 o más monstruos, éstos pierden 400 ATK.',
  'Tant que vous contrôlez exactement 1 monstre, il gagne 600 ATK. Tant que vous contrôlez 2 monstres ou plus, ils perdent 400 ATK.',
  'Mentre controlli esattamente 1 mostro, esso guadagna 600 ATK. Mentre controlli 2 o più mostri, essi perdono 400 ATK.',
  '自分フィールドのモンスターが1体のみの場合、そのモンスターの攻撃力は600アップする。自分フィールドのモンスターが2体以上の場合、それらの攻撃力は400ダウンする。',
  '자신 필드의 몬스터가 1장뿐인 경우, 그 몬스터의 공격력은 600 올린다. 자신 필드의 몬스터가 2장 이상인 경우, 그 몬스터들의 공격력은 400 내린다.',
  'Enquanto você controlar exatamente 1 monstro, ele ganha 600 de ATK. Enquanto você controlar 2 ou mais monstros, eles perdem 400 de ATK.',
  '自己场上的怪兽只有1只的场合，那只怪兽的攻击力上升600。自己场上的怪兽有2只以上的场合，那些怪兽的攻击力下降400。'),
 'While you control exactly 1 monster, it gains 600 ATK.': (
  'Solange du genau 1 Monster kontrollierst, erhält es 600 ATK.',
  'Mientras controles exactamente 1 monstruo, éste gana 600 ATK.',
  'Tant que vous contrôlez exactement 1 monstre, il gagne 600 ATK.',
  'Mentre controlli esattamente 1 mostro, esso guadagna 600 ATK.',
  '自分フィールドのモンスターが1体のみの場合、そのモンスターの攻撃力は600アップする。',
  '자신 필드의 몬스터가 1장뿐인 경우, 그 몬스터의 공격력은 600 올린다.',
  'Enquanto você controlar exatamente 1 monstro, ele ganha 600 de ATK.',
  '自己场上的怪兽只有1只的场合，那只怪兽的攻击力上升600。'),
 'While you control 2 or more monsters, they lose 400 ATK.': (
  'Solange du 2 oder mehr Monster kontrollierst, verlieren sie 400 ATK.',
  'Mientras controles 2 o más monstruos, éstos pierden 400 ATK.',
  'Tant que vous contrôlez 2 monstres ou plus, ils perdent 400 ATK.',
  'Mentre controlli 2 o più mostri, essi perdono 400 ATK.',
  '自分フィールドのモンスターが2体以上の場合、それらの攻撃力は400ダウンする。',
  '자신 필드의 몬스터가 2장 이상인 경우, 그 몬스터들의 공격력은 400 내린다.',
  'Enquanto você controlar 2 ou mais monstros, eles perdem 400 de ATK.',
  '自己场上的怪兽有2只以上的场合，那些怪兽的攻击力下降400。'),
 'Monsters you control can attack directly. They lose 700 ATK.': (
  'Alle Monster, die du kontrollierst, können direkt angreifen. Sie verlieren 700 ATK.',
  'Los monstruos que controles pueden atacar directamente. Pierden 700 ATK.',
  'Les monstres que vous contrôlez peuvent attaquer directement votre adversaire. Ils perdent 700 ATK.',
  'I mostri che controlli possono attaccare direttamente. Perdono 700 ATK.',
  '自分フィールドのモンスターは直接攻撃できる。それらの攻撃力は700ダウンする。',
  '자신 필드의 몬스터는 직접 공격할 수 있다. 그 몬스터들의 공격력은 700 내린다.',
  'Os monstros que você controla podem atacar diretamente. Eles perdem 700 de ATK.',
  '自己场上的怪兽可以直接攻击。那些怪兽的攻击力下降700。'),
 'Monsters you control lose 700 ATK.': (
  'Alle Monster, die du kontrollierst, verlieren 700 ATK.', 'Los monstruos que controles pierden 700 ATK.',
  'Les monstres que vous contrôlez perdent 700 ATK.', 'I mostri che controlli perdono 700 ATK.',
  '自分フィールドのモンスターの攻撃力は700ダウンする。', '자신 필드의 몬스터의 공격력은 700 내린다.',
  'Os monstros que você controla perdem 700 de ATK.', '自己场上的怪兽的攻击力下降700。'),
 'Monsters you control lose 300 ATK. They gain 100 ATK for each time you Ritual Summon a monster after getting this relic, across all Duels.': (
  'Alle Monster, die du kontrollierst, verlieren 300 ATK. Sie erhalten 100 ATK für jedes Mal, das du nach Erhalt dieses Relikts ein Monster als Ritualbeschwörung beschworen hast, über alle Duelle hinweg.',
  'Los monstruos que controlas pierden 300 ATK. Ganan 100 ATK por cada vez que hayas Invocado por Ritual un monstruo después de obtener esta reliquia, en todos los Duelos.',
  'Les monstres que vous contrôlez perdent 300 ATK. Ils gagnent 100 ATK pour chaque fois que vous avez Invoqué Rituellement un monstre après avoir obtenu cette relique, tous Duels confondus.',
  'I mostri che controlli perdono 300 ATK. Guadagnano 100 ATK per ogni volta che hai Evocato tramite Rituale un mostro dopo aver ottenuto questa reliquia, in tutti i Duelli.',
  '自分フィールドのモンスターの攻撃力は300ダウンする。このレリックを入手してから自分が儀式召喚した回数（全デュエル合計）×100、それらの攻撃力はアップする。',
  '자신이 컨트롤하는 몬스터의 공격력은 300 내려간다. 이 유물을 얻은 뒤 의식 소환한 횟수(모든 듀얼 합계) × 100만큼 공격력이 올라간다.',
  'Os monstros que você controla perdem 300 ATK. Eles ganham 100 ATK para cada vez que você Invocou por Ritual um monstro depois de obter esta relíquia, em todos os Duelos.',
  '自己场上的怪兽攻击力下降300。获得此遗物后每进行1次仪式召唤（所有决斗合计），它们的攻击力上升100。'),
 'Monsters you control lose 300 ATK.': (
  'Alle Monster, die du kontrollierst, verlieren 300 ATK.', 'Los monstruos que controles pierden 300 ATK.',
  'Les monstres que vous contrôlez perdent 300 ATK.', 'I mostri che controlli perdono 300 ATK.',
  '自分フィールドのモンスターの攻撃力は300ダウンする。', '자신 필드의 몬스터의 공격력은 300 내린다.',
  'Os monstros que você controla perdem 300 de ATK.', '自己场上的怪兽的攻击力下降300。'),
 'You always go first. Your opening hand contains 1 fewer card (min. 0).': (
  'Du beginnst immer als Erster. Deine Starthand enthält 1 Karte weniger (min. 0).',
  'Siempre juegas en primer lugar. Tu mano inicial contiene 1 carta menos (mín. 0).',
  'Vous jouez toujours en premier. Votre main de départ contient 1 carte en moins (min. 0).',
  'Giochi sempre per primo. La tua mano iniziale contiene 1 carta in meno (min. 0).',
  '自分は常に先攻になる。自分の初期手札は1枚少なくなる（最低0枚）。',
  '자신은 항상 선공이 된다. 자신의 첫 패는 1장 적어진다(최소 0장).',
  'Você sempre joga primeiro. Sua mão inicial contém 1 card a menos (mín. 0).',
  '①：自己总是先攻。②：自己的起手手卡少1张（最少为0张）。'),
 'Your opening hand contains 1 fewer card (min. 0).': (
  'Deine Starthand enthält 1 Karte weniger (min. 0).', 'Tu mano inicial contiene 1 carta menos (mín. 0).',
  'Votre main de départ contient 1 carte en moins (min. 0).', 'La tua mano iniziale contiene 1 carta in meno (min. 0).',
  '自分の初期手札は1枚少なくなる（最低0枚）。', '자신의 첫 패는 1장 적어진다(최소 0장).',
  'Sua mão inicial contém 1 card a menos (mín. 0).', '自己的起手手卡少1张（最少为0张）。'),
 'Your Dark Scorpion monsters and Don Zaloog gain 200 ATK for each face-up matching monster on the field and each matching monster in your GY.': (
  'Deine „Dunkler Skorpion“-Monster und „Don Zaloog“ erhalten 200 ATK für jedes offene passende Monster auf dem Spielfeld und jedes passende Monster in deinem Friedhof.',
  'Tus monstruos "Escorpión Oscuro" y "Don Zaloog" ganan 200 ATK por cada monstruo boca arriba de ese grupo en el Campo y por cada monstruo de ese grupo en tu Cementerio.',
  'Vos monstres "Scorpion Noir" et "Don Zaloog" gagnent 200 ATK pour chaque monstre correspondant face recto sur le Terrain et chaque monstre correspondant dans votre Cimetière.',
  'I tuoi mostri "Dark Scorpion" e "Don Zaloog" guadagnano 200 ATK per ogni mostro corrispondente scoperto sul Terreno e per ogni mostro corrispondente nel tuo Cimitero.',
  '自分の「黒蠍」モンスターと「首領・ザルーグ」の攻撃力は、フィールドの該当する表側表示モンスターと自分の墓地の該当するモンスターの数×200アップする。',
  '자신의 「전갈」 몬스터와 「돈 잘우그」의 공격력은, 필드의 앞면 표시인 그 몬스터들과 자신의 묘지의 그 몬스터들의 수 × 200 올린다.',
  'Seus monstros "Escorpião das Trevas" e "Dom Zaloog" ganham 200 de ATK para cada monstro correspondente com a face para cima no campo e cada monstro correspondente no seu Cemitério.',
  '场上每有1只表侧表示的「黑蝎」怪兽或「首领 扎鲁格」，以及自己墓地每有1只那些怪兽，自己的「黑蝎」怪兽和「首领 扎鲁格」的攻击力上升200。'),
}


def main():
    tables = {}
    for lang in LANGS:
        tables[lang] = json.loads((ROOT / f'data/i18n/ui/{lang}.json').read_text(encoding='utf-8-sig'))
    terms = dict(TERMS)
    # Archetype relics: the existing translation of the pool sentence plus the new "when acquired" sentence.
    for en in ARCHETYPE:
        if all(en in tables[lang] for lang in LANGS):
            terms[en + POOL] = tuple(tables[lang][en] + POOL_T[i] for i, lang in enumerate(LANGS))
        else:
            raise SystemExit('Missing translation of ' + en)
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = tables[lang]
        for en, values in terms.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in terms:
        if en not in known: catalog.append({'group': 'relic', 'en': en, 'kind': 'exact', 'ctx': 'Balance picks (2026-11-16)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(terms))


if __name__ == '__main__':
    main()
