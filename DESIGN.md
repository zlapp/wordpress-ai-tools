# Design systems live with each site

This monorepo (`wordpress-ai-tools`) is **AI tooling only**.  
Visual design systems are owned by **site packages** under `sites/<id>/`.

| Site | Design system |
|------|----------------|
| `lappzvi` | [`sites/lappzvi/DESIGN.md`](./sites/lappzvi/DESIGN.md) → [zlapp/lappzvi-wp](https://github.com/zlapp/lappzvi-wp/blob/main/DESIGN.md) |

When working on a site, always read **`sites/<id>/DESIGN.md`** (not this file).

To add a new site brand system: put `DESIGN.md` in that site’s own git repo (submodule root).
