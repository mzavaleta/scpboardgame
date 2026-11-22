# Simulator report

Command: `pnpm sim --games 20 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40`
Tuning fingerprint: `cfg 116d3b19` · 80 games · cap 40 rounds

| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 20 | 0% | 100% | 0% | 8 | 8 | 11 | 100% | 0% | 0.75 | 2.45 | 0% | 1.35 | 7.15 |
| 2 | aggressive | 20 | 0% | 100% | 0% | 10 | 10 | 16 | 95% | 55% | 0 | 0 | 0% | 1.15 | 5.1 |
| 3 | cautious | 20 | 0% | 100% | 0% | 8 | 8 | 10 | 100% | 0% | 1 | 3.2 | 0% | 1.35 | 9.75 |
| 3 | aggressive | 20 | 0% | 100% | 0% | 10 | 10 | 14 | 95% | 80% | 0 | 0 | 0% | 2.6 | 7.4 |

## The political layer

| Players | Policy | Containment win | Breach win | Breach achievable | Compels / game | Votes / game | Hazards / game | Declines / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 10% | 67% | 67% | 5.7 | 1.5 | 0.6 | 0 |
| 2 | aggressive | 19% | 63% | 75% | 10.4 | 0.85 | 0.45 | 0 |
| 3 | cautious | 10% | 50% | 63% | 10.65 | 1.25 | 0.65 | 0 |
| 3 | aggressive | 15% | 33% | 58% | 20.55 | 1.05 | 1 | 0 |

## Thresholds (§S9.4)

| Threshold | Target | Measured | Verdict |
| --- | --- | ---: | --- |
| `median-rounds` | 12–18 | 8 | **FAIL** |
| `compels-per-player-per-3-rounds` | >= 1 | 1.56 | **PASS** |
| `deaths-per-game` | <= 1.5 | 2.60 | **FAIL** |
| `breach-achievable` | >= 0.80 | 0.75 | **FAIL** |
| `role-win-spread` | every role 0.20–0.40 | 0.22–0.50 | **FAIL** |
| `deck-exhaustion` | no pile exhausted | not observable | **N/A** |

## Not measured yet

| Metric | Waiting on |
| --- | --- |
| `deckExhaustion` | not observable by design — D27 draws never deplete a pile |
| `sideDirectives` | cut from the MVP (§14b) |
| `compelsByPolicyPair` | needs a per-pair matrix, not a per-table aggregate |
