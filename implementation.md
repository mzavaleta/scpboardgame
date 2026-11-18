# SCP Digital Board Game — Implementation RFC (living document)

> **Status:** DRAFT (pre-implementation). Nothing is frozen except entries marked `AGREED`.
> **Work order:** we close **Business → Game Design → Engineering**, in that order. No engineering
> question is discussed until the business and design registers are closed.
> **Product intent (source of truth):** [`idea.md`](./idea.md) — the charter, verbatim, never edited here.
> **House rule:** decisions are never deleted, only superseded, and each keeps its `why`.

**Last updated:** 2026-11-18 · session 1
**Business:** `CLOSED` (12 agreed · B6 deferred to M6) · **Design:** `CLOSED` (11 agreed, 5 tuning params) · **Implementation spec:** `CLOSED` (§S1–S9) · **Content:** active (C1)

## Contents

**Part I — Business & Product** · [2](#2-the-business-checklist) checklist · [3](#3-ip-and-licensing) IP & licensing
**Part II — Game Design** · [4](#4-the-charters-internal-contradictions-and-how-they-were-settled) contradictions · [5](#5-resolution-math-d5) dice math · [6](#6-player-count-and-match-configuration-d10-d12) match config · [7](#7-the-pressure-model-d13) pressure · [7b](#7b-the-political-layer-aspects-compels-and-fate-points-d15) aspects & Fate · [7c](#7c-directives-d17--hidden-motive-and-the-alternate-win) directives · [8](#8-board-d4) board geometry · [9](#9-bilingual-content-d6) bilingual · [10](#10-design-register--closed) design register
**Part III — Engineering decisions** · [11](#11-the-core-bet-d9) core bet · [12](#12-stack-d2--why-each-piece) stack · [13](#13-repo-shape-d3) repo · [14](#14-scope-milestones-testing-risks) scope & milestones
**Part IV — Implementation design** · [S1](#s1-state-model) state · [S2](#s2-turn-and-round-loop) turn loop · [S3](#s3-action-vocabulary--the-reducers-public-api) actions · [S4](#s4-effect-and-condition-vocabulary--the-closed-set) effects · [S5](#s5-projection--what-each-viewer-receives) projection · [S6](#s6-evidence--the-public-trace-behind-d18) evidence · [S7](#s7-screens-navigation-and-the-privacy-model) screens · [S8](#s8-content-layout-and-validators) content pipeline · [S9](#s9-simulator-contract--the-metrics-that-own-the-tuning-parameters) simulator
**Part V — Content v1** · [C1](#c1-the-board-v1) the board · [C2](#c2-the-anomaly-deck-20-cards) the anomaly deck · [C3](#c3-roles-aspects-and-compels) roles, aspects & compels · [C4](#c4-main-directives-14) main directives · [C5](#c5-escalation-14-and-equipment-10) escalation & equipment
**Reference** · [15](#15-log-append-only) log (append-only, one line per exchange)

**Where things stand:** business `CLOSED` · design `CLOSED` · implementation specification `CLOSED` (S1–S9) · content authoring `ACTIVE` (C1 written) · no code written, M0 not started.

---

## 0. How this document works

### 0.1 Status vocabulary

| Status | Meaning |
| --- | --- |
| `OPEN` | Needs a human decision. I have no safe default. |
| `PROPOSED` | My recommendation **with reasoning**. Waiting for confirm/override. |
| `AGREED` | Locked. Changing it requires a new ID that supersedes it. |
| `DEFERRED` | Out of scope for the current stage; revisit at the stage gate. |
| `N/A` | Closed by circumstances rather than by a choice. |

Nothing gets implemented that is not `AGREED`. Every entry carries a `why` a future reader can attack.

### 0.2 The three phases

The document is split into three parts, and each part has its own register. We do not cross a phase
boundary until the previous one has zero `OPEN` items.

| Phase | Answers | Why this order |
| --- | --- | --- |
| **I. Business & Product** | What is this game, for whom, under what licence, sold how | These decide the constraints everything else must fit. Deciding the stack before the licence is how projects get rebuilt. |
| **II. Game Design** | The rules: dice, movement, decks, pressure, win condition | Rules are cheap to change on paper and brutal to change in code. They also determine whether the thing is fun at all. |
| **III. Engineering** | Stack, repo shape, state model, milestones | Pure consequence of I and II. Frozen last, because it costs the most to reverse. |

---

## 1. Decision register

### 1.1 Business & Product

| ID | Decision | Status |
| --- | --- | --- |
| **B1** | **Audience & positioning** — primary audience is the **board-game-curious**: someone who has never played Talisman or FATE. Veterans and SCP readers are served second, through depth and through writing. **Tie-breaker rule: when a design choice is ambiguous, choose learnability.** (§2.2) | `AGREED` |
| **B2** | **Competitive stance** — **shared win at the centre** for **containment-aligned** players. Firing the recontainment protocol saves everyone standing in the Command Center; anyone still outside when the countdown ends is lost with the site. Breach-aligned players (D17) win by the opposite terminal state, not by being saved. More-than-one-winner by design, because alliances and betrayal are core DNA. Full co-op and battle-royale remain possible as `VictoryPreset` variants. (§2.1, §7c.3) | `AGREED` |
| **B3** | **Naming** — the title contains **"SCP"** (working: *SCP: Protocol Breach*), because the project is open source and non-commercial (B9), where fan use of the acronym is the norm and searchability is the distribution strategy. Code and repo stay `protocol-breach`. Never reuse an existing game's exact subtitle ("Containment Breach" is taken). | `AGREED` |
| **B4** | **Content strategy** — **canon-first, adapted**: reuse whatever canon *fits the rule set* now; adapt more canon in later iterations; author original anomalies last. An entry that does not fit the schema is dropped, never given bespoke rules. (§2.3) | `AGREED` |
| **B5** | **Spanish** — **adapt the ES branch where a translation exists**, author everything else ourselves in **neutral Spanish**. Register is therefore neutral with an inherited Iberian flavour on canon cards. (§2.4) | `AGREED` |
| **B6** | **Release venue** — **GitHub Pages** if it stays free, else an own domain. GitHub Pages *is* free for public repositories (1 GB, ~100 GB/month soft bandwidth), which B9 guarantees. Caveats recorded in §2.5. Deferred to M6. | `DEFERRED` (leaning recorded) |
| **B7** | **Session shape** — **MVP is 2–3 players** (owner's cut, 2026-11-18), 60–90 minutes. The engine stays **parametric in N** up to 6, so a fourth seat is config plus content, not a rewrite. | `AGREED` |
| **B8** | **IP strategy** — CC BY-SA 3.0 derivative work: real SCP Wiki content and Foundation terminology, game published under the same licence, with attribution and share-alike encoded as build constraints (§3). | `AGREED` |
| **B9** | **Monetisation** — none. The project is open source. | `AGREED` |
| **D14** | **Licence split** — **code under MIT**, **game content (text, art, rules) under CC BY-SA 3.0**. Two licences, two artifacts, one repo (§3.2). | `AGREED` |
| **D10** | v1 tuned for **2–3 players** (B7); engine parametric in N, tolerance to 6. | `AGREED` |
| **D11** | Pass-and-play only in v1. Online multiplayer is Stage 3. | `AGREED` |
| **D8b** | **Open source** — the whole project is public from the start; no private/paid tier. | `AGREED` |

### 1.2 Game Design

| ID | Decision | Status |
| --- | --- | --- |
| **D1** | Win axis = **descend to the Command Center to recontain**. The "escape" feeling is delivered by pressure, not by a puzzle-escape victory. | `AGREED` |
| **D5** | **Dice split: `1d6` for movement, `4dF` for tests** (combat, containment checks, achievements). | `AGREED` |
| **D13** | Pressure model = **stagnation-driven escalation + roaming hunts**, not a fixed round timer. Preset-swappable per mode/expansion. | `AGREED` (shape) · tuning `OPEN` |
| **D16** | Anti-camping counts **attempts, not outcomes**: a failed test is paid for and is not camping. Inaction becomes an escalating cost (free → threat → Hazard). | `AGREED` |
| **D15** | **Aspects + compels + Fate points** as the political engine: aspects are enumerated content with coded compels (no free prose — software has no GM); Fate points are earned by risk and spent for agency; the "punish the camper" vote becomes a rare Escalation card that allocates loss instead. **All aspects are public in v1** — everyone sees and can invoke them. (§7b) | `AGREED` |
| **D17** | **Directives** — private always. **Main Directive** (1 at setup) is that player's **win condition**, in two families: containment-aligned or breach-aligned. **Side Directives** (0–2, drawn at terminal spaces from their own deck) only pay rewards and expire. (§7c) | `AGREED` (shape) |
| **D18** | **Every antagonistic directive must leave a public footprint**, and the reducer refuses a victory whose footprint never occurred. Hidden motive, visible evidence — otherwise it is a coin flip wearing a coat. (§7c.4) | `AGREED` |
| **D19** | **Safety valve on deck composition**: after dealing, if breach-aligned seats exceed ⌊n/2⌋ the excess is swapped for aligned. A reducer invariant, not a table argument. (§7c.5) | `AGREED` |
| **D20** | **Breach-aligned players do not know each other at setup.** They must discover each other through public behaviour. A private coordination channel would produce the exact zero-footprint coordination that D18 forbids. (§7c.4, §10.1) | `AGREED` |
| **D4** | Board geometry derived from polar coordinates + a graph, never hand-placed. | `AGREED` |
| **D6** | Bilingual split: i18next keys for UI chrome, inline `{en, es}` on content objects. | `AGREED` |

### 1.3 Engineering (parked — do not discuss until I and II close)

| ID | Decision | Status |
| --- | --- | --- |
| **D9** | Pure deterministic core: seeded PRNG in state, `reduce()` pure, no DOM/`Date.now`/`Math.random` in the engine. | `PROPOSED` |
| **D2** | TypeScript + React + Vite + Tailwind; SVG board; Motion; Zustand; Zod. **Package manager: pnpm** (owner's requirement). | `AGREED` |
| **D3** | Single package with ESLint-enforced boundaries; workspace only when a second consumer exists. | `PROPOSED` |
| **D7** | UI receives only `PlayerView` from `project(state, viewerId)`. | `PROPOSED` |
| **D12** | `MatchConfig` object threaded through the engine from day one. | `PROPOSED` |

---

# Part I — Business & Product

## 2. The business checklist (open items, in the order I would close them)

Nothing is open. B6 (release venue) is **deferred to M6** with a recorded leaning; it blocks nothing
before then.

Closed: B1 (audience), B2 (who can win), B3 (title), B4 (content strategy), B5 (Spanish), B7 (session
shape), B8 (IP), B9 (monetisation), D8b (open source), D10 (player count), D11 (network model),
D14 (licence split). Deferred: B6 (release venue).

### 2.0 Sequencing (recorded so it stops being re-litigated)

The owner's instruction: *"I'd like to pause and refine all the implementation… start but not
implementing, start design."* So the order is **specification first, code second**. Part IV is that
specification and it is the active work. M0 is not started and will not start until the specification
chapters are closed and the five engineering decisions in Part III are confirmed.

Nothing in Part IV depends on B6, and only S7 onward depends on the stack decision.

### 2.5 B6 — hosting note (recorded leaning)

GitHub Pages is **free for public repositories**, which B9 (open source, no paid tier) guarantees. Limits
that matter here: ~1 GB published size, ~100 GB/month soft bandwidth, no server-side code, and one hard
constraint — **it has no SPA rewrite**, so React Router needs either hash routing or a `404.html`
fallback that re-serves `index.html`. Both are fine for this project.

An own domain is free to attach and costs only the domain itself. So the decision is: Pages if the
project stays a personal/small-audience release, own domain if it ever needs to look like a product. It
changes nothing technically, which is why it is deferred to M6.

### 2.1 What B2 changes, concretely

**Decision:** firing the recontainment protocol **saves everyone standing in the Command Center**. Anyone
still outside when the countdown ends is lost with the site. Your reasoning: *"since it has a political
social aspect, where you can ally and betray … more than one can win."*

Four consequences worth writing down now, because they are structural:

1. **The endgame is a negotiation, not a sprint.** The last two turns are people shouting "hold the gate,
   I'm two spaces out" — and deciding whether they mean it. That is the political layer, and it costs
   zero extra rules.
2. **Betrayal has something to betray.** A player who reaches the centre early can fire the protocol and
   strand the others. The threat is credible because the mechanism is public.
3. **Shared win means no loser ranking in v1.** If everyone inside the centre wins equally, there is no
   reason to optimise points, and no reason to care who got there first — which is exactly what we want:
   the interesting decision is *who to travel with*, not who accumulates more. (Alternative: rank by
   Integrity or Records for tie-breaking flavour. Design Q10.)
4. **It makes `VictoryPreset` a config field later, not a redesign.** Full co-op ("all win or all lose")
   and battle royale ("one survivor") are variations of the same protocol firing, which is why the
   match object carries the preset rather than the rules hardcoding one.

Note the Stage gate this creates. Because v1 already carries hidden *agendas* as win conditions (D17),
Stage 2 must escalate along a different axis: hidden **identities** (roles, transformation), where a player
is not merely working against you but is no longer who they appeared to be. Same social-deduction family,
different organ. That is a cleaner stage boundary than the charter's, which put agendas and identities in
the same phase and would have made v1 and v2 feel like the same game twice.

### 2.2 What B1 changes, concretely

Owner: *"I will say all, but if i need to pick one, then 1."* Primary audience is the board-game-curious,
with veterans and SCP readers as secondary. The operative sentence is the tie-breaker:

> **When a design choice is ambiguous, choose learnability.**

Four consequences, so nobody re-litigates this later:

1. **Onboarding is a feature, not a tooltip.** A first game must teach movement, tests, clearance, the
   threat track *and* the Fate economy without a rulebook. That is a milestone on its own (M5) and a
   reason to keep the first table's complexity floor low.
2. **Compels must be taught explicitly.** Most web players have never met a FATE aspect. The UI has to
   show *why* a compel is legal, what each choice costs, and what happens next — the single hardest thing
   to teach in this game, and the one that pays for the whole design.
3. **Card text register is explanatory, not literary.** Short sentences, one mechanical clause each,
   deliberate repetition of vocabulary ("contain", "breach", "clearance"). The SCP-reader audience gets
   its atmosphere from art, tone and the directive text, not from long card prose.
4. **The difficulty band assumes no genre literacy.** Which is why §5's tier table keeps difficulty as the
   lever and why Q4 (the Fate re-roll) exists — a newcomer should lose to a decision, not to unfamiliarity.

### 2.3 What B4 changes, concretely

Owner: *"I want to reuse whatever fits from cannon, later on in further iterations we can get more by
adapting others, and lastly we can start creating original ones."* So the strategy is **canon-first,
adapted, originals last** — not a mixed catalogue.

The operative phrase is *"whatever fits"*, and it needs to be a rule rather than a taste. An entry is
**convertible** only when all of these hold:

| # | Fit test | Why |
| --- | --- | --- |
| 1 | It has a **clear public footprint** — one observable board act that advances it | D18: without a footprint, a breach victory is a coin flip |
| 2 | Its effect is **expressible in the existing effect vocabulary** | Otherwise it becomes a bespoke rule, see below |
| 3 | Its threat level maps to a **tier** (Safe / Euclid / Keter) without argument | The tier drives where the card lives and what it costs |
| 4 | It survives **both locales** as prose of similar length | A card that is twice as long in Spanish breaks the layout |
| 5 | Its wiki **author and slug are recorded** | Licence requirement (§3.1) |
| 6 | It does not require lore the player must already know to act | B1: learnability is the tie-breaker |

**The hard rule that keeps canon from eating the design:**

> **No card introduces a new mechanic.** Cards parameterise the systems in §5–§7; they never add one.

Without that rule, a canon-heavy deck produces twenty bespoke exceptions — which is what makes
licensed board games feel like a wiki with dice attached. It is also enforceable: the content schema has a
**closed vocabulary of effects**, and Zod rejects a card that uses an effect outside it. A card that
"needs" a new effect is a signal that the entry does not fit — drop it and adapt a different one.

Consequence for the pipeline: adaptation means **rewriting into the schema with attribution and an
indication that it was changed**, not quoting wiki text. Which is both a licence obligation and a
mechanical necessity.

### 2.4 What B5 changes, concretely

Owner: *"adapt ES-branch text, author the rest."* Three sources of Spanish text, and the pipeline must
know which one it is looking at:

| Source | Applies to | Attribution |
| --- | --- | --- |
| **ES-branch adaptation** | canon entries that already have a Spanish translation | author **and translator**, both recorded |
| **Authored neutral Spanish** | original text, adapted entries with no ES translation, every directive and aspect | ours |
| **Authored UI chrome** | i18next keys (`es/ui.json`) | ours |

**Variant is now decided implicitly, so record it before it gets re-argued:** neutral Spanish, with an
inherited Iberian flavour on canon cards because that is the register of the ES branch. If a fully
neutral voice ever matters more than authenticity, that is a *revision* of B5, not a matter of taste.

Three engineering consequences:

1. **The attribution schema gains a translator field.** `{ slug, author, translator?, sourceUrl }`. This is
   a licence obligation (CC BY-SA credits the translator as an author of that adaptation) and it is
   per-item, which is exactly what the credits screen and the CI provenance gate already consume.
2. **A shared glossary becomes a build artifact.** `content/glossary.ts` fixes the canonical Spanish for
   load-bearing vocabulary — containment, breach, clearance level, anomalous entity, directive, Fate
   point. The validator rejects forbidden synonyms, the same way it rejects a missing locale. Without
   this, three sources of Spanish text will produce three vocabularies within a week.
3. **A verification task, not a decision.** Confirm each branch's licensing page before adapting from it;
   branches generally mirror the main wiki's CC BY-SA terms but not identically. Recorded in the M4
   checklist so it cannot be forgotten.

## 3. IP and licensing

### 3.1 What D8 commits us to

The SCP Wiki's content is **CC BY-SA 3.0**, and share-alike is viral through derivative works. So the
game's *content* is published under CC BY-SA 3.0. Because the project is open source anyway (B9, D8b),
the cost that usually makes people hesitate — "I cannot stop redistribution or forks" — is not a cost
here. It is the point. The obligations that remain are mechanical:

| Obligation | Engineering consequence |
| --- | --- |
| **Attribution** to the SCP Wiki and to the individual authors of each entry used | `content/attribution.ts` records, per item: wiki slug, author, source URL. A **Credits / Licences screen** ships in the game (M4) — a licence requirement, not a nice-to-have. |
| **Indicate changes** | The credits screen states that entries were adapted for game mechanics. |
| **Share-alike** | Game text and assets are licensed CC BY-SA 3.0, with a `LICENSE-CONTENT` file and a note in the credits. |
| **No technical restrictions** | No DRM on content. Moot for an open-source web build, but recorded so nobody adds a licence check later. |
| **Per-asset provenance** | Wiki **images are frequently not CC** — the classic example is the SCP-173 sculpture photo, which is third-party copyrighted. Rule: **never reuse images from the wiki**; all art is ours, with recorded provenance. |
| **Trademark is separate** | The wiki licence covers fiction, not brands. Before any public launch, verify the current status of the "SCP" name as a mark. This is B3's problem. |

### 3.2 Why the code is not CC BY-SA (D14)

CC BY-SA was written for creative works, not software: no patent grant, no distinction between source
and object form, and warranty language that assumes a book. Putting engine code under it creates
ambiguity for anyone who forks the game.

So: **code MIT, content CC BY-SA 3.0**, two files at the repo root. Both are permissive enough for the
project's own goals and each fits what it covers. This is the standard shape for open-source games
(code permissive, assets share-alike) and it means a fork can reuse our engine without inheriting the
SCP text.

*I am not your lawyer. This section encodes plain licence requirements as build constraints; if the
project ever takes money or signs anything, have someone verify against the SCP Wiki licensing page.*

---

# Part II — Game Design

## 4. The charter's internal contradictions, and how they were settled

### 4.1 `4dF` cannot drive movement (settled: D5)

The charter said Fudge dice "replace standard 6-sided dice", while Stage 1 kept Talisman movement. But
`4dF` has **mean 0** and a range of `-4..+4`: a movement roll means players routinely move zero or
backwards. Talisman works because `1d6` has mean 3.5 and a floor of 1.

**Settled — D5, your words:** *"the fudge dice of fate are only for battle or achievements. for
movements are d6."* Movement is `1d6`; `4dF` resolves tests. This keeps both mechanics doing what they
are good at: a flat distribution where distance needs a floor, a bell curve where competence should
matter.

Three consequences to design for, recorded now because they bite later:

1. **Movement variance is back.** Rolling a 1 on a turn when you needed a 4 is Talisman's most reliable
   feel-bad. Options (design Q4): keep it as grit; allow a re-roll from a resource; or let
   "no progress this turn" count as progress-toward-nothing rather than a stall (see §7 — this matters,
   otherwise the pressure rule punishes bad luck).
2. **Direction choice needs a rule.** Talisman lets you choose at each junction after seeing the roll.
   With a graph board (§9) that means "you choose a path of N edges", which is the good part of the
   original. Confirm as a design question, do not assume.
3. **Lap length changes.** At 3.5 average movement over 31 nodes, a full lap is ~9 turns. Ring sizes
   (§9) and deck burn rates follow from that number.

### 4.2 "Escaping from these creatures" vs "descend to the Command Center" (settled: D1 + D13)

The charter's line 51 note ("not in the way of find a way to escape but you are escaping from these
creatures") framed the game as escape-from-pursuit, while the standard win is inward. Settled: the
descent stays; the escape feeling becomes **pressure** — §7.

### 4.3 Scope, honestly measured

The charter is three games wearing one coat: Stage 1 is a complete shippable board game (3–6 months
part-time, placeholder art); Stage 2 is a hidden-role social deduction layer roughly the same size
again; Stage 3 is content scaling, bots and online multiplayer. This document engineers Stage 1 only
and designs the *seams* Stage 2 needs, so Stage 2 is additive rather than a rewrite.

## 5. Resolution math (D5)

`4dF`: each die is `-1 | 0 | +1` with equal probability. This distribution is the entire reason for
choosing Fudge dice, so here it is exactly:

| Sum | Ways (of 81) | P(exactly) | P(≤ sum) |
| --: | --: | --: | --: |
| -4 | 1 | 1.2% | 1.2% |
| -3 | 4 | 4.9% | 6.2% |
| -2 | 10 | 12.3% | 18.5% |
| -1 | 16 | 19.8% | 38.3% |
| 0 | 19 | 23.5% | 61.7% |
| +1 | 16 | 19.8% | 81.5% |
| +2 | 10 | 12.3% | 93.8% |
| +3 | 4 | 4.9% | 98.8% |
| +4 | 1 | 1.2% | 100% |

**Test formula:** `shift = 4dF + stat + gear − difficulty`, read the shift as an outcome tier:

| Shift | Outcome tier |
| --: | --- |
| `≥ +3` | **Clean Containment** (critical: no cost, bonus effect) |
| `+1..+2` | **Success** |
| `0` | **Success at Collateral Cost** (pay a resource / take damage / the facility gets worse) |
| `-1..-2` | **Failure** (no progress, pressure advances) |
| `≤ -3` | **Containment Breach** (severe: Integrity loss, threat track jumps) |

At even odds (`stat == difficulty`, so shift = raw roll): 6.2% critical, 32.1% success, 23.5% cost,
32.1% failure, 6.2% breach — **38% bad outcomes when you are evenly matched**. That is brutal for a
board game where a failed check costs a turn *and* a resource.

**Therefore the tier table is the law and difficulty is the lever:** content assumes
`difficulty ≤ stat + 1` in the outer ring and `≤ stat + 2` in Keter, so the expected shift sits near
`+1` and the curve lands where we want it (~76% non-bad). One mechanism, one knob, and the simulation
harness tells us when the knob is wrong.

## 6. Player count and match configuration (D10, D12)

v1 is tuned for **2–4 players**, and the engine is **parametric in N** so a 5–6 player mode is
configuration, not a rewrite. Your words: *"keep it conservative up to 4 … later I'd like to be
expandable to 6, single mode, and modes that can speed things up."*

Consequence: **anything measuring elapsed time is expressed in player-turns, not rounds**, because a
4-player round contains 4× the encounters of a 2-player round. The whole match setup is one object:

```ts
type MatchConfig = {
  playerCount: 2 | 3 | 4;            // 5 | 6 later
  victory: VictoryPreset;            // "shared-centre" (v1) | "coop" | "battle-royale" later
  pressure: PressurePreset;          // see §7
  draftOptions: number;              // min(3, floor(rolePool / playerCount)) — STORED, not recomputed
  ringSizes: { outer: number; middle: number; inner: number };
  deckPresets: Record<DeckId, DeckPreset>;
}
```

The UI exposes one preset in v1 (`standard`), but the engine takes the object from day one. That is
what makes "modes that speed things up" a config task instead of a refactor.

`draftOptions` is **stored rather than recomputed** on purpose: it is derived from the size of the role
pool, and if a later content release adds roles, a saved game or a golden replay must still resolve the
way it did when it was created. Derived-at-setup values that affect gameplay get frozen into state.

## 7. The pressure model (D13)

Your formulation: *"each time something happens or not happens then something is getting closer to kill
them or so. maybe if in 3 rounds no one try to get towards the main activity they got a penalty
revealing a card that might let something bad happen."*

That is not a timer — it is a **stagnation detector**, and it is the strongest idea in the document. A
fixed timer punishes slow players. A stagnation clock punishes *camping*, which is the real failure mode
of Talisman descendants: the optimal line in the original game is to farm the safe outer ring for stats
before ever touching the dangerous centre. That produces a long, safe, boring middle — the exact thing
that turns a 90-minute design into a 3-hour session.

Two layers, each answering a different question:

| Layer | Question it answers | Mechanism |
| --- | --- | --- |
| **Threat Track** (0→5, global) | "Why can I not just sit in the Safe ring?" | Advances at the end of a round in which the table produced **no progress event** (crossed a gate, contained an anomaly, gained a clearance level, advanced the recontainment protocol). At thresholds it reveals an **Escalation card** from its own small deck. At 5 it **arms** the Alpha Warhead: a hard endgame countdown for everyone. |
| **Hunters** (2–3 tokens, local) | "Why can I not stand still *here*?" | Anomaly tokens that move toward the nearest player each round by a deterministic, publicly readable **scent rule** (shortest path to the closest token; ties to the lowest seat). Contact costs Integrity or a test. |

Why both: the track gives the *table* a shared reason to descend; hunters make any single space
dangerous. A track alone is a timer with extra steps; hunters alone let four players stand in a corner
forever if nothing pulls them inward.

Why the scent rule must be **visible and deterministic**: hidden movement produces *gotcha*; visible
movement produces *dread and planning*. Players should be able to say "if I stay here, that thing reaches
me in two turns" and feel it in the stomach. It also keeps hunter movement testable and replayable.

**The free-rider flaw, and the fix (D16).** A purely table-wide stall condition means one player can hold
the Safe ring — zero risk, farming gear — while the other three take the damage down in Keter, and the
punishment lands on everyone. Worse: if hiding is not addressed *individually*, hiding becomes the
optimal line and the honest players pay for it.

My earlier fixes (per-seat stall counter, or stall only if everyone stalled) all share the same defect,
and the owner named it: **a player who rolled badly looks identical to a player who chose to hide.** So
the punishment is the wrong thing to tune. The counter should measure **attempts, not outcomes**:

> A **progress event** is: attempting a containment test, moving towards a gate or the inner ring,
> spending on clearance, or entering a deeper ring — *successful or not*.

A failed test is already paid for in Integrity, turns and exposure. It is not camping. A camper produces
**zero attempts**, which is a categorically different signal and which the engine can observe exactly,
with no human judgement.

That converts the rule from a fine into an **escalating cost of inaction**: hold one turn → free (healing
and consolidating are legitimate plays); hold two consecutive turns → the personal threat advances; hold
three → you draw a Hazard. Nobody is punished for bad luck; everybody is punished for not trying.

**Mode/expansion hook:** the whole layer is a `PressurePreset` in `MatchConfig` — `standard` (track +
hunters), `blitz` (track advances every round regardless of progress, hunters move twice), `siege` (no
track, more hunters), `none` (sandbox/testing).

---

## 7b. The political layer: aspects, compels and Fate points (D15)

Proposed by the owner, and it is the strongest idea in the project so far, because it solves four
problems with one mechanism. Status: `PROPOSED` — but it is the piece that gives this game an identity
instead of "Talisman with an SCP skin".

### 7b.1 The idea, restated precisely

Players, places and items carry **aspects** — short narrative tags such as *Reckless*, *Attracted to
shiny things*, *Doesn't leave anyone behind*, *Compromised*. Any player may **compel** an aspect when the
situation makes it relevant. The owner chooses:

- **Accept** — the effect happens, and they gain Fate points.
- **Refuse** — they pay Fate points, and nothing happens.

The owner's example: a player holds the aspect *"you can ignore a kid calling for help"*; another player
is secretly a child and can invoke that aspect to *be the kid*. A hidden fact meets a public weakness and
produces a scene. That is the moment the game stops being a board game and becomes a political one.

### 7b.2 The one hard problem: software has no game master

In tabletop FATE a human GM decides whether a compel "applies". A digital game cannot adjudicate free
prose, and three things break if we pretend otherwise: the engine cannot validate the action, the
simulation harness cannot balance it, and online play has no referee.

**Therefore aspects are data with enumerated compels**, not free text:

```ts
type Aspect = {
  id: "aspect-shiny-things";
  label: { en: "Drawn to Shiny Things", es: "Atraído por lo Brillante" };
  visibility?: "public" | "concealed";     // omitted in v1 (all public); Stage 2 adds it
  compels: Compel[];                       // 1–3 per aspect
};

type Compel = {
  condition: Condition;                    // evaluated by the engine — data, not prose
  effect: Effect;
  text: { en: string; es: string };        // what the table reads aloud
};
```

Content budget: ~8 aspects in v1 × up to 3 compels each = ~24 micro-cards. That is small, and it reuses
the card content pipeline and the bilingual content format exactly.

*The trade:* we lose infinite flexibility of expression and gain a mechanic that is testable, simulable,
balanceable and eventually online. For a FATE-flavoured *digital* game that is not a trade, it is a
requirement.

### 7b.3 The economy: Fate points are earned by risk and spent for agency

This is what answers "how do we reward risk-taking instead of punishing camping" — and it is a stronger
answer than any penalty.

**Earn** (this is the risk dividend; campers earn nothing):

| Trigger | Fate |
| --- | --- |
| Crossing into a deeper ring for the first time | +1 |
| Suffering a **Containment Breach** outcome on a test | +1 |
| Accepting a compel against you | +2 |
| Being hit by a personal Escalation card | +1 |

**Spend** (this is agency):

| Use | Cost |
| --- | --- |
| Compel someone else's aspect | 1 |
| Refuse a compel against you | 1 |
| Re-roll your own movement `d6` | 1 |
| Invoke your own aspect for +2 on a test | 1 |

**Cap: 3 held.** Hoarding is the enemy of drama; a full wallet must be spent or wasted.

Four problems this closes at once:

1. **Camping stops being free** — a camper accumulates nothing, so by the time he descends he is
   under-equipped *and* has no Fate points to buy his way out of trouble.
2. **Bad luck becomes survivable without charity** — a player who keeps attempting and failing keeps
   earning, so the unluckiest player is the one with the most agency. That is a rubber band the player
   *chooses*, which feels like skill instead of a handicap.
3. **The movement feel-bad is solved** (design Q4) — the re-roll exists, and it costs something earned
   by taking risk. No new subsystem needed.
4. **The deduction layer gets its first home** — not in hidden aspects (they are public by decision), but
   in hidden **directives** (§7c). Stage 2 then adds `visibility: "concealed"` to the aspect schema and
   hidden roles on top; the field is optional, so nothing migrates.
   Watching *which* compel a player uses, and *which* they refuse to let land, is deduction without any
   extra mechanics. The owner's "kid calling for help" scene is exactly this.

**Anti-farming rule:** the *invoker always pays*. Two friends cannot pump each other's Fate points,
because invoking is a cost, not a transaction. The target then chooses between a bad effect and a Fate
payment — which is the whole drama, and which can corner a player who has none left.

### 7b.4 Why the vote stays out of the engine

The owner's vote idea (everyone votes for who gets punished; ties punish everyone) is thematically
perfect and mechanically dangerous as a *core* rule:

- **It punishes the leader.** In a progression game that is a known pathology: bash-the-leader makes
  games longer, and our ceiling is 90 minutes.
- **It degenerates at two players** (always vote for the other) — and 2 players is in scope.
- **It dogpiles the quiet player**, which is a social-dynamics defect in a pass-and-play web game with
  strangers.
- **It costs table time every round**, which is exactly what a 60–90 minute session cannot afford.

**Keep it as an Escalation card, not as the clock** — and change what is voted on from *who is punished*
to *how the loss is allocated*:

> **EMERGENCY ASSEMBLY.** The table votes: *seal the bulkhead* (one player of the table's choice cannot
> pass this gate for two rounds, the threat track does not advance) or *hold it open* (the threat track
> advances 2). Ties: the track advances.

That is politics with teeth, no popularity contest, no punishment for being ahead, and it appears twice a
game instead of every round.

### 7b.5 Scope call

Ship the economy in v1 with **every aspect public** — the owner's call, and the right one: a compel you
cannot see is a gotcha, not a decision. Public aspects mean the political economy runs on *visible*
levers, and the deduction layer does not live here at all (it lives in §7c).

---

## 7c. Directives (D17) — hidden motive, and the alternate win

Owner's ruling: *"aspects public, directives private always. one at the setup, can gain more on special
places from a special pile/deck, there shoudl be 2 kind of directives, main, that are win con, and side,
that just give you rewards."*

That split is cleaner than what I proposed, and it is also a bigger game. Writing it down honestly:

### 7c.1 The two kinds

| Kind | Count | Visibility | Function |
| --- | --- | --- | --- |
| **Main Directive** | exactly 1, dealt at setup | private forever; revealed at the end | **defines that player's win condition** |
| **Side Directive** | 0–2, drawn at terminal / research spaces from their own deck | private | **pays a reward immediately** (Fate, Records, clearance, gear). Never a win condition. |

Aspects are leverage: public, invokable by anyone. Directives are motive: private, always. Politics needs
both halves — visible pressure and invisible intent.

### 7c.2 Main Directives come in two families

- **Containment-aligned** — you win if the site is recontained **and** your personal condition holds
  ("you are the one who fires the protocol", "the sample leaves the site intact", "nobody is left
  behind").
- **Breach-aligned** — you win if the site is **not** recontained: the warhead detonates, or the protocol
  is sabotaged, plus your condition ("the core is destroyed", "the asset reaches the surface").

This is where D13 pays for itself twice. The Threat Track arming the Alpha Warhead is not just a timer —
it is **the breach faction's win window**. The clock and the alternate victory are the same object, which
is the most elegant thing in the design so far: one system, two meanings, and the tension between them is
the game.

### 7c.3 Victory resolution (must be explicit, or the table argues every game)

| Terminal state | Containment-aligned player | Breach-aligned player |
| --- | --- | --- |
| Protocol fires; player **at the centre**; condition met | **wins** (shared, B2) | **loses** — being saved is their failure |
| Protocol fires; player **outside** the centre | loses | loses |
| Warhead detonates | loses | **wins** if their condition is met |

So B2's shared win means "all **containment-aligned** players at the centre win". A breach-aligned player
standing in the Command Center when the protocol fires does not win — which keeps the shared win honest
and stops the saboteur free-riding somebody else's victory.

### 7c.4 The rule that keeps it a deduction game instead of a coin flip

> **Every antagonistic directive must leave a public footprint.**

A breach-aligned player must perform at least one *observable* action to advance their agenda — place a
Corruption token on a gate, take the containment sample, hold the protocol step one turn too long.
Without that, the group loses to a card they could never have seen, and "deduction" is a coin flip wearing
a coat.

This is the same principle that makes the hunters' visible scent rule work (§7): **hidden motive, visible
evidence.** The hidden thing is *why*; the evidence is *what*. Stage 2 then adds the case where even the
evidence is hidden, which is transformation.

Engineering consequence, not a design suggestion: `MainDirective` declares its `publicFootprint` — the
observable state change it requires — and the reducer refuses to resolve a victory whose footprint never
occurred. That makes the principle a testable invariant instead of a good intention.

### 7c.5 Deck composition is the balance lever

The aligned/breach mix in the main deck decides what kind of game each table gets:

- **all aligned** → a pure co-op race with no politics. Fine occasionally, wrong as the default.
- **exactly one breach in four** → the intended experience.
- **half breach** → the protocol path is dead, the game is two teams, and it is no longer the same game.
- **more than half** → the containment side cannot win; a degenerate table.

So the engine enforces a **safety valve**: after dealing, if breach-aligned seats exceed ⌊n/2⌋, the excess
is swapped for aligned directives. A reducer invariant the simulator can verify, and a rule the table
never has to adjudicate.

### 7c.6 Consequences

1. **The handoff screen is required in v1.** Pass the device → "read your directive" → conceal. It is the
   first privacy moment in the game and it sets the tone.
2. **`project()` (D7) is load-bearing immediately**, so its structural privacy test moves to M2.
3. **The endgame needs a motive reveal**: every directive revealed, who won and why. This is where the
   game's story actually lands — budget a real screen, not a toast.
4. **Side directives must be short-lived and checkable**, ideally expiring ("resolve the next anomaly
   without spending Fate"). Otherwise a player accumulates four objectives and the turn becomes
   bookkeeping. Cap at 2 held.
5. **The simulator must model alignment** and report win rate by table composition, plus how often a
   breach win was genuinely achievable. That is the instrument that tells us whether the politics works
   or is decoration.
6. **Content and scope delta: roughly +25–30%** over the no-directives version — two decks, victory
   resolution, the motive screen, and the footprint checks. That is the price of the identity, and it is
   the largest single scope change in this document.

```ts
type MainDirective = {
  id: string;
  text: { en: string; es: string };      // read only by its owner
  alignment: "containment" | "breach";
  condition: Condition;                   // machine-checked, no human adjudication
  publicFootprint: FootprintId[];         // ≥1 observable act required for a valid victory
};

type SideDirective = {
  id: string;
  text: { en: string; es: string };
  condition: Condition;
  reward: Reward;                         // paid immediately on fulfilment
  expiresIn?: number;                     // rounds; keeps the hand small
};
```

---

## 8. Board (D4)

Three concentric rings plus a centre is a **polar coordinate system**, not a layout problem:

```
x = cx + radius[ring] * cos(θ)          θ = slot * (2π / slotCount[ring])
y = cy + radius[ring] * sin(θ)
```

Content authoring is a list, never coordinates:

```ts
{ id: "outer-04", ring: "outer", slot: 4, kind: "lab", deck: "equipment", clearanceRequired: 1 }
```

Movement and adjacency are a **graph**: `ringEdge(a,b)` for consecutive slots (cyclic), `gateEdge(a,b)`
for ring checkpoints, and the Command Center reachable only from inner gates. With `1d6` movement, "move
N" means *the player chooses a path of N edges* and the reducer validates it — which is exactly what
makes branching decisions interesting.

**Why this matters more than it looks:** a hand-placed board is 31 magic numbers that break the moment
we want 12 outer spaces instead of 10. A derived board is a content edit, and during balance work we
*will* change ring sizes repeatedly.

**Token capacity:** unlimited stacking per node with a small visual offset. "Occupied = blocked" creates
deadlocks and interaction ambiguity, and blocks nothing we want; stacking also means a 6-player mode
needs no board change.

## 9. Bilingual content (D6)

Two kinds of text, two mechanisms — getting this wrong is expensive to fix later.

**A. UI chrome** (buttons, labels, tooltips, glossary, errors) → i18next resource files
(`locales/en/ui.json`, `locales/es/ui.json`). These change constantly, are reused, need interpolation,
and a missing key should be a CI error.

**B. Game content** (card names and text, space names, role descriptions, mission prompts) → **inline
per-locale fields on the content object**:

```ts
{ id: "anomaly-004", tier: "euclid",
  name: { en: "The Hollow Clerk", es: "El Oficinista Vacío" },
  text: { en: "…", es: "…" } }
```

A key-based pipeline means every card edit touches two files plus a translation table, invites key
collisions across hundreds of cards, and complicates the content extensibility the charter demands.
Inline locales mean **adding a card is one data entry**, and Zod enforces completeness via
`Record<Locale, string>`.

**The trap:** Spanish runs 15–25% longer than English. No `truncate`, no fixed heights on text regions,
text auto-sizing within a min/max, and a **pseudo-locale** (`xx`, padded to 1.3× with accent-heavy
characters) in dev to catch overflow before real translation exists.

## 10. Design register — closed

Every question in the former §10 is now a decision, ratified by the owner (*"all your assumptions are
correct"*, 2026-11-18), except the four numbers in §10.2 which are **tuning parameters**, not decisions.

### 10.1 Ratified decisions

| # | Decision |
| --- | --- |
| **Q2** | The top of the Threat Track **arms** the Alpha Warhead as a winnable countdown. It is not a surprise shared loss. |
| **Q3** | Hunters are **always visible**, moving by the deterministic scent rule. |
| **Q4** | Movement variance is mitigated by the **Fate-priced re-roll** — no other subsystem. |
| **Q5** | Direction is chosen **after** seeing the `d6`. |
| **Q6** | **No player-vs-player combat in v1.** PvP arrives with betrayal mechanics. |
| **Q7** | Four tracks: Integrity, Clearance 1–4, one upgrade currency ("Records"), Fate points. If it feels like accounting, Records folds into Clearance progress. |
| **Q8** | Encounters on **marked spaces, plus always on gate crossing**. |
| **Q10** | Shared win, **no ranking**. Winning is binary per player; there is no score. |
| **Q11** | Each role has a **fixed aspect**; one more is **acquired mid-game**. Items carry **tags** used by compel conditions, not full aspects. |
| **Q12** | One compel **per turn**. |
| **Q13** | You may compel an ally **to help them** (pay 1, they accept, gain 2). It makes alliances mechanical. |
| **Q15** | **Emergency Assembly** ships: two per escalation deck. |
| **Q17** | A Main Directive **cannot be redrawn**. It is your win condition; a redraw is a different game. Side directives can be discarded. |
| **Q18** | Mains are revealed **only at the end** (the reveal is the story). Sides are announced **immediately**. |
| **Q20** | Side directives: **cap 2 held**, drawn at terminal spaces, all with an expiry. |
| **Q21** | Directive conditions are evaluated against **public state** at resolution. Conflicting conditions are legal — they are the point. |
| **Q22** | **0 Integrity → downed.** Wait for rescue (gear intact, 1 Integrity) or respawn as a new character keeping only earned stats. Mechanics in §S2; the spare-identity content question is Q26. |
| **Q23** | **You may stop early** and forfeit remaining movement for **1 Fate**. |
| **Q24** | A **terminal space's directive draw replaces the encounter**. |
| **Q25** | Fate above the cap of 3 is **lost**, not banked. |
| **Q26** | **Character selection is a draft**, at setup and on respawn: `min(3, floor(availableRoles / players))` options. A dead character's role retires for the match. |
| **Q27** | **A dead player's Main Directive is declassified** — the one exception to "revealed only at the end". Death buys information. |
| **Q28** | Waiting downed costs nothing but lost turns; **hunters ignore downed players**. |
| **Q29** | **v1 ships 6 roles**, so `draftOptions` lands on 3/2/1 at 2/3/4 players and death always offers 2 options at 4 players. |
| **D22** | **The recontainment protocol is a three-step contested track** at the core: `advanceProtocol` (Intellect test, steps +1, ends the game at 3) and `sabotageProtocol` (no test, steps −1, places `tamperedProtocol`). The Command Center is a room to hold, not a line to cross. (§C4.4) `PROPOSED` |
| **D23** | ~~`abandonedAlly` evidence placed when a player moves away from a node holding a downed ally.~~ **SUPERSEDED by D24** — the owner's objection was correct: that rule makes ordinary tactical self-interest into criminal evidence, and this game is not a betrayal game. |
| **D24** | **Selfishness is legal and unremarkable; only a directive makes someone an antagonist.** No mechanic may treat *not helping* as evidence of intent. Cooperation is a tactic, solitude is a tactic, and only the four breach directives make a player an opponent. (§C4.5) `AGREED` |
| **D25** | Consequence of D24: `abandonedAlly` is **removed** from the evidence vocabulary, the breach deck drops to **3**, and a fourth *containment* directive (`m-clean`, "Clean Record") replaces it. `sealGate` is added as an action, because `b-denial` declared a footprint no action could produce. (§C4) `PROPOSED` |
| **D21** | **Evidence has two classes** — `accident` (anomaly breaches, failed gates, escalation) and `intent` (directive acts). Only `intent` satisfies a breach footprint. Without this, a saboteur wins on someone else's bad roll. (§S6, §C2.3) |

### 10.2 Tuning parameters — the simulator owns these

Not decisions. Starting values, written as **content data**, so changing them is an edit, not a refactor.

| Parameter | Starting value | What the sim must tell us |
| --- | --- | --- |
| Escalating-cost ladder | 1 free → threat → Hazard | Does the median game reach the centre before the warhead arms? |
| Board / deck sizes | 12 / 10 / 8 + centre; anomalies 20, equipment 20, events 15, allies 10, escalation 10, aspects 8 | Rounds-to-win and deck-exhaustion rate |
| Fate economy generosity | four earn triggers, cap 3 | Do players sit permanently at 3 (too generous) or never reach 1 (too stingy)? |
| Main deck mix | 14 mains: 10 containment / 4 breach | Win rate **by table alignment**, and how often a breach victory was genuinely achievable |
| Access economy | L2/L3/L4 cost 3/4/5 Records; anomalies yield 1/2/3 | Median rounds-to-terminal, and how often a gate test is chosen over buying clearance |

### 10.3 What is deliberately still open

Nothing in the design. The only unresolved items in this document are the business questions (§2) and the
engineering decisions in Part III, which stay parked until Part I closes.

---

# Part III — Engineering decisions

No code is written yet. These five decisions gate **M0**, not the specification work in Part IV — the state model, turn loop and vocabularies are framework-agnostic and can be designed before the stack is confirmed. The stack decision comes due at **S7 (screens)**, which is the first chapter that actually depends on it.

## 11. The core bet (D9)

```
              ┌───────────────────────────────────────────────┐
              │  src/engine  (zero deps, zero React, zero DOM) │
  seed ──────►│  reduce(state, action) → Result<state>         │──► state hash (replay/test)
              │  project(state, viewerId) → PlayerView         │──► what a player may see
              │  validate(state, action) → ok | reason         │──► legality, reusable by a server
              └───────────────────────────────────────────────┘
                        ▲                        ▲
              ┌─────────┴────────┐    ┌──────────┴───────────┐
              │ src/ui (React)   │    │ scripts/sim (Node)   │
              │ renders          │    │ 10k AI-vs-AI games   │
              │ PlayerView only  │    │ for balance tuning   │
              └──────────────────┘    └──────────────────────┘
```

Determinism (seeded PRNG inside state) buys: replay files, exactly reproducible bug reports, regression
tests, the bot harness, and future client/server sync — for about an hour of work now. Purity buys
thousands of simulated games per minute in Node. Projection buys hidden information as a structural
property instead of a discipline. Content-as-data satisfies the charter's extensibility requirement and
the §3.1 attribution obligation with the same structure.

*Rejected:* `boardgame.io` — it wants to own the state shape, its multiplayer value lands in Stage 3,
and the two things we actually need are ~200 lines we control. Verify its maintenance status before
treating that rejection as final.

## 12. Stack (D2) — why each piece

| Layer | Choice | Why | Rejected |
| --- | --- | --- | --- |
| Language | TypeScript `strict` | One language across engine, content, UI, sim. Discriminated unions check exhaustively. | Plain JS; Dart/Flutter (loses zero-install web) |
| Build | Vite | Fastest loop; static output on any CDN, no server. | Next.js (SSR is useless for a game) |
| UI | React 19 + Tailwind | Cards and dossiers are *documents*; React is best at text-heavy stateful documents. | Vue/Svelte (fine, no advantage) |
| Board | SVG + positioned React nodes | ~31 labelled spaces and a few tokens. Free scaling, crisp text, real accessibility. | Canvas/WebGL (no text a11y, no DOM debugging, for a sprite count in the dozens) |
| Animation | Motion | Declarative token movement and card flips; `layout` animations give the tactile feel cheaply. | GSAP (heavier, imperative) |
| Store | Zustand | One store, typed dispatch, no provider tree. | RTK (more boilerplate), XState (a small phase union is more testable) |
| Content | Zod | A card typo breaks the build, not a playtest. | — |
| Tests | Vitest + Playwright | Pure engine → instant units; e2e only for "a human can take a turn". | — |

**On "polished 2D":** polish is typography, timing, sound and consistency — not a rendering engine. A
31-space SVG board with excellent card design and 150 ms of easing reads better than a mediocre WebGL
scene. If we later need particles or grain, we add one `<canvas>` layer *behind* the SVG.

## 13. Repo shape (D3)

```
protocol-breach/
├─ idea.md  implementation.md
├─ LICENSE                  MIT (code)
├─ LICENSE-CONTENT          CC BY-SA 3.0 (game content)
├─ src/
│  ├─ engine/               pure TS. no React, no DOM, no Date.now, no Math.random
│  ├─ content/              typed data + zod schemas + attribution.ts
│  └─ ui/                   React. may import engine + content. never reversed
└─ scripts/                 sim.ts, validate-content.ts
```

Single package, with the dependency direction enforced by ESLint (`engine` must not import `ui`;
`content` must not import `ui`). A workspace monorepo buys real isolation at the price of build config
and slower iteration, for a solo project with one consumer. Promote the day a **second consumer** exists
(a server, a CLI, a native wrapper) — not because it would look cleaner.

## 14. Scope, milestones, testing, risks

**Stage 1 in:** 3 rings + centre; **6 roles** (draft) with **public aspects**; **compels + the Fate economy**; `1d6`
movement + `4dF` tests with five tiers; 4 decks + escalation; clearance gates 1–4; stat/gear progression;
pressure model (track + hunters); **two directive decks** (mains as win conditions, sides as rewards),
the handoff screen, **explicit victory resolution**, and a **motive-reveal endgame screen**; EN/ES;
save/resume; credits/licences screen; static deploy.

**Out:** online multiplayer, lobbies, accounts (Stage 3); secret missions, pacts, betrayal, hidden
transformation (Stage 2); shipped AI bots (but a headless bot in `scripts/sim.ts` is required — it is the
only scalable balance instrument); campaign, meta-progression, cosmetics; native apps; 3D/WebGL; final
art beyond a coherent placeholder pass.

**Definition of done:**
> Four people who have never seen the game open a link, finish in under 90 minutes with the rules taught
> by the UI itself, and ask to play again without being prompted.

| ID | Slice | Ends when |
| --- | --- | --- |
| **M0** | `git init`, Vite + TS + Tailwind, ESLint boundaries, licence files, `engine/rng.ts` + determinism test, content schema skeleton, CI script | Same seed + action list yields the same state hash |
| **M1** | Board geometry, graph, `1d6` movement (no cards), SVG rings, pass-and-play tokens | Two people move tokens around three rings through gates, with a replay log |
| **M2** | `4dF` + tiers, one anomaly encounter end-to-end, Integrity loss and defeat | A full turn (move → anomaly → test → tier → state change) is unit-tested |
| **M3** | Clearance gates, pressure model (track, escalation deck, hunters), **both terminal states and the victory-resolution matrix**, `sim.ts` bot | 10k sim games in under a minute; win rates **by table alignment**, rounds-to-win, stall frequency, how often a breach win was achievable |
| **M4** | **MVP content** in both locales: 6 roles, 18 anomalies, 12 mains, 14 escalation, 10 equipment, 31 spaces; i18next chrome; pseudo-locale; credits + attribution gate | Full game playable in EN and ES, zero hardcoded strings, green attribution check |
| **M5** | Handoff screen, card animation, sound one-shots, save/resume, **motive-reveal endgame** | A stranger plays without being taught, and the ending explains why everyone did what they did |
| **M6** | Sim-driven balance pass, deploy, playtests, tuning | The Definition of Done holds |

If the loop is not fun at M3 — with the bot telling us the numbers — no amount of M5 polish saves it.
That is the kill switch.

**Testing:** `seed + actions → state hash` with golden replays; a structural privacy test that
serialises `PlayerView` and asserts no hidden value leaks (**now covers directives, not just deck order**);
`validate()` returning testable reasons; the **victory-resolution matrix** as a table-driven test (three
terminal states × two alignments × condition met/not met); the **alignment invariant** (breach seats never
exceed ⌊n/2⌋ after the safety valve); **footprint enforcement** (a breach victory whose public footprint
never occurred is rejected); content Zod + locale completeness + unique IDs + attribution presence in CI;
500 fuzz games per run asserting invariants; `pnpm sim` reporting win rate by table composition; one
Playwright path.

**Risks:** R1 pacing (mitigated by D13's anti-camping clock) · R2 Stage 2 doubling scope (mitigated by
seams + a stage gate) · R3 art becoming the schedule (placeholder contract; art is M6) · R4 hidden-info
leak (projection + structural test) · R5 licence drift (never reuse wiki images; CI-enforced provenance)
· R6 multiplayer pulled forward · R7 bilingual drift (`Record<Locale,string>` + CI + pseudo-locale).

---

### 14b. MVP vs v1.1 — the cut

Owner: *"I mean im looking for an MVP and build on top."*

**The rule for cutting:** an MVP removes **breadth**, never **risk**. The risky assumptions are only three —
*is the loop fun*, *is the politics fun*, *is 60–90 minutes real* — and every system that touches them
stays. Everything that only adds variety goes.

| System | MVP | Later | Why |
| --- | --- | --- | --- |
| Board, 31 nodes | ✅ | — | data, cheap, and the shape of the game |
| 6 roles + aspects + compels | ✅ | more roles | *is the politics fun* — the core bet |
| Anomalies, 18 | ✅ | 20 | *is the loop fun* |
| Main directives, 12 + protocol track | ✅ | 14 | win conditions; nothing plays without them |
| Escalation, 14 (incl. 2 Emergency Assembly) | ✅ | — | the pressure model's teeth, and the cheapest test of the vote flow |
| Equipment, 10 | ✅ | 20 | risk needs a reward; 10 is the floor at 3 players |
| **Side directives** | ⏸ | 20 | breadth. `terminal` nodes draw **equipment** in the MVP |
| **Facility events** | ⏸ | 15 | breadth. No round-start draw in the MVP |
| **Allies + `recruit` node** | ⏸ | 10 | breadth. `outer-08` stays a supply node |
| **Strict privacy mode** (forced handoff + PIN) | ⏸ | — | the default privacy model is enough for a co-located table of friends |
| 5–6 players, victory presets | ⏸ | — | engine is parametric, UI exposes 2–4 |
| Online multiplayer | ⏸ | — | already Stage 3 |

#### The 3-player cut, honestly measured

Owner: *"I'll like to be considered 3 players only max, that will allow us to have less cards to create."*

The second half of that is **not quite true**, and it is worth knowing why before we budget. Deck size is
driven by **draws per game**, not by seats directly, and going from four seats to three cuts draws by only
~25% — because a 3-player game lasts more *rounds*, so the per-round draws spread across fewer players.

Where the real savings are:

| Saving | Size |
| --- | --- |
| 3 seats instead of 4 | simpler turn-order UI, one fewer layout, fewer edge cases in drafting, the valve and respawn |
| Shorter games | easier to hit 60–90 min without retuning the clock |
| Breach valve | `floor(3/2) = 1`, so **at most one saboteur** — cleaner than the 2v2 table the 4-player valve allows |
| **Better draft** | `min(3, floor(6/3)) = 2` options each, versus 1 at four players |
| Card count | ~5–10%, not 25% |

**6 roles stays.** With 3 players it is the *minimum* that yields a 2-option draft (`floor(6/3)=2`); 5 roles
or fewer gives one option each and the draft disappears, which was the reason for the draft in the first
place.

**MVP content budget: 54 cards** — 18 anomalies, 12 mains, 14 escalation, 10 equipment. Down from 56, and
almost all of the reduction is in decks whose draw rate genuinely fell.

Note the counter-intuitive one: **escalation goes up, not down.** Only 3 of 31 nodes are alarms (~10% of
landings), but stall hazards and personal escalation add draws on top, so a 3-player game still draws the
escalation deck roughly a dozen times. A 10-card escalation deck would exhaust in the median game and
violate §S8.3 check 9.

**Two rules for the temporary substitutions**, so they do not become permanent by accident:

1. Every deferral is a **config value**, not a code branch. `MatchConfig.deckPresets` says which decks are
   live and what a `terminal` node draws. Turning side directives back on is a content drop plus one line.
2. Every temporary substitution is listed in the log as **debt**, with the node kind it affects. A node kind
   that silently does nothing is how MVP shortcuts become shipped bugs.

**What the MVP still proves, and nothing less:** a stranger can open a link, draft a character, descend
three rings, survive the hunters, be compelled by a visible weakness, discover a hidden agenda at the
table, hold the Command Center against someone quietly pushing the protocol down, and read at the end why
they won or lost. If that is not fun, no amount of allies or events will save it — and if it *is* fun,
v1.1 is content, not design.

---

# Part IV — Implementation design (specification, no code)

Active per the owner: *"I'd like to pause and refine all the implementation… start but not
implementing, start design."*

Nothing here is code. This part produces the specification that makes M0 mechanical — the point where
"we know what to build" stops being a feeling and becomes a document somebody could implement from.

## S0. The specification queue

| Ch | Pins down | Status |
| --- | --- | --- |
| **S1** | State model: `GameState`, `Player`, outcome | **written** |
| **S2** | Turn and round loop: phases and the order of resolution | **written** |
| **S3** | Action vocabulary: the reducer's public API and its rejection reasons | **written** |
| **S4** | Effect and condition vocabulary: the closed set that makes B4's "no new mechanics" rule enforceable | **written** |
| **S5** | Projection: exactly what a viewer receives, including log filtering | **written** |
| **S6** | Evidence: the public trace system behind D18 | **written** |
| **S7** | Screens, navigation and the privacy model | **written** |
| **S8** | Content file layout, Zod schemas, validators | **written** |
| **S9** | Simulator output contract — the metrics that own the tuning parameters | **written** |

## S1. State model

Everything that can change lives in one serializable object. That single choice gives save/resume
(`JSON`), replay (`{seed, actions}`), and a simulator loop with no special cases.

```ts
type SeatId = "p1" | "p2" | "p3" | "p4";
type Ring = "outer" | "middle" | "inner" | "core";

type GameState = {
  config: MatchConfig;
  rng: { seed: number; cursor: number };        // the ONLY source of randomness
  round: number;
  turn: { seat: SeatId; phase: Phase };
  players: Record<SeatId, Player>;
  hunters: Hunter[];
  threat: { track: number };                    // 0..5
  warhead: { armed: boolean; remaining: number } | null;
  decks: Record<DeckId, Deck>;                  // drawPile + discard
  evidence: EvidenceToken[];                    // public trace — S6
  log: GameEvent[];                             // every event carries visibility
  outcome: Outcome | null;
};

type Player = {
  seat: SeatId;
  roleId: RoleId;
  node: NodeId;
  stats: { combat: number; intellect: number };
  integrity: number;
  maxIntegrity: number;
  clearance: 1 | 2 | 3 | 4;
  records: number;
  fate: number;                                 // 0..3
  aspects: AspectId[];                          // PUBLIC, always visible to everyone
  mainDirectiveId: MainDirectiveId;             // hidden
  sideDirectives: SideDirectiveId[];            // hidden, max 2
  gear: ItemId[];
  tags: TagId[];                                // sample, key, bound, distracted, ...
  stalledTurns: number;                         // attempts-based counter (D16)
  downed: boolean;                              // 0 Integrity; waits or respawns (S2)
  counters: Record<CounterId, number>;          // containments, rescues, gateFailures, sealedGates, ...
};

type Outcome = {
  terminal: "recontained" | "detonated";
  winners: SeatId[];
  revealed: Record<SeatId, {
    mainDirectiveId: MainDirectiveId;
    sideDirectives: SideDirectiveId[];
  }>;
};
```

**Why no derived data is stored:** adjacency, coordinates, and ring size are computed from `config` plus
content. Storing them would mean a ring resize invalidates every save and every golden replay.

**Why the log is state, not a side channel:** replays need it, the UI needs it, and — decisive — the
privacy test (§S5) must be able to inspect it for leaks. A `console.log` cannot be tested.

## S2. Turn and round loop

| Phase | Resolves | May act |
| --- | --- | --- |
| `turnStart` | expire side directives, hunter contact, start-of-turn triggers | system |
| `roll` | `1d6`; optional **one** Fate-priced re-roll | active seat |
| `move` | choose a path of exactly N edges (Q5: direction after the roll). **Q23: you may stop early for 1 Fate**, forfeiting the remainder | active seat |
| `space` | resolve the destination: gate check, encounter, or terminal | active seat |
| `action` | at most one: compel, clearance attempt, gear, rest | active seat |
| `end` | pass the turn | active seat |

A **downed** seat replaces the whole table above with a single decision — wait, or respawn (below) — and
the loop skips to `end`.

**Round boundary**, in this order, after the last seat's `end`:

1. Hunters move by the scent rule.
2. Hunter contact resolves (Integrity or a test).
3. **Threat check:** if no seat produced a progress *attempt* this round, the track `+1`.
4. If the track reaches 5 → **arm** the warhead; `remaining = preset`. It does **not** tick this round.
5. If armed → `remaining -1`.
6. Resolve terminals: `remaining == 0` → detonated; protocol fired → recontained.

The ordering is load-bearing, not incidental: hunters move after every player so the table sees the
consequence of the whole round at once, and the threat check reads the round's attempts rather than a
single player's turn — which is why D16's counter must be per-seat *and* aggregated.

**0 Integrity: downed, then rescued or replaced (Q22).** Owner's ruling: *"you loose all but the
experience, like the stats you earned. but loose equipment, quests etc. you get a new character, but also
a bit of a) so you can skipp turns until you get recued if you like."*

- At 0 Integrity the player becomes **downed at their node**. The token stays on the board; they take no
  turns and are skipped in turn order.
- At the start of each of their turns while downed, they choose one:
  - **Wait.** Stay downed. If another player reaches the node and spends their `action`, they revive with
    **gear intact at 1 Integrity** — you keep your stuff, but you owe someone.
  - **Respawn.** Return at the arrival node as a **new character**: **stats are kept** (the experience),
    while **gear, clearance, side directives and the Main Directive are lost**, and a **new Main
    Directive is dealt**. This is the path of the impatient and the abandoned.
- If the warhead fires while a player is downed, they lose with the site.
- A downed seat is **excluded from the stall check**. D16 exists to punish *choosing* inaction; a downed
  player has no choices left, and the table already paid for the death once.

**Consequences that must be designed, not discovered:**

1. **Character selection is a draft, not an assignment (Q26).** Owner: *"ideally you will start with 2-3
   random possible characters. you pick one. when you die same action, you get 2-3 and choose."* So both
   setup and respawn use the same mechanic, and the number of options is **derived from the content pool**:

   ```ts
   draftOptions = min(3, floor(availableRoles / players))
   ```

   With 6 roles: 2 players → 3 options each, 3 players → 2, 4 players → 1. A dead character's role is
   **retired for the match** (the post is gone; you never re-pick your own corpse), so on death the pool is
   the undealt roles — with 6 roles and 4 players that is **2 options**, which is the same experience as
   setup without special-casing the code.

   The draft also fixes a fairness problem the assignment model had: with asymmetric roles, being handed
   one is a lottery. Choosing one from a small set converts that into an opening decision — and it costs
   no new rules, only the same `choose()` the downed player already uses.
2. **A new Main Directive must respect D19.** After dealing on respawn, recompute alignment and apply the
   safety valve, or a dying player could silently hand the table a second saboteur.
3. **Losing your Main Directive changes what winning means for you mid-game.** That is dramatic and
   correct, but the endgame reveal (§7c.6) must show the *final* directive and, ideally, the previous one
   too. Recorded as a requirement for S7.

## S3. Action vocabulary — the reducer's public API

```ts
type Action =
  | { type: "spendFateToReroll" }
  | { type: "move"; path: EdgeId[] }
  | { type: "chooseEncounterOption"; optionIndex: number }
  | { type: "drawSideDirective" }                      // terminal spaces only
  | { type: "compel"; target: SeatId; aspectId: AspectId; compelIndex: number }
  | { type: "respondCompel"; accept: boolean }         // the ONE off-turn action
  | { type: "attemptClearance" }
  | { type: "useItem"; itemId: ItemId; target?: SeatId }
  | { type: "rest" }
  | { type: "rescue"; target: SeatId }                 // downed ally on your node
  | { type: "chooseDownedAction"; choice: "wait" | "respawn" }
  | { type: "advanceProtocol" }                        // Intellect test at the core; steps +1
  | { type: "sabotageProtocol" }                       // steps -1, places tamperedProtocol evidence
  | { type: "sealGate"; gateId: EdgeId }               // one action; gate blocked 2 rounds; places sealedGate
  | { type: "castVote"; choice: VoteChoice }
  | { type: "endTurn" };
```

`validate(state, action)` returns `ok` or a **reason code plus human text**, never a bare boolean — the
UI has to explain refusal, and refusal reasons are themselves test data.

`respondCompel` is the single exception to "only the active seat may act". It has to exist or the phase
machine deadlocks the moment a compel is invoked, and it is bounded by the phase (`space`/`action` of the
compeller's turn only).

## S4. Effect and condition vocabulary — the closed set

This is what makes B4's hard rule enforceable: a card cannot invent an effect, because the schema rejects
anything outside this list.

**Effects (~14).** `modifyIntegrity(delta)` · `modifyRecords(delta)` · `grantFate(n)` ·
`raiseThreat(n)` · `setClearance(n)` · `setRecords(n)` · `drawCard(deck, n)` · `placeEvidence(kind)` · `spawnHunter(kind)` · `forceMove(node)` · `modifyMaxIntegrity(n)` · `lockGate(gateId, rounds)` ·
`moveHunter(id, n)` · `grantAspect(id)` · `forceTest(stat, difficulty, onSuccess, onFailure)` ·
`addTag(kind)` · `removeGear(n)` · `armWarhead()`.

**Conditions (~11).** `atNode(id|kind)` · `inRing(ring)` · `clearanceAtLeast(n)` · `fateAtLeast(n)` ·
`integrityBelow(n)` · `hasTag(kind)` · `hasAspect(id)` · `hasEvidence(kind)` · `targetsAtLeast(n)` ·
`roundAtMost(n)` · `all/any/not(...)`.

If an SCP entry needs something outside these two lists, it **does not fit** (§2.3). That is the filter,
expressed as a type instead of a taste.

## S5. Projection — what each viewer receives

```ts
project(state: GameState, viewer: SeatId): PlayerView
```

| Field | Rule |
| --- | --- |
| own `mainDirectiveId`, own `sideDirectives` | included |
| other seats' directives | replaced by `{ hidden: true }` |
| decks | `drawPile.length` + `discard.length` only; the top card only where a rule explicitly exposes it |
| `log` | filtered by each event's `visibility: "public" | { seat: SeatId }` |
| aspects, stats, integrity, clearance, fate, records, gear, node, evidence | always public |

**The privacy test is generated from this table**, not hand-written: it serialises `PlayerView` for a
seat, walks every path in a list of hidden values, and fails if any appears. Adding a hidden field without
adding it to the list is itself a test failure, because the walker asserts that the field *is* absent.

## S6. Evidence — the public trace behind D18

```ts
type EvidenceToken = {
  class: "accident" | "intent";        // see below — this field is load-bearing
  kind:
    | "uncontained" | "breachAlarm"                          // accident
    | "sealedGate" | "tookSample" | "tamperedProtocol";       // intent
  sourceSeat: SeatId;
  nodeId: NodeId;
  round: number;
};
```

Evidence is **public** and permanent. A breach directive declares which kinds count for it, and a breach
victory is rejected if the player holds none of them.

**Why there are two classes (found while writing the anomaly deck, §C2.3).** If a failed containment placed
evidence that counted, a saboteur could win on somebody else's bad roll — standing next to a Keter failure
would launder a breach victory. So:

- `accident` — anomaly breaches, failed gates, escalation cards. Public, ambiguous, **never** satisfies a
  directive.
- `intent` — directive-driven acts. **Only these count.**

Accidents are what the site does to you; traces are what a person chose. The table still cannot tell an
innocent `tookSample` from a hostile one — that ambiguity is the game.

The design property worth protecting: **evidence shows an act, never an intent.** Carrying the sample can
be legitimate research or extraction; sealing a gate can be prudence or betrayal. Evidence creates
suspicion without proof, which is the exact currency a deduction game runs on — and it is why D18 is not
a bookkeeping rule but the thing that makes hidden agendas playable rather than arbitrary.

---

## S7. Screens, navigation and the privacy model

### S7.1 No router — and that resolves a hosting caveat

Screen state is a field in the client store (`screen: "setup" | "table" | "endgame" | "credits"`), not a
URL route. Three consequences, all good:

- one render root, no route guards, no history handling in a game that has no pages;
- deep links are meaningless anyway — a mid-game link is useless without the save;
- **GitHub Pages needs no `404.html` SPA fallback**, which removes the last real caveat of B6 (§2.5).

The only URL-worthy state is `?lang=es` for the language selector, and that is a query param read once.

### S7.2 Screen inventory

| Screen | Purpose | Exit |
| --- | --- | --- |
| `boot` | detect locale, language toggle | → `setup` |
| `setup` | player count, **role draft**, language, start | → `handoff` (seat 1) |
| `handoff` | pass the device; reveal then conceal private information | → `table` |
| `table` | the game | → `endgame` |
| `endgame` | **motive reveal**, winners, why | → `credits` / new game |
| `credits` | attribution, licences, glossary | back |

Overlays on `table` (not screens): `privatePanel`, `compelPrompt`, `encounterChoice`, `pathPreview`,
`vote`, `confirm`, `glossary`.

### S7.3 The privacy model: two mechanisms, not one

The charter implied a privacy screen per turn. That is heavier than needed and it interrupts a
co-located game. v1 uses two mechanisms for two different situations:

| Situation | Mechanism | Why |
| --- | --- | --- |
| **Acquiring** private information — setup draft, Main Directive, side-directive draw, respawn | **full `handoff` screen**: "Pass the device to *Agent Reyes*" → **hold to reveal** → **tap when done** → concealed | the moment of acquisition *must* be private, and it is short and rare |
| **Consulting** private information later — "what was my directive again?" | **`privatePanel` overlay**: claim your seat, then **hold-to-reveal** | no interruption, no turn handoff, and it cannot be left open by accident because releasing hides it |

**Seat claim, not honour system:** the private panel opens with "I am… → P2" before revealing. This is one
tap, and it means a player cannot read another seat's directive by opening the panel while that seat is
active. A **strict mode** flag escalates this to a forced handoff on every acquisition *and* a per-seat PIN
— same code path, one config switch, for tables that do not trust each other.

**Non-negotiable rule:** the `table` screen itself never renders any hidden value. Private UI is a
separate subtree fed by `project(state, claimedSeat)`, so a UI bug can leak *layout* but not *content*
from a component that never received it.

### S7.4 The `table` screen

```
┌──────────────────────────────────────────────────────────────────┐
│ THREAT ●●●○○   WARHEAD 7   ROUND 4/18   ANOM 12/20  ESC 8/10      │  status strip
├──────────────┬───────────────────────────────────┬───────────────┤
│ PLAYERS      │                                   │ LOG           │
│ P1 ▣●●● fate 2│        3 RING BOARD               │ ▸ P3 contained│
│   Euclid Lvl2│         (SVG, derived)             │   a Keter …   │
│ P2 ▣●●○ fate 0│                                   │ ▸ P1 compelled│
│   Safe  Lvl1 │                                   │   P2: Reckless│
│ P3 ▣○○○ DOWN  │                                   │               │
│ P4 ▣●●● fate 1│                                   │               │
├──────────────┴───────────────────────────────────┴───────────────┤
│ YOU: Agent Reyes · Combat 3 · Intellect 2 · Integrity 4/6 · L4    │  own panel
│ Gear ▸[3]   Directives ▸ hold to reveal   [ End turn ]            │
└──────────────────────────────────────────────────────────────────┘
```

Design rules that follow from B1 (learnability is the tie-breaker):

- **Every number has a name on hover/focus.** No icon-only state. Tier is never colour-only: label +
  glyph + colour (§2.2, R7 accessibility).
- **The log is the teaching surface.** Public events are written as short sentences with a subject, verb
  and consequence ("P3 attempted Keter containment — Breach. Integrity 6→2."), because a newcomer learns
  the rules by reading what just happened, not by opening a rulebook.
- **The board is the only interactive canvas.** Click/tap a node → path preview with the number of steps
  remaining, hazards on the path, and the cost of stopping early (Q23, 1 Fate). Confirm to move. No
  drag-and-drop: it is worse on touch and worse for accessibility.
- **Panels collapse before the board shrinks.** Below ~900 px the side panels become tabs under the board;
  the SVG keeps its aspect ratio via `viewBox`, so the board never becomes unreadable.

### S7.5 The `endgame` reveal

This is the payoff of ninety minutes of not knowing, so it is a **sequence**, not a scoreboard:

1. **The terminal state**, in one sentence: the site was recontained, or the warhead detonated.
2. **Per player, one at a time** (tap to advance), in seat order: their role, their **final** Main
   Directive, their **previous** directive if they died (Q22), their evidence trail, and a one-line
   verdict — *won*, *lost*, and *why*.
3. **The grid**: who won and by which path, side by side.
4. **The reel**: the three or four public events that decided it, pulled from the log by weight (protocol
   fired, warhead armed, a compel that changed a test, a rescue).
5. Credits/licences link — the licence requires it to be reachable, not buried.

Rule: **the reveal explains, it does not judge.** No ranking (Q10), no score. A player who lost should be
able to point at the moment they were beaten by someone's secret, not by arithmetic.

### S7.6 Accessibility floor (v1, not later)

- **Keyboard-complete.** The board is a *graph*, so arrow keys map naturally onto it: left/right travel a
  ring, up/down cross a gate. This is the one part of the UI where the derived board pays off twice.
- `aria-live="polite"` on the log and on the status strip, so a screen reader announces the game's
  narration.
- `prefers-reduced-motion` respected globally: token moves become instant, card flips become fades.
- Contrast and colour-blind safety per §2.2: clearance levels and threat states carry a glyph and a label.
- Focus is never trapped by the private panel; releasing it returns focus to the invoking button.

---

## S8. Content layout and validators

Content is data (§3, property 4). The layout exists so that adding a card is a one-line diff in one file,
and so that a bad card fails CI instead of a playtest.

### S8.1 Layout

```
src/content/
├─ schema.ts                 Zod schemas + exported types (the source of truth)
├─ glossary.ts               canonical ES vocabulary (B5)
├─ attribution.ts            per-item provenance: slug, author, translator?, sourceUrl
├─ board/
│  ├─ nodes.ts               one entry per node: id, ring, slot, kind, deck?, clearanceRequired
│  └─ gates.ts              one entry per gate: from, to, clearanceRequired | null (test-stoppable)
├─ roles/
│  ├─ roles.ts               6 entries
│  └─ aspects.ts             aspects + their coded compels
├─ cards/
│  ├─ anomalies.ts           20
│  ├─ equipment.ts           20
│  ├─ events.ts              15
│  ├─ allies.ts              10
│  └─ escalation.ts          10 (incl. 2 Emergency Assembly)
├─ directives/
│  ├─ main.ts                14 (10 containment / 4 breach)
│  └─ side.ts                20
└─ index.ts                  typed aggregate + contentVersion
```

**One file per deck, not one file per card.** Twenty cards in one file is searchable, diffable, and lets a
typo fix sit next to the card it touches. Twenty files means twenty imports and a merge conflict per card
when two people write content at once. The trade only inverts past ~100 entries per deck, which is a
Stage 3 problem.

### S8.2 Schema shape

```ts
type Localized = Record<"en" | "es", string>;

type Attribution = {
  slug?: string;        // SCP wiki slug, when adapted
  author?: string;      // wiki author
  translator?: string;  // ES-branch translator (B5) — a licence requirement
  sourceUrl?: string;
  license: "CC-BY-SA-3.0" | "original";
};

type Card = {
  id: CardId;
  text: Localized;
  attribution: Attribution;
} & (
  | { kind: "anomaly"; tier: Tier; test: { stat: Stat; difficulty: number }; effects: Effects }
  | { kind: "equipment"; slot: Slot; effects: Effects }
  | { kind: "event"; effects: Effects }
  | { kind: "ally"; effects: Effects }
  | { kind: "escalation"; effects: Effects }
);
```

Two schema rules carry weight beyond typing:

1. **`effects` is a discriminated union over the closed vocabulary in §S4.** An unknown effect cannot
   parse, which is how B4's "no card introduces a new mechanic" rule is enforced by the compiler and the
   build rather than by review.
2. **`attribution` is required on every content object, not optional.** `license: "original"` is a value,
   not an absence — so "nobody filled this in" and "we wrote it" are distinguishable, and the credits
   screen is generable rather than hand-maintained.

### S8.3 The validator (CI gate — `scripts/validate-content.ts`)

Every check below is a build failure, not a warning:

| # | Check | Why |
| --- | --- | --- |
| 1 | **Schema parse** of every object | typos fail at build |
| 2 | **Locale completeness** — `Localized` has exactly `en` and `es`, non-empty | the type makes it structural; the check catches whitespace |
| 3 | **Unique IDs** across all decks and board nodes | a duplicate silently shadows a card |
| 4 | **Attribution present**; adapted items have `slug` + `author` | licence obligation (§3.1) |
| 5 | **Glossary** — forbidden synonyms absent from `es` text | B5: three Spanish sources must not become three vocabularies |
| 6 | **Board graph integrity** — every gate joins existing nodes; ring slots are contiguous; Command Center reachable from every gate path; no orphan node | a broken graph is an unwinnable game |
| 7 | **Footprint satisfiability** — every breach directive names ≥ 1 evidence kind that some effect can actually place | D18: a directive nobody can satisfy is a silent loss |
| 8 | **Role invariants** — exactly 1 aspect each; stat totals inside the balance band; no duplicate aspect across roles | asymmetric roles are the easiest place to break fairness |
| 9 | **Deck sufficiency** — cards ≥ expected draws × 1.2 for the standard preset | pacing guard before the sim exists |
| 10 | **ES length ratio** — flag `es` text > 1.4× its `en` counterpart | catches layout breakage before the pseudo-locale pass |
| 11 | **contentVersion present and bumped** when any content file changes | saves and replays can then refuse a stale load instead of misresolving |

Checks 6–9 are the interesting ones: they encode *game* rules as build-time assertions, which is the
cheapest possible place to catch a content bug — the moment before it exists in a playtest.

### S8.4 What is deliberately not validated

- **Balance numbers** (difficulty, rewards, costs). They are the simulator's job (§S9); a validator that
  guesses at balance becomes a validator people disable.
- **Prose quality.** A tone linter would be theatre.
- **Art.** Assets are referenced by ID and checked for existence only; provenance for images is tracked in
  the attribution file, not inferred.

---

## S9. Simulator contract — the metrics that own the tuning parameters

The four tuning parameters in §10.2 have no human owner on purpose. This chapter defines the instrument
that owns them: a headless harness that runs thousands of games and reports numbers, so "does it feel
right?" becomes "did the median change?".

### S9.1 Command

```
pnpm sim --games 10000 --players 2,3,4 --policy mixed --seed-base 42 --out sim-report.json
```

Deterministic: the same `--seed-base` and the same content version produce byte-identical reports. That
is what makes a report diff meaningful — otherwise every run looks like a regression.

### S9.2 Bots must be representative, not smart

Three heuristics, mixed by default, because a single optimal bot measures the bot, not the game:

| Policy | Behaviour | Exists to answer |
| --- | --- | --- |
| `cautious` | heals, banks Fate, prefers the safest legal path, takes a gate only when clearance allows | does camping actually pay? |
| `aggressive` | always progresses, compels freely, accepts risk for Records | does the reward curve reward it? |
| `saboteur` | plays its directive family: containment players rush the centre, breach players place evidence and stall the protocol | is a breach victory reachable without being obvious? |

The bot never reads hidden information it should not have — it consumes `project(state, seat)` exactly
like a player. This is a second, stronger privacy test: a bot that cheats would report impossible win
rates, so the simulator *is* the enforcement.

### S9.3 Metrics

| Group | Metric | Owns |
| --- | --- | --- |
| Pacing | rounds-to-terminal p50 / p90, split by player count | escalating-cost ladder |
| Pacing | % of games hitting the warhead | whether the clock is a clock or decoration |
| Outcome | win rate by **alignment** and by player count | main-deck mix (D19) |
| Outcome | share of tables with 0 / 1 / 2 breach players | the mix, seen from the table's side |
| Fairness | **breach-achievable rate** — how often a breach player's condition was satisfiable at all | directive writing |
| Fairness | per-role win rate, per-seat-position win rate | role invariants, first-player advantage |
| Pressure | stall events per seat per game | D16 calibration |
| Economy | Fate earned / spent per player; % of turns ending at the cap | Fate generosity (Q14) |
| Economy | compels per game, acceptance rate, by policy pair | is the political layer alive or decoration? |
| Death | deaths per game; rescues vs respawns | Q22 severity |
| Content | deck exhaustion rate per deck | content sufficiency |
| Board | dwell time and test count per node; gate crossing attempts | ring sizes and gate placement |
| Legibility | evidence tokens generated per game, by kind | is D18 detectable at all? |

### S9.4 Acceptance thresholds (the "is this a real game" proxies)

Measured on the mixed policy at 4 players:

- **median game length between 12 and 18 rounds** — below is thin, above breaks the 90-minute promise;
- **every role wins between 20% and 40%** — wider than that and the draft is a lottery with extra steps;
- **breach-achievable ≥ 80%** — below that, hidden agendas are decoration and the table is not really split;
- **≥ 1 compel per player per 3 rounds** — the political layer has to touch every seat, not just the loud ones;
- **deaths ≤ 1.5 per game** — dying should be memorable, not routine;
- **no deck exhausted in the median game** — otherwise the reshuffle is the real content.

These are **thresholds, not targets**. The sim reports; the owner decides whether to accept a number that
misses one, and the miss gets recorded in the log rather than quietly rounded off.

### S9.5 Output

Two artifacts per run:

1. `sim-report.json` — machine-readable, diffable, listed above.
2. `sim-report.md` — one table per group, with the acceptance thresholds marked **PASS / FAIL**, generated
   so nobody hand-copies numbers into the document.

The markdown report is what gets committed alongside a balance change, so every tuning decision in the
history has the numbers that justified it. That is the same principle as the design log, applied to
numbers: **a change without evidence is a guess, and this document does not keep guesses.**

---

# Part V — Content v1 (authoring)

Active. This part contains the actual game content, not the rules about it. Everything here is content
data (§S8) and is validated by the build gate.

## C1. The board (v1)

### C1.1 The shape

Three rings and a core: **12 outer / 10 middle / 8 inner + Command Center = 31 nodes.** Ring sizes are a
tuning parameter (§10.2), so the geometry must survive being changed — which is why positions are derived
(§8) and this chapter only declares slots.

**The pacing claim this board makes, stated up front:** the board is *short* and the **clearance economy
is long**. From the arrival node, the Command Center is roughly seven movement steps — about two turns at
an average `d6`. If the game lasted as long as the distance, it would be over in ten minutes. It lasts
12–18 rounds because crossing a ring boundary demands either a **Clearance level** you must earn from
contained anomalies, or a **gate test** you can fail. Distance gives you the choice of route; permission
gives you the game. If the simulator reports a median under 12 rounds, this is the first dial to turn.

### C1.2 Node kinds and what they do

Marked nodes draw a card; facilities do not. This is Q8's "marked spaces plus gates".

| Kind | Draw | Mechanic |
| --- | --- | --- |
| `entry` | — | Arrival node. Where every character starts and every respawn returns. No encounter. |
| `medical` | — | Action: restore 2 Integrity, once per visit. |
| `checkpoint` | — | Action: spend Records to raise Clearance by 1 (the access economy, §C1.4). |
| `supply` | equipment | Draw 1 equipment card. |
| `terminal` | **side directive** | Draw 1 side directive — **replaces** the encounter (Q24). |
| `lab` | anomaly | Draw 1 anomaly from the ring's tier band. Test to contain. |
| `cell` | anomaly | Draw 1 anomaly one tier higher, harder test, better reward. |
| `alarm` | escalation | Draw 1 escalation card. The card decides whether the track moves. |
| `core` | — | The Command Center. Protocol, warhead, and the endgame. |

### C1.3 Gates

Gates are **edges**, not nodes: crossing is a movement step that triggers the check, and the gate stays
crossable in both directions. Two per boundary, placed roughly antipodal so that no position on a ring is
more than ~half a lap from an exit — that is the rule that prevents a dead-ended player.

| Gate | From → To | Clearance | Test (fallback) |
| --- | --- | --- | --- |
| **G1** | `outer-05` (150°) → `middle-04` (144°) | 2 | Intellect, difficulty 2 |
| **G2** | `outer-10` (300°) → `middle-08` (288°) | 2 | Intellect, difficulty 2 |
| **G3** | `middle-02` (72°) → `inner-02` (90°) | 3 | Intellect, difficulty 3 |
| **G4** | `middle-07` (252°) → `inner-06` (270°) | 3 | Intellect, difficulty 3 |
| **G5** | `inner-01` (45°) → core | 4 | Intellect, difficulty 4 |
| **G6** | `inner-05` (225°) → core | 4 | Intellect, difficulty 4 |

Slot angles are declared in the table so the renderer can lay gates out radially instead of as chords
crossing the board. With 12/10/8 slots the divisions are 30°/36°/45°, which is why the pairs above sit
within 18° of each other.

### C1.4 The access economy

Clearance is bought with Records, and Records come from containing anomalies. This is the whole reason
the outer ring exists.

| Action | Cost / reward |
| --- | --- |
| Contain a Safe anomaly | +1 Record |
| Contain a Euclid anomaly | +2 Records |
| Contain a Keter anomaly | +3 Records |
| Raise to Clearance 2 (at a checkpoint) | 3 Records |
| Raise to Clearance 3 | 4 Records |
| Raise to Clearance 4 | 5 Records |

Total to reach Level 4 by purchase: **12 Records**, roughly eight to ten containments, minus whatever you
recover from the breach-aligned player who is quietly *not* helping. A failed gate test does not raise
clearance — it just lets you through and costs the turn, which is the "bold" route and the reason
`intellect` matters early.

*All numbers are tuning parameters (§10.2), not law.*

### C1.5 Nodes

Names are **provisional** pending the canon pass (B4): a node becomes "SCP-173 — Containment" the moment
an adapted entry fits the fit test in §2.3.

**Outer ring — Safe · Administrative & Residential (12)**

| Slot | ID | Kind | EN | ES |
| --: | --- | --- | --- | --- |
| 0 | `outer-00` | lab | Storage Vault 2 | Bóveda de Almacenamiento 2 |
| 1 | `outer-01` | terminal | Records Annex | Anexo de Registros |
| 2 | `outer-02` | entry | Arrival Gate | Puerta de Llegada |
| 3 | `outer-03` | supply | Requisitions Office | Oficina de Requisiciones |
| 4 | `outer-04` | alarm | Alarm Junction | Cruce de Alarmas |
| 5 | `outer-05` | checkpoint | Checkpoint Alpha | Punto de Control Alfa |
| 6 | `outer-06` | medical | Medical Bay | Enfermería |
| 7 | `outer-07` | lab | Dormitory Block C | Bloque de Dormitorios C |
| 8 | `outer-08` | supply | Supply Depot | Depósito de Suministros |
| 9 | `outer-09` | terminal | Personnel Terminal | Terminal de Personal |
| 10 | `outer-10` | lab | Containment Locker 4 | Casillero de Contención 4 |
| 11 | `outer-11` | medical | Observation Ward | Sala de Observación |

**Middle ring — Euclid · Heavy Containment (10)**

| Slot | ID | Kind | EN | ES |
| --: | --- | --- | --- | --- |
| 0 | `middle-00` | lab | Euclid Containment 1 | Contención Euclid 1 |
| 1 | `middle-01` | cell | Anomaly Cell 7 | Celda de Anomalías 7 |
| 2 | `middle-02` | checkpoint | Checkpoint Beta | Punto de Control Beta |
| 3 | `middle-03` | terminal | Research Terminal | Terminal de Investigación |
| 4 | `middle-04` | supply | Requisition Cage | Jaula de Requisiciones |
| 5 | `middle-05` | alarm | Breach Corridor | Pasillo de Brecha |
| 6 | `middle-06` | lab | Biohazard Lab | Laboratorio de Riesgo Biológico |
| 7 | `middle-07` | checkpoint | Checkpoint Gamma | Punto de Control Gamma |
| 8 | `middle-08` | cell | Euclid Containment 9 | Contención Euclid 9 |
| 9 | `middle-09` | medical | Field Station | Puesto de Campaña |

**Inner ring — Keter · Critical Core (8)**

| Slot | ID | Kind | EN | ES |
| --: | --- | --- | --- | --- |
| 0 | `inner-00` | cell | Keter Holding A | Confinamiento Keter A |
| 1 | `inner-01` | checkpoint | Core Airlock Alpha | Esclusa del Núcleo Alfa |
| 2 | `inner-02` | terminal | Command Terminal | Terminal de Mando |
| 3 | `inner-03` | alarm | Reactor Spine | Columna del Reactor |
| 4 | `inner-04` | cell | Keter Holding B | Confinamiento Keter B |
| 5 | `inner-05` | checkpoint | Core Airlock Beta | Esclusa del Núcleo Beta |
| 6 | `inner-06` | medical | Burn Ward | Sala de Quemados |
| 7 | `inner-07` | supply | Armory Cage | Jaula de Armería |

**Core (1)**

| ID | Kind | EN | ES |
| --- | --- | --- | --- |
| `core` | core | Command Center | Centro de Mando |

### C1.6 Board invariants (validator checks, §S8.3 check 6)

1. Every ring has **at least one** `medical`, one `supply` and one `terminal` — no ring is a dead end for
   recovery or progress.
2. Every boundary has **exactly two** gates, and they are at least 120° apart.
3. **No node is isolated**; every node reaches every other node.
4. **The Command Center is reachable** from every gate path.
5. **The arrival node is ≥ 3 steps from every gate it can reach** — the game must not be openable in two
   turns.
6. Gate clearance is **monotonic by depth** (2, 3, 4) and every gate has a test fallback, so a player with
   no clearance is never permanently stuck — only slow.

Invariant 6 is the one worth arguing about: it guarantees that the Clearance economy can be *bypassed at a
price*, which is what makes the bold route viable and the cautious route worth its Records.

---

## C2. The anomaly deck (20 cards)

This is the canon-adaptation test (§2.3): if the fit rules cannot produce twenty playable cards from the
wiki's most famous entries, the content strategy is wrong and we find out now rather than after writing
the whole catalogue.

### C2.1 The anomaly schema

An anomaly card is mostly **data**, because the tier table (§5) does the work:

```ts
type Anomaly = {
  id: AnomalyId;
  name: Localized;
  text: Localized;
  attribution: Attribution;            // required — the validator blocks ship without it
  tier: "safe" | "euclid" | "keter";
  test: { stat: "combat" | "intellect"; difficulty: number };
  reward: { records: number };
  collateral: Effects;                 // shift == 0
  failure: Effects;                    // shift -1..-2
  breach: Effects;                     // shift <= -3
  mayLeave: boolean;                   // declining is a real option
  declineCost?: Effects;
};
```

Two design decisions inside that shape:

- **Containment reuses the §5 tier table unchanged.** The card only declares difficulty and the four
  outcome payloads, so a new anomaly can never invent an outcome ladder. This is what keeps twenty canon
  cards from becoming twenty rules.
- **`mayLeave` exists on every card.** Walking away is legal and costs something small (`declineCost`).
  Without it, the deck is a treadmill; with it, every draw is a decision — which is also why the
  anti-camping rule (§7, D16) can count *attempts* honestly: declining is an attempt, so declining is not
  camping.

**A vocabulary addition discovered by writing content, recorded properly:** `setRecords(n)` was missing
from §S4 and SCP-3000 needs it ("lose all Records"). The correct fix is to **add the effect to S4 and to
the Zod union deliberately** — never to special-case one card. The closed set is allowed to grow by
design; it is not allowed to grow by exception. That distinction is the whole point of the rule.

### C2.2 Deck composition and draw bands

Three independent piles, not one filtered deck — filtering breaks the moment a tier runs dry.

| Pile | Cards | Drawn at |
| --- | --- | --- |
| Safe | 6 | outer `lab` |
| Euclid | 8 | middle `lab` |
| Keter | 6 | middle and inner `cell` |

Difficulty bands: Safe 0–1, Euclid 2–3, Keter 4–5. Keter rewards 3 Records against Safe's 1, which is what
makes the middle `cell` nodes worth the risk rather than a coin flip.

### C2.3 Evidence has two classes — a hole in D18 found by writing cards

D18 says an antagonistic directive must leave a public footprint. Writing the deck revealed the exploit:
if anomaly breaches place evidence, a **saboteur can win on accidents**. Standing next to a Keter failure
would launder a breach victory out of someone else's bad roll.

So evidence carries a class, and only one class satisfies a directive:

| Class | Source | Counts toward a breach victory? |
| --- | --- | --- |
| `accident` | anomaly breach outcomes, failed gates, escalation cards | **No** — it is public noise, and it is deliberately ambiguous |
| `intent` | directive-driven acts: sealing a gate, taking the sample, holding the protocol | **Yes** |

This preserves the guarantee D18 was written for, and it improves the fiction: accidents are what the
site does to you, traces are what a person chose. The table still cannot tell an innocent `tookSample`
from a hostile one — which is the point.

### C2.4 The cards

Names are adaptations, not quotations. Every row is **provisional until the attribution pass** records the
wiki slug, author and licence (§3.1) — the validator refuses to ship a card without it, which is why this
table can exist before that pass is done.

**Safe — difficulty 0–1, reward 1 Record**

| # | Entry | EN / ES | Test | Collateral (0) | Failure (−1/−2) | Breach (≤−3) |
| --: | --- | --- | --- | --- | --- | --- |
| 1 | SCP-005 | Skeleton Key / *La Llave Maestra* | Int 1 | `addTag(key)` — one gate bypassed | the key is spent | `raiseThreat(1)` |
| 2 | SCP-131 | The Eye Pods / *Los Ojos* | Combat 0 | `grantFate(1)` | they lead a hunter in | `spawnHunter()` |
| 3 | SCP-294 | The Coffee Machine / *La Cafetera* | Int 1 | `drawCard(equipment,1)` | `modifyIntegrity(-1)` | `modifyIntegrity(-2)` |
| 4 | SCP-500 | Panacea / *Panacea* | Int 1 | `modifyIntegrity(2)` | a dose is lost | `modifyIntegrity(-1)` |
| 5 | SCP-914 | The Clockworks / *El Mecanismo de Relojería* | Int 2 | `drawCard(equipment,2)` + `removeGear(1)` | `removeGear(1)` | `modifyIntegrity(-2)` |
| 6 | SCP-1025 | Encyclopedia of Common Diseases / *Enciclopedia de Enfermedades Comunes* | Int 1 | `modifyIntegrity(-1)` | `modifyIntegrity(-2)` | `modifyIntegrity(-3)` |

**Euclid — difficulty 2–3, reward 2 Records**

| # | Entry | EN / ES | Test | Collateral (0) | Failure (−1/−2) | Breach (≤−3) |
| --: | --- | --- | --- | --- | --- | --- |
| 7 | SCP-173 | The Sculpture / *La Escultura* | Combat 2 | `modifyIntegrity(-1)` | `modifyIntegrity(-2)` | `modifyIntegrity(-3)` |
| 8 | SCP-096 | The Shy Guy / *El Tímido* | Int 2 | `spawnHunter()` | `spawnHunter()` | `spawnHunter()` + `raiseThreat(1)` |
| 9 | SCP-049 | Plague Doctor / *El Doctor de la Peste* | Int 3 | `modifyIntegrity(-1)` | `spawnHunter()` | `modifyIntegrity(-2)` + `spawnHunter()` |
| 10 | SCP-012 | A Bad Composition / *Una Composición Deficiente* | Int 2 | `addTag(bound)` — end next turn here | `addTag(bound)` + `modifyIntegrity(-1)` | `modifyIntegrity(-2)` + `addTag(bound)` |
| 11 | SCP-426 | I Am a Toaster / *Soy una Tostadora* | Int 2 | `grantFate(-1)` | `grantFate(-2)` | `grantFate(-1)` + `modifyIntegrity(-1)` |
| 12 | SCP-513 | A Cowbell / *Un Cencerro* | Int 2 | `spawnHunter()` | `spawnHunter()` | `spawnHunter()` + `raiseThreat(1)` |
| 13 | SCP-1471 | MalO ver1.0.0 / *MalO ver1.0.0* | Int 2 | `modifyIntegrity(-1)` | `spawnHunter()` | `spawnHunter()` + `modifyIntegrity(-1)` |
| 14 | SCP-008 | Zombie Plague / *Plaga Zombi* | Int 3 | `modifyIntegrity(-1)` | `modifyIntegrity(-2)` + `raiseThreat(1)` | `modifyIntegrity(-3)` + `raiseThreat(1)` |

**Keter — difficulty 4–5, reward 3 Records**

| # | Entry | EN / ES | Test | Collateral (0) | Failure (−1/−2) | Breach (≤−3) |
| --: | --- | --- | --- | --- | --- | --- |
| 15 | SCP-106 | The Old Man / *El Anciano* | Combat 4 | `modifyIntegrity(-2)` | `modifyIntegrity(-3)` | `modifyIntegrity(-3)` + `removeGear(1)` |
| 16 | SCP-682 | Hard-to-Destroy Reptile / *Reptil Difícil de Destruir* | Combat 5 | `modifyIntegrity(-2)` | `modifyIntegrity(-4)` | `modifyIntegrity(-4)` + `raiseThreat(2)` |
| 17 | SCP-035 | Possessive Mask / *Máscara Posesiva* | Int 4 | `modifyIntegrity(-2)` | `modifyIntegrity(-3)` + `grantFate(-1)` | `modifyIntegrity(-4)` |
| 18 | SCP-610 | The Flesh That Hates / *La Carne que Odia* | Combat 4 | `modifyIntegrity(-2)` | `modifyIntegrity(-3)` + `spawnHunter()` | `modifyIntegrity(-4)` + `spawnHunter()` |
| 19 | SCP-3000 | Ananteshesha / *Ananteshesha* | Int 5 | `modifyRecords(-1)` | `modifyIntegrity(-1)` + `modifyRecords(-2)` | `modifyIntegrity(-2)` + `setRecords(0)` |
| 20 | SCP-2935 | O, Death / *Oh, Muerte* | Int 5 | `raiseThreat(1)` | `raiseThreat(2)` + `modifyIntegrity(-2)` | `raiseThreat(3)` |

Every breach row also places `accident` evidence (§C2.3) as an implicit consequence of the tier table, not
as per-card text — one rule, twenty cards.

### C2.5 Canon that did **not** fit (the filter working)

Recording rejections is the point of having a fit test:

| Entry | Fails | Why |
| --- | --- | --- |
| SCP-055 | #2 — expressible in the vocabulary | "the anti-meme" has no testable condition; its whole appeal is that it cannot be modelled |
| SCP-2521 | #2 and #6 — vocabulary and no prior lore | it cannot be described, so the card cannot be read by a player who does not already know it |
| SCP-2317 | #6 — no required prior lore | the mechanic is a ritual with seven components; the card would need a rulebook |
| SCP-2006 | #3 — tierable without argument | the mechanic is social fear, which the tier ladder cannot express |
| SCP-5000 | #1 — clear public footprint | the premise is a setting-wide revelation, not a board act |

Five famous entries rejected, and that is the **correct** outcome: the licence gives access to the
catalogue, not an obligation to use all of it.

### C2.6 Verification debt (deliberately tracked, not hidden)

Every row above needs, before it can ship: the wiki **slug**, the entry **author**, the **ES-branch
translator** where a translation is used (B5), and confirmation that the **tier** on the wiki matches the
tier we assigned. This is the M4 attribution pass, and the validator turns each unfilled field into a
build failure. Writing the deck first and attributing it second is fine; shipping with it missing is not.

---

## C3. Roles, aspects and compels

Six roles, six public aspects, eighteen coded compels. This is the identity system: a role gives you stats
and a **visible weakness**, and the table uses that weakness against you on purpose.

### C3.1 What a role is — and what it stopped being

A role is: `{ combat, intellect, maxIntegrity, startingGear[], aspect }`. Nothing else.

**Roles have no Move stat.** D5 originally gave each role a movement allowance (2–4); when the owner moved
movement to `1d6`, that allowance became redundant, and keeping it would have meant two movement systems
arguing. Movement is `1d6` for everyone. Recorded because the old text still implied otherwise.

Clearance also starts at **1 for every role**. Asymmetry has to come from stats, Integrity, gear and the
aspect — if one role started at Clearance 3 it would skip the access economy (§C1.4), which is the game's
pacing.

### C3.2 The roles

| Role | C | I | Int | Starting gear | Aspect |
| --- | --: | --: | --: | --- | --- |
| **MTF Field Agent** / *Agente de la FTM* | 4 | 2 | 7 | **Sidearm** — +1 on combat tests | Reckless |
| **Senior Researcher** / *Investigador Sénior* | 2 | 4 | 5 | **Clearance Badge** — +1 on gate tests | Curious |
| **D-Class Personnel** / *Personal de Clase D* | 3 | 2 | 6 | — (starts with nothing) | Nothing to Lose |
| **Containment Specialist** / *Especialista en Contención* | 2 | 4 | 7 | **Containment Kit** — +1 on anomaly tests | Methodical |
| **Medical Officer** / *Oficial Médico* | 2 | 3 | 6 | **Medkit** — +1 to healing | Sworn to Heal |
| **Ethics Aide** / *Auxiliar del Comité de Ética* | 2 | 4 | 5 | **Ethics Waiver** — refuse one compel free | By the Book |

Balance band: `combat + intellect` is 5–6 for every role, and Integrity 5–7. A role that leaves that band
fails the validator (§C3.5), because the draft only works if the options are genuinely comparable.

### C3.3 The compels

Every aspect carries **three** coded compels. All effects apply **to the target** and come from the closed
vocabulary in §S4, with one addition declared below.

| Aspect | # | Compel text (EN) | Condition | Effect (on target) |
| --- | --: | --- | --- | --- |
| **Reckless** | 1 | "There is a fight here, and you cannot walk past it." | a hunter or anomaly node within 2 edges | `forceMove(<that node>)` |
| | 2 | "You take the hard way." | about to test | `addTag(hardTest)` — next test is +1 difficulty |
| | 3 | "You go first." | a hunter shares your ring | `modifyIntegrity(-1)` + `grantFate(1)` |
| **Curious** | 1 | "You cannot leave a sealed file unopened." | you declined an anomaly this turn | `drawCard(anomaly, 1)` |
| | 2 | "You have to write it down." | you contained an anomaly this turn | `addTag(distracted)` — lose your action |
| | 3 | "You publish, immediately." | you hold ≥ 2 Records | `modifyRecords(1)` + `raiseThreat(1)` |
| **Nothing to Lose** | 1 | "You are the one who goes in first." | any ally is wounded | `forceMove(<wounded ally's node>)` |
| | 2 | "Nothing here is yours anyway." | you hold gear | `removeGear(1)` |
| | 3 | "Somebody has to be blamed." | threat ≥ 3 | `modifyRecords(-1)` + `raiseThreat(1)` |
| **Methodical** | 1 | "Finish the procedure before you move." | you started a containment this turn | `addTag(protocol)` — no move next turn |
| | 2 | "Check it twice." | at a marked node | `drawCard(escalation, 1)` |
| | 3 | "Sign the form." | you are at a checkpoint | `placeEvidence(intent: tookSample)` |
| **Sworn to Heal** | 1 | "Someone is bleeding." | any player is downed or below half Integrity | `forceMove(<that player's node>)` |
| | 2 | "You cannot leave them." | an ally is downed on your node | `addTag(bound)` — must end your turn here |
| | 3 | "You take their pain." | an adjacent ally is wounded | `modifyIntegrity(-2)` |
| **By the Book** | 1 | "Report it." | any player holds a `sealedGate` or `tamperedProtocol` token | `placeEvidence(intent: tamperedProtocol)` |
| | 2 | "You cannot take that." | you acquired gear this turn | `removeGear(1)` |
| | 3 | "Read them their rights." | you are the active seat | `addTag(held)` — lose your action |

Compel text is authored neutral Spanish in the content pass (B5) rather than translated, because every one
of these lines is ours, not the wiki's.

### C3.4 Two properties worth protecting

**Framing is legal, and it is the best thing in this chapter.** Note `By the Book` #1 and `Methodical` #3:
a player can compel someone to **place intent evidence under their own name**. Evidence is public and
permanent, so an innocent can be made to look guilty — and because the footprint check only reads a
player's *own* tokens, framing can never hand a saboteur someone else's victory. It only costs the innocent
their credibility. That is exactly the currency a deduction game runs on, and it is emergent from the
vocabulary rather than bolted on.

**Every aspect must have a cost, not just a lever.** The validator enforces this crudely but usefully: each
aspect's three compels must include at least one that **takes** something (`modifyIntegrity(-)`,
`removeGear`, `modifyRecords(-)`, `addTag(...)`), not only ones that give. An aspect that is pure upside is
not a weakness, it is a stat, and it would be drafted for the wrong reason.

### C3.5 Compel economy, restated once

Because this is the most-asked rule at a table:

1. Invoker spends **1 Fate** (always — this is what stops two friends farming each other).
2. Target chooses: **accept** → the effect happens and the target gains **2 Fate**; or **refuse** → the
   target spends **1 Fate** and nothing happens.
3. A target with **0 Fate cannot refuse**. That is the cornered state, and it is the drama.
4. **Once per turn**, on the compeller's own turn.
5. The compel's condition must hold right now, and the engine checks it — there is no "well, it sort of
   applies".

### C3.6 Validator additions for this chapter

| Check | Rule |
| --- | --- |
| Role balance band | `combat + intellect ∈ {5,6}`, `5 ≤ maxIntegrity ≤ 7` |
| Compel count | exactly 3 per aspect, at least 1 of them a cost (§C3.4) |
| Compel satisfiability | every condition references a signal the engine actually tracks, and at least one node or effect can make it true |
| Aspect uniqueness | no aspect appears on two roles; every role has exactly one |
| Gear validity | each starting gear item resolves to a real item definition and an effect in the closed set |

### C3.7 One vocabulary addition, declared

`forceMove(node)` — compels need to move a target, and nothing in §S4 could. Added deliberately, exactly as
`setRecords(n)` was in §C2.1: the closed set grows by design, never by a per-card exception.

```ts
// S4 delta
| `forceMove(node)` | moves the target one legal path step toward `node`; no gate check |
```

Note the "no gate check": a forced move must never be a way to smuggle someone past Clearance. That single
line keeps the access economy intact under compels.

---

## C4. Main directives (14)

Ten containment-aligned, four breach-aligned. These are **win conditions**, not rewards (§7c), so each one
is pure condition plus — for breach directives only — a footprint.

### C4.1 Schema

```ts
type MainDirective = {
  id: MainDirectiveId;
  name: Localized;
  text: Localized;                  // read only by its owner, until the reveal
  alignment: "containment" | "breach";
  condition: Condition;             // machine-checked at resolution
  publicFootprint: FootprintId[];   // required and non-empty for breach; empty for containment
};
```

**D18 applies only to breach directives.** A footprint exists so the table can *suspect* someone working
against them; a cooperative goal needs no evidence, and demanding one would turn every honest player into
a suspect for the wrong reason. The validator encodes exactly that asymmetry.

### C4.2 Containment-aligned (10) — win if the site is recontained **and** the condition holds

| # | ID | EN / ES | Condition | Play |
| --: | --- | --- | --- | --- |
| 1 | `m-custodian` | Protocol Custodian / *Custodio del Protocolo* | you completed the **final** protocol step | compete for the last step; the endgame becomes a queue |
| 2 | `m-nobody-left` | No One Left Behind / *Nadie se Queda Atrás* | every living player is inside the Command Center when it fires | forces rescue runs at the worst possible moment |
| 3 | `m-chain` | Chain of Custody / *Cadena de Custodia* | you hold `tag(sample)` at resolution | the sample is the object everyone argues about |
| 4 | `m-merit` | By Merit / *Por Mérito* | Clearance 4 and **zero** failed gate tests | the cautious route, and it is genuinely harder |
| 5 | `m-long-way` | The Long Way / *El Camino Largo* | you visited all three rings and end at the core | rewards depth without forcing the fast line |
| 6 | `m-auditor` | Auditor / *Auditor* | at least two **other** players hold `intent` evidence at resolution | you need others to look guilty — which means compelling them into it (§C3.4) |
| 7 | `m-quota` | Containment Quota / *Cuota de Contención* | you contained 5 anomalies | the honest grind; makes the outer ring worth its turns |
| 8 | `m-medic` | Field Medic / *Médico de Campo* | you performed 2 rescues | you win by keeping others alive, including your rival |
| 9 | `m-untouched` | Untouched / *Intacto* | you end at full Integrity | a playstyle, not a task: refuse every risk |
| 10 | `m-keter` | Keter Hunter / *Cazador de Keter* | you contained 2 Keter anomalies | the middle `cell` nodes become your route |
| 11 | `m-clean` | Clean Record / *Expediente Limpio* | you hold **zero** `accident` evidence | the cautious playstyle, and it fights the Fate economy: no risk means no agency |

Note how they pull in different directions: #7 and #10 want turns spent in the rings, #2 and #8 want turns
spent babysitting, #1 wants the last protocol step and therefore the *fewest* turns elsewhere. Two
containment players rarely want the same thing, which is what keeps an "allied" table from being a
cooperative cakewalk.

### C4.3 Breach-aligned (4) — win if the site is **not** recontained **and** the condition holds

| # | ID | EN / ES | Condition | Footprint (intent, §C2.3) |
| --: | --- | --- | --- | --- |
| 11 | `b-saboteur` | Saboteur / *Saboteador* | the warhead detonates | `tamperedProtocol` |
| 12 | `b-extraction` | Extraction / *Extracción* | the warhead detonates **and** you hold `tag(sample)` | `tookSample` |
| 13 | `b-denial` | Denial / *Negación* | the warhead detonates and you sealed 2 gates | `sealedGate` |


Each of the three wants a *different observable act*, which is what stops "breach" from being one
personality. A Saboteur lives in the core; an Extractor lives in the rings; a Denial player lives at the
gates.

**Why there are only three, and why there was nearly a fourth.** A fourth directive — *Abandonment*, won by
leaving people behind — was written and then removed, because the owner's objection was right: this game is
**not** a betrayal game. Working together is a tactic; going alone is a tactic; declining to rescue someone
is a legitimate tactical choice in a race, exactly as it is in Talisman. A rule that stamps evidence on
anyone who walks past a bleeding ally does not create suspicion, it creates an **obligation to help**, which
is a different game with a different mood.

So the principle is now explicit (D24): **only a directive makes someone an antagonist.** Ordinary
self-interest is invisible to the evidence system, which is what keeps the suspicion honest — when a token
appears, someone *chose* to make it appear.

`b-denial` also exposed a real gap: it declared `sealedGate` as its footprint and **no action could produce
one**. The board had a kind of evidence with no source. Fixed with a `sealGate` action (D25): one action at
a gate, that gate cannot be crossed for two rounds, and the actor places `sealedGate`. Defensive or
malicious, publicly identical — which is exactly the shape evidence should have.

### C4.4 The protocol track — the endgame the directives forced

`Protocol Custodian` cannot exist without an answer to "who fired it", and a saboteur's footprint needs
somewhere to be placed. Both questions resolve into one mechanic:

> **The recontainment protocol is a three-step track at the Command Center.**
> - **Advance** (one action, Intellect test at the ring's difficulty): `steps + 1`. At **3**, the site is
>   recontained and the game ends.
> - **Sabotage** (one action, no test): `steps − 1`, minimum 0, and the actor **places `tamperedProtocol`
>   evidence**.
> - The warhead countdown runs **concurrently**, once armed.

This is the best thing the content has produced so far, because it makes the last act of the game *play*
instead of arithmetic: three people are pushing a track up while one person on the same tile is quietly
pushing it down, everyone can see the number moving, and the only way to know who is doing it is to watch
who spends their actions at the core. No combat, no dice-off — a public contested counter with private
intent.

It also means the Command Center is not a finish line you cross, it is a **room you have to hold** while
the clock runs.

### C4.5 Two rules the deck forced

**Every evidence kind needs exactly one producing action, and that action must be a choice.** The rule that
came out of removing *Abandonment*: if a token can appear without a deliberate act, the evidence system is
lying about what it saw. Current ledger:

| Kind | Produced by | Choice? |
| --- | --- | --- |
| `tamperedProtocol` | `sabotageProtocol` | yes — one action spent pushing the counter down |
| `tookSample` | taking the sample / `Methodical` #3 / `By the Book` #1 | yes |
| `sealedGate` | `sealGate` | yes — one action, blocks a gate for two rounds |
| `uncontained`, `breachAlarm` | accident class | not evidence of intent by design |

**The state model needs counters.** `By Merit`, `Containment Quota`, `Keter Hunter` and `Field Medic` are all
"how many times did you do X". So `Player` gains:

```ts
counters: Record<CounterId, number>;   // containments, containmentsByTier, rescues, gateFailures,
                                      // sealedGates, protocolFinishers
```

That is a real structural finding, not a detail: writing win conditions revealed that the S1 state model
could not express half of them. Better to find it here than in M4.

### C4.6 Deck and safety valve

**12 unique mains** for the MVP (9 containment / 3 breach), one dealt per player at setup. At three players
the expected breach count is ~0.75, and a table with no saboteur at all is genuinely possible — which is
fine, because a table that *suspects* one behaves the same way. The MVP ships 9 of the 11 containment
directives listed above; `m-quota` and `m-long-way` are the two held back, as the least mechanically
distinct pair.

The D19 valve caps breach seats at ⌊n/2⌋, which at four players **allows 2** — a 2v2 table. That is a
deliberately different game (two teams with hidden membership), and whether it is fun is a *tuning*
question, not a rule: if the simulator shows 2-breach tables are degenerate, the valve tightens to 1. The
valve is in the reducer, so tightening it is a one-line change and a config value, not a redesign.

### C4.7 Conditions this chapter adds to §S4

`completedFinalProtocolStep` · `holdsTag(t)` · `visitedRings(n)` · `noGateFailures` · `othersWithIntentEvidence(n)` ·
`containments(n)` · `containmentsByTier(tier, n)` · `rescues(n)` · `fullIntegrity` · `sealedGates(n)` ·
`anySeatDowned` · `allLivingAtCore` · `terminalIs(state)` · `warheadArmed` · `protocolSteps(n)`.

Fifteen predicates, all reading tracked state. If one of them had needed a *new* tracked value, that would
have been a second structural finding; it did not, which is a good sign that the counters are the right
abstraction.

### C4.8 Validator additions

| Check | Rule |
| --- | --- |
| Footprint symmetry | breach directives have ≥ 1 `intent` kind; containment directives have **none** |
| Footprint satisfiability | every declared kind is placed by at least one effect in the closed set (§S8.3 check 7) |
| Condition satisfiability | every condition references a tracked signal; counters named exist in `CounterId` |
| Deck composition | exactly 9 containment / 3 breach in the MVP, ids unique |
| Valve reachability | `floor(n/2) < breachCountInDeck` for every supported `n`, so the valve is never asked to empty the deck |

---

## C5. Escalation (14) and equipment (10)

### C5.1 The escalation deck is the pressure model's teeth

The Threat Track (§7) says *the facility gets worse*. This deck is how. It is drawn in two situations, and
the same deck serves both because both are "the site is failing on you":

| Source | Trigger | Who it hits |
| --- | --- | --- |
| **Alarm node** | landing on one of the 3 `alarm` nodes | the drawer, by the card |
| **Stall Hazard** (D16) | you ended a turn with no progress attempt, three turns running | the drawer, by the card |

So each card declares **`target: "facility" | "drawer"`**, and that field is the whole reason one deck can
serve two masters: facility cards make the board worse for everyone, hazard cards make a specific person
pay. The stall rule punishes the individual; the alarm punishes the room.

**This is what makes D16 honest.** A stalled player is not fined — they are handed a card from the same deck
everyone else is drawing from, with the same distribution. The punishment is the *deck*, not a bespoke
penalty, so it can never feel arbitrary.

### C5.2 The 14 cards

| # | ID | EN / ES | Target | Effect |
| --: | --- | --- | --- | --- |
| 1 | `e-containment-failure` | Containment Failure / *Fallo de Contención* | facility | `raiseThreat(1)` |
| 2 | `e-alarm-cascade` | Alarm Cascade / *Cascada de Alarmas* | facility | `raiseThreat(1)` + `spawnHunter()` |
| 3 | `e-lockdown` | Lockdown / *Confinamiento* | facility | `lockGate(nearest gate, 2)` |
| 4 | `e-power-surge` | Power Surge / *Pico de Tensión* | facility | every player on a marked node: `modifyIntegrity(-1)` |
| 5 | `e-hunter-release` | Hunter Release / *Liberación* | facility | `spawnHunter()` at the inner ring |
| 6 | `e-assembly-1` | Emergency Assembly / *Asamblea de Emergencia* | facility | the vote, §C5.3 |
| 7 | `e-assembly-2` | Emergency Assembly / *Asamblea de Emergencia* | facility | the vote, §C5.3 |
| 8 | `h-collapse` | Structural Collapse / *Colapso Estructural* | drawer | `modifyIntegrity(-2)` |
| 9 | `h-gas` | Gas Leak / *Fuga de Gas* | drawer | `modifyIntegrity(-1)` + `forceMove(next node)` |
| 10 | `h-requisition` | Requisition Denied / *Requisa Denegada* | drawer | `removeGear(1)` |
| 11 | `h-blackout` | Comm Blackout / *Apagón de Comunicaciones* | drawer | `grantFate(-1)` |
| 12 | `h-exposure` | Exposure / *Exposición* | drawer | `raiseThreat(1)` + `placeEvidence(accident: breachAlarm)` |
| 13 | `h-panic` | Panic / *Pánico* | drawer | `addTag(bound)` — your turn ends here |
| 14 | `h-duty` | Containment Duty / *Deber de Contención* | drawer | `drawCard(anomaly, 1)` at this node |

Two of the fourteen are the **Emergency Assembly**, deliberately duplicates: it is the best stress test of
the political layer and 2-in-14 means a table sees it once or twice a game, not every round.

### C5.3 Emergency Assembly — the vote, specified

The one place the vote survives (§7b.4), and it votes on **allocation of loss**, never on who is punished:

1. The drawer calls it; the vote opens.
2. Every player casts `castVote` — **seal the bulkhead** or **hold it open**.
3. *Seal*: the gate nearest the drawer is locked for 2 rounds, and the track does **not** advance.
   *Hold*: the track advances **+2**.
4. **Tie advances the track** (+1), because a table that cannot decide deserves the worse outcome.

No one is named, no one is blamed, and yet somebody always loses — the people on the wrong side of that
gate. That is politics with teeth and without a popularity contest.

### C5.4 Equipment: three slots, two lifetimes

**Max 3 carried items.** Without a cap, the equipment deck is a second stat sheet and every decision about
what to take becomes "take everything". With a cap, `h-requisition` ("Requisition Denied") has teeth and the
`supply` node is a real choice.

Two lifetimes, declared per item:

- **`permanent`** — the item is a standing modifier (a tag the test formula reads).
- **`consumed`** — one use, then discarded.

### C5.5 The 10 items

| # | ID | EN / ES | Lifetime | Effect |
| --: | --- | --- | --- | --- |
| 1 | `i-telekill` | Telekill Alloy / *Aleación Antitelequinesia* | permanent | +1 on anomaly tests |
| 2 | `i-vest` | Reinforced Vest / *Chaleco Reforzado* | permanent | `modifyMaxIntegrity(1)` (and heal 1) |
| 3 | `i-dosimeter` | Dosimeter / *Dosímetro* | permanent | +1 on gate tests |
| 4 | `i-radio` | Field Radio / *Radio de Campo* | permanent | you may rescue a downed ally on an **adjacent** node |
| 5 | `i-idol` | Anomalous Idol / *Ídolo Anómalo* | permanent | +1 Record per containment, **but** you always hold 1 `accident` evidence |
| 6 | `i-key` | Skeleton Key / *Llave Maestra* | consumed | cross one gate with no check |
| 7 | `i-cola` | Cola / *Refresco* | consumed | +2 movement this turn |
| 8 | `i-cap` | Cap of Neglect / *Gorro de la Desatención* | consumed | hunters ignore you this round |
| 9 | `i-medkit` | Field Medkit / *Botiquín de Campaña* | consumed | `modifyIntegrity(2)` |
| 10 | `i-charge` | Breaching Charge / *Carga de Ruptura* | consumed | `lockGate(gate, 0)` — opens a sealed gate |

**`i-idol` is the important card.** It is power with a permanent stain: one extra Record every time you
contain something, and you can **never** satisfy `m-clean` ("Clean Record", zero accident evidence). A
player who takes it is choosing a playstyle and revealing it to anyone paying attention — which is the
Fate economy's logic applied to gear.

Four of the ten are canon (Telekill, Cola, Skeleton Key, Cap of Neglect) and join the attribution debt from
§C2.6. The other six are ours.

### C5.6 Vocabulary additions this chapter needs

| Addition | Why it could not be avoided |
| --- | --- |
| `modifyMaxIntegrity(n)` | the vest is a standing modifier; `modifyIntegrity` cannot express a ceiling |
| `lockGate(gateId, rounds)` | Lockdown, Breaching Charge and `sealGate` are all the same primitive with different durations; `rounds: 0` means "open" |
| `lockGate(nearest, n)` targeting | one escalation card needs a *nearest* resolver; it is a resolver, not a new effect |

Three additions, all declared. The alternative — special-casing each card — is what §C2.1 forbids.

### C5.7 Validator additions

| Check | Rule |
| --- | --- |
| Deck sufficiency | escalation ≥ 14 at 3 players (draw rate ~12/game); equipment ≥ 10 |
| Target class | every escalation card declares `facility` or `drawer`; at least 40% of each |
| Vote cards | exactly 2 `e-assembly-*` in the deck |
| Slot cap | no item grants another slot; the 3-slot cap is a rule, not content |
| Consumed vs permanent | every item declares one, and consumed items must have `uses: 1` |
| Duplicate canon | an item adapted from an entry already used as an anomaly must be the same object, not a second card |

---

## 15. Log (append-only)

| Date | Entry |
| --- | --- |
| 2026-11-18 | Charter received; converted to `idea.md` (verbatim) and `idea.txt` removed. First draft of this RFC: architecture bet, stack, repo shape, derived board, `4dF` math, hidden information, bilingual split, IP obligations, match configuration. |
| 2026-11-18 | **D1** (win axis): *"Descend + pursuit pressure."* The descent stays; the escape feeling becomes a pressure curve. **D8** (IP): *"CC BY-SA derivative"* — real SCP content, game under CC BY-SA 3.0. **D10/D12** (session shape): *"let's keep it conservative up to 4. later I'd like to be expandable to 6, single mode, and modes that can speedup things."* → engine parametric in N, `MatchConfig` from day one. **D11**: *"Pass-and-play only in v1."* |
| 2026-11-18 | **D13** (pressure): owner's words — *"each time something happens or not happens then something is getting closer to kill them or so. maybe if in 3 rounds no one try to get towards the main activity they got a penalty revealing a card that might let something bad happen."* Recorded as a stagnation-driven Threat Track + hunters (§7). Writing it surfaced the free-rider flaw → design Q1. |
| 2026-11-18 | **D5 corrected by the owner.** I had proposed removing dice from movement; owner: *"the fudge dice of fate are only for battle or achievements. for movements are d6."* Movement is `1d6`, `4dF` only for tests. Three consequences recorded (§4.1): movement variance returns, direction-choice needs a rule, lap length ~9 turns. |
| 2026-11-18 | **B9/D8b agreed: open source.** This deletes the monetisation question entirely and dissolves the main cost of CC BY-SA. **D14 proposed**: code under MIT, content under CC BY-SA 3.0, so a fork can reuse the engine without inheriting SCP text. |
| 2026-11-18 | **Process correction by the owner:** *"you jump from business to technically. could we end business first?"* Document restructured into three ordered phases (Business → Game Design → Engineering) with per-phase registers and a hard rule that a phase is not crossed while it has open items. Part III parked. |
| 2026-11-18 | **B2 agreed — shared win at the centre.** Owner: *"since it has political social aspect, where you can ally and betray. then make sense that more than one can win. so can be coop, battle Royale. but 1 for now is a good start."* Recorded in §2.1 with four structural consequences: the endgame becomes a negotiation; betrayal gains a credible mechanism; no loser ranking in v1; `VictoryPreset` becomes a config field so co-op and battle-royale are later variants, not redesigns. Also recorded the Stage 2 constraint this creates: secret missions must make a shared win a *worse* outcome for a player with a private agenda. |
| 2026-11-18 | **Owner attacked the anti-camping design and was right.** *"none of your approaches feels complete … a player that had a bad roll die will have same punish as the camper."* Correct, and it invalidated all three fixes. **D16**: the counter measures *attempts*, not outcomes — a failed test is already paid for, a camper produces zero attempts. Inaction becomes an escalating cost, not a fine. |
| 2026-11-18 | **Owner proposed the aspect/compel system** (§7b), including the *"kid calling for help"* cross-player example, plus a vote-to-punish, a risk-reward incentive, and forced-risk rules. Analysis recorded: the vote is thematically perfect but mechanically wrong as an engine (punishes the leader → longer games; degenerate at 2 players; dogpiles the quiet player) and survives as the *Emergency Assembly* escalation card that votes on allocation of loss. The incentive problem is solved by the **Fate economy: earned by risk, spent for agency** — which also resolves the movement-re-roll problem (Q4). Hard constraint discovered: **software has no GM**, so aspects must carry enumerated coded compels, not prose. |
| 2026-11-18 | **D15 accepted as the identity of v1.** Owner: *"yes lets do fate as an identity, public. all aspects are public, so all cna see it and invoke them. what is hidden is the quests or side quests maybe."* Aspects are all public (a compel you cannot see is a gotcha), and the deduction layer relocates to hidden directives. Consequence recorded: the handoff screen is now required in v1 and `project()` becomes load-bearing immediately. |
| 2026-11-18 | **D17 reshaped by the owner: mains are win conditions.** Owner: *"aspects public, directives private always. one at the setup, can gain more on special places from a special pile/deck, there shoudl be 2 kind of directives, main, that are win con, and side, that just give you rewards."* This reverses my staging argument (I had argued mains must not be alternate victories or v1 would become the traitor game I wanted to keep for Stage 2). The owner's split is better: **v1 owns hidden *agendas*, Stage 2 owns hidden *identities*.** Consequences written into §7c: the victory-resolution matrix; B2 amended so the shared win applies only to containment-aligned players; D18 (antagonistic directives must leave a **public footprint**, enforced by the reducer — hidden motive, visible evidence, or deduction is a coin flip); D19 (safety valve: breach seats never exceed ⌊n/2⌋). The D13 warhead and the alternate victory turned out to be the same object: arming the countdown *is* the breach faction's win window. Honest scope delta recorded: +25–30%. |
| 2026-11-18 | **Design register closed.** Owner: *"all you asumtions are correct"* — D16, D18, D19 ratified; **D20** added (breach-aligned players do not know each other at setup, because a private coordination channel is precisely the zero-footprint coordination D18 forbids). All remaining design questions ratified as decisions in §10.1; the four numbers (cost ladder, board/deck sizes, Fate generosity, main-deck mix) reclassified as **tuning parameters** owned by the simulator and stored as content data, not code. §2.0 added: M0–M3 depend on none of the open business items, so engineering may start in parallel if the owner prefers. |
| 2026-11-18 | **B1 agreed — audience is the board-game-curious**, with the operative rule *"when a design choice is ambiguous, choose learnability"* (§2.2). Four consequences recorded: onboarding is a feature; compels must be taught explicitly (most web players have never met a FATE aspect); card text is explanatory, not literary; the difficulty band assumes no genre literacy. |
| 2026-11-18 | **B4 agreed — canon-first, adapted, originals last.** Owner: *"reuse whatever fits from cannon, later on in further iterations we can get more by addapting others, and lastly we can start creating original ones."* §2.3 turns *"whatever fits"* into a six-point fit test (public footprint, expressible in the effect vocabulary, tierable, survives both locales, attributed, no required prior lore) plus the hard rule **no card introduces a new mechanic** — enforced by a closed effect vocabulary that Zod rejects. |
| 2026-11-18 | **B5 agreed — adapt the ES branch, author the rest.** §2.4: three sources of Spanish text (branch adaptation / authored neutral / authored UI chrome); variant fixed as **neutral Spanish with inherited Iberian flavour on canon cards**; attribution schema gains a **translator** field (CC BY-SA credits the translator); a **shared glossary becomes a build artifact** with CI-rejected synonyms, because three sources of Spanish produce three vocabularies within a week; branch licensing pages to be verified in the M4 checklist. |
| 2026-11-18 | **Business closed.** B3 agreed — the title contains **"SCP"** (working *SCP: Protocol Breach*); the reasoning changed from my earlier caution because B9 removed the commercial exposure. D14 agreed — code **MIT**, content **CC BY-SA 3.0**. B6 deferred to M6 with a recorded leaning: **GitHub Pages is free for public repos**, with two caveats (`404.html` SPA fallback, ~1 GB). |
| 2026-11-18 | **Death system designed (Q22-Q25).** Owner: *"you loose all but the experience, like the stats you earned. but loose equipment, quests etc. you get a new character, but also a bit of a) so you can skipp turns until you get recued if you like so."* → 0 Integrity is **downed at the node**: each of your turns choose **wait** (an ally's `rescue` returns you with gear intact at 1 Integrity) or **respawn** as a new character (stats kept; gear, clearance and directives lost; a new Main Directive dealt). Downed seats are excluded from the stall check. Three consequences recorded in §S2: respawn needs a **spare character identity** (Q26), a new Main Directive must re-run the **D19 safety valve**, and the endgame reveal must show the previous directive too. Also settled: Q23 stop-early costs 1 Fate; Q24 terminal draw replaces the encounter; Q25 Fate above the cap is lost. D2 confirmed with **pnpm**. |
| 2026-11-18 | **Q26-Q28 settled: character draft replaces assignment.** Owner: *"ideally you will start with 2-3 random possible characters. you pick one. when you die same action, you get 2-3 and choose. for this iteration you can choose 1 from pool since we have limited chars probably."* Recorded as `draftOptions = min(3, floor(availableRoles / players))`, used at **both** setup and respawn; a dead character's role retires for the match. This also fixes the fairness problem of assigning asymmetric roles, and it needs no new engine surface — it reuses the same `choose()` a downed player already uses. `draftOptions` is frozen into `MatchConfig` rather than recomputed, so a later content release cannot change how an old save or replay resolves. Q27: a dead player's Main Directive is **declassified** (the one exception to "only at the end"). Q28: waiting downed costs only lost turns; hunters ignore downed players. |
| 2026-11-18 | **Q29: v1 ships 6 roles.** `draftOptions` then lands on 3 / 2 / 1 options at 2 / 3 / 4 players, and a death at four players always offers 2 — the same experience as setup, with no special case. |
| 2026-11-18 | **S7 written — screens and the privacy model.** Key calls: **no router** (screen state in the store), which also removes the GitHub Pages `404.html` caveat from B6; two privacy mechanisms instead of a per-turn handoff — a **full handoff screen on acquisition** (setup, main directive, side draw, respawn) and a **hold-to-reveal `privatePanel` with a seat claim** for consulting later, plus a `strictMode` flag that escalates to forced handoff and per-seat PIN on the same code path. The `table` screen never renders a hidden value: private UI is a separate subtree fed by `project(state, claimedSeat)`, so a layout bug cannot leak content. Endgame is a five-step **reveal sequence** ending in a grid and a "reel" of the decisive log events — it explains, it does not judge. Keyboard navigation maps onto the board graph (left/right along a ring, up/down through a gate), which is the second payoff of the derived board. |
| 2026-11-18 | **S8 written — content layout and validators.** One file per deck (not per card): searchable, diffable, no import ceremony, and the trade only inverts past ~100 entries per deck. `attribution` is **required on every content object** with `license: "original"` as a value rather than an absence, so "nobody filled this in" and "we wrote it" are distinguishable and the credits screen is generated, not hand-maintained. The validator is a build gate with 11 checks; the interesting ones encode *game* rules as build-time assertions — **board graph integrity**, **footprint satisfiability** (a breach directive naming evidence no effect can place), **role invariants**, and **deck sufficiency** (≥ expected draws × 1.2). Balance is explicitly *not* validated: that is the simulator's job, and a validator that guesses at balance is one people disable. |
| 2026-11-18 | **S9 written — the specification is closed.** The simulator owns the four tuning parameters. Bots are `cautious` / `aggressive` / `saboteur` and **never read hidden information** — they consume `project(state, seat)` like a player, which makes the harness a second, stronger privacy test. 13 metrics across pacing, outcome, fairness, pressure, economy, death, content, board and legibility. Six acceptance thresholds written down (median 12–18 rounds; every role 20–40% win; breach-achievable ≥ 80%; ≥ 1 compel per player per 3 rounds; ≤ 1.5 deaths per game; no deck exhausted in the median game) — **thresholds, not targets**, and a miss is recorded in the log rather than rounded off. Two artifacts per run (`.json` diffable, `.md` generated with PASS/FAIL) and the markdown is committed with every balance change, so each tuning decision carries its evidence. |
| 2026-11-18 | **Owner: the document must be visible as a live doc.** Added a **Contents** index at the top (the file is >1 400 lines and had no navigation, which is why it read as if nothing had been captured), plus a one-line "where things stand" state. Nothing was missing from the body: every decision, its reasoning and the owner's verbatim words were already recorded per exchange in §15. |
| 2026-11-18 | **C1 written — the board.** 12 / 10 / 8 + core = 31 nodes, 8 node kinds with defined mechanics, 6 gate edges (2 per boundary, antipodal, angles declared so the renderer draws them radially), and the **access economy**: clearance costs 3 / 4 / 5 Records, anomalies yield 1 / 2 / 3. The pacing claim recorded explicitly — **the board is short and the clearance economy is long**, because the Command Center is ~7 movement steps from the arrival node, so the 12–18 rounds must come from permission rather than distance. Six board invariants added, including "the arrival node is ≥ 3 steps from every gate" and "every gate has a test fallback so no player is ever permanently stuck". |
| 2026-11-18 | **C2 written — the anomaly deck (20 canon-adapted cards).** Three tier piles (6 Safe / 8 Euclid / 6 Keter) rather than one filtered deck, because filtering breaks when a tier runs dry. Containment reuses the §5 tier table unchanged, so each card only declares difficulty plus four outcome payloads — twenty canon entries, zero new rules. **`mayLeave` on every card** makes declining a real choice, which is what lets D16 count attempts honestly. **D21 discovered and recorded:** evidence needed two classes, `accident` (anomaly breaches, failed gates) and `intent` (directive acts), because otherwise a saboteur wins on a neighbour's bad roll — the exact laundering D18 was written to prevent. Five famous entries recorded as **rejected** by the fit test (055, 2521, 2317, 2006, 5000) with reasons, which is the filter proving itself. `setRecords(n)` added to the §S4 vocabulary deliberately rather than special-cased, with the rule recorded: the closed set grows by design, never by exception. Attribution recorded as tracked **verification debt** that the validator turns into a build failure. |
| 2026-11-18 | **C3 written — 6 roles, 6 aspects, 18 compels.** Corrected a leftover from D5: **roles have no Move stat**, because the owner's `1d6` made the original movement allowance redundant and keeping it would mean two movement systems arguing. Clearance starts at **1 for everyone**, or one role would skip the access economy that provides the game's pacing. Balance band `combat + intellect ∈ {5,6}` and Integrity 5–7, validator-enforced, because the draft only works if the options are genuinely comparable. **Framing recorded as legal and deliberate**: `By the Book` #1 and `Methodical` #3 let a player compel someone to place intent evidence under *their own* name — public, permanent, and unable to gift a saboteur a victory because the footprint check only reads a player's own tokens. It only costs the innocent their credibility. Rule added: **every aspect must carry at least one compel that takes something**, or it is a stat rather than a weakness. One vocabulary addition, `forceMove(node)`, with the line that keeps it safe: a forced move never performs a gate check, so compels cannot smuggle anyone past Clearance. |
| 2026-11-18 | **C4 written — the 14 main directives, and the two mechanics they forced.** Ten containment / four breach. Containment directives carry **no** footprint (D18 is about suspicion; demanding evidence from honest players turns everyone into a suspect for the wrong reason) and the validator encodes that asymmetry. The four breach directives each demand a *different observable act* — Saboteur holds the core, Extractor wants the sample, Denial wants the gates, Abandonment wants someone bleeding — so "breach" is not one personality. **D22**: `Protocol Custodian` and a saboteur footprint cannot both exist without an answer to "who fired it", which produced the **three-step contested protocol track** — the last act becomes play (a public counter pushed up by three people and quietly down by one) instead of arithmetic. **D23**: `abandonedAlly` is placed when a player **moves away from a node holding a downed ally**, which loads the rescue mechanic politically. **Structural finding:** the win conditions could not be expressed in the S1 state model, so `Player` gained `counters` — found here instead of in M4. |
| 2026-11-18 | **C5 written — escalation (14) and equipment (10).** One escalation deck serving two masters via a `target: facility | drawer` field: alarm nodes make the room worse, stall hazards make one person pay. **That is what makes D16 honest** — a stalled player is not fined, they draw from the same deck everyone else draws from, so the punishment can never feel arbitrary. Emergency Assembly specified as the vote on **allocation of loss** (seal a gate / hold it open; ties advance the track). Equipment capped at **3 carried slots**, because without a cap the deck becomes a second stat sheet and `h-requisition` has no teeth. `i-idol` recorded as the important card: +1 Record per containment and a **permanent accident token**, so it can never satisfy `m-clean` — power with a stain, and a playstyle revealed to anyone paying attention. Three vocabulary additions declared (`modifyMaxIntegrity`, `lockGate(gateId, rounds)`, and a *nearest* resolver), not four special cases. |
| 2026-11-18 | **MVP narrowed to 2–3 players.** Owner: *"as an MVP Ill like to be considered 3 players only max, that will allow us to have lees cards to create."* B7/D10 amended. **Honest correction recorded:** the card saving is ~5–10%, not 25%, because deck size follows draws-per-game and a 3-player game lasts more rounds. The real savings are structural — one fewer seat in the UI, shorter games, `floor(3/2)=1` so **at most one saboteur**, and a **better draft** (2 options each instead of 1). **6 roles is retained** because it is the minimum that yields a 2-option draft at three players. Budget set at **54 cards** (18 anomalies / 12 mains / 14 escalation / 10 equipment) — and escalation went *up*, because 3 of 31 nodes are alarms and stall hazards add draws on top, so a 10-card deck would exhaust in the median game. |
| 2026-11-18 | **Q2 rejected — D23 superseded.** Owner: *"that will means that its a full cooperative… for tactic reasons you might not want to help the other player… working as coop is ok, but as single player is ok too. and not same as betrayal."* Correct. Stamping evidence on anyone who walks past a bleeding ally does not create suspicion, it creates an **obligation to help** — a different game with a different mood. **D24** recorded as a principle: selfishness is legal and unremarkable, and **only a directive makes someone an antagonist**. Consequences (D25): `abandonedAlly` removed from the vocabulary, breach deck drops to **3**, and a fourth containment directive — `m-clean` "Clean Record" (zero accident evidence) — takes its place. Writing that removal also surfaced that `b-denial` declared a `sealedGate` footprint **that no action could produce**; added `sealGate` (one action, blocks a gate two rounds, places the token). New rule: **every evidence kind must have exactly one producing action, and that action must be a choice.** |
| 2026-11-18 | **MVP cut defined (§14b).** Owner: *"I mean im looking for an MVP and build on top."* Rule adopted: **an MVP removes breadth, never risk.** MVP keeps board, 6 roles + compels, 20 anomalies, 14 mains + protocol track, 10 escalation, 12 equipment (56 cards). Defers side directives (terminal draws equipment), facility events, allies + `recruit` node, strict privacy mode, 5–6 players. Two guard rules: every deferral is a **config value, not a code branch**, and every temporary substitution is logged as **debt** with the node kind it affects — a node kind that silently does nothing is how MVP shortcuts become shipped bugs. |
| 2026-11-18 | **Owner: design before code.** *"I'd like to pause and refine all the implementation… start but not implementing, start design."* Opened **Part IV — Implementation design** and wrote its spine: **S1** state model (`GameState`/`Player`/`Outcome`, no derived data, log-as-state), **S2** turn and round loop with explicit ordering rules (hunters after all players; arming does not tick the warhead; 0 Integrity is *contained*, not eliminated), **S3** action vocabulary including the single off-turn action `respondCompel`, **S4** the closed effect/condition vocabulary that enforces B4's "no new mechanics" rule, **S5** projection table plus a *generated* privacy test, **S6** evidence tokens — "evidence shows an act, never an intent". S7–S9 queued. |
