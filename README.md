# Admin Dashboard FE (Template)

React + TypeScript + Vite **template only**, organized with a clean architecture style
## Create project (npm)

This was scaffolded with:

```bash
npm create vite@latest admin-dashboard-fe -- --template react-ts
cd admin-dashboard-fe
npm install
npm run dev
```

## What you get

- App shell (sidebar + topbar) and routing (`react-router-dom`)
- Dashboard page placeholder cards
- Clean architecture core under `src/core/` (domain, application, infrastructure, presentation) — see **[architecture.md](./architecture.md)**

## Architecture

- **Start here :** [architecture.md](./architecture.md) — layers, dependency flow, how to add features.
- **Shared UI / widgets:** [src/shared/README.md](./src/shared/README.md)
