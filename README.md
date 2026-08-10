# Admin Dashboard Frontend

React + TypeScript frontend for role-based admin operations. It supports KBZPay verification, safe-payment administration, moderation, rewards, notifications, categories, slider ads, points and withdrawals, admin users/roles, Facebook follow review, and an AI assistant.

This repository is deliberately structured so a client or a new development team can maintain it without relying on the original vendor. The active dashboard code follows a **feature-first** pattern: each operational domain owns its API code, UI, types, and state as far as practical. Cross-cutting concerns—authentication, HTTP, routing, theme, and shared UI—remain in stable, well-known locations.

## Stack

- React 19, TypeScript, Vite
- React Router 7
- Axios
- Framer Motion
- i18next / react-i18next
- Pusher (optional real-time notifications)
- Vitest and Testing Library
- Custom CSS and the existing project UI classes

## Quick Start

### Prerequisites

- Git
- A current Node.js LTS release and npm

The repository does not pin a Node or npm version. Use the team-approved current LTS version; `npm install` and `npm run build` are the compatibility check.

### Install and Run

```bash
git clone <repository-url>
cd adminDashboardFe
npm install
```

Create a `.env` file in the repository root. At minimum, configure the backend URL:

```dotenv
VITE_API_URL=https://your-api.example.com
```

To enable real-time admin notifications, also configure Pusher:

```dotenv
VITE_PUSHER_KEY=your-pusher-key
VITE_PUSHER_CLUSTER=your-pusher-cluster
VITE_PUSHER_ADMIN_CHANNEL=private-admin-dashboard
VITE_PUSHER_ADMIN_EVENT=admin-notification
```

The notification UI continues to work with normal HTTP fetches when the Pusher admin channel/event settings are absent.

```bash
npm run dev       # Start local Vite server
npm run build     # Type-check and create production build
npm run test      # Run Vitest tests
npm run lint      # Run ESLint
npm run preview   # Preview the production build
```

## Application Entry Points

- `src/main.tsx` loads global styles and i18n, then mounts React.
- `src/app/App.tsx` composes `ThemeProvider`, `NetworkStatusGate`, `AuthProvider`, `AIAssistantProvider`, and `AppRouter`.
- `src/app/router/AppRouter.tsx` defines public/authenticated routes and permission guards.
- `src/widgets/layout/AppShell.tsx` provides the authenticated sidebar, topbar, theme/language controls, notifications, and page shell.

## Current Runtime Flow

### Application Startup

1. `src/main.tsx` loads CSS in this order: `index.css`, `global.css`, then `components/ui/light-mode.css`. Later files intentionally override earlier rules.
2. `src/main.tsx` initializes i18n and mounts `src/app/App.tsx`.
3. `App` installs providers in this order: theme → network status → authentication → AI assistant → router.
4. `AuthProvider` restores the current user through `AuthService` before protected content is resolved.
5. `AppRouter` renders a public route, the authenticated `AppShell`, an access-denied view, or the not-found page.

### Login, Session, and Logout

1. `/login` accepts either email or phone plus password.
2. `LoginPage` calls `useAuth().login(identifier, password)`.
3. `AuthService` delegates the request to `ApiAuthRepository`, which normalizes the backend response and persists the authenticated session.
4. A successful login returns to the originally requested route when available; otherwise it navigates to `/fraud-reports`.
5. On refresh, `AuthProvider` restores the current user before protected routes are rendered.
6. Logout clears the session through the auth service and `AppShell` navigates to `/login`.

### Authenticated Navigation and Permissions

1. `RequireAuth` redirects unauthenticated users to `/login` and preserves the requested location.
2. `RequirePermission` checks `useAdminPermissions()` for every protected page.
3. `ROOT_ADMIN` automatically passes all permission checks; non-root admins use the `permissions` array from the authenticated user.
4. `/` and forbidden routes normally redirect to the first accessible entry in `ADMIN_PERMISSION_ROUTE_ORDER`.
5. If no permitted route exists, the access-denied view is displayed. The AI Assistant route intentionally displays access denied instead of redirecting.
6. `AppShell` uses the same permission mapping for sidebar visibility, preventing navigation and route guards from drifting apart.

