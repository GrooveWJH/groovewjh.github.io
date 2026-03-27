# Core Asset Architecture

Public stable entrypoints:
- `/assets/core/main.css`
- `/assets/core/pages.css`
- `/assets/core/app.js`

Internal structure:
- `foundation/`: tokens, themes, reset/baseline rules
- `layout/`: shell, header, post-header, footer
- `components/`: reusable UI building blocks
- `pages/`: route-specific overrides
- `behavior/`: JS modules initialized by `app.js`

Load order:
1. `main.css`: `foundation -> layout -> components`
2. `pages.css`: `taxonomy -> home -> archive -> errors`
3. `app.js`: initializes all runtime behaviors with DOM guards

Conventions:
- Put global rules only in `foundation/*`
- Put route-only rules only in `pages/*`
- Keep component styles reusable and route-agnostic
- Do not expose internal module paths as public API
