# WordPress AI Tools

**Multi-site** toolkit so Claude Code, Codex, and other agents can design and edit many WordPress sites from one place.

```
wordpress-ai-tools/          ← this repo (tools only)
├── packages/cli/            ← wp-ai CLI
├── templates/site-repo/     ← starter for each site’s own git repo
├── sites/                   ← git submodules (one folder per site)
│   └── lappzvi/             ← submodule → lappzvi.com theme + config
├── sites.registry.json      ← index of all sites (CLI + agents)
├── .claude/skills/          ← official WordPress agent skills + multi-site skill
└── AGENTS.md                ← instructions agents should follow
```

Each **customer / personal site is its own git repository**, linked here as a **submodule**. This monorepo holds the AI tooling; site repos hold themes, blueprints, and site-specific deploy config.

## Prerequisites

- Node.js ≥ 20.18
- Git
- Optional: Claude Code / Codex, WP-CLI
- Optional MCP: `@wp-playground/mcp` for local Playground control

## Clone

```bash
git clone --recurse-submodules https://github.com/zlapp/wordpress-ai-tools.git
cd wordpress-ai-tools
```

## Quick start

```bash
# Skills ship under .agents/skills/ (re-run only to upgrade upstream packs)
npm run skills:install

# List registered sites
npm run site:list

# Local preview for one site (Playground + theme mount)
npm run playground -- lappzvi

# Add another site as a submodule
npm run site:add -- --id acme --repo git@github.com:YOU/acme-wp.git --url https://acme.com
```

### Registered sites

| Id | Live site | Package repo |
|----|-----------|--------------|
| `lappzvi` | https://lappzvi.com | https://github.com/zlapp/lappzvi-wp (private submodule) |

### MCP (optional)

```bash
# Local Playground control
claude mcp add --transport stdio --scope user wordpress-playground -- npx -y @wp-playground/mcp
codex mcp add wordpress-playground -- npx -y @wp-playground/mcp
```

See [`config/mcp.example.json`](./config/mcp.example.json). Live-site MCP needs [mcp-adapter](https://github.com/WordPress/mcp-adapter) on a host that allows plugins, plus Application Passwords — see each site’s `site.yaml`.

## Creating a new site repo

```bash
cp -R templates/site-repo /tmp/my-client-wp
cd /tmp/my-client-wp
# edit site.yaml, theme/
git init && git add . && git commit -m "Initial site package"
# push to GitHub, then from the tools monorepo:
npm run site:add -- --id my-client --repo git@github.com:YOU/my-client-wp.git
```

## Agent workflow (any site)

1. `npm run site:list` → pick id  
2. Edit only `sites/<id>/…`  
3. `npm run playground -- <id>` → verify  
4. Commit **inside the submodule**, push site remote  
5. Deploy per `sites/<id>/site.yaml` (SFTP / Action / host git)

## Registry

All sites are declared in [`sites.registry.json`](./sites.registry.json). Agents and the CLI read this file; keep secrets out of it (only env var *names*).

## License

GPL-2.0-or-later (aligned with WordPress tooling).
