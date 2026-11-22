# Simulator report

Command: `pnpm sim --games 20 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40`
Tuning fingerprint: `cfg 0a2eeb10` · 80 games · cap 40 rounds

| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 20 | 0% | 100% | 0% | 12 | 12 | 19 | 100% | 75% | 1.3 | 3.9 | 0% | 1.85 | 8.7 |
| 2 | aggressive | 20 | 0% | 100% | 0% | 12 | 12 | 18 | 95% | 65% | 0 | 0 | 0% | 1.05 | 5.9 |
| 3 | cautious | 20 | 0% | 100% | 0% | 11 | 11 | 16 | 100% | 70% | 1.75 | 5.25 | 0% | 2.1 | 11.5 |
| 3 | aggressive | 20 | 0% | 100% | 0% | 12 | 12 | 20 | 100% | 85% | 0 | 0 | 0% | 2.9 | 9.05 |

## The political layer

| Players | Policy | Containment win | Breach win | Breach achievable | Compels / game | Votes / game | Hazards / game | Declines / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 41% | 63% | 63% | 8.55 | 1.9 | 0.75 | 0 |
| 2 | aggressive | 40% | 70% | 40% | 13.75 | 1.65 | 0.4 | 0 |
| 3 | cautious | 31% | 50% | 50% | 13.85 | 1.95 | 1.2 | 0 |
| 3 | aggressive | 28% | 56% | 56% | 23.85 | 1.8 | 0.95 | 0 |

## Thresholds (§S9.4)

| Threshold | Target | Measured | Verdict |
| --- | --- | ---: | --- |
| `median-rounds` | 12–18 | 11 | **FAIL** |
| `compels-per-player-per-3-rounds` | >= 1 | 1.72 | **PASS** |
| `deaths-per-game` | <= 1.5 | 2.90 | **FAIL** |
| `breach-achievable` | >= 0.80 | 0.40 | **FAIL** |
| `role-win-spread` | every role 0.20–0.40 | 0.30–0.67 | **FAIL** |
| `deck-exhaustion` | no pile exhausted | not observable | **N/A** |

## Not measured yet

| Metric | Waiting on |
| --- | --- |
| `deckExhaustion` | not observable by design — D27 draws never deplete a pile |
| `sideDirectives` | cut from the MVP (§14b) |
| `compelsByPolicyPair` | needs a per-pair matrix, not a per-table aggregate |
