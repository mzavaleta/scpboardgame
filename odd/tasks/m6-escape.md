# M6 A5 — The escape capsule (one seat)

Branch: `main` · Runner: `pnpm test` · Spec origin: `odd/tasks/m4-mvp.md` **L15** (owner: *"yes 1 seat"*),
`implementation.md` §14k.5 (R1–R7) · Backlog: Phase A, proposed order step 1.

## Specs

**S1 — The facility is doomed.** The site is lost no matter what the table does. The clock is a deadline, not a
problem to solve. (The clock itself is R2, the next unit.)

**S2 — The capsule has exactly one seat.** It sits in the Command Center (`core-00`). Claiming it is an action,
taken on your own action phase while standing there.

**S3 — The claim is public and permanent.** `GameState.capsuleSeat` is visible to the whole table; the log names
the claimant; nobody can take the seat afterwards.

**S4 — Claiming is the only escape path for now.** Making room for a second seat is a later iteration, priced in
time/rounds/rolls/spawns — that is where cooperation and betrayal live.

**S5 — The terminal and the directives change together.** The site is always lost; the capsule holder wins, and a
directive whose condition holds is the secondary win. The board's centre and the alignment stop deciding, so the
twelve directive texts are re-written in the same change.

**S6 — No visual polish belongs here.** The button and the status line exist because a state you cannot see is
not a rule. Everything else waits for Phase C.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | `capsuleSeat` on `GameState`, `claimCapsule` action, `capsule-taken` rejection | S1–S3 | inline | **done** |
| T2 | Action button at the Core, status-strip holder, EN/ES keys | S3, S6 | inline | **done** |
| T3 | Tests: free at start, claim at Core, off-Core refused, second claim refused, wrong phase | S2–S3 | inline | **done** |
| T4 | Protocol buys rounds; terminal reads the capsule; directives win by condition; texts rewritten | S5 | inline | **done** |
| T5 | Doom deck (R2): the clock advances by chance, so the site is lost on a schedule | S1 | inline | **done** |

## Log

**L1 — owner, 2026-11-22 (verbatim).** *"yes 1 seat"* — answering the one decision that unblocked this unit:
one seat, first to claim it.

**L2 — built (2026-11-22).** `GameState.capsuleSeat: SeatId | null`, initialised `null`; `claimCapsule` requires
the action phase, `core-00`, and a free seat, and rejects a second claim with `capsule-taken`. The claim writes
the public log line *"P1 claims the escape capsule — one seat, and it is taken."* The Core action row shows the
button (disabled with the holder's name once taken), and the status strip shows the holder. 209 tests / 16 files,
typecheck clean.

**L3 — what the next unit has to decide.** The terminal and the directives are one change: if the site is always
lost, the twelve directives stop meaning what they say (today `Breach` waits for the site to be lost, which will
be the default ending). Two things must be answered before code: **what do the 12 directives become**, and **what
does the protocol do now** (the proposal in L17: each protocol step buys one round of countdown, so the Core is
the place where you either buy time for the table or take the only seat). The rules page does not mention the
capsule yet — it gets one rewrite with the terminal, not two.

**L4 — the terminal, built (2026-11-22).** The protocol now buys time instead of winning: on a success it adds one
round to the warhead countdown, or takes one off the Threat track before the warhead is armed, and the third step
only records `protocolFinishers` (one directive asks for it). `resolveOutcome` no longer reads the terminal or the
alignment: **winners = the capsule holder (if alive) + every seat whose directive condition holds**, with the
public-footprint check for the directives that name one. The twelve texts were re-written out of the old
"the site is recontained" frame, and `verdictFor` lost its `alignment` reason.

**L5 — R2 landed early, because the terminal was unreachable without it.** The Threat track only rose when nobody
attempted anything, so a table that kept playing (or worked the protocol) could hold the clock forever and the
only ending never fired. `src/content/doom.ts` adds four facility cards, and `endRound` draws one at
`TUNING.doom.chancePercent` (50% today, a balance dial). Four cards, one existing effect (`raiseThreat`), no new
rule.

**L6 — the instrument was lying, and this unit found it.** `playGame` broke out of its loop on any rejected bot
action, and the sample was then counted as a **cap hit**. Bot bugs (`rest` on a held seat, `compel` on a seat that
could not act, `compel` twice in a turn) made whole samples stop early and look like stalemates. After fixing the
three, `pnpm sim --games 20` reads **cap 0%, detonated 100%, median rounds 8–10** — the 44–82% cap in
§S9.6 was, at least in part, a measurement artefact. That is a B2 finding, recorded, not tuned: 8–10 rounds is
below the 12–18 target and deaths are 1.15–2.6/game.
