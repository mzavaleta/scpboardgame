# M4 — the MVP (politics + content + bilingual)

Feature: the game becomes a complete MVP — every seat has a hidden motive, the table can compel, the
facility fights back, and all of it is playable in English and Spanish.
Branch: `main` (solo repo, direct commits per work unit). Test runner: `pnpm test`.
Owner request (2026-11-21, verbatim): *"ok I need you to go forward until the mvp is completed, be free of
commiting whatever you need until you complete the MVP (M4 stage) , if there are open cquestions leave
themn open and will address just after mvp is completed as technical debts."*

## Scope

MVP per §14b plus M4's exit criterion: **full game playable in EN and ES, zero hardcoded UI strings,
green content validation**. It includes M3c's second half (roles, directives, compels) because the game
cannot be played without it.

Out (recorded debt, not silently missing): side directives, facility events, allies, strict privacy mode,
5–6 seats, save/resume, animation, sound, Playwright test, CI, pixel polish.

## Specs

**S1 — Six roles, drafted, never assigned.** §C3.2: `{ combat, intellect, maxIntegrity, startingGear[],
aspect }`, balance band `combat + intellect ∈ {5,6}`, Integrity 5–7. §S2 Q26: setup and respawn offer
`min(3, floor(availableRoles / players))` options; a dead role is retired for the match. The owner's
quote: *"ideally you will start with 2-3 random possible characters. you pick one."*

**S2 — One public aspect per role, three coded compels each.** §C3.3: every aspect carries exactly three
compels, each with an engine-checked `Condition` and a closed-set `Effect`, and at least one takes
something. §7b.5: aspects are public, always.

**S3 — The Fate economy.** §7b.3: earn on first entry to a deeper ring, on a breach outcome, on accepting
a compel (+2), on a personal escalation; spend 1 to compel, 1 to refuse, 1 to re-roll movement, 1 for +2
on your own test. Cap 3. §C3.5: a target with 0 Fate cannot refuse.

**S4 — Twelve Main Directives: 9 containment, 3 breach.** §C4.6: one dealt per seat at setup, private
until the endgame. §C4.3: every breach directive declares a non-empty `publicFootprint` of `intent`
evidence, and a breach victory without its own footprint is rejected (D18).

**S5 — Victory is explicit, never argued.** §7c.3: recontained → containment-aligned at the Command
Center with the condition met; detonated → breach-aligned with the condition met and footprint satisfied;
everyone else loses. §7c.5: after dealing, if breach seats exceed ⌊n/2⌋ the excess is swapped for
containment directives (D19).

**S6 — The threat track reveals escalation, and stalling has teeth.** §C5.1: `alarm` nodes and a third
consecutive stalled turn draw from the 14-card deck. §C5.3: two Emergency Assembly cards open a vote —
seal (gate locked two rounds, track does not advance) vs hold (track +2); a tie advances +1.

**S7 — Hunters move by a public, deterministic scent rule.** §7: each hunter takes one step along the
shortest path to the nearest player, ties to the lowest seat, and contact costs Integrity. Visible, never
a gotcha.

**S8 — Equipment: ten deck items, three slots, two lifetimes.** §C5.4/§C5.5. Permanent items are
modifiers; consumed items are one use. A full rack discards the new draw (debt: no discard choice).

**S9 — Actions the content forces.** §C4.5/§C5.6: `sealGate` (an action at either endpoint, blocks two
rounds, places `sealedGate`), `rescue`, `rest`, `useItem`, `spendFateToReroll`, `compel`,
`respondCompel`, `castVote`. §C3.7: `forceMove` never crosses a gate.

**S10 — Evidence is public, permanent, and classed.** §S6/§C2.3: `accident` (uncontained, breachAlarm)
never satisfies a directive; `intent` (sealedGate, tookSample, tamperedProtocol) is the only class that
counts. Tokens carry seat, node and round.

**S11 — The simulator measures the political layer.** §S9.3: win rate by alignment, breach-achievable
rate, compels per game, deaths, rounds to terminal. §S9.4 thresholds reported PASS/FAIL, not silently
rounded.

