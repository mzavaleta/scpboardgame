/**
 * `pnpm sim` — the CLI half of the simulator (§S9.1).
 *
 * All the logic lives in `src/sim/run.ts` (pure, unit-tested). This file only
 * parses flags and writes the two artifacts §S9.5 asks for: a diffable JSON and a
 * markdown table beside it.
 */

import { writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { runSimulation, toMarkdown } from "../src/sim/run";
import type { Policy, SimOptions } from "../src/sim/run";

const startedAt = Date.now();

function flag(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : process.argv[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

const games = Number(flag("games", "1000"));
const players = flag("players", "2,3")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value): value is 2 | 3 => value === 2 || value === 3);
const policy = flag("policy", "mixed") as Policy | "mixed";
const seedBase = Number(flag("seed-base", "42"));
const maxRounds = Number(flag("max-rounds", "40"));
const out = flag("out", "sim-report.json");

if (!Number.isInteger(games) || games < 1) throw new Error(`--games must be a positive integer`);
if (players.length === 0) throw new Error(`--players must list 2 and/or 3`);
if (!["cautious", "aggressive", "mixed"].includes(policy)) {
  throw new Error(`--policy must be cautious, aggressive or mixed`);
}
if (!Number.isInteger(seedBase)) throw new Error(`--seed-base must be an integer`);
if (!Number.isInteger(maxRounds) || maxRounds < 1) throw new Error(`--max-rounds must be a positive integer`);

const options: SimOptions = { games, players, policy, seedBase, maxRounds };
const report = runSimulation(options);

writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const markdownPath = join(dirname(out), `${basename(out, ".json")}.md`);
writeFileSync(markdownPath, toMarkdown(report), "utf8");

console.log(`${report.games} games in ${(Date.now() - startedAt) / 1000}s`);
for (const row of report.rows) {
  console.log(
    `  ${row.players}p ${row.policy.padEnd(10)} cap ${String(Math.round(row.capHitShare * 100)).padStart(3)}% · ` +
      `purchases ${row.purchasesPerGame} · inner ${Math.round(row.reachedInnerShare * 100)}% · ` +
      `core ${Math.round(row.reachedCoreShare * 100)}% · gate fail ${Math.round(row.gateFailureShare * 100)}% · ` +
      `detonated ${Math.round(row.detonatedShare * 100)}%`,
  );
}
console.log(`wrote ${out} and ${markdownPath}`);
