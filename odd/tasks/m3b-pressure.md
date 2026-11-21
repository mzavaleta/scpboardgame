# M3b — the pressure model

Feature: the game gets a clock, a threat, and an ending.
Branch: `main` (solo repo, direct commits per work unit).
Test runner: `pnpm test` (vitest). `pnpm typecheck`, `pnpm build`, `pnpm sim` before closing a unit.
Owner request: *"is there anything valueble to test manually or can we just go M3b?"* → proceed to M3b.

## Specs

**S1 — A progress attempt is recorded per seat.** The seat registers one when it lands in a deeper ring,
attempts a containment test (success or failure), attempts or passes a gate, or buys clearance. Merely
walking around the same ring registers nothing. Quote, §7: *"attempting a containment test, moving towards
a gate or the inner ring, spending on clearance, or entering a deeper ring — successful or not"*.

**S2 — The track advances on a round where nobody tried.** At the end of a round in which no seat registered
a progress attempt, the threat track `+1`. One seat trying is enough to hold it. Quote, §S2: *"if no seat
produced a progress attempt this round, the track `+1`"*.

**S3 — Threat caps at 5 and arms the warhead.** Reaching 5 sets `warhead = { remaining: countdown }` from
`tuning.json` and does **not** tick it that round. Quote, §S2: *"If the track reaches 5 → arm the warhead;
`remaining = preset`. It does not tick this round."*

**S4 — The warhead counts down and detonates.** Each later round end ticks `remaining - 1`; at 0 the outcome
is `detonated`. Quote, §S2: *"If armed → `remaining - 1`. Resolve terminals: `remaining == 0` → detonated"*.

**S5 — A terminal state stops the game.** Once `outcome !== null`, every action is rejected with
`game-over` and the UI says how it ended. No new terminal can overwrite one.

**S6 — No directives means a shared loss, not a hidden winner.** Until M3c deals Main Directives, every
seat is containment-aligned, so `detonated` has **no winners** and the log says the site was lost. Faking a
winner would contradict §7c.3, which needs alignment to resolve.

**S7 — The clock is visible.** Threat, warhead countdown and the outcome appear in the status strip, and the
tuning file owns `threat.max` and `threat.warheadCountdown` (§S10).

**S8 — Deliberately out of this milestone.** Threshold escalation cards (§C5, needs `lockGate`,
`forceMove`, the vote), hunters that move, and the `recontained` terminal — it needs the protocol track.
Recorded as debt in `## Log` and in `implementation.md`, not silently missing.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Progress attempts + threat track on the round boundary | S1, S2 | inline | **done** (`pressure.test.ts`) |
| T2 | Warhead arm/countdown + `detonated` outcome + action lockout | S3, S4, S5, S6 | inline | **done** |
| T3 | Threat/warhead/outcome in the status strip + tuning entries | S7 | inline | **done** (browser: `threat 1/5`) |
| T4 | Simulator reports terminals and rounds-to-terminal | S4 | inline | **done** (median 20–28 rounds) |

## Log

**L1 — owner, 2026-11-21 (verbatim).** *"is there anything valueble to test manually or can we just go M3b?"*
followed by *"i see the buy button, for the rest is tuneable so its ok"* — M3a accepted; go to M3b.

**L2 — split correction.** §14b originally put *both* terminal states and the victory-resolution matrix in
M3b. The `recontained` terminal needs the protocol track (D22, `PROPOSED`) and the matrix needs alignments,
which arrive with directives in M3c. M3b therefore delivers the **clock and one terminal**, and the matrix
moves to M3c. Recorded in `implementation.md` §14b the same day, so the milestone is not re-argued.

**L3 — threshold escalation deferred.** §7 says the track "reveals an Escalation card" at thresholds. The 14
cards live in §C5 and three of them need vocabulary that does not exist (`lockGate`, `forceMove`, the
Assembly vote). M3b ships the track without the cards; the track still forces descent because arming the
warhead is the threat. Content lands in M4 as planned.

**L4 — T1–T4 landed.** 137 tests. Tuning gained `threat.max = 5` and `threat.warheadCountdown = 3`.
Simulator: `capHitShare`, `detonatedShare`, `roundsToTerminalP50` are real; `recontainedRate`,
`winRateByAlignment`, `breachAchievableRate`, `compelsPerGame` stay `null`.
Finding: median 20–28 rounds to detonation against §S9.4's 12–18 band, and farming in the outer ring is now
punished exactly as D16 intends (the cautious bot had to be taught to land on anomalies).
