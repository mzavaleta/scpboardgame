/**
 * `pnpm validate` — the §S8.3 content gate.
 *
 * Default mode: attribution `PENDING` is a warning (debt D2). `--release` turns
 * every warning about shipping data into a failure.
 */

import { summarize, validateContent } from "../src/content/validate";

const release = process.argv.includes("--release");
const issues = validateContent({ release });
const { errors, warnings } = summarize(issues);

if (issues.length === 0) {
  console.log("content: clean");
} else {
  for (const issue of issues) {
    const mark = issue.level === "error" ? "ERROR" : "warn ";
    console.log(`${mark} [${issue.check}] ${issue.message}`);
  }
}

console.log(`\n${errors} error(s), ${warnings} warning(s)${release ? " · release mode" : ""}`);
process.exit(errors > 0 ? 1 : 0);
