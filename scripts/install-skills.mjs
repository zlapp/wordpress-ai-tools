#!/usr/bin/env node
/**
 * Install official WordPress agent skills into this tools monorepo
 * for Claude Code, Codex, Cursor, and VS Code / Copilot.
 */
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SKILLS = [
  "wordpress-router",
  "wp-project-triage",
  "wp-block-themes",
  "wp-patterns",
  "wp-playground",
  "blueprint",
  "wp-rest-api",
  "wp-wpcli-and-ops",
  "wp-plugin-development",
  "wp-block-development",
  "wp-abilities-api",
];

function run(cmd, args) {
  return new Promise((res, rej) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd: ROOT, shell: false });
    child.on("error", rej);
    child.on("exit", (code) => (code === 0 ? res() : rej(new Error(`exit ${code}`))));
  });
}

console.log("Installing WordPress/agent-skills into this tools repo…\n");

try {
  await run("npx", [
    "-y",
    "skills",
    "add",
    "WordPress/agent-skills",
    "-y",
    "--skill",
    ...SKILLS,
  ]);
  console.log("\nDone. Skills are under .claude/skills/, .codex/skills/, etc.");
  console.log("Commit them so every agent clone gets the same playbook.");
} catch (e) {
  console.error("\nAutomated install failed. Manual fallback:");
  console.error("  npx skills add WordPress/agent-skills --list");
  console.error("  npx skills add WordPress/agent-skills --skill wp-block-themes wp-playground …");
  process.exit(1);
}
