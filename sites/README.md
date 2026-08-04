# Sites (git submodules)

Each subdirectory is **one WordPress site package**, usually a **git submodule** pointing at that site’s own repository.

```text
sites/
  lappzvi/     → git@…/lappzvi-wp.git   (lappzvi.com)
  acme/        → git@…/acme-wp.git
```

## Add a site that already has a repo

From the tools monorepo root:

```bash
npm run site:add -- --id acme --repo git@github.com:ORG/acme-wp.git --url https://acme.com
```

## Bootstrap a site with no repo yet

```bash
npm run wp-ai -- site init-local lappzvi
# develop under sites/lappzvi, then push to its own GitHub repo and re-add as submodule
```

## Clone tools + all sites

```bash
git clone --recurse-submodules git@github.com:YOU/wordpress-ai-tools.git
# or after plain clone:
git submodule update --init --recursive
```

Do not put theme code for multiple clients loosely in this folder without submodules — agents rely on `sites.registry.json` + one folder per id.
