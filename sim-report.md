# Simulator report

Command: `pnpm sim --games 20 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40`
Tuning fingerprint: `cfg eb81810c` · 80 games · cap 40 rounds

| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 20 | 0% | 100% | 0% | 12 | 12 | 18 | 100% | 70% | 1.15 | 3.45 | 0% | 1.45 | 7.4 |
| 2 | aggressive | 20 | 0% | 100% | 0% | 13 | 13 | 20 | 100% | 70% | 0 | 0 | 0% | 1.8 | 6.45 |
| 3 | cautious | 20 | 0% | 100% | 0% | 11 | 11 | 16 | 100% | 70% | 1.45 | 4.35 | 0% | 2.35 | 11.25 |
| 3 | aggressive | 20 | 0% | 100% | 0% | 13 | 13 | 17 | 100% | 100% | 0 | 0 | 0% | 3.35 | 9.3 |

## The political layer

| Players | Policy | Containment win | Breach win | Breach achievable | Compels / game | Votes / game | Hazards / game | Declines / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 43% | 70% | 90% | 7.8 | 1.55 | 1 | 0 |
| 2 | aggressive | 50% | 70% | 70% | 13.3 | 1.65 | 0.55 | 0 |
| 3 | cautious | 23% | 29% | 57% | 14.8 | 1.65 | 1.25 | 0 |
| 3 | aggressive | 30% | 62% | 62% | 25.5 | 1.4 | 1.25 | 0 |

## Thresholds (§S9.4)

| Threshold | Target | Measured | Verdict |
| --- | --- | ---: | --- |
| `median-rounds` | 12–18 | 11 | **FAIL** |
| `compels-per-player-per-3-rounds` | >= 1 | 1.53 | **PASS** |
| `deaths-per-game` | <= 1.5 | 3.35 | **FAIL** |
| `breach-achievable` | >= 0.80 | 0.70 | **FAIL** |
| `role-win-spread` | every role 0.20–0.40 | 0.33–0.73 | **FAIL** |
| `deck-exhaustion` | no pile exhausted | not observable | **N/A** |

## Not measured yet

| Metric | Waiting on |
| --- | --- |
| `deckExhaustion` | not observable by design — D27 draws never deplete a pile |
| `sideDirectives` | cut from the MVP (§14b) |
| `compelsByPolicyPair` | needs a per-pair matrix, not a per-table aggregate |
