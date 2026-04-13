This template follows a feature-sliced clean architecture style.

Core idea:
- `app/` composes providers + router (composition root)
- `pages/` route-level screens
- `widgets/` large UI blocks (layouts, sidebars, tables)
- `features/` user-facing actions (login, search, filters)
- `entities/` domain objects (user, inventoryItem, order)
- `shared/` reusable UI + utilities
- `infrastructure/` IO adapters (HTTP, storage)

