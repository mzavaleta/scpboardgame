# M6 A1 — Gates become places, not tolls

Branch: `main` · Delivery: work-unit commits · Runner: `pnpm test` (vitest) · Spec origin: `implementation.md`
§14k.4 (amendment to D29) · Debt: D10 · Backlog: Phase A item A1.

## Specs

**S1 — A gate is a place with one state.** The owner, playing:
*"if door is open i shoudl be able to cross, if closed i need to open it, by key, by special artifact or item,
by skill etc. or maybe the door is open but passign by activates a draw and if hapens to be a monster then
needs to be cleared before corssing."*
Each gate holds exactly one **condition** — `open`, `locked`, `guarded` — plus an optional **seal** (the
existing Assembly/Lockdown: `reopen > round` blocks it regardless of condition) and an optional **guard**
(an anomaly card held at the gate). State lives in `GameState`, is serializable, and is visible on the board.

**S2 — Open crosses free.** No roll, no spend, either direction, any player.

**S3 — Locked opens, and opening is permanent.** A locked gate opens by the `key` tag (consumed), or by one
successful Intellect test at the gate's difficulty. (A gear effect that opens locks does not exist yet; when it
does, it joins this list.) Opening sets the gate to `open` **for everyone, for the rest of the game** — a door
that was opened is open.

**S4 — Guarded draws on the way through.** Crossing a guarded gate draws an anomaly from the deck of the ring
being **entered** (core entries draw from the inner deck). Containing it lets you cross and the gate becomes
`open`. Failing or walking away means **you do not cross and the thing stays at the gate**.

**S5 — A guard persists and blocks everyone.** While a `guard` card is held at a gate, the gate is a blocked
corridor: any player crossing it, in either direction, must face that same card. It is never discarded by a
failure. Leaving it behind is a public act (the evidence rules already make a failed gate an accident).

**S6 — Sealed wins.** A gate sealed by `sealGate` / Lockdown crosses nobody until its reopen round passes;
when it lapses the gate returns to its underlying condition, not automatically to `open`.

**S7 — The toll is deleted.** Clearance no longer grants passage and `buyClearance` / `attemptClearance` no
longer exist at a gate. **Temporary state (recorded, not hidden):** `buyClearance` still exists as an
administrative rank used only by directives until **A2** decides what Records buy and what clearance becomes;
it is a dead purchase in the meantime, and A2 is the very next item.

**S8 — The board says what each gate is.** Condition and seal are visible on the board (colour + tooltip),
localized through `t()`; the crossing prompt names the requirement (`locked · Intellect 2`, `guarded`, `sealed
until round N`).

**S9 — The instrument is told the truth.** The simulator reads gate condition and guard occupancy instead of
`clearance >= gate.clearance`. Its purchase heuristic is now stale and says so in L5; fixing the bot is B2, and
`purchasesPerGame` is removed there once A2 gives Records a sink.

**S10 — Tests pin each rule.** One test per state, plus: opening is permanent; a failed guard blocks the other
direction; a seal lapses to the underlying condition; crossing marks progress exactly once.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Gate state model: `gates` map in `GameState`, defaults from tuning, seal derived, hash/serialization | S1, S2, S6 | inline | **done** |
| T2 | Crossing: open free, locked opens permanently, sealed refuses | S2, S3, S6, S7 | inline | **done** |
| T3 | Guarded: entry draw, containment crosses, failure persists the guard and blocks everyone | S4, S5 | inline | **done** |
| T4 | Content + tuning: starting conditions, lock difficulties, core entry deck | S1, S4 | inline | **done** |
| T5 | Simulator: gate condition and guard occupancy replace the clearance check | S9 | inline | **done** |
| T6 | Board and prompts: condition, seal, guard badge, requirement text, i18n | S8 | inline | **done** |
| T7 | Close: docs, feature log, full suite and build | all | inline | **done** |

## Log

**L1 — owner, 2026-11-22 (verbatim).** *"ok then lets go with next M6-7 butcould we differ and separate all
visual improvements , im interested in first finish all related with mechanics and reall value improvements,
then finetuning and balance, then visuals"* — this item is the first of Phase A, and no visual polish is part
of it (the board work in T6 exists because a state you cannot see is not a rule).

**L2 — the model, chosen from §14k.4.** One condition per gate, with the seal as an overlay instead of a
fourth state. Reason: `sealedGates` already exists and is *time-bounded*, while `open/locked/guarded` describe
the door itself; modelling `sealed` as a fifth condition would have to remember what to return to. The
`condition` field is the truth; `reopen > round` is the seal.

**L3 — built (2026-11-22).** `GameState.sealedGates` (gate id → round) is replaced by `GameState.gates`
(gate id → `{ condition, guard?, reopen? }`). The seal is now an **overlay**: `reopen > round` blocks crossing
and lapses back to whatever the door actually is, which is why sealing no longer accidentally unlocks a locked
gate. The toll is gone from `tryCrossGate` (now `tryOpenLock`): key tag, then one Intellect test, and success
rewrites the gate to `open` for everyone. A guarded gate stops the walk at the mouth (`startGuardEncounter`),
draws from the deeper ring's deck, and its card is stored on the gate: a failure or a decline leaves it there,
blocking both directions, and resolving it moves the crosser to the far side and opens the door. Content starts
G1 open, G2/G4/G5 locked, G3/G6 guarded — one of each shape per boundary, so the mechanic is reachable without
a dev tool.

**L4 — verification.** 200 tests / 15 files, `pnpm typecheck` clean, `vite build` clean. `gates.test.ts` pins
the five rules (draw at the mouth, decline persists, containment crosses and opens, the standing guard blocks
the reverse direction with the same card, the seal lapses to the door's own condition). RED was observed for
T2 through the five old tests that asserted the toll (`clearance 2 crosses G1`, key bypass, held-at-the-mouth,
the seal fixture and the `sealedGates` shape); the guard tests of T3 were written after the code, so their RED
was not observed and that is stated rather than implied. Browser: the three gate strokes and the six tooltips
render (`G1 — open`, `G2 — locked`, `G3 — guarded`, …), and every chrome string is behind `t()`.

**L5 — the instrument took the hit, as predicted (§14k.4).** `pnpm sim --games 20`: cap hit **70–100%**
(2p cautious 95%, 2p aggressive 70%) against 44–82% before, `gate fail 0%`, and `purchases 0.45/game` while
clearance buys nothing. Two causes, both instrument-side: the bot's `gateIsPassable` still models the old
economy (it buys rank it cannot use), and it now avoids guarded gates entirely instead of confronting them.
The warhead still fires, so the `capHitShare < 1` assertion moved from 6 to 20 games to keep it honest.
**This is B2 work, not a number to tune now** (owner: balance comes after mechanics).