**S12 — Every UI string is bilingual.** §S7/§M4: `?lang=en|es`, a typed dictionary, no hardcoded chrome.
Content stays inline `{en, es}`. A pseudo-locale pass proves nothing is hardcoded.

**S13 — Playable screens.** §S7.2: setup (count, draft, language), handoff (reveal a private directive),
table, endgame (motive reveal, winners, why), credits. §S7.3: the table never renders a hidden value;
private UI is fed by `project(state, seat)`.

**S14 — Content validation is a gate.** §S8.3: schema parse, locale completeness, unique IDs, attribution
presence, board integrity, footprint satisfiability, role invariants, deck sufficiency, ES length ratio,
`contentVersion`.

## Recorded open questions (debt, per owner)

- **D1 — i18n implementation.** §S7 names i18next; this build uses a typed hand-rolled dictionary
  (`src/i18n/`) to avoid adding a dependency mid-MVP. Swap is mechanical.
- **D2 — Attribution authors.** 20 anomalies + 4 canon items still need wiki slug, author and ES
  translator. The validator reports them; `--release` fails on them. Completing it needs the wiki pass.
- **D3 — Sample tag.** No action produces `tag(sample)`; `m-chain` and `b-extraction` use `tookSample`
  evidence instead, which is tracked and public.
- **D4 — Hunter contact** is fixed Integrity damage, not a test.
- **D5 — Equipment overflow** discards the new draw instead of offering a swap.
- **D6 — Rest** heals 1 anywhere, 2 at a medical node; no once-per-visit tracking.
- **D7 — `createGame` auto-drafts** roles when `draft` is not requested, so the simulator and engine tests
  are not a UI flow. The setup screen requests `draft: true`.
- **D8 — Seat count** stays 2–3 (existing type); §14b's 2–4 UI is not reached.
- **D9 — The engine log is English-only.** Bilingual narration needs structured events (typed log entries)
  instead of pre-rendered sentences; only then can the UI translate them. Accepted for the MVP by the owner
  (*"logs english only is ok, is mostly for debug"*) — the UI, characters, cards and content are translated.
- **D10 — Gates are tolls, not places.** Found by the owner playing the MVP: *"paying a door just because just
  dont makes sense."* Clearance is permission, not an object; a door has no state; and a declined anomaly
  evaporates instead of staying in the room. The rework is `implementation.md` §14k.4 (amendment to D29): four
  gate states, entry draws, and **an unresolved guard persists and blocks everyone**. Two prerequisites before
  it can be built: (a) Records need a physical sink once permission is gone; (b) the simulator needs gate
  state and guard occupancy, or §S9.4 stops measuring anything. Sequenced **before** the clock rework in M6.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Types, evidence tokens, tuning additions, effect additions | S3, S9, S10 | inline | **done** |
| T2 | Roles, aspects, compels content + draft | S1, S2 | inline | **done** |
| T3 | Main directives, alignment, victory matrix, D19 valve | S4, S5 | inline | **done** |
| T4 | Fate economy + compel action + respondCompel | S3 | inline | **done** |
| T5 | Escalation deck, stall hazard, Emergency Assembly vote | S6 | inline | **done** |
| T6 | Hunters move + contact | S7 | inline | **done** |
| T7 | Gear content, slots, modifiers, actions (rest/rescue/useItem/sealGate) | S8, S9 | inline | **done** |
| T8 | Simulator: alignment, compels, breach-achievable, thresholds | S11 | inline | **done** |
| T9 | i18n dictionary + pseudo-locale + all chrome | S12 | inline | **done** |
| T10 | Screens: setup/draft, handoff, table, endgame, credits | S13 | inline | **done** |
| T11 | Content validator + contentVersion + attribution gate | S14 | inline | **done** |
| T12 | Close: docs, report, browser walk | all | inline | **done** |

## Log

