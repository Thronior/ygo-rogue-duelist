"""Deds' 74 card sleeves of 2026-11-20 (tools/add_deds_sleeves.py): every new sleeve name that is not a card in the pool,
and every new unlock condition, in all 8 languages. The Achievements rows show the same name and condition, so they are
translated too. Card names inside a sentence come from each language's official card names (data/i18n/cards), and
duelist names from the UI table. Existing translations are never overwritten; safe to run again."""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
CARDS = {'DM': 46986414, 'DMG': 38033121, 'TW': 71625222, 'RE': 74677422}
# Thousands separators as the existing sleeve texts write them.
SEP = {'de': '.', 'es': '.', 'fr': ' ', 'it': '.', 'ja': '', 'ko': '', 'pt': '.', 'zh': ''}

NAMES = {
 'Ancient Golem': ('Uralter Golem', 'Gólem Antiguo', 'Golem Ancien', 'Golem Antico', '古代のゴーレム', '고대의 골렘', 'Golem Antigo', '古代魔像'),
 'Allure of Darkness': ('Verlockung der Finsternis', 'Atracción de la Oscuridad', 'Attrait des Ténèbres', "Fascino dell'Oscurità", '闇の誘惑', '어둠의 유혹', 'Atração das Trevas', '暗之诱惑'),
 'Divine Serpent Geh': ('Göttliche Schlange Geh', 'Serpiente Divina Geh', 'Serpent Divin Geh', 'Serpente Divino Geh', '蛇神ゲー', '사신 게', 'Serpente Divina Geh', '蛇神 盖'),
 "Gravekeeper's Visionary": ('Seher der Grabwächter', 'Visionario Guardián de la Tumba', 'Visionnaire Gardien du Tombeau', 'Visionario Guardiano delle Tombe', '墓守の大筆頭', '묘지기의 대필두', 'Visionário Guardião da Tumba', '守墓的大笔头'),
 'Jerry Beans Man': ('Jerry Bohnenmann', 'Jerry Hombre Frijol', 'Jerry Beans Man', 'Jerry Uomo Fagiolo', 'ジェリービーンズマン', '젤리빈즈맨', 'Jerry Homem Feijão', '果冻豆人'),
 'Orgoth the Relentless': ('Orgoth der Unerbittliche', 'Orgoth el Implacable', "Orgoth l'Implacable", "Orgoth l'Implacabile", '冷酷なるオーゴス', '냉혹한 오고스', 'Orgoth, o Implacável', '冷酷的奥格斯'),
 'The Seal of Orichalcos': ('Das Siegel von Orichalcos', 'El Sello de Orichalcos', "Le Sceau d'Orichalque", 'Il Sigillo di Orichalcos', 'オレイカルコスの結界', '오레이칼코스의 결계', 'O Selo de Orichalcos', '欧雷卡尔克斯之结界'),
 'VW-Tiger Catapult': ('VW-Tiger Catapult', 'VW-Tiger Catapult', 'VW-Tiger Catapult', 'VW-Tiger Catapult', 'VW－タイガー・カタパルト', 'VW-타이거 캐터펄트', 'VW-Tiger Catapult', 'VW-虎式弹射器'),
 'VWXYZ-Dragon Catapult Cannon': ('VWXYZ-Dragon Catapult Cannon', 'VWXYZ-Dragon Catapult Cannon', 'VWXYZ-Dragon Catapult Cannon', 'VWXYZ-Dragon Catapult Cannon', 'VWXYZ－ドラゴン・カタパルトキャノン', 'VWXYZ-드래곤 캐터펄트 캐논', 'VWXYZ-Dragon Catapult Cannon', 'VWXYZ-龙弹射加农炮'),
}

