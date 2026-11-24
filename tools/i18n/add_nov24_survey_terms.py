"""The 10K player survey (android/web/survey.js, 2026-11-24). All 8 languages; never overwrites an existing translation.
Terms follow docs/i18n/TERMS.md: shadow relics (never cursed), fused relics, Tag Duels, Draft Duels."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 '10K player survey': ('10K-Spielerumfrage', 'Encuesta de los 10K jugadores', 'Sondage des 10K joueurs', 'Sondaggio dei 10K giocatori',
  '10K人記念プレイヤーアンケート', '1만 명 기념 플레이어 설문', 'Pesquisa dos 10K jogadores', '1万玩家调查'),
 '10K players!': ('10K Spieler!', '¡10K jugadores!', '10K joueurs !', '10K giocatori!', 'プレイヤー1万人突破！', '플레이어 1만 명 돌파!', '10K jogadores!', '玩家突破1万！'),
 "To celebrate 10K total players, I'm running a player survey to find out what your favourite and least favourite characters, opponents and relics are, and what I can still implement to make the game better.": (
  'Um 10K Spieler insgesamt zu feiern, mache ich eine Spielerumfrage: Welche Charaktere, Gegner und Relikte magst du am meisten und welche am wenigsten, und was kann ich noch einbauen, um das Spiel besser zu machen?',
  'Para celebrar los 10K jugadores en total, hago una encuesta para saber cuáles son tus personajes, oponentes y reliquias favoritos y menos favoritos, y qué puedo añadir aún para mejorar el juego.',
  "Pour fêter les 10K joueurs au total, je lance un sondage pour savoir quels sont vos personnages, adversaires et reliques préférés et les moins aimés, et ce que je peux encore ajouter pour améliorer le jeu.",
  'Per festeggiare i 10K giocatori totali, faccio un sondaggio per scoprire quali sono i tuoi personaggi, avversari e reliquie preferiti e meno amati, e cosa posso ancora aggiungere per migliorare il gioco.',
  'プレイヤー累計1万人を記念して、アンケートを実施しています。好きな・苦手なキャラクター、対戦相手、レリックと、ゲームをもっと良くするために追加してほしいものを教えてください。',
  '누적 플레이어 1만 명을 기념해 설문을 진행합니다. 가장 좋아하는/가장 덜 좋아하는 캐릭터, 상대, 유물과 게임을 더 좋게 만들기 위해 추가했으면 하는 것을 알려 주세요.',
  'Para comemorar os 10K jogadores no total, estou fazendo uma pesquisa para saber quais são seus personagens, oponentes e relíquias favoritos e menos favoritos, e o que ainda posso adicionar para melhorar o jogo.',
  '为庆祝累计玩家突破1万，我正在进行一次玩家调查，想了解你最喜欢和最不喜欢的角色、对手和遗物，以及我还能加入什么让游戏变得更好。'),
 'Take survey now': ('Jetzt teilnehmen', 'Hacer la encuesta', 'Répondre au sondage', 'Partecipa ora', '今すぐ回答する', '지금 참여하기', 'Responder agora', '立即参与'),
 'Continue survey': ('Umfrage fortsetzen', 'Continuar la encuesta', 'Reprendre le sondage', 'Continua il sondaggio', 'アンケートを続ける', '설문 계속하기', 'Continuar a pesquisa', '继续调查'),
 'No thank you': ('Nein danke', 'No, gracias', 'Non merci', 'No, grazie', '遠慮しておく', '괜찮습니다', 'Não, obrigado', '不用了，谢谢'),
 'Tell me your favourite characters, opponents and relics, and what to add next.': (
  'Sag mir deine liebsten Charaktere, Gegner und Relikte und was als Nächstes kommen soll.',
  'Cuéntame tus personajes, oponentes y reliquias favoritos, y qué añadir después.',
  'Dites-moi vos personnages, adversaires et reliques préférés, et ce qu’il faut ajouter ensuite.',
  'Dimmi i tuoi personaggi, avversari e reliquie preferiti, e cosa aggiungere dopo.',
  '好きなキャラクター、対戦相手、レリックと、次に追加してほしいものを教えてください。',
  '좋아하는 캐릭터, 상대, 유물과 다음에 추가했으면 하는 것을 알려 주세요.',
  'Conte seus personagens, oponentes e relíquias favoritos, e o que adicionar a seguir.',
  '告诉我你最喜欢的角色、对手和遗物，以及接下来想加入什么。'),
 'Before we start': ('Bevor es losgeht', 'Antes de empezar', 'Avant de commencer', 'Prima di iniziare', 'はじめに', '시작하기 전에', 'Antes de começar', '开始之前'),
 'Which country are you from?': ('Aus welchem Land kommst du?', '¿De qué país eres?', 'De quel pays venez-vous ?', 'Da quale paese vieni?', 'どこの国から遊んでいますか？', '어느 나라에서 오셨나요?', 'De que país você é?', '你来自哪个国家？'),
 'Optional. You can skip this, like every question.': (
  'Freiwillig. Du kannst das überspringen, wie jede Frage.', 'Opcional. Puedes saltarla, como todas las preguntas.',
  'Facultatif. Vous pouvez passer cette question, comme toutes les autres.', 'Facoltativo. Puoi saltarla, come ogni domanda.',
  '任意です。ほかの質問と同じくスキップできます。', '선택 사항입니다. 모든 질문처럼 건너뛸 수 있습니다.',
  'Opcional. Você pode pular, como todas as perguntas.', '可选。和所有问题一样，可以跳过。'),
 'Country': ('Land', 'País', 'Pays', 'Paese', '国', '국가', 'País', '国家'),
 'Question {0} of {1}': ('Frage {0} von {1}', 'Pregunta {0} de {1}', 'Question {0} sur {1}', 'Domanda {0} di {1}', '質問 {0}/{1}', '질문 {0}/{1}', 'Pergunta {0} de {1}', '第 {0}/{1} 题'),
 'Skip': ('Überspringen', 'Saltar', 'Passer', 'Salta', 'スキップ', '건너뛰기', 'Pular', '跳过'),
 'Who is your favourite character to play as?': ('Welchen Charakter spielst du am liebsten?', '¿Cuál es tu personaje favorito para jugar?',
  'Quel est votre personnage préféré à jouer ?', 'Qual è il tuo personaggio preferito da usare?', '一番好きな使用キャラクターは？',
  '플레이하기 가장 좋아하는 캐릭터는?', 'Qual é o seu personagem favorito para jogar?', '你最喜欢使用哪个角色？'),
 'Who is your least favourite character to play as?': ('Welchen Charakter spielst du am wenigsten gern?', '¿Cuál es el personaje que menos te gusta jugar?',
  'Quel personnage aimez-vous le moins jouer ?', 'Qual è il personaggio che ti piace meno usare?', '一番苦手な使用キャラクターは？',
  '플레이하기 가장 싫은 캐릭터는?', 'Qual é o personagem que você menos gosta de jogar?', '你最不喜欢使用哪个角色？'),
 'What is your favourite normal relic?': ('Was ist dein liebstes normales Relikt?', '¿Cuál es tu reliquia normal favorita?', 'Quelle est votre relique normale préférée ?',
  'Qual è la tua reliquia normale preferita?', '一番好きな通常レリックは？', '가장 좋아하는 일반 유물은?', 'Qual é a sua relíquia normal favorita?', '你最喜欢的普通遗物是？'),
 'What is your favourite shadow relic?': ('Was ist dein liebstes Schattenrelikt?', '¿Cuál es tu reliquia de las sombras favorita?', "Quelle est votre relique de l'ombre préférée ?",
  "Qual è la tua reliquia dell'ombra preferita?", '一番好きな影のレリックは？', '가장 좋아하는 그림자 유물은?', 'Qual é a sua relíquia das sombras favorita?', '你最喜欢的暗影遗物是？'),
 'What is your favourite fused relic?': ('Was ist dein liebstes fusioniertes Relikt?', '¿Cuál es tu reliquia fusionada favorita?', 'Quelle est votre relique fusionnée préférée ?',
  'Qual è la tua reliquia fusa preferita?', '一番好きな融合レリックは？', '가장 좋아하는 합성 유물은?', 'Qual é a sua relíquia fundida favorita?', '你最喜欢的融合遗物是？'),
 'Who is your favourite opponent?': ('Wer ist dein Lieblingsgegner?', '¿Quién es tu oponente favorito?', 'Quel est votre adversaire préféré ?', 'Qual è il tuo avversario preferito?',
  '一番好きな対戦相手は？', '가장 좋아하는 상대는?', 'Quem é o seu oponente favorito?', '你最喜欢的对手是谁？'),
 'Who is your least favourite opponent?': ('Gegen wen spielst du am wenigsten gern?', '¿Quién es el oponente que menos te gusta?', 'Quel adversaire aimez-vous le moins ?',
  "Qual è l'avversario che ti piace meno?", '一番苦手な対戦相手は？', '가장 싫은 상대는?', 'Quem é o oponente de que você menos gosta?', '你最不喜欢的对手是谁？'),
 'What is your favourite online game mode?': ('Was ist dein liebster Online-Modus?', '¿Cuál es tu modo en línea favorito?', 'Quel est votre mode en ligne préféré ?',
  'Qual è la tua modalità online preferita?', '一番好きなオンラインモードは？', '가장 좋아하는 온라인 모드는?', 'Qual é o seu modo online favorito?', '你最喜欢的联机模式是？'),
 'What would you like to see added to the game?': ('Was möchtest du im Spiel noch sehen?', '¿Qué te gustaría que se añadiera al juego?', 'Que voudriez-vous voir ajouté au jeu ?',
  'Cosa ti piacerebbe vedere aggiunto al gioco?', 'ゲームに追加してほしいものは？', '게임에 추가되었으면 하는 것은?', 'O que você gostaria de ver adicionado ao jogo?', '你希望游戏加入什么？'),
 'Your ideas': ('Deine Ideen', 'Tus ideas', 'Vos idées', 'Le tue idee', 'あなたのアイデア', '아이디어', 'Suas ideias', '你的想法'),
 'Thank you for taking the survey!': ('Danke für deine Teilnahme an der Umfrage!', '¡Gracias por hacer la encuesta!', "Merci d'avoir répondu au sondage !",
  'Grazie per aver partecipato al sondaggio!', 'アンケートへのご協力ありがとうございます！', '설문에 참여해 주셔서 감사합니다!', 'Obrigado por responder à pesquisa!', '感谢你参与调查！'),
 'To celebrate 10K players, the next update will feature a special cosmetic for everyone.': (
  'Zur Feier von 10K Spielern bringt das nächste Update ein besonderes kosmetisches Extra für alle.',
  'Para celebrar los 10K jugadores, la próxima actualización traerá un cosmético especial para todos.',
  'Pour fêter les 10K joueurs, la prochaine mise à jour offrira un cosmétique spécial à tout le monde.',
  'Per festeggiare i 10K giocatori, il prossimo aggiornamento porterà un cosmetico speciale per tutti.',
  'プレイヤー1万人を記念して、次のアップデートでは全員に特別なコスメティックが登場します。',
  '플레이어 1만 명을 기념해 다음 업데이트에서 모두에게 특별한 꾸미기 아이템을 드립니다.',
  'Para comemorar os 10K jogadores, a próxima atualização trará um cosmético especial para todos.',
  '为庆祝玩家突破1万，下次更新将为所有人带来一个特别的装饰。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()
