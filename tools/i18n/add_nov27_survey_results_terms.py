"""The 10K survey closed and became a Family Feud style results quiz (android/web/survey.js, survey-results.js; user
2026-11-27). All 8 languages; never overwrites an existing translation.

"Family Feud" is named after each language's own version of the show (user: "each language gets its own phrase, using
the local version of that show; if a language has no local version, keep Family Feud"), from Wikipedia's
"International versions of Family Feud" (2026-11-27):
 de Familien-Duell (RTL)            es 100 mexicanos dijeron (Televisa; the best-known Spanish-language version)
 fr Une famille en or (TF1)         it Famiglie d'Italia (La7, the current version)
 ja クイズ100人に聞きました (TBS)   ko none listed: Family Feud
 pt Tem ou Não Tem (TV Globo)       zh 家庭赛乐赛 (Dragon TV)
"""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
# Each language's local show, in the phrases below.
SHOW = {'de': '„Familien-Duell“', 'es': '«100 mexicanos dijeron»', 'fr': '« Une famille en or »', 'it': "«Famiglie d'Italia»",
        'ja': '『クイズ100人に聞きました』', 'ko': 'Family Feud', 'pt': '“Tem ou Não Tem”', 'zh': '《家庭赛乐赛》'}
TERMS = {
 # Popup and bell card (survey.js)
 'Thank you for your votes on the 10K players survey!': ('Danke für eure Stimmen bei der 10K-Spielerumfrage!', '¡Gracias por tus votos en la encuesta de los 10K jugadores!', 'Merci pour vos votes au sondage des 10K joueurs !', 'Grazie per i tuoi voti nel sondaggio dei 10K giocatori!', '10K人記念プレイヤーアンケートへのご投票、ありがとうございました！', '1만 명 기념 플레이어 설문에 투표해 주셔서 감사합니다!', 'Obrigado pelos seus votos na pesquisa dos 10K jogadores!', '感谢你参与1万玩家调查投票！'),
 '{0} players answered. Can you guess what they picked? Find out in a Family Feud style quiz.': ('{0} Spieler haben geantwortet. Errätst du, was sie gewählt haben? Finde es heraus in einem Quiz im Stil von {S}.', '{0} jugadores respondieron. ¿Adivinas qué eligieron? Descúbrelo en un quiz al estilo de {S}.', '{0} joueurs ont répondu. Devinerez-vous leurs choix ? Découvrez-le dans un quiz façon {S}.', 'Hanno risposto {0} giocatori. Indovini cosa hanno scelto? Scoprilo in un quiz in stile {S}.', '{0}人のプレイヤーが回答しました。みんなが何を選んだか当てられますか？{S}風のクイズで確かめよう。', '{0}명의 플레이어가 답했습니다. 무엇을 골랐는지 맞힐 수 있나요? {S} 스타일 퀴즈로 확인해 보세요.', '{0} jogadores responderam. Consegue adivinhar o que escolheram? Descubra num quiz no estilo {S}.', '共有{0}名玩家作答。你能猜到他们选了什么吗？来{S}风格的问答游戏里揭晓吧。'),
 '10K player survey results': ('Ergebnisse der 10K-Spielerumfrage', 'Resultados de la encuesta de los 10K jugadores', 'Résultats du sondage des 10K joueurs', 'Risultati del sondaggio dei 10K giocatori', '10K人記念プレイヤーアンケートの結果', '1만 명 기념 플레이어 설문 결과', 'Resultados da pesquisa dos 10K jogadores', '1万玩家调查结果'),
 'See what {0} players picked, in a Family Feud style quiz.': ('Sieh dir an, was {0} Spieler gewählt haben, in einem Quiz im Stil von {S}.', 'Mira lo que eligieron {0} jugadores, en un quiz al estilo de {S}.', 'Découvrez les choix de {0} joueurs dans un quiz façon {S}.', 'Scopri cosa hanno scelto {0} giocatori, in un quiz in stile {S}.', '{0}人のプレイヤーが選んだ答えを、{S}風のクイズで見てみよう。', '{0}명의 플레이어가 고른 답을 {S} 스타일 퀴즈로 확인해 보세요.', 'Veja o que {0} jogadores escolheram, num quiz no estilo {S}.', '在{S}风格的问答游戏中看看{0}名玩家选了什么。'),
 'Your quiz score: {0} points': ('Deine Quizpunktzahl: {0} Punkte', 'Tu puntuación en el quiz: {0} puntos', 'Votre score au quiz : {0} points', 'Il tuo punteggio nel quiz: {0} punti', 'クイズのスコア：{0}点', '퀴즈 점수: {0}점', 'Sua pontuação no quiz: {0} pontos', '你的问答得分：{0}分'),
 'See results': ('Ergebnisse ansehen', 'Ver resultados', 'Voir les résultats', 'Vedi i risultati', '結果を見る', '결과 보기', 'Ver resultados', '查看结果'),
 'Full results': ('Alle Ergebnisse', 'Resultados completos', 'Résultats complets', 'Risultati completi', 'すべての結果', '전체 결과', 'Resultados completos', '完整结果'),
 'Play again': ('Nochmal spielen', 'Jugar otra vez', 'Rejouer', 'Gioca ancora', 'もう一度遊ぶ', '다시 하기', 'Jogar de novo', '再玩一次'),
 # Intro and rounds (survey-results.js)
 'Survey says!': ('Die Umfrage sagt!', '¡La encuesta dice!', 'Le sondage dit !', 'Il sondaggio dice!', 'アンケートの結果は！', '설문 결과는!', 'A pesquisa diz!', '调查结果揭晓！'),
 'Survey says…': ('Die Umfrage sagt …', 'La encuesta dice…', 'Le sondage dit…', 'Il sondaggio dice…', 'アンケートの結果は…', '설문 결과는…', 'A pesquisa diz…', '调查结果是……'),
 'We asked {0} players. Guess their most popular answers: each pick scores the % of players who gave it.': ('Wir haben {0} Spieler gefragt. Errate ihre beliebtesten Antworten: Jede Wahl bringt so viele Punkte, wie Prozent der Spieler sie gegeben haben.', 'Preguntamos a {0} jugadores. Adivina sus respuestas más populares: cada elección suma el % de jugadores que la dieron.', 'Nous avons interrogé {0} joueurs. Devinez leurs réponses les plus populaires : chaque choix rapporte le % de joueurs qui l’ont donné.', 'Abbiamo chiesto a {0} giocatori. Indovina le risposte più popolari: ogni scelta vale la % di giocatori che l’ha data.', '{0}人のプレイヤーに聞きました。人気の答えを当てよう。選んだ答えを選んだプレイヤーの割合（%）がそのまま得点になります。', '{0}명의 플레이어에게 물었습니다. 가장 인기 있는 답을 맞혀 보세요. 고른 답을 선택한 플레이어 비율(%)만큼 점수를 얻습니다.', 'Perguntamos a {0} jogadores. Adivinhe as respostas mais populares: cada escolha vale a % de jogadores que a deram.', '我们询问了{0}名玩家。猜猜最热门的答案：每个选择的得分等于选择它的玩家百分比。'),
 'Start the quiz': ('Quiz starten', 'Empezar el quiz', 'Commencer le quiz', 'Inizia il quiz', 'クイズを始める', '퀴즈 시작', 'Começar o quiz', '开始问答'),
 'Skip to the results': ('Direkt zu den Ergebnissen', 'Ir a los resultados', 'Passer aux résultats', 'Vai ai risultati', '結果へスキップ', '결과로 건너뛰기', 'Pular para os resultados', '跳到结果'),
 'Round {0} of {1}': ('Runde {0} von {1}', 'Ronda {0} de {1}', 'Manche {0} sur {1}', 'Round {0} di {1}', 'ラウンド {0}/{1}', '라운드 {0}/{1}', 'Rodada {0} de {1}', '第{0}/{1}轮'),
 'Score': ('Punkte', 'Puntos', 'Score', 'Punti', 'スコア', '점수', 'Pontos', '得分'),
 'We asked {0} players:': ('Wir haben {0} Spieler gefragt:', 'Preguntamos a {0} jugadores:', 'Nous avons interrogé {0} joueurs :', 'Abbiamo chiesto a {0} giocatori:', '{0}人のプレイヤーに聞きました：', '{0}명의 플레이어에게 물었습니다:', 'Perguntamos a {0} jogadores:', '我们询问了{0}名玩家：'),
 'Pick the answer you think most players gave.': ('Wähle die Antwort, die deiner Meinung nach die meisten Spieler gegeben haben.', 'Elige la respuesta que crees que dieron más jugadores.', 'Choisissez la réponse que la plupart des joueurs ont donnée selon vous.', 'Scegli la risposta che secondo te hanno dato più giocatori.', '一番多くのプレイヤーが選んだと思う答えを選ぼう。', '가장 많은 플레이어가 골랐을 것 같은 답을 고르세요.', 'Escolha a resposta que você acha que mais jogadores deram.', '选出你认为最多玩家给出的答案。'),
 '{0}% of players picked it.': ('{0} % der Spieler haben das gewählt.', 'El {0} % de los jugadores lo eligió.', '{0} % des joueurs l’ont choisi.', 'L’ha scelto il {0}% dei giocatori.', '{0}%のプレイヤーが選びました。', '플레이어의 {0}%가 골랐습니다.', '{0}% dos jogadores escolheram.', '{0}%的玩家选了它。'),
 'Not on the board!': ('Nicht auf der Tafel!', '¡No está en el tablero!', 'Pas au tableau !', 'Non è sul tabellone!', 'ボードにない！', '보드에 없어요!', 'Não está no painel!', '不在榜上！'),
 'Only {0}% of players picked it.': ('Nur {0} % der Spieler haben das gewählt.', 'Solo el {0} % de los jugadores lo eligió.', 'Seuls {0} % des joueurs l’ont choisi.', 'L’ha scelto solo il {0}% dei giocatori.', '選んだのはわずか{0}%のプレイヤーでした。', '플레이어의 {0}%만 골랐습니다.', 'Só {0}% dos jogadores escolheram.', '只有{0}%的玩家选了它。'),
 'No one picked it.': ('Niemand hat das gewählt.', 'Nadie lo eligió.', 'Personne ne l’a choisi.', 'Nessuno l’ha scelto.', '誰も選びませんでした。', '아무도 고르지 않았습니다.', 'Ninguém escolheu.', '没有玩家选它。'),
 'Less than 1% of players picked it.': ('Weniger als 1 % der Spieler haben das gewählt.', 'Menos del 1 % de los jugadores lo eligió.', 'Moins de 1 % des joueurs l’ont choisi.', 'L’ha scelto meno dell’1% dei giocatori.', '選んだのは1%未満のプレイヤーでした。', '플레이어의 1% 미만이 골랐습니다.', 'Menos de 1% dos jogadores escolheram.', '不到1%的玩家选了它。'),
 'Next question': ('Nächste Frage', 'Siguiente pregunta', 'Question suivante', 'Prossima domanda', '次の問題', '다음 문제', 'Próxima pergunta', '下一题'),
 'See your score': ('Punktzahl ansehen', 'Ver tu puntuación', 'Voir votre score', 'Vedi il tuo punteggio', 'スコアを見る', '점수 보기', 'Ver sua pontuação', '查看得分'),
 # Score screen and image
 'Your score': ('Deine Punktzahl', 'Tu puntuación', 'Votre score', 'Il tuo punteggio', 'あなたのスコア', '내 점수', 'Sua pontuação', '你的得分'),
 'Best possible: {0}': ('Bestmöglich: {0}', 'Máximo posible: {0}', 'Meilleur score possible : {0}', 'Massimo possibile: {0}', '最高得点：{0}', '최고 가능 점수: {0}', 'Máximo possível: {0}', '最高可得：{0}'),
 'Your survey quiz score': ('Deine Punktzahl im Umfrage-Quiz', 'Tu puntuación en el quiz de la encuesta', 'Votre score au quiz du sondage', 'Il tuo punteggio nel quiz del sondaggio', 'アンケートクイズのスコア', '설문 퀴즈 점수', 'Sua pontuação no quiz da pesquisa', '你的调查问答得分'),
 'Continue to results': ('Weiter zu den Ergebnissen', 'Continuar a los resultados', 'Continuer vers les résultats', 'Continua ai risultati', '結果へ進む', '결과로 계속', 'Continuar para os resultados', '继续查看结果'),
 'The score image could not be drawn.': ('Das Punktebild konnte nicht gezeichnet werden.', 'No se pudo dibujar la imagen de la puntuación.', 'L’image du score n’a pas pu être dessinée.', 'Impossibile disegnare l’immagine del punteggio.', 'スコア画像を描画できませんでした。', '점수 이미지를 그릴 수 없습니다.', 'Não foi possível desenhar a imagem da pontuação.', '无法绘制得分图片。'),
 'Survey Master': ('Umfrage-Meister', 'Maestro de la encuesta', 'Maître du sondage', 'Maestro del sondaggio', 'アンケートマスター', '설문 마스터', 'Mestre da pesquisa', '调查大师'),
 'Crowd Reader': ('Gedankenleser der Masse', 'Lector de multitudes', 'Lecteur de foule', 'Lettore della folla', 'みんなの心を読む者', '민심 읽는 자', 'Leitor da galera', '读心达人'),
 'Rising Duelist': ('Aufstrebender Duellant', 'Duelista en ascenso', 'Duelliste prometteur', 'Duellante emergente', '期待の新人デュエリスト', '떠오르는 듀얼리스트', 'Duelista em ascensão', '新星决斗者'),
 'Wild Card': ('Joker', 'Comodín', 'Joker', 'Jolly', 'ワイルドカード', '와일드카드', 'Coringa', '外卡'),
 'Family Feud style quiz': ('Quiz im Stil von {S}', 'Quiz al estilo de {S}', 'Quiz façon {S}', 'Quiz in stile {S}', '{S}風クイズ', '{S} 스타일 퀴즈', 'Quiz no estilo {S}', '{S}风格问答'),
 '{0} players answered': ('{0} Spieler haben geantwortet', '{0} jugadores respondieron', '{0} joueurs ont répondu', 'Hanno risposto {0} giocatori', '{0}人が回答', '{0}명 응답', '{0} jogadores responderam', '{0}名玩家作答'),
 'Favourite character': ('Lieblingscharakter', 'Personaje favorito', 'Personnage préféré', 'Personaggio preferito', '好きな使用キャラクター', '좋아하는 캐릭터', 'Personagem favorito', '最喜欢的角色'),
 'Least favourite character': ('Unbeliebtester Charakter', 'Personaje menos favorito', 'Personnage le moins aimé', 'Personaggio meno amato', '苦手な使用キャラクター', '가장 싫은 캐릭터', 'Personagem menos favorito', '最不喜欢的角色'),
 'Favourite normal relic': ('Liebstes normales Relikt', 'Reliquia normal favorita', 'Relique normale préférée', 'Reliquia normale preferita', '好きな通常レリック', '좋아하는 일반 유물', 'Relíquia normal favorita', '最喜欢的普通遗物'),
 'Favourite shadow relic': ('Liebstes Schattenrelikt', 'Reliquia de las sombras favorita', "Relique de l'ombre préférée", "Reliquia dell'ombra preferita", '好きな影のレリック', '좋아하는 그림자 유물', 'Relíquia das sombras favorita', '最喜欢的暗影遗物'),
 'Favourite fused relic': ('Liebstes fusioniertes Relikt', 'Reliquia fusionada favorita', 'Relique fusionnée préférée', 'Reliquia fusa preferita', '好きな融合レリック', '좋아하는 합성 유물', 'Relíquia fundida favorita', '最喜欢的融合遗物'),
 'Favourite opponent': ('Lieblingsgegner', 'Oponente favorito', 'Adversaire préféré', 'Avversario preferito', '好きな対戦相手', '좋아하는 상대', 'Oponente favorito', '最喜欢的对手'),
 'Least favourite opponent': ('Unbeliebtester Gegner', 'Oponente menos favorito', 'Adversaire le moins aimé', 'Avversario meno amato', '苦手な対戦相手', '가장 싫은 상대', 'Oponente menos favorito', '最不喜欢的对手'),
 'Favourite online mode': ('Liebster Online-Modus', 'Modo en línea favorito', 'Mode en ligne préféré', 'Modalità online preferita', '好きなオンラインモード', '좋아하는 온라인 모드', 'Modo online favorito', '最喜欢的联机模式'),
 # Results page
 '{0} players answered. Thank you!': ('{0} Spieler haben geantwortet. Danke!', '{0} jugadores respondieron. ¡Gracias!', '{0} joueurs ont répondu. Merci !', 'Hanno risposto {0} giocatori. Grazie!', '{0}人のプレイヤーが回答しました。ありがとう！', '{0}명의 플레이어가 답했습니다. 감사합니다!', '{0} jogadores responderam. Obrigado!', '共有{0}名玩家作答。谢谢！'),
 'Your quiz score': ('Deine Quizpunktzahl', 'Tu puntuación en el quiz', 'Votre score au quiz', 'Il tuo punteggio nel quiz', 'クイズのスコア', '퀴즈 점수', 'Sua pontuação no quiz', '你的问答得分'),
 'players answered': ('Spieler haben geantwortet', 'jugadores respondieron', 'joueurs ont répondu', 'giocatori hanno risposto', '人が回答', '명 응답', 'jogadores responderam', '名玩家作答'),
 'places represented': ('vertretene Orte', 'lugares representados', 'lieux représentés', 'luoghi rappresentati', 'の国・地域', '개 국가·지역', 'lugares representados', '个国家和地区'),
 'most loved character': ('beliebtester Charakter', 'personaje más querido', 'personnage le plus aimé', 'personaggio più amato', '一番人気のキャラクター', '가장 사랑받는 캐릭터', 'personagem mais amado', '最受喜爱的角色'),
 'favourite online mode': ('liebster Online-Modus', 'modo en línea favorito', 'mode en ligne préféré', 'modalità online preferita', '一番人気のオンラインモード', '가장 인기 있는 온라인 모드', 'modo online favorito', '最受欢迎的联机模式'),
 'Characters: loved vs. disliked': ('Charaktere: beliebt vs. unbeliebt', 'Personajes: queridos vs. odiados', 'Personnages : aimés vs détestés', 'Personaggi: amati vs. odiati', 'キャラクター：好き vs 苦手', '캐릭터: 호감 vs 비호감', 'Personagens: amados vs. odiados', '角色：喜爱 vs 讨厌'),
 'Favourite picks grow right, least favourite picks grow left.': ('Lieblingsstimmen wachsen nach rechts, unbeliebte nach links.', 'Los favoritos crecen a la derecha y los menos favoritos a la izquierda.', 'Les votes « préféré » s’étendent à droite, les votes « le moins aimé » à gauche.', 'I preferiti crescono a destra, i meno amati a sinistra.', '「好き」は右へ、「苦手」は左へ伸びます。', '좋아요 표는 오른쪽, 싫어요 표는 왼쪽으로 늘어납니다.', 'Os favoritos crescem para a direita, os menos favoritos para a esquerda.', '喜爱票向右延伸，讨厌票向左延伸。'),
 'Opponents: loved vs. disliked': ('Gegner: beliebt vs. unbeliebt', 'Oponentes: queridos vs. odiados', 'Adversaires : aimés vs détestés', 'Avversari: amati vs. odiati', '対戦相手：好き vs 苦手', '상대: 호감 vs 비호감', 'Oponentes: amados vs. odiados', '对手：喜爱 vs 讨厌'),
 'Who players enjoy facing, and who they dread.': ('Gegen wen Spieler gern antreten und wen sie fürchten.', 'A quién disfrutan enfrentar los jugadores y a quién temen.', 'Ceux que les joueurs aiment affronter, et ceux qu’ils redoutent.', 'Chi i giocatori amano affrontare e chi temono.', 'みんなが戦って楽しい相手と、戦いたくない相手。', '플레이어가 즐겨 상대하는 상대와 두려워하는 상대.', 'Quem os jogadores gostam de enfrentar e quem eles temem.', '玩家喜欢面对的对手，以及最怕遇到的对手。'),
 'Favourite relics': ('Lieblingsrelikte', 'Reliquias favoritas', 'Reliques préférées', 'Reliquie preferite', '好きなレリック', '좋아하는 유물', 'Relíquias favoritas', '最喜欢的遗物'),
 '{0} answers': ('{0} Antworten', '{0} respuestas', '{0} réponses', '{0} risposte', '回答{0}件', '응답 {0}개', '{0} respostas', '{0}个回答'),
 'Least favourite': ('Am wenigsten beliebt', 'Menos favorito', 'Le moins aimé', 'Meno amato', '苦手', '싫어요', 'Menos favorito', '最不喜欢'),
 'Favourite': ('Liebling', 'Favorito', 'Préféré', 'Preferito', '好き', '좋아요', 'Favorito', '最喜欢'),
 'Show top and bottom only': ('Nur Anfang und Ende zeigen', 'Mostrar solo los primeros y los últimos', 'Afficher seulement le haut et le bas', 'Mostra solo i primi e gli ultimi', '上位と下位だけ表示', '상위와 하위만 보기', 'Mostrar só os primeiros e os últimos', '只显示首尾'),
 'Show all {0}': ('Alle {0} zeigen', 'Mostrar los {0}', 'Tout afficher ({0})', 'Mostra tutti ({0})', '全{0}件を表示', '전체 {0}개 보기', 'Mostrar todos ({0})', '显示全部{0}项'),
 'Where players are from': ('Woher die Spieler kommen', 'De dónde son los jugadores', 'D’où viennent les joueurs', 'Da dove vengono i giocatori', 'プレイヤーの出身地', '플레이어 출신 지역', 'De onde são os jogadores', '玩家来自哪里'),
 '{0} players told us': ('{0} Spieler haben es uns verraten', '{0} jugadores nos lo dijeron', '{0} joueurs nous l’ont dit', 'Ce l’hanno detto {0} giocatori', '{0}人が回答', '{0}명이 알려 주었습니다', '{0} jogadores nos contaram', '{0}名玩家告诉了我们'),
 '{0} players ({1}%)': ('{0} Spieler ({1} %)', '{0} jugadores ({1} %)', '{0} joueurs ({1} %)', '{0} giocatori ({1}%)', '{0}人（{1}%）', '{0}명 ({1}%)', '{0} jogadores ({1}%)', '{0}名玩家（{1}%）'),
 '1–2 players': ('1–2 Spieler', '1–2 jugadores', '1 à 2 joueurs', '1–2 giocatori', '1〜2人', '1~2명', '1–2 jogadores', '1–2名玩家'),
 'No players': ('Keine Spieler', 'Ningún jugador', 'Aucun joueur', 'Nessun giocatore', 'プレイヤーなし', '플레이어 없음', 'Nenhum jogador', '没有玩家'),
 'Hover or tap a country.': ('Fahre über ein Land oder tippe darauf.', 'Pasa el cursor o toca un país.', 'Survolez ou touchez un pays.', 'Passa sopra o tocca un paese.', '国にカーソルを合わせるかタップしてください。', '국가에 마우스를 올리거나 탭하세요.', 'Passe o cursor ou toque num país.', '将鼠标悬停或点击一个国家。'),
 'World map of where players are from': ('Weltkarte: Woher die Spieler kommen', 'Mapa mundial de dónde son los jugadores', 'Carte du monde d’où viennent les joueurs', 'Mappa del mondo da dove vengono i giocatori', 'プレイヤーの出身地の世界地図', '플레이어 출신 지역 세계 지도', 'Mapa-múndi de onde são os jogadores', '玩家来源世界地图'),
 'Hover or tap a country. Scroll or pinch to zoom.': ('Fahre über ein Land oder tippe darauf. Scrollen oder mit zwei Fingern zoomen.', 'Pasa el cursor o toca un país. Usa la rueda o pellizca para hacer zoom.', 'Survolez ou touchez un pays. Molette ou pincement pour zoomer.', 'Passa sopra o tocca un paese. Usa la rotella o pizzica per lo zoom.', '国にカーソルを合わせるかタップ。スクロールかピンチで拡大。', '국가에 마우스를 올리거나 탭하세요. 스크롤하거나 손가락을 벌려 확대.', 'Passe o cursor ou toque num país. Role ou faça pinça para dar zoom.', '将鼠标悬停或点击一个国家。滚动或双指缩放。'),
 'Zoom in': ('Vergrößern', 'Acercar', 'Zoom avant', 'Ingrandisci', '拡大', '확대', 'Aproximar', '放大'),
 'Zoom out': ('Verkleinern', 'Alejar', 'Zoom arrière', 'Riduci', '縮小', '축소', 'Afastar', '缩小'),
 'Reset zoom': ('Zoom zurücksetzen', 'Restablecer zoom', 'Réinitialiser le zoom', 'Ripristina zoom', 'ズームをリセット', '확대 초기화', 'Redefinir zoom', '重置缩放'),
 'Play the quiz': ('Quiz spielen', 'Jugar al quiz', 'Jouer au quiz', 'Gioca al quiz', 'クイズで遊ぶ', '퀴즈 하기', 'Jogar o quiz', '玩问答'),
 'Play the quiz again': ('Quiz nochmal spielen', 'Jugar al quiz otra vez', 'Rejouer au quiz', 'Rigioca il quiz', 'もう一度クイズで遊ぶ', '퀴즈 다시 하기', 'Jogar o quiz de novo', '再玩一次问答'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i].replace('{S}', SHOW[lang]))
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
