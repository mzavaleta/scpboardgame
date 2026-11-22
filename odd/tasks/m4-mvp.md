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
- **D11 — Six of the eighteen compels can never fire.** `inEncounter` and `activeSeat` test
  `state.seat === seat`; `declinedThisTurn`, `containedThisTurn`, `gainedGearThisTurn` and
  `startedContainmentThisTurn` read the *target's* per-turn events. But a compel is invoked on the **invoker's**
  action phase (the target's answer is the one off-turn action), and `turnEvents` is only ever written for the
  acting seat and cleared at every `endTurn`. So those six are false by construction: `reckless#1`,
  `curious#0`, `curious#1`, `methodical#0`, `by-the-book#1`, `by-the-book#2`. This is part of why §S9.6 reads
  0.4–2.1 compels per game. Three ways out, all M6-scale: (a) a per-seat `lastTurnEvents` memory, cheapest and
  keeps the content; (b) rewrite the six as state conditions; (c) a reaction window — the compel fires when the
  event happens, which is the richest and the most work. **Also a UI defect (M5):** two applicable compels on
  the same target render two identical `Compel P2` buttons, distinguishable only by an HTML `title` tooltip —
  invisible on touch.
- **D12 — The economy is unreachable in practice, and invisible when it is reachable.** First full game
  (25 rounds, 2 players): **4 containments, all Safe tier, 4 Records total**, ending at 1 and 3. The first
  purchase (clearance 2) costs 3, so it needs three Safe containments — and the owner never saw the button
  enabled: *"i did not see the buy thing."* Two independent failures stacked: **(a) affordability** — the game
  produced 4 Records against the 12 needed for clearance 4, a different order of magnitude, not a shortfall;
  **(b) discoverability** — `Buy clearance` renders only during the **action phase** while standing on one of
  five checkpoints, and is `opacity-30` when unaffordable; there is **no glossary, help or rules screen
  anywhere in the UI**, so `Records 3` on the sheet explains nothing. Fix direction: always show the ladder at
  a checkpoint (`Access 2 · 3 Records · you have 1`), make the checkpoint a board feature rather than a button,
  and put the purpose of Records somewhere reachable. Pairs with D10 (Records need a physical sink) and with
  the owner's ask for *"items, consumables, equipment that help to go forward"* — there is still no progression
  system: D28 remains designed-not-built.
- **D13 — The hidden directive is a predicate, not an objective.** Asked whether the private motive changed any
  decision in the first full game, the owner answered: *"no, to be honest, we just ignored since it was not
  clear what to do."* The cause is structural, not presentation: all **12** directives are end-state
  conditions evaluated once, at the reveal (`evalCondition` in `engine/directives.ts`). None names a step. The
  private panel shows the name and one sentence **while the button is held**, with no progress readout and no
  "what advances this". So a player must reverse-engineer a plan from a logical statement about systems they
  are still learning — and the rational response is exactly what happened: ignore it. **Consequence: the core
  bet of the design (§7c, hidden motive → deduction) does not engage at the table.** It is decoration until a
  motive is actionable. Fix direction: directives become **objectives with visible progress** — two to four
  concrete steps, a private checklist, and a progress readout that updates. This is the same shape as the
  owner's own post-MVP proposal (*"a public objective, optional, but if achieved unlock something really good"*):
  design them together, one identity layer, not two. Needs a new action or two so that steps can be *performed*
  rather than inferred.
- **D14 — There is no player sheet, and the table hides the numbers that matter.** Owner request (2026-11-21):
  *"want to be able to see not only the current data of a player … the player itself entirely. all the stats,
  objectives, items, cards, all that player in its possesion, if bought something like a stat i like to see the
  base stat + the bought ones."* Today the table shows Integrity, Fate, Records, Clearance, node, aspect, gear
  names, evidence counts and tags — **but no stats at all** (they appear only during the draft), and gear
  modifiers are invisible: the engine rolls `stats[stat] + gearTestBonus(...)` while the screen shows nothing.
  Note the phrasing correction: **nothing buys stats today** — there is no stat purchase, so "base + bought" is
  currently "base + gear". Fix direction: a per-seat sheet (own seat: everything; other seats: public only) with
  stats rendered as *composition* (`Combat 3 +1 Sidearm = 4`), the directive shown as an objective with progress
  (D13), gear with its modifier, and carried items. **Privacy boundary:** the directive is the only hidden
  value; everything else in that list is public by design. On multi-screen play the concealment UI becomes
  scaffolding — each device receives its own projection — so build the sheet from `project(state, seat)` and it
  works for both.
  **Fixed while recording this (2026-11-21):** the encounter preview printed the raw stat and the printed card
  difficulty, ignoring the gear bonus and the `hardTest` tag — it now shows the number the engine will use
  (`src/ui/App.tsx`).
  **Built (2026-11-21):** the hold-to-reveal panel is gone. It was theatre — a persistent peephole anyone could
  tap, which on a shared screen hid nothing. Replaced by a **full-screen sheet** you open with one click and
  dismiss: directive, stats as composition (`base + statBonus`), Integrity/Fate/Records/Clearance, aspect,
  evidence, tags, and gear with each item's text. The trade is explicit: on one shared screen this is **table
  trust**, the same as handing over a paper sheet — not security. The structural version arrives with one
  device per player (D11 keeps v1 pass-and-play; online is Stage 3): then the overlay disappears entirely and
  each device receives only `project(state, seat)`. Single state, N projections.

## Post-MVP backlog — recorded, **not** to be fixed in this pass

Owner's instruction (2026-11-21, playtest): *"ok record it to be fixed later."* Nothing below is built now.
The order is the decision; the debt entries above hold the detail.

| Order | Item | Debt | Where it lives |
| --: | --- | --- | --- |
| 1 | **Gates become places** — four states, entry draws, an unresolved guard persists and blocks everyone; Records find a physical sink | D10 / §14k.4 | `content/board.ts` (gate shape), `engine/reduce.ts` (`tryCrossGate`), `engine/effects.ts` (no persistence today), `content/anomalies.ts` |
| 2 | **The economy is visible and reachable** — the price ladder always shown at a checkpoint, the checkpoint as a board feature, Records explained somewhere; then decide whether progression lives in Records or in gear | D12 / D28 | `ui/App.tsx`, `i18n/index.ts`, `config/tuning.json` (prices/rewards) |
| 3 | **Directives become objectives** — 2–4 concrete steps, a private checklist with live progress, and actions that perform them; designed together with the post-MVP personal stake | D13 | `content/directives.ts`, `engine/conditions.ts`, `engine/directives.ts`, `ui/App.tsx` |
| 4 | **Compels that can fire** — 6 of 18 are unreachable; pick a resolution (last-turn memory, state conditions, or a reaction window) | D11 | `engine/conditions.ts`, `content/roles.ts`, `engine/reduce.ts` (`compel`) |
| 5 | **The clock's ending** — guaranteed terminal; the wave clock is the leading candidate | checkpoint / §S9.6 | `engine/reduce.ts` (`endRound`), `engine/hunters.ts` (the base), `config/tuning.json` |
| 6 | **UI comprehension and the player sheet** — tooltips/help for `Rest`, `Seal`, `Compel`, the Assembly's consequences; distinct labels when two compels apply to one target; a per-seat sheet showing stats as `base + modifier`, gear, items and objective progress | D11 (UI half) / D14 | `ui/App.tsx`, `i18n/index.ts` |
| 7 | Everything else in the debt list above | D1–D9 | — |

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
| T13 | English UI sweep: tier, node kinds, gate tooltip, hunter count, dev count | S12 | inline | **done** |

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
- **Compel question → defect (D11).** Asked what the `Compel` button means; auditing it showed **6 of the 18
  compels are unreachable** (turn-scoped conditions on the target evaluated during the invoker's turn). Recorded
  as D11 with three resolutions. This is the first finding that explains a simulator number rather than a
  feeling: compels sit at 0.4–2.1 per game partly because a third of them cannot fire at all.

**L10 — the first full game to the cap (2026-11-21, 25 rounds).** Verbatim:

> *"the game ended becasue we reach the top rounds. … its hard to go into inner rings, because the encounters
> are very low and very difficult to levelup, we shoudl have more encounters or be able to het items
> cunsumibles, equipment that help to go forward easier. becasue 25 rounds is also a little to short. even
> trying hard to go inner rings i failed badly."*

Board facts that frame it (counted, not estimated): **9 of 31 nodes draw an anomaly** (labs and cells), 8 draw
gear, 5 are checkpoints and **every checkpoint sits at a gate mouth** (`outer-05`/G1, `middle-02`/G3,
`inner-01`/G5, `inner-05`/G6). Clearance 1→4 costs **12 Records** total; containment pays 1/2/3 by tier.

Three candidate causes, which the debrief must separate: **(a) volume** — exact-distance movement (D26) means
you can rarely steer onto a draw node, so the encounter rate is lower than 9/31 suggests; **(b) difficulty** —
the encounters that did happen were lethal; **(c) economy** — there is **no progression system at all** beyond
Records→clearance and random gear. D28 (containment as a trophy spent on stats) is designed and unbuilt, so
"level up" has no mechanic behind it today. The owner's ask — *consumables, equipment that help to go forward* —
is that missing progression layer, not a tuning number.

**The debrief, answered (same session).** The ledger, and what it proves:

| Measured | Value | What it settles |
| --- | --- | --- |
| Anomaly encounters | **4** in 25 rounds (50 seat-turns) | not a difficulty problem — 4/4 were contained |
| Tier of those encounters | **all Safe** (pays 1) | a single purchase of clearance 2 costs 3, so 1 + 3 = 4 Records forces all four to be Safe → **all four were in the outer ring** |
| Records earned / spent | **4 / 0** | a purchase subtracts 3; the table's 4 proves none happened |
| Gate crossings | **1**, around round 24 | by Intellect test, not by purchase — the owner's *"somehow lucky"* |
| Checkpoint purchase seen | **never** | *"i did not see the buy thing"* |
| Turn shape | *"basically roll and move, fight if so and pass"* | 44 of 50 seat-turns produced no decision |

**The owner's verdict, recorded verbatim:** *"boring, but that isbecause there are lot of things missing, ,
balance, cards, equipment, play things, use cosumible items etc, its ok to be boring for now, we have very few
things in place"* — accepted as the MVP verdict, with one correction: **the board is not short of events.** 20
of 31 nodes already produce something on landing (9 anomalies, 8 gear, 3 escalation). What the turn lacks is a
**decision**: every one of those events resolves itself, the action phase offers only End turn, and the only
choice in a turn is the destination — which exact-distance movement has already narrowed. Adding more cards
makes the automatic resolution richer; it does not add agency. That distinction is the M6 brief: *what does the
player decide?* — not *how many cards are there?*

**L11 — M4's last failing criterion, closed (2026-11-21).** Owner: *"depending, are thos things as debt before
M5 then yes"*. Classification of the three items left open after the playtest:

| Item | Is it debt before M5? | Why |
| --- | --- | --- |
| English UI sweep | **yes — and it was M4 work, not debt** | the M4 exit criterion is "zero hardcoded UI strings"; it was failing |
| D11 — six unreachable compels | no | content/design completion, owned by M6 item 4 |
| D2 — attribution `PENDING` | no | blocks `pnpm validate --release` only; M5 is still not public |

Swept and now behind `t()`: the encounter tier (`· safe`), node-kind tooltips (`· lab`), the gate tooltip
(`G1 — clearance 2 / Intellect 2 · sealed until round N`), the hunter count (`2 hunters` → `Hunters: 2`), and
the dev panel's `6 roles`. **A defect in the sweep tool itself was found and fixed:** the pseudo-locale
transliterated the characters inside `{var}`, so `t()`'s `\w+` never matched and pseudo runs printed raw
braces — the tool that is supposed to expose untranslated chrome was hiding broken interpolation. The
transform now skips placeholders, pinned by a new test (195 tests). Verified in the browser under
`?lang=pseudo`: every chrome string bracketed, no raw braces, gate tooltips interpolated; content names stay
English by design (`localized()` falls back to `en` for pseudo).