TERMS = {
 'Summon Dark Magician.': ('Beschwöre {DM}.', 'Invoca a {DM}.', 'Invoquez {DM}.', 'Evoca {DM}.', '{DM}を召喚する。', '{DM}을(를) 소환한다.', 'Invoque {DM}.', '召唤{DM}。'),
 'Deal the final blow with Dark Magician Girl.': ('Versetze den letzten Schlag mit {DMG}.', 'Asesta el golpe final con {DMG}.', 'Portez le coup final avec {DMG}.', 'Infliggi il colpo finale con {DMG}.', '{DMG}でとどめを刺す。', '{DMG}(으)로 결정타를 날린다.', 'Dê o golpe final com {DMG}.', '用{DMG}给予最后一击。'),
 'Deal the final blow with a monster that has 3,000 or more ATK.': ('Versetze den letzten Schlag mit einem Monster mit 3.000 oder mehr ATK.', 'Asesta el golpe final con un monstruo que tenga 3.000 o más de ATK.', 'Portez le coup final avec un monstre ayant 3 000 ATK ou plus.', 'Infliggi il colpo finale con un mostro che ha 3.000 o più ATK.', '攻撃力3000以上のモンスターでとどめを刺す。', '공격력 3000 이상의 몬스터로 결정타를 날린다.', 'Dê o golpe final com um monstro que tenha 3.000 ou mais de ATK.', '用攻击力3000以上的怪兽给予最后一击。'),
 'Win 10 duels while you control Red-Eyes Black Dragon (across runs).': ('Gewinne 10 Duelle, während du {RE} kontrollierst (über mehrere Durchläufe).', 'Gana 10 Duelos mientras controlas a {RE} (entre partidas).', 'Gagnez 10 Duels en contrôlant {RE} (sur plusieurs parties).', 'Vinci 10 Duelli mentre controlli {RE} (in più partite).', '{RE}をコントロールしている状態でデュエルに10回勝利する（ラン通算）。', '{RE}을(를) 컨트롤한 상태로 듀얼에서 10번 승리한다 (런 누적).', 'Vença 10 Duelos enquanto controla {RE} (em várias Jornadas).', '在自己场上有{RE}的状态下赢得10场决斗（跨冒险累计）。'),
 'Win a duel while you control a "Harpie" monster.': ('Gewinne ein Duell, während du ein „Harpyie“-Monster kontrollierst.', 'Gana un Duelo mientras controlas un monstruo "Arpía".', 'Gagnez un Duel en contrôlant un monstre « Harpie ».', 'Vinci un Duello mentre controlli un mostro "Arpia".', '「ハーピィ」モンスターをコントロールしている状態でデュエルに勝利する。', '"하피" 몬스터를 컨트롤한 상태로 듀얼에서 승리한다.', 'Vença um Duelo enquanto controla um monstro "Harpia".', '在自己场上有「鹰身」怪兽的状态下赢得决斗。'),
 'Win runs on Challenge Level 2 or higher with 5 different duelists.': ('Gewinne mit 5 verschiedenen Duellanten Durchläufe auf Schwierigkeitsgrad 2 oder höher.', 'Gana partidas en el Nivel de desafío 2 o superior con 5 duelistas diferentes.', 'Gagnez des parties au Niveau de défi 2 ou plus avec 5 duellistes différents.', 'Vinci partite al Livello di sfida 2 o superiore con 5 duellanti diversi.', 'チャレンジレベル2以上で、5人の異なるデュエリストでランに勝利する。', '도전 레벨 2 이상에서 서로 다른 듀얼리스트 5명으로 런에서 승리한다.', 'Vença Jornadas no Nível de Desafio 2 ou superior com 5 duelistas diferentes.', '在挑战等级2以上用5名不同的决斗者赢得冒险。'),
 'Win 5 Tag runs.': ('Gewinne 5 Tag-Durchläufe.', 'Gana 5 partidas Tag.', 'Gagnez 5 parties Tag.', 'Vinci 5 partite Tag.', 'タッグランに5回勝利する。', '태그 런에서 5번 승리한다.', 'Vença 5 Jornadas Tag.', '赢得5次双打冒险。'),
 'Draw 1,000 cards (across runs).': ('Ziehe 1.000 Karten (über mehrere Durchläufe).', 'Roba 1.000 cartas (entre partidas).', 'Piochez 1 000 cartes (sur plusieurs parties).', 'Pesca 1.000 carte (in più partite).', 'カードを1000枚ドローする（ラン通算）。', '카드를 1000장 드로우한다 (런 누적).', 'Compre 1.000 cards (em várias Jornadas).', '抽1000张卡（跨冒险累计）。'),
 'Win the Time Wizard toss 3 times in one duel.': ('Gewinne in einem Duell 3-mal den Münzwurf von {TW}.', 'Gana el lanzamiento de {TW} 3 veces en un Duelo.', 'Gagnez le lancer de {TW} 3 fois en un Duel.', 'Vinci il lancio di {TW} 3 volte in un Duello.', '1回のデュエルで{TW}のコイントスに3回成功する。', '1번의 듀얼에서 {TW}의 코인 토스를 3번 성공한다.', 'Vença o lançamento de {TW} 3 vezes em um Duelo.', '在1场决斗中{TW}的硬币投掷成功3次。'),
 'Pay 10,000 LP for card costs (across runs).': ('Zahle 10.000 LP als Kosten für Karten (über mehrere Durchläufe).', 'Paga 10.000 LP como coste de cartas (entre partidas).', 'Payez 10 000 LP en coûts de cartes (sur plusieurs parties).', 'Paga 10.000 LP come costo di carte (in più partite).', 'カードのコストとしてLPを10000払う（ラン通算）。', '카드의 코스트로 LP를 10000 지불한다 (런 누적).', 'Pague 10.000 LP como custo de cards (em várias Jornadas).', '作为卡的代价支付10000LP（跨冒险累计）。'),
 'Destroy 25 monsters with coin-toss effects (across runs).': ('Zerstöre 25 Monster mit Münzwurf-Effekten (über mehrere Durchläufe).', 'Destruye 25 monstruos con efectos de lanzar una moneda (entre partidas).', 'Détruisez 25 monstres avec des effets de lancer de pièce (sur plusieurs parties).', 'Distruggi 25 mostri con effetti di lancio di moneta (in più partite).', 'コイントスの効果でモンスターを25体破壊する（ラン通算）。', '코인 토스 효과로 몬스터를 25장 파괴한다 (런 누적).', 'Destrua 25 monstros com efeitos de lançamento de moeda (em várias Jornadas).', '用投掷硬币的效果破坏25只怪兽（跨冒险累计）。'),
 "Return 100 of your opponent's monsters to the hand (across runs).": ('Lass 100 Monster deines Gegners auf die Hand zurückkehren (über mehrere Durchläufe).', 'Devuelve a la mano 100 monstruos de tu adversario (entre partidas).', 'Renvoyez 100 monstres de votre adversaire dans la main (sur plusieurs parties).', 'Fai tornare in mano 100 mostri del tuo avversario (in più partite).', '相手モンスターを手札に100体戻す（ラン通算）。', '상대 몬스터를 패로 100장 되돌린다 (런 누적).', 'Devolva 100 monstros do seu oponente para a mão (em várias Jornadas).', '让对方的100只怪兽回到手卡（跨冒险累计）。'),
 'Flip Summon 50 monsters (across runs).': ('Führe 50 Flippbeschwörungen durch (über mehrere Durchläufe).', 'Invoca por Volteo 50 monstruos (entre partidas).', 'Invoquez par Flip 50 monstres (sur plusieurs parties).', 'Evoca di Scoperta 50 mostri (in più partite).', 'モンスターを50体反転召喚する（ラン通算）。', '몬스터를 50장 반전 소환한다 (런 누적).', 'Faça a Invocação-Virada de 50 monstros (em várias Jornadas).', '反转召唤50只怪兽（跨冒险累计）。'),
 'Banish 100 DARK monsters (across runs).': ('Verbanne 100 FINSTERNIS-Monster (über mehrere Durchläufe).', 'Destierra 100 monstruos de OSCURIDAD (entre partidas).', 'Bannissez 100 monstres TÉNÈBRES (sur plusieurs parties).', 'Bandisci 100 mostri OSCURITÀ (in più partite).', '闇属性モンスターを100体除外する（ラン通算）。', '어둠 속성 몬스터를 100장 제외한다 (런 누적).', 'Bana 100 monstros de TREVAS (em várias Jornadas).', '除外100只暗属性怪兽（跨冒险累计）。'),
 'Change 50 monsters to face-down Defense Position with card effects (across runs).': ('Ändere mit Karteneffekten 50 Monster in verdeckte Verteidigungsposition (über mehrere Durchläufe).', 'Cambia 50 monstruos a Posición de Defensa boca abajo con efectos de cartas (entre partidas).', 'Mettez 50 monstres en Position de Défense face verso avec des effets de cartes (sur plusieurs parties).', 'Cambia 50 mostri in Posizione di Difesa coperta con effetti di carte (in più partite).', 'カードの効果でモンスターを50体裏側守備表示にする（ラン通算）。', '카드의 효과로 몬스터 50장을 뒷면 수비 표시로 한다 (런 누적).', 'Mude 50 monstros para Posição de Defesa com a face para baixo com efeitos de cards (em várias Jornadas).', '用卡的效果让50只怪兽变成里侧守备表示（跨冒险累计）。'),
 'Defeat the World Champion 3 times (across runs).': ('Besiege den Weltmeister 3-mal (über mehrere Durchläufe).', 'Derrota al Campeón del Mundo 3 veces (entre partidas).', 'Battez le Champion du monde 3 fois (sur plusieurs parties).', 'Sconfiggi il Campione del mondo 3 volte (in più partite).', '世界チャンピオンに3回勝利する（ラン通算）。', '월드 챔피언에게 3번 승리한다 (런 누적).', 'Derrote o Campeão Mundial 3 vezes (em várias Jornadas).', '击败世界冠军3次（跨冒险累计）。'),
 'Make your opponent discard 30 cards (across runs).': ('Lass deinen Gegner 30 Karten abwerfen (über mehrere Durchläufe).', 'Haz que tu adversario descarte 30 cartas (entre partidas).', 'Faites défausser 30 cartes à votre adversaire (sur plusieurs parties).', 'Fai scartare 30 carte al tuo avversario (in più partite).', '相手に手札を30枚捨てさせる（ラン通算）。', '상대에게 패를 30장 버리게 한다 (런 누적).', 'Faça seu oponente descartar 30 cards (em várias Jornadas).', '让对方丢弃30张手卡（跨冒险累计）。'),
 'Win a duel after taking 10,000 or more damage.': ('Gewinne ein Duell, nachdem du 10.000 oder mehr Schaden erhalten hast.', 'Gana un Duelo después de recibir 10.000 o más de daño.', 'Gagnez un Duel après avoir subi 10 000 dommages ou plus.', 'Vinci un Duello dopo aver subito 10.000 o più danni.', '10000以上のダメージを受けたデュエルに勝利する。', '10000 이상의 데미지를 받은 듀얼에서 승리한다.', 'Vença um Duelo depois de sofrer 10.000 ou mais de dano.', '在受到10000以上伤害的决斗中获胜。'),
 'Activate 100 Trap Cards (across runs).': ('Aktiviere 100 Fallenkarten (über mehrere Durchläufe).', 'Activa 100 Cartas de Trampa (entre partidas).', 'Activez 100 Cartes Piège (sur plusieurs parties).', 'Attiva 100 Carte Trappola (in più partite).', '罠カードを100回発動する（ラン通算）。', '함정 카드를 100번 발동한다 (런 누적).', 'Ative 100 Cards de Armadilha (em várias Jornadas).', '发动100次陷阱卡（跨冒险累计）。'),
 'Win a run without activating an Equip Spell.': ('Gewinne einen Durchlauf, ohne einen Ausrüstungszauber zu aktivieren.', 'Gana una partida sin activar ninguna Mágica de Equipo.', "Gagnez une partie sans activer de Magie d'Équipement.", 'Vinci una partita senza attivare Magie Equipaggiamento.', '装備魔法を発動せずにランに勝利する。', '장착 마법을 발동하지 않고 런에서 승리한다.', 'Vença uma Jornada sem ativar nenhuma Magia de Equipamento.', '不发动装备魔法赢得冒险。'),
 'Win 5 duels with an empty Graveyard (across runs).': ('Gewinne 5 Duelle mit leerem Friedhof (über mehrere Durchläufe).', 'Gana 5 Duelos con tu Cementerio vacío (entre partidas).', 'Gagnez 5 Duels avec un Cimetière vide (sur plusieurs parties).', 'Vinci 5 Duelli con il Cimitero vuoto (in più partite).', '墓地が0枚の状態でデュエルに5回勝利する（ラン通算）。', '묘지가 0장인 상태로 듀얼에서 5번 승리한다 (런 누적).', 'Vença 5 Duelos com o Cemitério vazio (em várias Jornadas).', '在墓地为空的状态下赢得5场决斗（跨冒险累计）。'),
 'Gain 10,000 or more LP in one duel.': ('Erhalte in einem Duell 10.000 oder mehr LP.', 'Gana 10.000 o más LP en un Duelo.', 'Gagnez 10 000 LP ou plus en un Duel.', 'Guadagna 10.000 o più LP in un Duello.', '1回のデュエルでLPを10000以上回復する。', '1번의 듀얼에서 LP를 10000 이상 회복한다.', 'Ganhe 10.000 ou mais LP em um Duelo.', '在1场决斗中回复10000以上的LP。'),
 "Look at your opponent's hand with card effects 25 times (across runs).": ('Sieh dir 25-mal mit Karteneffekten die Hand deines Gegners an (über mehrere Durchläufe).', 'Mira la mano de tu adversario con efectos de cartas 25 veces (entre partidas).', 'Regardez la main de votre adversaire avec des effets de cartes 25 fois (sur plusieurs parties).', 'Guarda la mano del tuo avversario con effetti di carte 25 volte (in più partite).', 'カードの効果で相手の手札を25回確認する（ラン通算）。', '카드의 효과로 상대의 패를 25번 확인한다 (런 누적).', 'Olhe a mão do seu oponente com efeitos de cards 25 vezes (em várias Jornadas).', '用卡的效果确认对方手卡25次（跨冒险累计）。'),
 'Win a duel with a Main Deck whose monsters are all Normal Monsters.': ('Gewinne ein Duell mit einem Main Deck, dessen Monster alle Normale Monster sind.', 'Gana un Duelo con un Deck Principal cuyos monstruos sean todos Monstruos Normales.', 'Gagnez un Duel avec un Main Deck dont tous les monstres sont des Monstres Normaux.', 'Vinci un Duello con un Deck Principale i cui mostri siano tutti Mostri Normali.', 'メインデッキのモンスターがすべて通常モンスターの状態でデュエルに勝利する。', '메인 덱의 몬스터가 전부 일반 몬스터인 상태로 듀얼에서 승리한다.', 'Vença um Duelo com um Deck Principal cujos monstros sejam todos Monstros Normais.', '在主卡组的怪兽全部为通常怪兽的状态下赢得决斗。'),
 'Deal 25,000 effect damage (across runs).': ('Füge 25.000 Effektschaden zu (über mehrere Durchläufe).', 'Inflige 25.000 de daño por efecto (entre partidas).', "Infligez 25 000 dommages d'effet (sur plusieurs parties).", 'Infliggi 25.000 danni da effetto (in più partite).', '効果ダメージを合計25000与える（ラン通算）。', '효과 데미지를 총 25000 준다 (런 누적).', 'Cause 25.000 de dano por efeito (em várias Jornadas).', '给予合计25000的效果伤害（跨冒险累计）。'),
 'Tribute Summon 50 monsters (across runs).': ('Führe 50 Tributbeschwörungen durch (über mehrere Durchläufe).', 'Invoca por Sacrificio 50 monstruos (entre partidas).', 'Invoquez par Sacrifice 50 monstres (sur plusieurs parties).', 'Evoca tramite Tributo 50 mostri (in più partite).', 'モンスターを50体アドバンス召喚する（ラン通算）。', '몬스터를 50장 어드밴스 소환한다 (런 누적).', 'Invoque-por-Tributo 50 monstros (em várias Jornadas).', '上级召唤50只怪兽（跨冒险累计）。'),
 'Win a duel with 20 or more cards in your Graveyard.': ('Gewinne ein Duell mit 20 oder mehr Karten im Friedhof.', 'Gana un Duelo con 20 o más cartas en tu Cementerio.', 'Gagnez un Duel avec 20 cartes ou plus dans votre Cimetière.', 'Vinci un Duello con 20 o più carte nel tuo Cimitero.', '墓地が20枚以上の状態でデュエルに勝利する。', '묘지가 20장 이상인 상태로 듀얼에서 승리한다.', 'Vença um Duelo com 20 ou mais cards no seu Cemitério.', '在墓地有20张以上卡的状态下赢得决斗。'),
}

