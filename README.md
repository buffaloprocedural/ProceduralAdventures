# Procedural Adventures

*A creature-befriending adventure, made anew from every seed.*

From The Buffalo, New York Procedural Amusements Coding Society.

Every new game builds its own little county: towns, routes, a dungeon, a cast of characters, a three-act story and
a soundtrack, all from a single seed. A whole adventure takes about 15 to 45 minutes. Then you can start again
somewhere else entirely.

You don't catch creatures here. You **make friends** with them.

---

## Getting started

Open **`dist/procedural-adventures.html`** in any modern browser. That's the whole game in one file, and it works
right from your desktop.

At the title screen:

* **NEW ADVENTURE** deals you a world at random.
* **CHOOSE A SEED** lets you type any word. The same word always makes the same world, story and music, so you can
  share one with a friend.
* **CONTINUE** picks up your saved game. There is one save slot; save from the START menu.

## Controls

| Button | Keyboard | Touch | Controller |
| --- | --- | --- | --- |
| D‑pad | Arrows / WASD | on‑screen pad | d‑pad or left stick |
| A | Z, Space, J | A | bottom face button |
| B (hold to hurry) | X, Backspace, K | B | right face button |
| START | Enter, Esc | START | Menu / Options / + |
| SELECT (diary) | Shift, Tab | SELECT | View / Share / − |
| Mute / fullscreen | M / F | — | — |

**Controllers:** most gamepads work, including Bluetooth controllers on phones and tablets. Press any button once
after the page opens, and the game will say "Controller ready!" If your controller's A button is on the right, set
**OPTIONS → PAD A=RIGHT**.

**Naming:** when asked for a name, you can just type it and press Enter.

---

## Making friends

When you meet a wild creature, choose **BEFRIEND** and try one of five approaches:

> **COMPLIMENT** · **WAIT QUIETLY** · **PET** · **FEED** · **PLAY**

Every creature has its own tastes. Win its trust and the **hearts** fill up. Fill them all and it will ask to join
you. Choose badly and you may lose a heart, or it may wander off.

A few things to keep in mind:

* **Be kind first.** If you hurt a creature in any way, it won't trust you for the rest of that encounter.
* **Divas and Shy Ones.** Every creature is one or the other. Divas love attention. Shy Ones would rather you
  were patient.
* **Watch out for petting.** Some creatures adore it. Others really, *really* don't.
* **Every creature has exactly one person.** A trainer's creature is already spoken for.
* **Your ALMANAC** remembers what each kind of creature likes as you find out.

Making a friend earns as much experience as winning a battle, so the gentle path is never the weaker one.

## The creatures

There are 38 creatures to meet, each with its own temperament and three attacks. The third is a **signature
attack**, learned at level 9, which says something about who they are.

### The twelve types

The types come in four rings of three. Inside a ring, each type beats the next one along. Against the other rings
it's an even match.

| Ring | | | |
| --- | --- | --- | --- |
| Hearth | KINDLE beats BLOOM | BLOOM beats TIDE | TIDE beats KINDLE |
| Forge | CURRENT beats CHROME | CHROME beats STONE | STONE beats CURRENT |
| Weather | FROST beats BREEZE | BREEZE beats LOAM | LOAM beats FROST |
| Stage | GLAM beats BLIGHT | BLIGHT beats HUSH | HUSH beats GLAM |

Some types are immune to their own troubles: KINDLE won't burn, FROST won't freeze, BLIGHT won't be poisoned, and
STONE won't be paralysed.

### Temperament in battle

* **Divas** hit harder right after landing a hit, but after taking a big one they sulk and their aim suffers.
* **Shy Ones** are hard to hit on their first turn out, and hold back while their opponent is still at full health.

## GULLIVER

Meet **GULLIVER**, the cool seagull. He's with you in every story, leading your party, and he's the only one of
his kind.

## The stories

Every adventure deals you **four cards**: a **story**, a **setting**, a **genre** and a **premise**. Together they
decide where you are, who you'll meet, what's gone wrong and how you'll fix it. With hundreds of cards in the four
decks, you might find yourself running an election in a mole kingdom, chasing a thief across a cloud city, or
fetching six errands before the last ferry.

Every story follows the same shape:

1. **The setup.** Choose how you'd like to appear and pick a name. Someone needs your help right away.
2. **Act I.** Collect what's needed by talking to people, answering questions, doing favours and making friends.
3. **Act II.** Halfway through, something changes.
4. **Act III.** As the day turns to dusk, head for the end of the road and see it through.

Most stories have creature battles. Some don't, and in those you'll solve things with questions and kindness
instead. Your **WORLD MAP** is in your bag from the start.

Now and then the cards make a very odd hand. The game will own up to it.

## The world

Each county has a home town, two more towns, three routes, a dungeon (a deep cave or a tangled forest) and,
sometimes, a hidden glade. Look for the CLINIC to rest your team, the SHOP for supplies, the library for some light
reading, and the ASSEMBLY ROOMS for whatever the story has in store.

---

## For tinkerers

The game's source is in `src/`, and `index.html` runs it straight from there. The art lives in `art/` and the
build scripts in `tools/` (Python 3, with Pillow and numpy). `python3 tools/bundle.py` rebuilds the single-file
game in `dist/`. Tests are in `tests/` (Node and Playwright); `node tests/smoke.js` is a good quick check.

A few URL options for experimenting:

* `?story=structure.setting.genre.premise` deals a particular hand (any part can be `*`)
* `?setting=space` fixes one deck at a time
* `?battles=0` turns battles off
* `?title=snow|rain|petals` changes the title screen weather

## Credits

Made by **The Buffalo, New York Procedural Amusements Coding Society**.

* **Art:** the characters, creatures, GULLIVER, tiles, objects, battle effects and the Bitmap8 font are all
  original, made for this game.
* **Words:** place and character names and quotations from Jane Austen's *Pride and Prejudice* (1813), which is in
  the public domain, via Project Gutenberg.
* **Engine, worlds, stories and music:** written for this game.

Much of the art and code was made with AI assistance; see `NOTICE`.

## Licence

**Code: public domain.** The engine, world generator, story engine, music composer, build tools and tests are
dedicated to the public domain under CC0 1.0 (`LICENSE`). Use them for anything, no credit needed.

**Graphics, story text and design documents: CC BY-NC 4.0.** The pixel art, the creature and effect designs, the
story decks, the game's dialogue, the creature roster and the design notes are under Creative Commons
Attribution-NonCommercial 4.0 (`LICENSE-ART`, which lists the exact files). See `NOTICE`.
