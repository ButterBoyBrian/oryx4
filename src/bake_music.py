# renders a soundtrack once in the browser and stores it as assets/music.ogg (Oryx IV) or, with the argument 5,
# assets/music5.ogg (Oryx V), as Opus; build.py embeds both in the game
# needs: pip install playwright && playwright install chromium; ffmpeg with libopus on PATH
import asyncio, base64, os, subprocess, sys, time
from playwright.async_api import async_playwright
FIVE = sys.argv[1:] == ['5']; L, R_, PROG, NAME = ('LA.music5L', 'LA.music5R', 'LA.prog5', 'music5.ogg') if FIVE else ('LA.musicL', 'LA.musicR', 'LA.prog', 'music.ogg')
ROOT = os.path.dirname(os.path.abspath(__file__)); FF = 'ffmpeg'; os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(); await pg.goto('file://' + os.path.join(ROOT, 'index.html'))
        t0 = time.time(); await pg.wait_for_function(f'{PROG} >= 1 && {L}', timeout=900000); print('composed in', round(time.time() - t0, 1), 's')
        n = await pg.evaluate(f'{L}.length'); raw = bytearray(); CH = 48000 * 10
        for i in range(0, n, CH):   # interleaved 16-bit PCM, 10 s at a time
            raw += base64.b64decode(await pg.evaluate(f"""(() => {{ const L = {L}, R = {R_}, e = Math.min(L.length, {i + CH}), o = new Int16Array((e - {i}) * 2);
              for (let j = {i}; j < e; j++) {{ o[(j - {i}) * 2] = Math.max(-1, Math.min(1, L[j])) * 32767; o[(j - {i}) * 2 + 1] = Math.max(-1, Math.min(1, R[j])) * 32767; }}
              let s = ''; const u = new Uint8Array(o.buffer); for (let k = 0; k < u.length; k += 8192) s += String.fromCharCode.apply(null, u.subarray(k, k + 8192)); return btoa(s); }})()"""))
        await b.close()
    out = os.path.join(ROOT, 'assets', NAME)
    subprocess.run([FF, '-loglevel', 'error', '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', '-', '-c:a', 'libopus', '-b:a', '96k' if FIVE else '112k', out], input=bytes(raw), check=True)
    print(out, os.path.getsize(out) // 1024, 'KB')
asyncio.run(main())
