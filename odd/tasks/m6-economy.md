# M6 A2/A4 — The economy round: Records buy stats, Fate moves, gear has two racks

Branch: `main` · Runner: `pnpm test` · Spec origin: `odd/tasks/m4-mvp.md` **L14–L16**, `implementation.md` §14k.5
**R3, R5, R6** · Backlog: Phase A steps 3 and 5 (A2 + A4), executed together.

Owner's brief for this round: *"implement as much as you can, do the best assumptions you can … include balance
that feels appropriate … keep current look and feel … mechanics first."*

## Specs

**S1 — Records are the progression.** Containment pays Records by tier (1/2/3). At a checkpoint,
`progression.pointsPerStep` (3) Records raise **Combat or Intellect by one**, up to `progression.statCap` (6).
Clearance is **deleted**: no field, no purchase, no door asks for it.

**S2 — R3's typed-per-stat reward is the one deviation.** The owner asked for *"each monster gives specific
stat"*. Kept flat for this round: anomaly payloads already spend Records (collateral costs, "publish" compels),
so splitting the currency would have to rewrite every payload and its validator in the same change. The stat is
chosen at purchase instead. Recorded below as the next economy step.

**S3 — Fate is transferred, never created (R5).** Invoking a compel pays 1 Fate. On **accept** that point becomes
the target's; on **refuse** the target pays 1 back to the invoker. The Ethics Waiver refuses with no transfer.
Nothing burns, nothing is minted.

**S4 — Two racks (R6).** Consumables and standing equipment each hold `equipment.slots` (3). A piece that does
not fit is **left on the node** (`GameState.dropped`), and any player standing there can take it with `pickUp`
once that rack has room.

**S5 — The clock has a balance dial.** `doom.chancePercent` (30) controls how often a facility card advances the
Threat track each round. Set by measurement, not by feel.

**S6 — Look and feel untouched.** The new controls reuse the existing table rows and panels; no layout, styling
or navigation work.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Fate transfer in `compel` / `respondCompel`, tuning 2 → 1 | S3 | inline | **done** |
| T2 | Delete clearance: field, action, prices, condition, directive, UI | S1 | inline | **done** |
| T3 | `raiseStat` at a checkpoint, cap and refusals, two buttons | S1, S6 | inline | **done** |
| T4 | Two racks by `lifetime`, `dropped` state, `pickUp` action and button | S4, S6 | inline | **done** |
| T5 | Rules page: Records/progress, Fate transfer, gear racks | all | inline | **done** |
| T6 | Balance pass with the simulator | S5 | inline | **done** |

## Log

**L1 — what changed (2026-11-22).** `Player.clearance` is gone, along with `attemptClearance`, `clearancePrice`,
the `clearanceAtLeast` condition, the `setClearance` effect and the checkpoint ladder. `raiseStat` replaces them.
`By Merit` now reads *"you contained three anomalies and never failed a gate test"*. The player sheet and the
players list no longer show a rank. The rules page's "Records and clearance" section is now "Records and
progress". 208 tests / 17 files, typecheck and build clean.

**L2 — the deviation, stated plainly.** R3 asked for typed rewards. This round keeps one currency and lets the
player choose the stat. Reason: `modifyRecords` is used by anomaly collateral and by two compels, so a typed
currency would have had to touch every payload, the content validator and the reward tests in the same change.
The next economy step is either typed rewards (`modifyProgress { stat }`) or card-declared stat rewards; both are
mechanical once the shop shape is settled.

**L3 — balance, measured.** `pnpm sim --games 20`, doom 30%: **cap 0%, detonated 100%, median rounds 11–13**
(target 12–18), deaths 1.45–3.35 per game (the 3-player aggressive table is the outlier), 1.15–1.45 stat raises
per cautious game. Doom at 50% gave 8–10 rounds; 30% is the chosen dial. The report's "Containment win / Breach
win" columns are **stale**: alignment no longer decides a win, and B2 has to replace them with capsule wins and
directive wins.

**L4 — not in this round, deliberately.** **R4** (Fate as a ±2 roll modifier) needs a pre-test decision window the
current single-click flow does not have; **A3** (public character objective + directives as steps) is the next
design unit; **R7** (hunters as real monsters) needs stat blocks and the containment pipeline. All three remain
in `implementation.md` §14k.5.
