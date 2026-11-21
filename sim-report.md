# Simulator report

Command: `pnpm sim --games 200 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40`
Tuning fingerprint: `cfg fe9f0b8a` · 800 games · cap 40 rounds

| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 200 | 44% | 56% | 1% | 14 | 14 | 19 | 13% | 1% | 0.805 | 2.62 | 43% | 0.18 | 12.18 |
| 2 | aggressive | 200 | 82% | 1% | 17% | 6 | 7 | 14 | 87% | 26% | 0 | 0 | 59% | 0.105 | 2.515 |
| 3 | cautious | 200 | 80% | 20% | 1% | 14 | 14 | 20 | 26% | 1% | 1.35 | 4.395 | 56% | 0.295 | 17.975 |
| 3 | aggressive | 200 | 75% | 0% | 25% | 4 | 4 | 8 | 75% | 28% | 0 | 0 | 45% | 0.045 | 2.565 |

## The political layer

| Players | Policy | Containment win | Breach win | Breach achievable | Compels / game | Votes / game | Hazards / game | Declines / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 0% | 17% | 40% | 0.375 | 1.17 | 1.89 | 0 |
| 2 | aggressive | 3% | 0% | 0% | 1.445 | 0.54 | 0.1 | 0 |
| 3 | cautious | 0% | 8% | 9% | 0.86 | 1.48 | 2.885 | 0 |
| 3 | aggressive | 2% | 0% | 0% | 2.065 | 0.255 | 0.085 | 0 |

## Thresholds (§S9.4)

| Threshold | Target | Measured | Verdict |
| --- | --- | ---: | --- |
| `median-rounds` | 12–18 | 4 | **FAIL** |
| `compels-per-player-per-3-rounds` | >= 1 | 0.31 | **FAIL** |
| `deaths-per-game` | <= 1.5 | 0.29 | **PASS** |
| `breach-achievable` | >= 0.80 | 0.00 | **FAIL** |
| `role-win-spread` | every role 0.20–0.40 | 0.00–0.06 | **FAIL** |
| `deck-exhaustion` | no pile exhausted | not observable | **N/A** |

## Not measured yet

| Metric | Waiting on |
| --- | --- |
| `deckExhaustion` | not observable by design — D27 draws never deplete a pile |
| `sideDirectives` | cut from the MVP (§14b) |
| `compelsByPolicyPair` | needs a per-pair matrix, not a per-table aggregate |
