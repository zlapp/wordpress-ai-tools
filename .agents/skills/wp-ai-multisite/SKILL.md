---
name: wp-ai-multisite
description: >
  Multi-site WordPress AI tools monorepo. Use when the user mentions sites/,
  sites.registry.json, wp-ai CLI, submodules, editing lappzvi or any client site,
  adding a new WordPress site package, or switching between multiple WP sites.
---

# Multi-site WordPress AI tools

## Rules

1. This repo root is **tools only**. Site code lives under `sites/<id>/` (usually a git submodule).
2. Always resolve the site via `sites.registry.json` before editing.
3. Never edit more than one site’s files in a single drive-by change unless the user asked for multiple sites.
4. Never commit secrets (`.env`, app passwords, SFTP passwords, JWT).
5. Prefer official skills: `wp-block-themes`, `wp-patterns`, `wp-playground`, `wp-rest-api`.

## Commands

```bash
node packages/cli/bin/wp-ai.js site list
node packages/cli/bin/wp-ai.js site show <id>
node packages/cli/bin/wp-ai.js site path <id>
node packages/cli/bin/wp-ai.js site init-local <id>
node packages/cli/bin/wp-ai.js site add --id <id> --repo <git-url> --url https://...
node packages/cli/bin/wp-ai.js playground <id>
```

## Edit loop for site `<id>`

1. `site show <id>` → confirm path, url, deploy, content method  
2. Edit only `sites/<id>/theme/` (and patterns/blueprints as needed)  
3. `playground <id>` to verify  
4. Commit **inside the submodule** (or inside `sites/<id>` if not yet a submodule), push site remote  
5. Deploy per `sites/<id>/site.yaml`

## Adding a client site

1. Copy or `site init-local`  
2. Push site package to its **own** GitHub repo  
3. `site add --id … --repo …` so tools monorepo tracks it as a submodule  
4. Register non-secret metadata in `sites.registry.json`

## Content vs design

| Design (theme) | Content (posts) |
|----------------|-----------------|
| Git in site submodule | REST/MCP with per-site env vars |
| Deploy SFTP / Action | Application Password named in registry |

If the user says “edit my WordPress” without an id, run `site list` and ask which id.