### Feature Data and Mutations

```text
Page/component
    → feature API service or feature context
    → shared HttpClient / Axios client
    → API_ENDPOINTS
    → backend
    → feature-level response normalization
    → page state refresh
```

Feature contexts are used for shared live workflows such as authentication, notifications, suggestions, KBZPay verification, admin chat, and the AI assistant. Self-contained screens use local React state. Successful create/update/delete actions should refresh the responsible feature state rather than requiring a full page reload.

### Notifications and Dashboard Refresh

`AdminNotificationsContext` loads notifications over HTTP and optionally subscribes to the configured private Pusher channel. New notification activity updates `lastNotificationAt`; the KBZPay dashboard observes that value and refreshes its verification queues. Without Pusher configuration, normal HTTP loading and manual refresh remain available.

## Directory Map

```text
src/
├── app/          # Application composition and route definitions
├── assets/       # Static assets
├── components/   # Reusable cross-domain UI, including UI styling files
├── config/       # Runtime configuration (for example Pusher)
├── core/         # Auth, HTTP, DI, domain entities, repositories, and legacy modules
├── features/     # Dashboard domain modules, APIs, contexts, types, and feature UI
├── lib/          # i18n, cookies, password helpers, and small library helpers
├── pages/        # Route-level pages that compose feature workflows
├── shared/       # Shared UI packages and reusable cross-domain code
├── test/         # Test setup and common test utilities
├── theme/        # Theme provider, context, and hooks
└── widgets/      # Composite layouts such as AppShell
```

### Architecture as Implemented

There are two valid patterns in this codebase:

1. **Current dashboard pattern (use this for most new admin work):**
   `page` → `src/features/<feature>` API/context/components → shared HTTP endpoint constants → router/sidebar/permission mapping.
2. **Legacy clean-architecture pattern (use it only when extending an existing core module):**
   `src/core/domain` → `application` → `infrastructure` → `presentation`.

`src/core` is therefore not the primary location for every new dashboard screen. Check the nearby feature first and follow the pattern already used by that area.

## Current Feature Areas

| Area | Route | Main implementation |
|---|---|---|
| KBZPay verification | `/dashboard`, `/dashboard/:userId` | `features/kbzVerification` and dashboard pages |
| Safe-payment admin chat | `/admin-chat` | `features/adminChat` |
| Fraud reports | `/fraud-reports` | `features/fraudReports` |
| Content moderation | `/content-moderation` | `features/contentModeration` |
| Suggestions | `/suggestions` | `features/suggestions` |
| Notifications | `/notifications` | `features/adminNotifications` |
| Categories | `/categories` | `features/categories` |
| Slider ads | `/slider-ads` | `features/sliderAds` |
| Points, ranks, withdrawals | `/points` | `pages/PointsPage.tsx` |
| Facebook follow review | `/facebook-follow` | `pages/FacebookFollowPage.tsx` |
| Admin users | `/admin-users` | `features/adminUsers` |
| Admin roles | `/admin-roles` | `features/adminRoles` |
| AI assistant | `/ai-assistant` | `features/aiAssistant` |

## Authentication and Permissions

Authentication is implemented through `src/core/presentation/hooks/useAuth.tsx` and the related core service/repository classes. The auth provider restores the user session at startup; unauthenticated requests are redirected to `/login` by `RequireAuth` in the router.

The single source for dashboard page permissions is:

```text
src/features/adminPermissions/useAdminPermissions.ts
```

- A user whose `adminRoleName` is `ROOT_ADMIN` has full access.
- Other users are evaluated using the authenticated user's real `permissions` array.
- Route guards and sidebar visibility both call `useAdminPermissions()`.
- A page with multiple permission keys uses **any-of** logic: one matching permission grants access.
- `/` redirects to the first permitted route. If none is available, the app shows the access-denied view.
- Root-only pages currently include AI Assistant, Admin Users, Admin Roles, and Facebook Follow Review.

Do not fetch root-only data merely to determine a non-root user's permissions. Do not create permission keys unless the backend provides them.

## API and State Patterns

