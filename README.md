# Protocol Breach

A browser-first 2D tabletop game: three concentric containment rings, a facility that is failing, visible
weaknesses, and one hidden directive per player.

**Status: pre-implementation.** The specification is complete and frozen; M0 (engine skeleton) is in
progress. No game is playable yet.

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
pnpm test        # engine unit tests, including the determinism guarantee
pnpm typecheck
```

### The one invariant everything else rests on

The engine is a pure, seeded reducer:

```
seed + ordered actions  →  identical GameState  →  identical state hash
```

No `Math.random()`, no `Date.now()`, no DOM, no I/O inside `src/engine`. Every random draw is a pure function
of `(seed, cursor)`, and the cursor lives in the state. That single property buys replay files,
reproducible bug reports, golden regression tests, the balance simulator, and (later) client/server sync.

It is also the whole of M0's acceptance test: `src/engine/replay.test.ts`.
