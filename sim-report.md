# Simulator report

Command: `pnpm sim --games 20 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40`
Tuning fingerprint: `cfg 473818d8` · 80 games · cap 40 rounds

| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 20 | 100% | 0% | 0% | 0 | 4 | 10 | 95% | 0% | 0.45 | 1.45 | 0% | 0.3 | 3.6 |
| 2 | aggressive | 20 | 75% | 0% | 25% | 7 | 5 | 8 | 75% | 40% | 0 | 0 | 0% | 0.1 | 2.5 |
| 3 | cautious | 20 | 100% | 0% | 0% | 0 | 3 | 5 | 75% | 0% | 0.05 | 0.15 | 0% | 0.05 | 3.2 |
| 3 | aggressive | 20 | 90% | 0% | 10% | 3 | 2 | 3 | 35% | 10% | 0 | 0 | 0% | 0.1 | 1.9 |

## The political layer

| Players | Policy | Containment win | Breach win | Breach achievable | Compels / game | Votes / game | Hazards / game | Declines / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 0% | 0% | 0% | 1.25 | 0.55 | 0.2 | 0 |
| 2 | aggressive | 0% | 0% | 0% | 1.45 | 0.15 | 0.05 | 0 |
| 3 | cautious | 0% | 0% | 0% | 2 | 0.3 | 0.25 | 0 |
| 3 | aggressive | 2% | 0% | 0% | 1.75 | 0 | 0 | 0 |

## Thresholds (§S9.4)

| Threshold | Target | Measured | Verdict |
| --- | --- | ---: | --- |
| `median-rounds` | 12–18 | 3 | **FAIL** |
| `compels-per-player-per-3-rounds` | >= 1 | 0.43 | **FAIL** |
| `deaths-per-game` | <= 1.5 | 0.30 | **PASS** |
| `breach-achievable` | >= 0.80 | 0.00 | **FAIL** |
| `role-win-spread` | every role 0.20–0.40 | 0.00–0.00 | **FAIL** |
| `deck-exhaustion` | no pile exhausted | not observable | **N/A** |

## Not measured yet

| Metric | Waiting on |
| --- | --- |
| `deckExhaustion` | not observable by design — D27 draws never deplete a pile |
| `sideDirectives` | cut from the MVP (§14b) |
| `compelsByPolicyPair` | needs a per-pair matrix, not a per-table aggregate |
