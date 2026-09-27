# Oryx the Mad God IV — The Unwound

A fan-made bullet-hell boss fight inspired by Realm of the Mad God's Oryx series, playable in the browser.
Oryx IV is a clockwork god: six phases (Tick, Rewind, Stasis, Eleventh Hour, Midnight, and a
survival finale, The Final Seconds) with original sprites, music and sound, all generated in code.

**Play:** open `index.html`, or the GitHub Pages site for this repository.

## Controls

| Action | Key |
|---|---|
| Move | W A S D |
| Aim | Mouse |
| Fire | Left click (or toggle autofire with C / middle click) |
| Spell | Space |
| HP / MP potion | F / V |
| Pause | Esc (then R to restart) |
| Practice a phase | 1–6 on the title screen |

Difficulties: **Easy**, **Hard** (default), **Diabolical**.

## Building from source

`index.html` is a single self-contained file (scripts, fonts and music inlined). To rebuild it:

```
cd src
python3 build.py              # writes src/dist/oryx4_game.html
cp dist/oryx4_game.html ../index.html
```

The soundtrack is pre-rendered into `src/assets/music.ogg`. If you change the music code, re-bake it with
`python3 bake_music.py` (needs Playwright with Chromium and ffmpeg with libopus). Without the file, the game
composes the music in the browser at startup instead.

## Credits

Fan-made; not affiliated with or endorsed by DECA Games. Fonts: Pixelify Sans, Silkscreen, Press Start 2P,
Chakra Petch and Rajdhani, all under the SIL Open Font License.
