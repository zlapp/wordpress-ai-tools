# WordPress AI Tools — Agent Instructions

This repository is a **multi-site AI toolkit**, not a single WordPress site.

## Mental model

| Path | Owns |
|------|------|
| Repo root | Shared tools: CLI, skills, MCP recipes, deploy templates, site registry |
| `sites/<id>/` | **One git submodule per WordPress site** (theme, blueprints, site.yaml) |
| `sites.registry.json` | Machine-readable index of all sites |

**Never** put multiple clients’ themes in one flat folder. Always work under `sites/<id>/`.

## Before editing a site

1. Read `sites.registry.json` and resolve the site id (e.g. `lappzvi`).
2. Confirm the submodule is checked out: `sites/<id>/` exists and is not empty.
3. Read `sites/<id>/site.yaml` for deploy + content auth hints.
4. Prefer official skills under `.claude/skills/` / `.codex/skills/` (especially `wp-block-themes`, `wp-patterns`, `wp-playground`, `wp-rest-api`).
5. Run local preview with Playground mounted on that site’s theme:

   ```bash
   npm run playground -- lappzvi
   ```

## What to edit where

| Change type | Where |
|-------------|--------|
| Design (colors, templates, header/footer) | `sites/<id>/theme/` |
| Reusable page sections | `sites/<id>/theme/patterns/` or `sites/<id>/patterns/` |
| Local seed content | `sites/<id>/blueprints/` |
| Live post/page body | WordPress REST / MCP — **not** git (unless the site opts into patterns-as-content) |
| Shared agent knowledge | Root skills + this file — **not** inside a site submodule |

## Multi-site safety

- Only touch files under `sites/<id>/` for the site the user named.
- Do not mix credentials between sites. Env var names are per-site in the registry.
- Do not commit `.env`, Application Passwords, JWT tokens, or SFTP passwords.
- When unsure which site: run `npm run site:list` and ask.

## Adding a new site (human or agent)

```bash
# Separate repo for the site first (from templates/site-repo), then:
npm run site:add -- --id client-acme --repo git@github.com:ORG/acme-wp.git
```

That adds a git submodule at `sites/client-acme` and a registry entry.

## Deploy

Design (theme) ships from the **site submodule** repo (or monorepo CI that deploys `sites/<id>/theme`).  
See each site’s `site.yaml` → `deploy.method`.

## Design System

Always read `sites/<id>/DESIGN.md` before making any visual or UI decisions for that site.
All font choices, colors, spacing, and aesthetic direction are defined there
([google-labs-code/design.md](https://github.com/google-labs-code/design.md) format).
Default brand is **YC Formidable** (modeled on [ycombinator.com](https://www.ycombinator.com/)).

- Do not deviate without explicit user approval.
- Design systems: `sites/<id>/DESIGN.md` is the source of truth for that site (not monorepo root).
- In QA mode, flag any code that doesn't match `sites/<id>/DESIGN.md`.
- Optional lint: `npx @google/design.md lint sites/<id>/DESIGN.md`

## Skills to load first

- `wordpress-router` / `wp-project-triage` — classify work
- `wp-block-themes` — theme.json + FSE
- `wp-patterns` — patterns
- `wp-playground` — local run/test
- `wp-rest-api` — content via REST
- `wp-wpcli-and-ops` — ops when WP-CLI is available