**L1 — owner, 2026-11-21 (verbatim).** *"ok I need you to go forward until the mvp is completed, be free of
commiting whatever you need until you complete the MVP (M4 stage) , if there are open cquestions leave
themn open and will address just after mvp is completed as technical debts."*

**L2 — target read.** "MVP (M4 stage)" is §14b's MVP plus M4's exit: the politics layer cannot be skipped,
because §14b lists roles, aspects, compels and 12 directives as MVP. The M3c protocol track already
shipped uncommitted and is committed first.

**L3 — route.** Inline, sequential. The units share `types.ts` and `reduce.ts`, so parallel writers would
collide; content files are authored once the vocabulary is stable.

**L4 — T1–T8 landed.** 184 tests. Evidence moved from a per-player counter to public tokens; directives are
dealt from the seed (not the die stream) so setup consumes no dice; `createGame` without `draft` keeps the
flat sheet for the engine fixture, and the setup screen + simulator use `draft: true` (debt D7). The
simulator now measures containment/breach win rates, breach-achievable, compels, votes and hazards, and
prints §S9.4 verdicts.

**L5 — the instrument's first honest read (800 games, `--seed-base 42`).** Median rounds to terminal 4–15,
but **44–82% of games hit the 40-round cap**: containment bots keep attempting (so the track never
advances) while the protocol test is slow, and breach bots cannot arm the warhead without detonations.
Compels 0.4–2.1 per game; breach-achievable 0–40%; role win spread 0–0.06. Every threshold fails except
deaths ≤ 1.5. These are balance findings, not build failures: the political layer is *implemented* but the
*economy* that makes it pay (D28, faster clocks, cheaper clearance) is still M6 work. Recorded, not tuned —
the owner's instruction is to leave open questions as debt until the MVP is complete.

**L6 — T9–T11: the shell, the dictionary and the gate.** `src/i18n` is a typed EN/ES dictionary plus a
**pseudo-locale** (`?lang=pseudo`) that brackets every chrome string; content stays inline `{en, es}`.
`project()` feeds the private panel, with a structural test that another seat's directive id never appears
in the projected bytes. `pnpm validate` runs §S8.3: 0 errors, 28 warnings (all attribution `PENDING`).
Debt recorded: the engine log is English-only — bilingual narration needs structured events (D9).

**L7 — the browser walk (the M4 exit criterion, as far as a session can carry it).** Playwright against
`pnpm dev`: setup in EN/ES/pseudo → draft → handoff with hold-to-reveal (a Spanish directive revealed and
hidden) → table → roll → cross a gate → Euclid encounter → contain → end turn → dev terminal → motive
reveal (verdicts explain *why*) → credits. Zero console errors. Not covered: a full 12–18-round game to a
natural terminal, and save/resume (M5).

**L8 — close.** 194 tests (14 files), typecheck clean, build clean, `pnpm validate` 0 errors, 800 sim games
in ~2 s. The feature document, `implementation.md`'s checkpoint and §S9.6b, and the README are updated.
Open questions are recorded as debt in the Specs section and the checkpoint, not silently fixed by guessing.

**L9 — the first human playtest (owner at the table, 2026-11-21).** Live findings, recorded as they arrive:

- **Comprehension (UI, not rules).** The owner asked what `Rest`, `Seal G1` and the Emergency Assembly do.
  All three work as designed; none is *explained in place*. The overlay states the vote's fiction but not its
  consequences (+2 / +1 / locked 2 rounds), and `Rest`/`Seal` have no tooltip. This is M5 work (help text,
  tooltips, a first-turn hint), not a rule defect.
- **The gate verdict (design).** *"Paying a door just because just dont makes sense."* Recorded as debt **D10**
  and as `implementation.md` §14k.4, an amendment to D29. The owner's own model — door states, an entry draw,
  and an unresolved guard that **persists and blocks everyone** — is recorded verbatim there, because it is
  stronger than the toll it replaces and it gives sabotage a physical object.
- **Sequencing decision.** The gate rework goes **ahead of the clock rework** in M6: the clock decides when the
  game ends, the gate decides whether the game is about anything.