# Families with a count ({n}); the English key gets the number written as the sleeve's text writes it.
FAMILIES = [
 ('Summon Dark Magician {n} times (across runs).', (10, 25), ('Beschwöre {DM} {n}-mal (über mehrere Durchläufe).', 'Invoca a {DM} {n} veces (entre partidas).', 'Invoquez {DM} {n} fois (sur plusieurs parties).', 'Evoca {DM} {n} volte (in più partite).', '{DM}を{n}回召喚する（ラン通算）。', '{DM}을(를) {n}번 소환한다 (런 누적).', 'Invoque {DM} {n} vezes (em várias Jornadas).', '召唤{DM}{n}次（跨冒险累计）。')),
 ('Ritual Summon {n} times (across runs).', (10, 25, 100), ('Führe {n} Ritualbeschwörungen durch (über mehrere Durchläufe).', 'Realiza {n} Invocaciones por Ritual (entre partidas).', 'Effectuez {n} Invocations Rituelles (sur plusieurs parties).', 'Esegui {n} Evocazioni tramite Rituale (in più partite).', '儀式召喚を{n}回行う（ラン通算）。', '의식 소환을 {n}번 한다 (런 누적).', 'Faça {n} Invocações-Ritual (em várias Jornadas).', '进行{n}次仪式召唤（跨冒险累计）。')),
 ('Win a duel that lasts {n} turns or more.', (20, 60), ('Gewinne ein Duell, das {n} oder mehr Spielzüge dauert.', 'Gana un Duelo que dure {n} turnos o más.', 'Gagnez un Duel qui dure {n} tours ou plus.', 'Vinci un Duello che dura {n} turni o più.', '{n}ターン以上続いたデュエルに勝利する。', '{n}턴 이상 이어진 듀얼에서 승리한다.', 'Vença um Duelo que dure {n} turnos ou mais.', '赢得一场持续{n}回合以上的决斗。')),
 ('Win {n} duels that last 20 turns or more (across runs).', (5, 10, 25), ('Gewinne {n} Duelle, die 20 oder mehr Spielzüge dauern (über mehrere Durchläufe).', 'Gana {n} Duelos que duren 20 turnos o más (entre partidas).', 'Gagnez {n} Duels qui durent 20 tours ou plus (sur plusieurs parties).', 'Vinci {n} Duelli che durano 20 turni o più (in più partite).', '20ターン以上続いたデュエルに{n}回勝利する（ラン通算）。', '20턴 이상 이어진 듀얼에서 {n}번 승리한다 (런 누적).', 'Vença {n} Duelos que durem 20 turnos ou mais (em várias Jornadas).', '赢得{n}场持续20回合以上的决斗（跨冒险累计）。')),
 ('Win {n} duels while you control a "Harpie" monster (across runs).', (10, 25), ('Gewinne {n} Duelle, während du ein „Harpyie“-Monster kontrollierst (über mehrere Durchläufe).', 'Gana {n} Duelos mientras controlas un monstruo "Arpía" (entre partidas).', 'Gagnez {n} Duels en contrôlant un monstre « Harpie » (sur plusieurs parties).', 'Vinci {n} Duelli mentre controlli un mostro "Arpia" (in più partite).', '「ハーピィ」モンスターをコントロールしている状態でデュエルに{n}回勝利する（ラン通算）。', '"하피" 몬스터를 컨트롤한 상태로 듀얼에서 {n}번 승리한다 (런 누적).', 'Vença {n} Duelos enquanto controla um monstro "Harpia" (em várias Jornadas).', '在自己场上有「鹰身」怪兽的状态下赢得{n}场决斗（跨冒险累计）。')),
 ('Return {n} of your monsters to the Extra Deck (across runs).', (5, 10), ('Lass {n} deiner Monster ins Extra Deck zurückkehren (über mehrere Durchläufe).', 'Devuelve {n} de tus monstruos al Deck Extra (entre partidas).', 'Renvoyez {n} de vos monstres dans votre Extra Deck (sur plusieurs parties).', 'Fai tornare {n} dei tuoi mostri nel Deck Extra (in più partite).', '自分のモンスターをエクストラデッキに{n}体戻す（ラン通算）。', '자신의 몬스터를 엑스트라 덱으로 {n}장 되돌린다 (런 누적).', 'Devolva {n} dos seus monstros para o Deck Adicional (em várias Jornadas).', '让自己的{n}只怪兽回到额外卡组（跨冒险累计）。')),
 ('Fusion Summon {n} times in one duel.', (3, 5), ('Führe in einem Duell {n} Fusionsbeschwörungen durch.', 'Realiza {n} Invocaciones por Fusión en un Duelo.', 'Effectuez {n} Invocations Fusion en un Duel.', 'Esegui {n} Evocazioni tramite Fusione in un Duello.', '1回のデュエルで融合召喚を{n}回行う。', '1번의 듀얼에서 융합 소환을 {n}번 한다.', 'Faça {n} Invocações-Fusão em um Duelo.', '在1场决斗中进行{n}次融合召唤。')),
 ('Make {n} relic fusions (across runs).', (25, 50, 75, 100, 150), ('Verschmelze {n}-mal Relikte (über mehrere Durchläufe).', 'Fusiona reliquias {n} veces (entre partidas).', 'Fusionnez des reliques {n} fois (sur plusieurs parties).', 'Fondi reliquie {n} volte (in più partite).', 'レリック融合を{n}回行う（ラン通算）。', '유물 융합을 {n}번 한다 (런 누적).', 'Funda relíquias {n} vezes (em várias Jornadas).', '进行{n}次遗物融合（跨冒险累计）。')),
 ('Deal the final blow with a monster that has 3,000 or more ATK in {n} duels (across runs).', (10,), ('Versetze in {n} Duellen den letzten Schlag mit einem Monster mit 3.000 oder mehr ATK (über mehrere Durchläufe).', 'Asesta el golpe final con un monstruo que tenga 3.000 o más de ATK en {n} Duelos (entre partidas).', 'Portez le coup final avec un monstre ayant 3 000 ATK ou plus dans {n} Duels (sur plusieurs parties).', 'Infliggi il colpo finale con un mostro che ha 3.000 o più ATK in {n} Duelli (in più partite).', '{n}回のデュエルで攻撃力3000以上のモンスターでとどめを刺す（ラン通算）。', '{n}번의 듀얼에서 공격력 3000 이상의 몬스터로 결정타를 날린다 (런 누적).', 'Dê o golpe final com um monstro que tenha 3.000 ou mais de ATK em {n} Duelos (em várias Jornadas).', '在{n}场决斗中用攻击力3000以上的怪兽给予最后一击（跨冒险累计）。')),
 ('Deal the final blow with a monster that has 500 or less ATK in {n} duels (across runs).', (10,), ('Versetze in {n} Duellen den letzten Schlag mit einem Monster mit 500 oder weniger ATK (über mehrere Durchläufe).', 'Asesta el golpe final con un monstruo que tenga 500 o menos de ATK en {n} Duelos (entre partidas).', 'Portez le coup final avec un monstre ayant 500 ATK ou moins dans {n} Duels (sur plusieurs parties).', 'Infliggi il colpo finale con un mostro che ha 500 o meno ATK in {n} Duelli (in più partite).', '{n}回のデュエルで攻撃力500以下のモンスターでとどめを刺す（ラン通算）。', '{n}번의 듀얼에서 공격력 500 이하의 몬스터로 결정타를 날린다 (런 누적).', 'Dê o golpe final com um monstro que tenha 500 ou menos de ATK em {n} Duelos (em várias Jornadas).', '在{n}场决斗中用攻击力500以下的怪兽给予最后一击（跨冒险累计）。')),
 ('Deal the final blow with a monster that has 1,000 or less ATK in {n} duels (across runs).', (25,), ('Versetze in {n} Duellen den letzten Schlag mit einem Monster mit 1.000 oder weniger ATK (über mehrere Durchläufe).', 'Asesta el golpe final con un monstruo que tenga 1.000 o menos de ATK en {n} Duelos (entre partidas).', 'Portez le coup final avec un monstre ayant 1 000 ATK ou moins dans {n} Duels (sur plusieurs parties).', 'Infliggi il colpo finale con un mostro che ha 1.000 o meno ATK in {n} Duelli (in più partite).', '{n}回のデュエルで攻撃力1000以下のモンスターでとどめを刺す（ラン通算）。', '{n}번의 듀얼에서 공격력 1000 이하의 몬스터로 결정타를 날린다 (런 누적).', 'Dê o golpe final com um monstro que tenha 1.000 ou menos de ATK em {n} Duelos (em várias Jornadas).', '在{n}场决斗中用攻击力1000以下的怪兽给予最后一击（跨冒险累计）。')),
]
# "Win N duels while you control a <Type> monster (across runs)."
TYPES = {
 'Warrior': (('Krieger', 'Guerrero', 'Guerrier', 'Guerriero', '戦士族', '전사족', 'Guerreiro', '战士族'), (10, 25, 50, 100)),
 'Machine': (('Maschinen', 'Máquina', 'Machine', 'Macchina', '機械族', '기계족', 'Máquina', '机械族'), (10, 25)),
 'Reptile': (('Reptil', 'Reptil', 'Reptile', 'Rettile', '爬虫類族', '파충류족', 'Réptil', '爬虫类族'), (10,)),
 'Zombie': (('Zombie', 'Zombi', 'Zombie', 'Zombie', 'アンデット族', '언데드족', 'Zumbi', '不死族'), (10,)),
 'Thunder': (('Donner', 'Trueno', 'Tonnerre', 'Tuono', '雷族', '번개족', 'Trovão', '雷族'), (10,)),
}
TYPE_TEXT = ('Gewinne {n} Duelle, während du ein {t}-Monster kontrollierst (über mehrere Durchläufe).', 'Gana {n} Duelos mientras controlas un monstruo {t} (entre partidas).', 'Gagnez {n} Duels en contrôlant un monstre {t} (sur plusieurs parties).', 'Vinci {n} Duelli mentre controlli un mostro {t} (in più partite).', '{t}モンスターをコントロールしている状態でデュエルに{n}回勝利する（ラン通算）。', '{t} 몬스터를 컨트롤한 상태로 듀얼에서 {n}번 승리한다 (런 누적).', 'Vença {n} Duelos enquanto controla um monstro {t} (em várias Jornadas).', '在自己场上有{t}怪兽的状态下赢得{n}场决斗（跨冒险累计）。')
# "Defeat <duelist> as an opponent 5 times (across runs)." The name is that duelist's own translation (UI table).
DUELISTS = ('PaniK', 'Lumis and Umbra', 'Weevil Underwood', 'Yami Marik', 'Aknadin', 'Duke Devlin', 'Dartz', 'Noah Kaiba')
DEFEAT = ('Besiege {D} 5-mal als Gegner (über mehrere Durchläufe).', 'Derrota a {D} como rival 5 veces (entre partidas).', "Battez {D} en tant qu'adversaire 5 fois (sur plusieurs parties).", 'Sconfiggi {D} come avversario 5 volte (in più partite).', '対戦相手の{D}に5回勝利する（ラン通算）。', '상대 {D}에게 5번 승리한다 (런 누적).', 'Derrote {D} como oponente 5 vezes (em várias Jornadas).', '击败作为对手的{D}5次（跨冒险累计）。')


