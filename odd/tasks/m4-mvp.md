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

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Types, evidence tokens, tuning additions, effect additions | S3, S9, S10 | inline | pending |
| T2 | Roles, aspects, compels content + draft | S1, S2 | inline | pending |
| T3 | Main directives, alignment, victory matrix, D19 valve | S4, S5 | inline | pending |
| T4 | Fate economy + compel action + respondCompel | S3 | inline | pending |
| T5 | Escalation deck, stall hazard, Emergency Assembly vote | S6 | inline | pending |
| T6 | Hunters move + contact | S7 | inline | pending |
| T7 | Gear content, slots, modifiers, actions (rest/rescue/useItem/sealGate) | S8, S9 | inline | pending |
| T8 | Simulator: alignment, compels, breach-achievable, thresholds | S11 | inline | pending |
| T9 | i18n dictionary + pseudo-locale + all chrome | S12 | inline | pending |
| T10 | Screens: setup/draft, handoff, table, endgame, credits | S13 | inline | pending |
| T11 | Content validator + contentVersion + attribution gate | S14 | inline | pending |
| T12 | Close: docs, report, browser walk | all | inline | pending |

## Log

**L1 — owner, 2026-11-21 (verbatim).** *"ok I need you to go forward until the mvp is completed, be free of
commiting whatever you need until you complete the MVP (M4 stage) , if there are open cquestions leave
themn open and will address just after mvp is completed as technical debts."*

**L2 — target read.** "MVP (M4 stage)" is §14b's MVP plus M4's exit: the politics layer cannot be skipped,
because §14b lists roles, aspects, compels and 12 directives as MVP. The M3c protocol track already
shipped uncommitted and is committed first.

**L3 — route.** Inline, sequential. The units share `types.ts` and `reduce.ts`, so parallel writers would
collide; content files are authored once the vocabulary is stable.
