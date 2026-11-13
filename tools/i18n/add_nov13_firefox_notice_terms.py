"""Firefox notice (user, 2026-11-13): explains the automatic Compatibility Mode and suggests another browser, 8 languages.
The dialog's paragraphs are translated whole; bold words are kept as separate keys by the screen translator."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Playing on Firefox': {'de': 'Spielen mit Firefox', 'es': 'Jugar en Firefox', 'fr': 'Jouer sur Firefox', 'it': 'Giocare su Firefox',
                        'ja': 'Firefoxでプレイ中', 'ko': 'Firefox에서 플레이 중', 'pt': 'Jogando no Firefox', 'zh': '正在使用 Firefox 游玩'},
 "Many of the game's effects flicker a lot in Firefox, so Compatibility Mode is on: blur, glow, 3D card turns and animated backgrounds are replaced with simpler versions.": {
  'de': 'Viele Effekte des Spiels flackern in Firefox stark, deshalb ist der Kompatibilitätsmodus an: Unschärfe, Leuchten, 3D-Kartendrehungen und animierte Hintergründe werden durch einfachere Versionen ersetzt.',
  'es': 'Muchos efectos del juego parpadean mucho en Firefox, así que el modo de compatibilidad está activado: el desenfoque, los brillos, los giros de cartas en 3D y los fondos animados se sustituyen por versiones más sencillas.',
  'fr': "De nombreux effets du jeu clignotent beaucoup sur Firefox, donc le mode compatibilité est activé : le flou, les lueurs, les rotations de cartes en 3D et les fonds animés sont remplacés par des versions plus simples.",
  'it': 'Molti effetti del gioco sfarfallano molto su Firefox, quindi la modalità compatibilità è attiva: sfocature, bagliori, rotazioni 3D delle carte e sfondi animati sono sostituiti da versioni più semplici.',
  'ja': 'Firefoxでは多くの演出が激しくちらつくため、互換モードがオンになっています。ぼかし、発光、カードの3D回転、アニメーション背景はシンプルな表示に置き換わります。',
  'ko': 'Firefox에서는 많은 효과가 심하게 깜빡이기 때문에 호환 모드가 켜져 있습니다. 흐림, 빛 효과, 3D 카드 회전과 움직이는 배경이 더 단순한 버전으로 바뀝니다.',
  'pt': 'Muitos efeitos do jogo piscam bastante no Firefox, então o Modo de Compatibilidade está ligado: desfoque, brilhos, giros de cartas em 3D e fundos animados são substituídos por versões mais simples.',
  'zh': '游戏中的许多效果在 Firefox 中会严重闪烁，因此已开启兼容模式：模糊、发光、3D 翻牌和动态背景会换成更简单的版本。'},
 'For the full look and smoother animations, play in Chrome, Edge, Opera or Safari, or install the Android app.': {
  'de': 'Für die volle Optik und flüssigere Animationen spiele in Chrome, Edge, Opera oder Safari oder installiere die Android-App.',
  'es': 'Para ver el juego completo y con animaciones más fluidas, juega en Chrome, Edge, Opera o Safari, o instala la app de Android.',
  'fr': "Pour profiter de tous les effets et d'animations plus fluides, jouez sur Chrome, Edge, Opera ou Safari, ou installez l'application Android.",
  'it': "Per la grafica completa e animazioni più fluide, gioca su Chrome, Edge, Opera o Safari, oppure installa l'app per Android.",
  'ja': 'すべての演出となめらかなアニメーションを楽しむには、Chrome、Edge、Opera、Safariでプレイするか、Androidアプリをインストールしてください。',
  'ko': '전체 연출과 더 부드러운 애니메이션을 보려면 Chrome, Edge, Opera, Safari에서 플레이하거나 Android 앱을 설치하세요.',
  'pt': 'Para o visual completo e animações mais suaves, jogue no Chrome, Edge, Opera ou Safari, ou instale o app para Android.',
  'zh': '想要完整的画面和更流畅的动画，请使用 Chrome、Edge、Opera 或 Safari 游玩，或安装 Android 应用。'},
 'You can turn Compatibility Mode off in Settings › Display, but you may see flickering.': {
  'de': 'Du kannst den Kompatibilitätsmodus unter Einstellungen › Anzeige ausschalten, dann kann es aber flackern.',
  'es': 'Puedes desactivar el modo de compatibilidad en Ajustes › Pantalla, pero puede que veas parpadeos.',
  'fr': "Vous pouvez désactiver le mode compatibilité dans Paramètres › Affichage, mais des clignotements peuvent apparaître.",
  'it': 'Puoi disattivare la modalità compatibilità in Impostazioni › Schermo, ma potresti vedere sfarfallii.',
  'ja': '互換モードは「設定 › 表示」でオフにできますが、ちらつくことがあります。',
  'ko': '호환 모드는 설정 › 화면에서 끌 수 있지만 깜빡임이 생길 수 있습니다.',
  'pt': 'Você pode desligar o Modo de Compatibilidade em Configurações › Tela, mas pode ver piscadas.',
  'zh': '你可以在“设置 › 显示”中关闭兼容模式，但可能会出现闪烁。'},
 "Compatibility Mode is off, so many of the game's effects may flicker a lot in Firefox.": {
  'de': 'Der Kompatibilitätsmodus ist aus, deshalb können viele Effekte des Spiels in Firefox stark flackern.',
  'es': 'El modo de compatibilidad está desactivado, así que muchos efectos del juego pueden parpadear mucho en Firefox.',
  'fr': "Le mode compatibilité est désactivé, donc de nombreux effets du jeu peuvent beaucoup clignoter sur Firefox.",
  'it': 'La modalità compatibilità è disattivata, quindi molti effetti del gioco possono sfarfallare molto su Firefox.',
  'ja': '互換モードがオフのため、Firefoxでは多くの演出が激しくちらつくことがあります。',
  'ko': '호환 모드가 꺼져 있어 Firefox에서 많은 효과가 심하게 깜빡일 수 있습니다.',
  'pt': 'O Modo de Compatibilidade está desligado, então muitos efeitos do jogo podem piscar bastante no Firefox.',
  'zh': '兼容模式已关闭，游戏中的许多效果在 Firefox 中可能会严重闪烁。'},
}
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        table.pop("Firefox makes some of the game's effects flicker, so Compatibility Mode is on: blur, glow, 3D card turns and animated backgrounds are replaced with simpler versions.", None)
        for key, text in TERMS.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'mobile.js firefox notice'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()
