# Protocol Breach

A browser-first 2D tabletop game: three concentric containment rings, a facility that is failing, visible
weaknesses, and one hidden directive per player.

**Status: MVP complete (M4).** The game is playable end to end in English and Spanish: setup → role
draft → private directive handoff → table → motive-reveal endgame → credits. 194 tests, a pure seeded
engine, a content gate and a balance simulator. M5 (save/resume, animation, sound, accessibility) and M6
(balance, deploy, playtests) remain.

| Document | What it is |
| --- | --- |
| [`idea.md`](./idea.md) | The original product charter, verbatim. Never edited. |
| [`implementation.md`](./implementation.md) | **The living document.** Every decision, its reasoning, the specification, and the content. Start at the Contents block. |

## Licences

- **Code:** MIT — see [`LICENSE`](./LICENSE)
- **Game content:** CC BY-SA 3.0 — see [`LICENSE-CONTENT`](./LICENSE-CONTENT)

The split exists because this is a derivative work of the SCP Wiki (CC BY-SA 3.0, whose share-alike clause
covers derived content), while the engine should stay reusable without inheriting that.

## Development

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev         # localhost:5173 — ?seed=123&players=2&lang=en|es
pnpm test        # engine, content and UI-chrome tests, including determinism
pnpm typecheck
pnpm build
pnpm validate    # §S8.3 content gate; --release turns attribution debt into failure
pnpm sim --games 200 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40
```

`?lang=pseudo` renders every chrome string bracketed, so an untranslated literal is visible at a glance.
The address bar always carries `?seed=&players=&lang=`, so a playtest URL reopens the exact table.

### The one invariant everything else rests on

The engine is a pure, seeded reducer:

```
seed + ordered actions  →  identical GameState  →  identical state hash
```

No `Math.random()`, no `Date.now()`, no DOM, no I/O inside `src/engine`. Every random draw is a pure function
of `(seed, cursor)`, and the cursor lives in the state. That single property buys replay files,
reproducible bug reports, golden regression tests, the balance simulator, and (later) client/server sync.

It is also the whole of M0's acceptance test: `src/engine/replay.test.ts`.
