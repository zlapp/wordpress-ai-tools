# {{SITE_NAME}} (WordPress site package)

This repo is **one site**, not the AI toolkit.

| Path | Purpose |
|------|---------|
| `theme/` | Block theme (design + patterns) — edit with Claude/Codex |
| `blueprints/` | Playground seed (sample content, plugins) |
| `site.yaml` | Deploy + content API hints |

It is consumed as a **git submodule** under:

```text
wordpress-ai-tools/sites/{{SITE_ID}}/
```

## Local preview (from tools monorepo)

```bash
cd /path/to/wordpress-ai-tools
npm run playground -- {{SITE_ID}}
```

## Agent scope

- Edit design in `theme/` (`theme.json`, templates, parts, patterns).
- Do not commit Application Passwords or SFTP secrets.
- Live posts/pages: REST/MCP using env vars named in `site.yaml`.
