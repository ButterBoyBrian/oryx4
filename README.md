# Oryx the Mad God IV & V

Two fan-made bullet-hell boss fights inspired by Realm of the Mad God's Oryx series, playable in the browser.

- **Oryx IV — The Unwound** is a clockwork god: six phases (Tick, Rewind, Stasis, Eleventh Hour, Midnight, and a
  survival finale, The Final Seconds).
- **Oryx V — The Usurper** sends the heroes he has stolen at you, one yellow-dyed party per weapon, each in a hall of
  its own shape: the Conclave (Wizard, Necromancer, Mystic), the Choir (Priest, Sorcerer, Summoner), the Hunt
  (Archer, Huntress, Bard), the Night (Rogue, Assassin, Trickster) and the Colosseum (Warrior, Paladin). Then he
  fights you himself, as the Knight. Every hero has its own health and signature moves named for its items, and the
  heroes strafe, dash and blink around you while they fight; every so often a whole party breaks off and hunts you
  down. The Colosseum and the Knight's Last Stand are survival phases: outlast a clock that every hit you land winds
  down faster. It lasts four to five minutes and is much harder than Oryx IV.

Sprites, music and sound are original and generated in code.

**Play:** open `index.html`, or the GitHub Pages site for this repository.

## Controls

| Action | Key |
|---|---|
| Choose the fight | ↑ / ↓ or click, on the title screen |
| Move | W A S D |
| Aim | Mouse |
| Fire | Left click (or toggle autofire with C / middle click) |
| Spell | Space |
| HP / MP potion | F / V |
| Pause | Esc (then R to restart) |
| Practice a phase | 1–6 on the title screen (Oryx V adds 7: the Knight's Last Stand) |

Difficulties: **Easy**, **Hard** (default), **Diabolical**.

## Building from source

`index.html` is a single self-contained file (scripts, fonts and music inlined). To rebuild it:

```
cd src
python3 build.py              # writes src/dist/oryx4_game.html
cp dist/oryx4_game.html ../index.html
```

The soundtracks are pre-rendered into `src/assets/music.ogg` (Oryx IV) and `src/assets/music5.ogg` (Oryx V). If you
change the music code, re-bake them with `python3 bake_music.py` and `python3 bake_music.py 5` (needs Playwright with
Chromium and ffmpeg with libopus). Without the files, the game composes the music in the browser at startup instead.

## Credits

Fan-made; not affiliated with or endorsed by DECA Games. Fonts: Pixelify Sans, Silkscreen, Press Start 2P,
Chakra Petch and Rajdhani, all under the SIL Open Font License.
