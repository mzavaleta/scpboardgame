# M3c — the protocol track (the second terminal)

Feature: the Command Center stops being an empty room and becomes the room you hold.
Branch: `main`. Test runner: `pnpm test`. Owner request: *"ok lets commit m3b and go m3c"*.

## Specs

**S1 — The protocol is a three-step track at the Command Center.** Quote, §C4.4: *"The recontainment
protocol is a three-step track at the Command Center."* `protocolSteps` lives in `GameState`, starts at 0,
and its ceiling plus the test difficulty come from `tuning.json`.

**S2 — `advanceProtocol` is one action, an Intellect test at the ring's difficulty.** On success `steps + 1`;
on failure nothing changes except the attempt. Quote: *"Advance (one action, Intellect test at the ring's
difficulty): `steps + 1`."*

**S3 — At the ceiling the site is recontained and the game ends.** Quote: *"At 3, the site is recontained and
the game ends."* The outcome is `recontained`; it is never overwritten.

**S4 — `sabotageProtocol` is one action, no test, `steps − 1` floored at 0, and it places
`tamperedProtocol` evidence.** Quote: *"Sabotage (one action, no test): `steps − 1`, minimum 0, and the
actor places `tamperedProtocol` evidence."* D18's rule — hidden motive, visible evidence — means the
saboteur is visible as the number moving down.

**S5 — Both actions require standing on the Command Center, in the action phase.** It is a room, not a
remote control.

**S6 — Only advancement counts as progress.** §7's list names *"advanced the recontainment protocol"*.
Sabotage is an action against the site, so it does not hold the threat track.

**S7 — With no directives yet, every seat is containment-aligned.** So `recontained` winners are the seats
**standing on the Command Center** when it fires, and everyone outside loses (§7c.3, shared win).

**S8 — The simulator measures both endings.** `recontainedRate` stops being `null`; rounds-to-terminal is
reported per terminal.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | `protocolSteps` in state + `advanceProtocol` with the Intellect test | S1, S2, S5 | inline | **done** |
| T2 | Recontained terminal + winners by position | S3, S7 | inline | **done** |
| T3 | `sabotageProtocol` + `tamperedProtocol` evidence | S4, S6 | inline | **done** |
| T4 | UI: protocol counter and the two core actions | S1, S5 | inline | **done** (strip shows `protocol 0/3`; core buttons not visually walked) |
| T5 | Simulator: both terminals, bots push the protocol at the core | S8 | inline | **done** |

## Log

**L1 — owner, 2026-11-21.** *"ok lets commit m3b and go m3c"* — M3b's clock committed as `d0d3c58`.

**L2 — scope split.** M3c is three systems (§14b): the protocol track, the role draft, and directives with
compels. This document covers the **protocol only** — the second terminal — because with one ending the
simulator cannot compare strategies. The draft and the directives get their own document.

**L3 — why sabotage does not count as progress.** §7's progress list names *advancing* the protocol only. A
saboteur still spends an action at the core, which is the cost the design wants: it is a choice against the
site, and the visible counter is the footprint.

**L4 — T1–T5 landed.** 148 tests. `protocol.steps = 3`, `protocol.difficulty = 4` in tuning. The simulator
reports `recontainedShare` and `roundsToTerminalP50`; `recontainedRate` left the "not measured" table.

**L5 — the measurement that changed the question.** A beeline recontains in a median of 5–6 rounds and never
buys clearance: the core is three moves away, a core gate is a ~61% test that can be retried every turn, and
the protocol needs three of the same test. Clearance 4 costs 19 Records, so paying is strictly worse than
gambling. Raising `protocol.difficulty` to 6 changed nothing; raising the **core gates' difficulty** to 6
doubled the median to 12 and dropped recontainment to 88%. Recorded in §S9.6 with both rows; nothing was
committed from the experiments, which were reverted.

**L6 — owner's call: "A".** The core gates G5/G6 go from difficulty 4 to 6 in `tuning.json`, adopted as a
balance change with its report (§S9.5). Effect on 800 sim games: aggressive recontainment median 6 → **12**
rounds (2p) and 5 → **10** (3p), recontained share 100% → 88 / 96%, detonation now happens at all. The
cautious route is unchanged — it still cannot afford clearance 4 inside 20 rounds, so the economy is not yet
a competitive path into the core.
