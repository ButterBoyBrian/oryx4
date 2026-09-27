# bundles the game into one self-contained HTML file (fonts inlined as data URIs, scripts inlined)
import os, re, base64
ROOT = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
html = re.sub(r"url\((fonts/[^)]+)\)", lambda m: "url(data:font/ttf;base64," + base64.b64encode(open(os.path.join(ROOT, m.group(1)), 'rb').read()).decode() + ")", html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: '<script>\n' + open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read().replace('</script>', '<\\/script>') + '\n</script>', html)
html = re.sub(r'<!--BOT-->.*?</script>', '', html)
# the pre-rendered scores (bake_music.py); without them the game composes at startup
for name, var in (('music.ogg', 'MUSIC_OGG'), ('music5.ogg', 'MUSIC5_OGG')):   # Oryx IV's and Oryx V's scores
    ogg = os.path.join(ROOT, 'assets', name)
    if os.path.exists(ogg): html = html.replace('</head>', '<script>const ' + var + ' = "' + base64.b64encode(open(ogg, 'rb').read()).decode() + '";</script>\n</head>', 1)
out = os.path.join(ROOT, 'dist', 'oryx4_game.html'); open(out, 'w', encoding='utf-8').write(html)
print(out, os.path.getsize(out) // 1024, 'KB')
