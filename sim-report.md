# Simulator report

Command: `pnpm sim --games 200 --players 2,3 --policy mixed --seed-base 42 --max-rounds 40`
Tuning fingerprint: `cfg d87e721a` · 800 games · cap 40 rounds

| Players | Policy | Games | Cap hit | Detonated | Recontained | Rounds to terminal | Rounds p50 | Rounds p90 | Reached inner | Reached core | Purchases / game | Records spent | Gate fail | Deaths / game | Draws / game |
| --: | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| 2 | cautious | 200 | 0% | 86% | 14% | 20 | 20 | 27 | 46% | 14% | 1.835 | 6.49 | 28% | 0.715 | 17.31 |
| 2 | aggressive | 200 | 1% | 12% | 88% | 12 | 12 | 23 | 100% | 88% | 0 | 0 | 62% | 0.46 | 4.305 |
| 3 | cautious | 200 | 1% | 54% | 46% | 27 | 27 | 35 | 85% | 46% | 4.345 | 16.02 | 39% | 1.745 | 33.765 |
| 3 | aggressive | 200 | 1% | 4% | 96% | 10 | 10 | 20 | 100% | 96% | 0 | 0 | 60% | 0.52 | 5.64 |

## Not measured yet

| Metric | Waiting on |
| --- | --- |
| `winRateByAlignment` | M3c — needs Main Directives and alignment (§7c.3) |
| `breachAchievableRate` | M3c — needs breach directives |
| `compelsPerGame` | M3c — needs the protocol track |
| `deckExhaustion` | not observable by design — D27 draws never deplete a pile |
