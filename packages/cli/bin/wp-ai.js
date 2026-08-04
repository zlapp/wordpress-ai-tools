#!/usr/bin/env node
/**
 * wp-ai — multi-site WordPress AI toolkit CLI
 *
 * Usage:
 *   wp-ai site list
 *   wp-ai site show <id>
 *   wp-ai site path <id>
 *   wp-ai site add --id <id> --repo <git-url> [--name "..."] [--url https://...]
 *   wp-ai site init-local <id>
 *   wp-ai playground <id> [--port 9400]
 *   wp-ai which
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const REGISTRY_PATH = join(ROOT, "sites.registry.json");
const SITES_DIR = join(ROOT, "sites");
const TEMPLATE_DIR = join(ROOT, "templates/site-repo");

function die(msg, code = 1) {
  console.error(`wp-ai: ${msg}`);
  process.exit(code);
}

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    return {
      version: 1,
      defaults: { theme_subdir: "theme", blueprint: "blueprints/local.json" },
      sites: {},
    };
  }
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
}

function saveRegistry(reg) {
  writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2) + "\n", "utf8");
}

function sitePath(id, reg) {
  const site = reg.sites?.[id];
  if (!site) die(`unknown site id "${id}". Run: wp-ai site list`);
  return resolve(ROOT, site.path || `sites/${id}`);
}

function printHelp() {
  console.log(`wp-ai — multi-site WordPress AI tools

This monorepo holds AI tooling. Each WordPress site is a git submodule under sites/<id>/.

Commands:
  site list                         List registered sites
  site show <id>                    Show registry entry (JSON)
  site path <id>                    Print absolute path to site package
  site add --id <id> --repo <url>   git submodule add + registry entry
         [--name "..."] [--url https://...]
  site init-local <id>              Scaffold sites/<id> from template (no remote)
  playground <id> [--port N]        Run Playground with that site's theme mounted
  site pull <id>                    Public snapshot of live WordPress.com/site into import/
  which                             Print tools monorepo root

Examples:
  wp-ai site list
  wp-ai site init-local lappzvi
  wp-ai site add --id acme --repo git@github.com:you/acme-wp.git --url https://acme.com
  wp-ai playground lappzvi
`);
}

function cmdSiteList(reg) {
  const ids = Object.keys(reg.sites || {});
  if (!ids.length) {
    console.log("No sites registered.\n  wp-ai site init-local <id>\n  wp-ai site add --id <id> --repo <git-url>");
    return;
  }
  console.log("ID               URL                              Status   Path");
  console.log("-".repeat(72));
  for (const id of ids) {
    const s = reg.sites[id];
    const p = resolve(ROOT, s.path || `sites/${id}`);
    const present = existsSync(p) ? "ok" : "MISSING";
    const url = (s.url || "—").slice(0, 32).padEnd(32);
    console.log(`${id.padEnd(16)} ${url} ${present.padEnd(8)} ${s.path || `sites/${id}`}`);
  }
}

function cmdSiteShow(reg, id) {
  if (!id) die("usage: wp-ai site show <id>");
  const site = reg.sites?.[id];
  if (!site) die(`unknown site "${id}"`);
  console.log(JSON.stringify({ id, ...site, absPath: sitePath(id, reg) }, null, 2));
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: opts.cwd || ROOT,
      shell: false,
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited ${code}`))
    );
  });
}

function envKey(id, suffix) {
  return `${id.toUpperCase().replace(/-/g, "_")}_${suffix}`;
}

function personalizeTree(dir, id) {
  const walk = (d) => {
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, name.name);
      if (name.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(yaml|yml|md|css|json|html|php|txt)$/i.test(name.name)) continue;
      let text = readFileSync(p, "utf8");
      if (!text.includes("{{")) continue;
      text = text
        .replaceAll("{{SITE_ID}}", id)
        .replaceAll("{{SITE_NAME}}", id)
        .replaceAll("{{SITE_URL}}", `https://${id}.example.com`);
      writeFileSync(p, text, "utf8");
    }
  };
  walk(dir);
}

async function cmdSiteAdd(reg, flags) {
  const id = flags.id;
  const repo = flags.repo;
  if (!id || !repo) die("site add requires --id and --repo");
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) die("id must be alphanumeric / dash / underscore");

  const rel = `sites/${id}`;
  const abs = join(ROOT, rel);

  if (existsSync(abs)) {
    die(`${rel} already exists. Remove it first if you want to re-add the submodule.`);
  }

  mkdirSync(SITES_DIR, { recursive: true });
  console.log(`git submodule add ${repo} ${rel}`);
  await run("git", ["submodule", "add", repo, rel]);

  reg.sites = reg.sites || {};
  reg.sites[id] = {
    name: flags.name || id,
    path: rel,
    url: flags.url || "",
    deploy: {
      method: "sftp",
      secrets: ["SFTP_HOST", "SFTP_USER", "SFTP_PASS"],
      remote_theme_path: `/wp-content/themes/${id}`,
    },
    content: {
      method: "rest",
      rest_base: flags.url ? `${String(flags.url).replace(/\/$/, "")}/wp-json` : "",
      env: {
        username: envKey(id, "WP_USER"),
        app_password: envKey(id, "WP_APP_PASSWORD"),
      },
      mcp: { enabled: false },
    },
    scope: ["theme", "patterns", "blueprints"],
  };
  saveRegistry(reg);
  console.log(`Registered "${id}" in sites.registry.json`);
  console.log(`Commit: git add .gitmodules ${rel} sites.registry.json && git commit`);
}

async function cmdSiteInitLocal(reg, id) {
  if (!id) die("usage: wp-ai site init-local <id>");
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) die("id must be alphanumeric / dash / underscore");

  const rel = `sites/${id}`;
  const abs = join(ROOT, rel);
  if (existsSync(abs)) die(`${rel} already exists`);
  if (!existsSync(TEMPLATE_DIR)) die(`missing template at ${TEMPLATE_DIR}`);

  mkdirSync(SITES_DIR, { recursive: true });
  cpSync(TEMPLATE_DIR, abs, { recursive: true });
  personalizeTree(abs, id);

  reg.sites = reg.sites || {};
  reg.sites[id] = {
    name: id,
    path: rel,
    url: id === "lappzvi" ? "https://lappzvi.com" : "",
    admin_url: id === "lappzvi" ? "https://wordpress.com/home/lappzvi.com" : "",
    deploy: {
      method: "sftp",
      secrets: ["SFTP_HOST", "SFTP_USER", "SFTP_PASS"],
      remote_theme_path: `/wp-content/themes/${id}`,
    },
    content: {
      method: "rest",
      rest_base: id === "lappzvi" ? "https://lappzvi.com/wp-json" : "",
      env: {
        username: envKey(id, "WP_USER"),
        app_password: envKey(id, "WP_APP_PASSWORD"),
      },
      mcp: { enabled: false },
    },
    scope: ["theme", "patterns", "blueprints"],
    notes:
      "Local scaffold. To convert to submodule: push sites/<id> to its own remote, remove folder, then wp-ai site add --id ... --repo ...",
  };
  if (id === "lappzvi") {
    reg.sites[id].name = "Zvi Lapp personal";
  }
  saveRegistry(reg);

  console.log(`Created ${rel} from templates/site-repo`);
  console.log(`
Promote to submodule (recommended):
  cd ${rel}
  git init && git add . && git commit -m "Initial ${id} site package"
  # create empty GitHub repo, then:
  git remote add origin git@github.com:YOU/${id}-wp.git
  git push -u origin main
  cd ${ROOT}
  rm -rf ${rel}
  node packages/cli/bin/wp-ai.js site add --id ${id} --repo git@github.com:YOU/${id}-wp.git --url https://...
`);
}

async function cmdPlayground(reg, id, flags) {
  if (!id) die("usage: wp-ai playground <id>");
  const abs = sitePath(id, reg);
  if (!existsSync(abs)) {
    die(`site path missing: ${abs}\n  Try: git submodule update --init --recursive\n  Or:  wp-ai site init-local ${id}`);
  }

  const themeSub = reg.defaults?.theme_subdir || "theme";
  const themeDir = join(abs, themeSub);
  if (!existsSync(join(themeDir, "style.css"))) {
    die(`no theme at ${themeDir} (need style.css)`);
  }

  const port = String(flags.port || "9400");
  console.log(`Playground ← site "${id}"`);
  console.log(`  theme → ${themeDir}`);
  console.log(`  http://127.0.0.1:${port}\n`);

  await run(
    "npx",
    [
      "-y",
      "@wp-playground/cli@latest",
      "server",
      "--port",
      port,
      "--mount",
      `${themeDir}:/wordpress/wp-content/themes/${id}`,
      "--login",
    ],
    { cwd: ROOT }
  );
}


async function cmdSitePull(reg, id) {
  if (!id) die("usage: wp-ai site pull <id>");
  const site = reg.sites?.[id];
  if (!site) die(`unknown site "${id}"`);
  const abs = sitePath(id, reg);
  const url = (site.url || "").replace(/\/$/, "");
  if (!url) die(`site ${id} has no url in registry`);

  const snap = join(abs, "import/snapshots");
  const mediaDir = join(abs, "import/media");
  mkdirSync(snap, { recursive: true });
  mkdirSync(mediaDir, { recursive: true });

  console.log(`Pulling public snapshot of ${url} → ${join(abs, "import/")}`);

  const write = (name, body) => writeFileSync(join(snap, name), body);

  const fetchText = async (u) => {
    const res = await fetch(u, { redirect: "follow", headers: { "user-agent": "wordpress-ai-tools/0.1" } });
    if (!res.ok) throw new Error(`${u} → ${res.status}`);
    return await res.text();
  };
  const fetchJson = async (u) => JSON.parse(await fetchText(u));

  // Homepage HTML
  const html = await fetchText(url + "/");
  write("homepage.html", html);

  // WP.com REST site meta (works for Simple sites)
  let meta = null;
  for (const host of [new URL(url).hostname, url.replace(/^https?:\/\//, "")]) {
    try {
      meta = await fetchJson(`https://public-api.wordpress.com/rest/v1.1/sites/${host}`);
      break;
    } catch {
      /* try next */
    }
  }
  if (meta) write("site-meta.json", JSON.stringify(meta, null, 2) + "\n");

  const themeMatch = html.match(/wptheme&quot;:&quot;([^&]+)/);
  const theme = themeMatch ? themeMatch[1].replace(/\\\//g, "/") : "unknown";
  const bodyMatch = html.match(/body class="([^"]+)"/);
  const summary = {
    url,
    pulled_at: new Date().toISOString(),
    wpcom_site_id: meta?.ID ?? null,
    platform: meta?.is_wpcom_atomic ? "wordpress.com-atomic" : "wordpress.com-or-self-hosted",
    is_atomic: Boolean(meta?.is_wpcom_atomic),
    theme_detected: theme,
    body_classes: bodyMatch?.[1] || "",
    name: meta?.name || null,
  };
  write("site-summary.json", JSON.stringify(summary, null, 2) + "\n");

  // Media URLs from homepage
  const imgs = [...html.matchAll(/https?:\/\/[^"'\\s>]+\.(?:png|jpe?g|webp|gif)/gi)].map((m) => m[0].split("?")[0]);
  const uniq = [...new Set(imgs)].filter((u) => !/pixel\.wp\.com|s0\.wp\.com\/i\//.test(u));
  write("media-urls.json", JSON.stringify(uniq, null, 2) + "\n");

  for (const imgUrl of uniq.slice(0, 40)) {
    try {
      const res = await fetch(imgUrl, { headers: { "user-agent": "wordpress-ai-tools/0.1" } });
      if (!res.ok) continue;
      const name = imgUrl.split("/").pop() || "image.bin";
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(join(mediaDir, name), buf);
      console.log(`  media ${name} (${buf.length} bytes)`);
    } catch (e) {
      console.warn(`  media skip ${imgUrl}: ${e.message}`);
    }
  }

  console.log("\nDone. See import/snapshots/ and import/IMPORT.md (if present).");
  console.log("For full content export: WordPress.com → Tools → Export → save WXR under import/wxr/");
  console.log(JSON.stringify(summary, null, 2));
}


async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === "-h" || argv[0] === "--help" || argv[0] === "help") {
    printHelp();
    return;
  }

  const reg = loadRegistry();
  const [cmd, sub, ...rest] = argv;

  if (cmd === "which") {
    console.log(ROOT);
    return;
  }

  if (cmd === "site") {
    const { flags, positional } = parseArgs(rest);
    if (sub === "list") return cmdSiteList(reg);
    if (sub === "show") return cmdSiteShow(reg, positional[0] || flags.id);
    if (sub === "path") {
      console.log(sitePath(positional[0] || flags.id, reg));
      return;
    }
    if (sub === "add") return cmdSiteAdd(reg, flags);
    if (sub === "init-local") return cmdSiteInitLocal(reg, positional[0] || flags.id);
    if (sub === "pull") return cmdSitePull(reg, positional[0] || flags.id);
    die(`unknown site subcommand "${sub}"`);
  }

  if (cmd === "playground") {
    const { flags, positional } = parseArgs([sub, ...rest].filter(Boolean));
    const id = positional[0];
    return cmdPlayground(reg, id, flags);
  }

  die(`unknown command "${cmd}". Try: wp-ai help`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