### HTTP and Endpoint Constants

- Base API URL: `src/core/infrastructure/api/constants.ts` reads `VITE_API_URL`.
- Endpoint constants: `src/core/infrastructure/api/constants.ts` exports `API_ENDPOINTS`.
- Shared authenticated HTTP behavior: `src/core/infrastructure/api/HttpClient.ts`.
- Feature API examples: `features/sliderAds/sliderApi.ts`, `features/adminRoles/adminRolesApi.ts`, and `features/fraudReports/fraudReportsApi.ts`.

Keep endpoint paths in `API_ENDPOINTS`. Keep request/response normalization near the responsible feature API service or feature context. Pages should consume normalized data and focus on UI and workflow coordination.

The project uses React local state and feature contexts rather than Redux. Use page-local state for a self-contained screen; introduce a feature context when multiple components or routes share live workflow state.

### Feature Boundaries

- Keep domain-specific code in `src/features/<feature-name>/`.
- Put generic UI without business rules in `src/components/`; put genuinely reusable helpers/types/hooks in `src/shared/` or `src/lib/` as appropriate.
- Do not create an abstraction until it is needed by more than one domain.
- Avoid importing another feature's internal code. There are existing exceptions—such as Admin Users reading Admin Roles API types and AI Assistant reading Category data—but new cross-feature sharing should expose a small shared/public contract rather than create further internal coupling.

## Adding or Changing a Feature

Follow this checklist:

1. Confirm the backend endpoint, exact request fields, response shape, and permission key.
2. Add/update `API_ENDPOINTS` in `src/core/infrastructure/api/constants.ts`.
3. Add or update the feature API service in `src/features/<feature>/`; normalize backend inconsistencies there.
4. Add feature-specific types, components, hooks, or context only where needed.
5. Create/update the route page in `src/pages/`.
6. Register or update the route in `src/app/router/AppRouter.tsx`.
7. Add/update `ADMIN_PAGE_PERMISSIONS` in `src/features/adminPermissions/useAdminPermissions.ts`.
8. Add a sidebar item in `src/widgets/layout/AppShell.tsx` only when the screen needs navigation.
9. Add i18n strings for visible UI text.
10. Run `npm run build`; add targeted tests for high-risk changes.

For CRUD workflows, provide loading, empty, and error states; refresh data after successful mutations; and use a confirmation step for destructive actions such as delete, deactivate, ban, or demote.

## Styling, Theme, and Localization

The UI uses the existing CSS system in `src/index.css`, `src/global.css`, and `src/components/ui/light-mode.css`. The import order in `src/main.tsx` is significant because global dark-theme and light-mode overrides depend on the cascade. Reuse established page, table, action, and modal classes before adding new styling. Tailwind and a component-library framework are not installed; utility-looking class names in some components are existing project conventions and should not be treated as proof of a Tailwind build pipeline.

Theme support is in `src/theme/ThemeProvider.tsx` and `src/theme/useTheme.ts`. New UI must work in the existing theme modes.

Localization is initialized from `src/lib/i18n/index.ts`. Locale files are in `src/lib/i18n/locales/` (`en`, `my`, `ko`, and `zh-CN`). Use `t(...)` for new user-facing text and add matching locale keys rather than hardcoding strings.

## Tests and Quality Checks

Tests live mainly in `src/pages/__tests__/` and `src/features/**/__tests__/`. Existing coverage includes API unit tests and page smoke tests.

Always run this after meaningful frontend changes:

```bash
npm run build
```

Also run `npm run test` when touching authentication, permissions, route access, API normalization, notifications, or AI assistant behavior.

## Documentation and Handover

- Full operational guide: [docs/PROJECT_GUIDE.md](./docs/PROJECT_GUIDE.md)
- Architecture background: [architecture.md](./architecture.md)
- Core-layer details: [src/core/README.md](./src/core/README.md)
- Shared UI notes: [src/shared/README.md](./src/shared/README.md)

Store backend API references, supplied PDF documents, and contract examples in `docs/`. When a backend contract or feature behavior changes, update this README and the relevant feature/API documentation in the same change so the handover documentation stays aligned with the code.
