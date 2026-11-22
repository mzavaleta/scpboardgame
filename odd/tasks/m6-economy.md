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

**L5 — the owner's confirmations (2026-11-22).** All five assumptions were accepted, with one direction on the
deviation: *"ok but eventually will be splitted. we need different economies."* So **typed, separate economies for
Combat and Intellect are the intended end state** (R3's full form); this round's flat Records pool is a stage, not
the design. Recorded in §14k.5 as the next economy step. The rest are confirmed as built: 3 Records per step and a
cap of 6; drops stay on the node and cost the action; no capsule claim window; the capsule and a directive can
both win.

**L6 — R7 landed in the same round (hunters are monsters).** `Hunter` now carries `card` (a Keter stat block),
contact rolls the same 4dF test as a containment and costs `hunters.contactDamage` (1) on a failure, and the new
`confrontHunter` action is the deliberate fight: success destroys the hunter, failure applies the card's own
failure/breach payload. Being caught is cheap; choosing to fight is not. The rules page says so. Balance after it:
median 11–12 rounds, cap 0%, deaths 1.05–2.9/game (3-player tables still above the 1.5 target — Phase B).

**L7 — A3, layer 1: public character objectives (2026-11-22).** Each of the six roles now carries one **fixed,
public** objective (`src/content/objectives.ts`), the character's reason to be in the building: the Field Agent
clears two anomalies, the Researcher brings a Keter, the D-Class reaches the inner ring, the Specialist holds two
Euclid, the Medic performs a rescue, the Ethics Aide audits someone else's intent evidence. It pays a one-time
reward the moment it is met (checked at the end of that seat's turn) and turns into a **mild penalty** when the
warhead arms — the moment the site's destruction stops being a threat. An already-met objective is never punished.
It is visible in the players panel and in the player sheet, with ✓/○/✗. 215 tests. Balance after: median 11–12,
deaths 1.05–3.05.

**L8 — A3, layer 2: the hidden directive now shows its steps (2026-11-22).** Each of the twelve directives carries
1–3 `steps` (conditions) beside its win `condition`. The player sheet renders them as a private checklist with live
✓/○ and real counts (`Containments 2/3`), through one `stepText` helper in `src/ui/conditionText.ts` rather than
twenty hand-written strings. The win rule is untouched: the engine still reads `condition`, so behavior cannot
change — only the player's ability to see what advances the motive. Verified in the browser. **Still open:** turning
the steps into *actions that perform them* (the directive is legible now, not yet performable).

**L9 — R4: Fate pushes a test (2026-11-22).** `Player.boost` holds Fate bought before a roll; `boostTest {amount}`
(1 or 2) is declared in the move/space/action phase, costs one Fate per point, caps at +2, and is consumed by
`rollTest`, which records the boost on `TestResult` and prints `(incl. +2 Fate)` in the arithmetic line. A reroll
still costs 1. The UI puts the two buttons in the move footer and in the encounter banner; the preview includes the
boost. Three tests pin the spend, the consumption and the refusals. The rules page says it in one sentence.
