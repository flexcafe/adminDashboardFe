# Admin Dashboard FE

Admin frontend for role-based operational workflows including verification, safe payments, fraud moderation, rewards, categories, slider ads, notifications, admin roles/users, Facebook follow review, and an AI assistant surface.

## Start Here

- Project guide: [docs/PROJECT_GUIDE.md](./docs/PROJECT_GUIDE.md)
- Architecture background: [architecture.md](./architecture.md)
- Shared UI notes: [src/shared/README.md](./src/shared/README.md)

## Scripts

```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
```

## Environment

Common env values:

- `VITE_API_URL`
- `VITE_PUSHER_KEY`
- `VITE_PUSHER_CLUSTER`
- `VITE_PUSHER_ADMIN_CHANNEL`
- `VITE_PUSHER_ADMIN_EVENT`

## Notes

- The active dashboard feature pattern is mostly page + feature API/context under `src/features`, not only the older `src/core` clean-architecture modules.
- After meaningful frontend changes, run `npm run build`.
