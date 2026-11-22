# Simulator report

Command: `pnpm sim --games 20 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40`
Tuning fingerprint: `cfg 0a2eeb10` · 80 games · cap 40 rounds

| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 20 | 0% | 100% | 0% | 12 | 12 | 19 | 100% | 70% | 1.65 | 4.95 | 0% | 2.05 | 8.6 |
| 2 | aggressive | 20 | 0% | 100% | 0% | 12 | 12 | 18 | 95% | 65% | 0 | 0 | 0% | 1.05 | 5.85 |
| 3 | cautious | 20 | 0% | 100% | 0% | 11 | 11 | 16 | 100% | 65% | 2.25 | 6.75 | 0% | 2.35 | 11.15 |
| 3 | aggressive | 20 | 0% | 100% | 0% | 12 | 12 | 19 | 100% | 90% | 0 | 0 | 0% | 3.05 | 8.8 |

> `Recontained` is no longer produced (L15): the site is always lost and the escape is the ending. The two
> win columns count seats whose own directive was met, by the directive's flavor — not a side.

## The political layer

| Players | Policy | Win: containment directive | Win: breach directive | Breach achievable | Compels / game | Votes / game | Hazards / game | Declines / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 33% | 60% | 60% | 7.95 | 1.8 | 0.85 | 0 |
| 2 | aggressive | 37% | 60% | 30% | 13.85 | 1.65 | 0.45 | 0 |
| 3 | cautious | 27% | 50% | 50% | 13.2 | 1.95 | 1.35 | 0 |
| 3 | aggressive | 31% | 67% | 58% | 23.55 | 1.8 | 1.05 | 0 |

## Thresholds (§S9.4)

| Threshold | Target | Measured | Verdict |
| --- | --- | ---: | --- |
| `median-rounds` | 12–18 | 11 | **FAIL** |
| `compels-per-player-per-3-rounds` | >= 1 | 1.73 | **PASS** |
| `deaths-per-game` | <= 1.5 | 3.05 | **FAIL** |
| `breach-achievable` | >= 0.80 | 0.30 | **FAIL** |
| `role-win-spread` | every role 0.20–0.40 | 0.00–0.67 | **FAIL** |
| `deck-exhaustion` | no pile exhausted | not observable | **N/A** |

## Not measured yet

| Metric | Waiting on |
| --- | --- |
| `deckExhaustion` | not observable by design — D27 draws never deplete a pile |
| `sideDirectives` | cut from the MVP (§14b) |
| `compelsByPolicyPair` | needs a per-pair matrix, not a per-table aggregate |