def entries(i, lang, table, card):
    out = {en: values[i] for en, values in NAMES.items()}
    for en, values in TERMS.items():
        out[en] = values[i]
    for en, counts, values in FAMILIES:
        for n in counts:
            out[en.replace('{n}', str(n))] = values[i].replace('{n}', str(n))
    for en, (local, counts) in TYPES.items():
        for n in counts:
            out[f'Win {n} duels while you control a {en} monster (across runs).'] = TYPE_TEXT[i].replace('{n}', str(n)).replace('{t}', local[i])
    for name in DUELISTS:
        out[f'Defeat {name} as an opponent 5 times (across runs).'] = DEFEAT[i].replace('{D}', table.get(name) or name)
    for key, value in card.items():
        out = {en: text.replace('{' + key + '}', value) for en, text in out.items()}
    return out


def main():
    sleeves = json.loads((ROOT / 'data/card-sleeves.json').read_text(encoding='utf8'))['sleeves']
    pool = {c['name'] for c in json.loads((ROOT / 'android/web/content.json').read_text(encoding='utf-8-sig'))['cards']}
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for i, lang in enumerate(LANGS):
        names = json.loads((ROOT / f'data/i18n/cards/{lang}.json').read_text(encoding='utf-8-sig'))
        card = {key: names[str(code)][0] for key, code in CARDS.items()}
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        new = entries(i, lang, table, card)
        if i == 0:
            # Every new sleeve's name and condition must be covered (a pool card name translates by itself).
            start = [s['id'] for s in sleeves].index('dark-magician')
            for s in sleeves[start:start + 74]:
                assert s['art'] in pool or s['art'] in new, s['art']
                assert s['text'] in new or s['text'] in table or s['text'].startswith('Win a duel while you control ') and '"' not in s['text'], s['text']
        for en, value in new.items():
            table.setdefault(en, value)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        if i == 0:
            for en in new:
                if en not in known:
                    catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': "Deds' card sleeve name or unlock condition (Cosmetics, Achievements), 2026-11-20"})
                    known.add(en)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(new))


if __name__ == '__main__':
    main()
