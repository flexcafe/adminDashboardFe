# Admin Dashboard Frontend Guide

This document is the working handoff for developers who need to maintain or extend this project.

It covers:

- what the app does
- how the app boots
- how login/session restoration works
- how routing and permissions work
- which feature pages exist and what workflows they support
- where API integration lives
- how localization, notifications, and AI assistant behavior are wired
- the safest way to add future features without breaking existing patterns

## 1. Project Summary

This repository is an admin dashboard frontend for role-based operational workflows.

The current production-oriented surfaces are:

- KBZPay verification dashboard
- verification detail flow
- safe-payment admin chat
- fraud reports moderation
- user suggestions review/reward
- admin notifications center
- points, rank, and withdrawal management
- category hierarchy management
- slider ads management
- admin users management
- admin roles and permissions management
- Facebook follow submission review
- root-only AI assistant and AI quick-chat popup

Although `src/core` still contains legacy clean-architecture modules for customers, suppliers, debts, and users, the main dashboard experience is implemented mostly through feature-local API files, contexts, and pages under `src/features` and `src/pages`.

## 2. Stack

- React 19
- TypeScript
- Vite
- React Router
- Axios via project `HttpClient`
- `react-i18next` for localization
- Framer Motion for some transitions and modal behavior
- Pusher for admin notifications realtime updates
- Vitest + Testing Library for tests

## 3. Boot Process

Entry files:

- `src/main.tsx`
- `src/app/App.tsx`

Startup order:

1. Global CSS and i18n are loaded in `src/main.tsx`.
2. `App` mounts the provider stack:
   - `ThemeProvider`
   - `NetworkStatusGate`
   - `AuthProvider`
   - `AIAssistantProvider`
   - `AppRouter`
3. `AppRouter` decides whether to render the login page, the authenticated shell, or denied/not-found views.

Provider stack behavior:

- `ThemeProvider` handles light/dark theme state.
- `NetworkStatusGate` blocks the app with an offline loading screen when the browser reports no connectivity.
- `AuthProvider` restores the authenticated user from cookie/session storage through `authService.getCurrentUser()`.
- `AIAssistantProvider` manages AI settings, memory, sessions, and tool execution state.

## 4. Environment and Runtime Configuration

Important env values:

- `VITE_API_URL`
- `VITE_PUSHER_KEY`
- `VITE_PUSHER_CLUSTER`
- `VITE_PUSHER_ADMIN_CHANNEL`
- `VITE_PUSHER_ADMIN_EVENT`

Relevant files:

- `src/core/infrastructure/api/constants.ts`
- `src/config/pusher.ts`

Notes:

- `API_CONFIG.BASE_URL` comes from `VITE_API_URL`.
- Admin notifications realtime mode is only considered enabled when both admin Pusher channel and event env values are present.
- If Pusher env vars are missing, the app still works using HTTP polling/refresh logic for notifications.

## 5. Scripts

From `package.json`:

- `npm run dev` starts Vite
- `npm run build` runs TypeScript build and Vite production build
- `npm run test` runs Vitest
- `npm run lint` runs ESLint
- `npm run preview` serves the production build

Validation rule used in this repo:

- after meaningful frontend changes, always run `npm run build`

## 6. Folder Map

Top-level frontend folders:

- `src/app` app bootstrap and router
- `src/assets` static assets
- `src/components` reusable UI and larger shared components
- `src/config` runtime config helpers
- `src/core` legacy clean-architecture layer and shared infra services
- `src/features` feature-local logic, APIs, contexts, and components
- `src/lib` i18n, cookie helpers, and utility modules
- `src/pages` route-level pages
- `src/shared` shared UI subpackages
- `src/theme` theme provider/hooks
- `src/widgets` shell/layout wrappers

## 7. Architecture in Practice

There are two patterns in the codebase:

### 7.1 Legacy clean-architecture path

Used mostly by older modules under `src/core`:

- domain entities and interfaces
- application services
- infrastructure repositories
- presentation hooks

Key files:

- `src/core/infrastructure/di/container.ts`
- `src/core/application/services/AuthService.ts`
- `src/core/infrastructure/repositories/ApiAuthRepository.ts`
- `src/core/presentation/hooks/useAuth.tsx`

### 7.2 Current dashboard feature path

Most active admin features follow this simpler path:

- page in `src/pages`
- feature API/context in `src/features/<feature>`
- route in `src/app/router/AppRouter.tsx`
- sidebar visibility in `src/widgets/layout/AppShell.tsx`
- permission mapping in `src/features/adminPermissions/useAdminPermissions.ts`

This second pattern is the one you should normally follow for new dashboard functionality unless the target area already uses the older `src/core` stack.

## 8. Authentication and Session Workflow

Relevant files:

- `src/pages/LoginPage.tsx`
- `src/core/presentation/hooks/useAuth.tsx`
- `src/core/application/services/AuthService.ts`
- `src/core/infrastructure/repositories/ApiAuthRepository.ts`
- `src/lib/cookies.ts`

### 8.1 Login flow

1. User enters phone or email plus password on `/login`.
2. `LoginPage` calls `useAuth().login(identifier, password)`.
3. `AuthProvider` delegates to `AuthService.login`.
4. `AuthService` validates inputs and calls `ApiAuthRepository.login`.
5. `ApiAuthRepository`:
   - clears any persisted auth state first
   - sends `email + password` if identifier contains `@`
   - otherwise sends `phone + password`
   - extracts token from several possible response shapes
   - extracts user/admin record from several possible response shapes
   - normalizes the user into the local `User` entity
   - persists token and user into session storage and secure cookie-backed storage
6. On success, `LoginPage` navigates to `from` or `/fraud-reports`.

### 8.2 Session restore flow

On app startup:

1. `AuthProvider` calls `authService.getCurrentUser()`.
2. `ApiAuthRepository.getCurrentUser()` reads `wms_token` and `wms_user`.
3. It checks token expiry using `decodeJWT()` and `isTokenExpired()`.
4. If token is valid, it reconstructs a `User`.
5. If token is missing or expired, it clears auth storage and returns `null`.

### 8.3 Logout flow

1. `AppShell` calls `logout()`.
2. `AuthService.logout()` delegates to repository logout.
3. `ApiAuthRepository.logout()` clears CSRF token, session storage, and auth cookies.
4. `AppShell` navigates back to `/login`.

### 8.4 Session storage keys

The app currently uses:

- `wms_token`
- `wms_user`
- `wms_csrf_token`

These are managed through `tokenCookies` in `src/lib/cookies.ts`.

## 9. Routing Model

Main file:

- `src/app/router/AppRouter.tsx`

### 9.1 Public routes

- `/login`
- `/loading-preview`

### 9.2 Authenticated routes

Wrapped by `RequireAuth`, then rendered inside `AppShell`.

Routes:

- `/dashboard`
- `/dashboard/:userId`
- `/ai-assistant`
- `/admin-chat`
- `/categories`
- `/slider-ads`
- `/admin-users`
- `/admin-roles`
- `/fraud-reports`
- `/facebook-follow`
- `/points`
- `/notifications`
- `/suggestions`

### 9.3 Redirect behavior

- unauthenticated users are redirected to `/login`
- `/` redirects to the first permitted route from `ADMIN_PERMISSION_ROUTE_ORDER`
- forbidden routes either:
  - redirect to the first allowed route, or
  - show access denied if no route is available
- AI assistant page explicitly disables the fallback redirect and shows access denied directly when forbidden

## 10. Permission Model

Main file:

- `src/features/adminPermissions/useAdminPermissions.ts`

Rules:

- `ROOT_ADMIN` gets full access automatically
- non-root users use their real `permissions` array from the authenticated user object
- route checks and sidebar visibility both use the same permission source

Current page permission mapping:

- dashboard: `MANAGE_USERS`
- AI assistant page: root only
- AI assistant popup: `VIEW_ANALYTICS` or root
- admin chat: `MANAGE_SAFE_PAYMENTS` or `MANAGE_TRANSACTIONS`
- fraud reports: `MANAGE_REPORTS`
- suggestions: `MANAGE_SUGGESTIONS`
- notifications: `SEND_NOTIFICATIONS`
- slider ads: `MANAGE_SLIDER_ADS`
- categories: `MANAGE_CATEGORIES`
- points: `MANAGE_POINT_CONFIG` or `MANAGE_RANK_CONFIG` or `MANAGE_WITHDRAWALS`
- admin users: root only
- admin roles: root only
- Facebook follow: root only

Important developer note:

- the app currently uses `Array.some()` semantics for page access
- that means any one permission in a page’s permission array grants entry

## 11. Shell, Navigation, and Global UX

Main file:

- `src/widgets/layout/AppShell.tsx`

`AppShell` is responsible for:

- sidebar navigation
- topbar identity and logout
- theme toggle
- language switcher
- notifications dropdown
- page transition wrapper
- AI quick chat popup on allowed pages

Sidebar items are conditionally rendered using `canAccess(...)`.

The shell is also where the authenticated user’s displayed name is resolved:

- preferred: `user.nickname`
- fallback: `user.name`
- role label: `ROOT_ADMIN` special case, otherwise `adminRoleName`

## 12. Notifications System

Main file:

- `src/features/adminNotifications/AdminNotificationsContext.tsx`

Support files:

- `src/pages/NotificationsPage.tsx`
- `src/config/pusher.ts`
- `src/lib/i18n/dynamic.ts`

### 12.1 What it does

- fetches admin notifications from the backend
- normalizes inconsistent payload shapes
- stores local read state
- optionally listens to realtime Pusher events
- drives both the topbar dropdown and `/notifications` page

### 12.2 Notification lifecycle

1. Notifications are loaded from `API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST`.
2. Items are normalized into `AdminNotification`.
3. Dynamic title/type/message translation is resolved at render time.
4. Read state is tracked locally and can be flushed to backend via mark-all-read endpoint.
5. The KBZ verification dashboard listens to `lastNotificationAt` and refreshes when new notifications arrive.

### 12.3 Realtime

When Pusher admin config is present, the context can subscribe to the configured private admin dashboard channel and event.

If realtime is unavailable, the UI still works with manual refresh and normal fetches.

## 13. Localization Model

Main files:

- `src/lib/i18n/index.ts`
- `src/lib/i18n/locales/*.json`
- `src/components/LanguageSwitcher.tsx`

Supported locales:

- `en`
- `my`
- `ko`
- `zh-CN`

Merge strategy:

- `en`: `en.json` + `en-admin.json`
- `my`: `en.json` + `en-admin.json` + `my.json` + `my-admin.json`
- `ko`: `en.json` + `en-admin.json` + `ko.json`
- `zh-CN`: `en.json` + `en-admin.json` + `zh-CN.json`

Developer rules:

- do not hardcode visible UI strings in pages/components
- use `t(...)` for labels, empty states, accessibility text, dialogs, and workflow copy
- if you add a new key used by multiple screens, add it in `en.json` and then supply locale values in the other bundles
- if backend event payloads vary, normalize them first and translate later

## 14. Theme System

Relevant files:

- `src/theme/ThemeProvider.tsx`
- `src/theme/useTheme.ts`
- `src/components/ThemeToggle.tsx`

The app supports theme switching globally. Any new shell-level or page-level UI should respect the established theme classes instead of introducing a competing styling system.

## 15. Feature Workflows

This section documents the operator-facing behavior page by page.

### 15.1 Login

Route:

- `/login`

Purpose:

- authenticate an admin using phone or email plus password

Behavior:

- redirects authenticated users away immediately
- preserves a `from` route from router state
- shows auth errors from the login request

### 15.2 KBZPay Verification Dashboard

Routes:

- `/dashboard`
- `/dashboard/:userId`

Main files:

- `src/pages/DashboardPage.tsx`
- `src/features/kbzVerification/VerificationWorkflowContext.tsx`
- `src/components/kbzVerification/VerificationList.tsx`
- `src/pages/UserVerificationDetailPage.tsx`

Data sources:

- `AUTH.KBZPAY_REGISTERED_ACCOUNTS`
- `AUTH.KBZPAY_VERIFICATION_REQUESTED`
- `AUTH.KBZPAY_MONEY_CHECK`
- `AUTH.KBZPAY_VERIFIED_USERS`

Workflow:

1. Dashboard loads four verification queues.
2. Default active tab is `requested`.
3. When a relevant admin notification arrives, the dashboard refreshes its queues.
4. Operator can open a specific user record.
5. Detail page supports:
   - sending KBZPay instruction
   - verifying a money-check request
6. Sending instruction posts `adminPhoneForTransfer` and `adminNote`.
7. Verifying posts `adminNote` and redirects back to `/dashboard` after success.

Notes:

- backend payloads are normalized into `VerificationRecord`
- queue item permissions are inferred from status in the frontend normalization

### 15.3 Safe Payment Admin Chat

Route:

- `/admin-chat`

Main files:

- `src/pages/AdminChatPage.tsx`
- `src/features/adminChat/AdminChatContext.tsx`
- `src/components/adminChat/AdminChatWorkspace.tsx`

Data sources:

- awaiting instruction queue
- pending queue
- send instruction
- mark received
- mark transferred

Workflow:

1. Load safe-payment transactions in two queues.
2. Operator selects a transaction from the queue.
3. If transaction is awaiting instruction:
   - enter receiving KBZPay phone
   - optional note
   - send instruction
4. If transaction is pending:
   - review buyer proof/payment info
   - mark payment received
   - mark transferred to seller

### 15.4 Fraud Reports

Route:

- `/fraud-reports`

Main files:

- `src/pages/FraudReportsPage.tsx`
- `src/features/fraudReports/fraudReportsApi.ts`

Workflow:

1. Load all fraud reports.
2. Search by reporter, reported user, or reason.
3. For each report, operator can:
   - confirm
   - dismiss
   - ban user
   - unban user
4. Confirm and dismiss flows can include reporter message payloads.
5. Confirm flow can optionally block the reported user.

### 15.5 Suggestions

Route:

- `/suggestions`

Main files:

- `src/pages/SuggestionsPage.tsx`
- `src/features/suggestions/SuggestionsContext.tsx`
- `src/features/suggestions/suggestionsApi.ts`

Workflow:

1. Load suggestions list and pending count.
2. Reward flow opens a modal and requires points input.
3. Dismiss flow acts directly.
4. After mutation, context refreshes suggestion state.

### 15.6 Notifications Center

Route:

- `/notifications`

Main files:

- `src/pages/NotificationsPage.tsx`
- `src/features/adminNotifications/AdminNotificationsContext.tsx`

Workflow:

1. User opens notifications page or dropdown.
2. Notifications are localized using dynamic event translation.
3. Search works across localized title, message, and type.
4. User can mark one notification read or mark all read.
5. If opened from shell dropdown with state, the highlighted notification scrolls into view.

### 15.7 Categories

Route:

- `/categories`

Main files:

- `src/pages/CategoriesPage.tsx`
- `src/features/categories/categoriesApi.ts`
- `src/features/categories/*`

Workflow:

1. Load full category tree.
2. Support search/filter over hierarchy.
3. Select a category to view details.
4. Create or edit category in modal.
5. Deactivate category with confirmation modal.
6. Reorder categories and persist updated parent/sort order.
7. Batch move or batch deactivate selected categories.
8. Export tree as JSON or CSV.

### 15.8 Slider Ads

Route:

- `/slider-ads`

Main files:

- `src/pages/SliderAdsPage.tsx`
- `src/features/sliderAds/sliderApi.ts`
- `src/features/sliderAds/*`

Workflow:

1. Load slider ads list.
2. Search by title, link, status, or sort order.
3. Create/edit ads in modal.
4. Preview active ads in the live preview panel.
5. Reorder ads.
6. Delete with confirmation.

### 15.9 Points, Ranks, and Withdrawals

Route:

- `/points`

Main files:

- `src/pages/PointsPage.tsx`

Data sources:

- star config
- rank config
- withdrawals
- user list summary for reseller count

Workflow:

1. Config tab edits star points and reseller rank thresholds.
2. Withdrawals tab reviews withdrawal requests.
3. For each withdrawal, operator can:
   - approve
   - reject
   - mark paid
4. Mark paid requires `kbzTransferRef`.
5. Bulk approval is supported for selected pending withdrawals.

### 15.10 Facebook Follow Review

Route:

- `/facebook-follow`

Main files:

- `src/pages/FacebookFollowPage.tsx`

Workflow:

1. Load Facebook follow submissions.
2. Search by reseller, contact, or Facebook identity.
3. Review proof and profile link.
4. Approve or reject each submission.

### 15.11 Admin Roles

Route:

- `/admin-roles`

Main files:

- `src/pages/AdminRolesPage.tsx`
- `src/features/adminRoles/adminRolesApi.ts`
- `src/features/adminRoles/AdminRoleFormModal.tsx`

Workflow:

1. Load roles and permission catalog.
2. Search by role metadata.
3. Create or edit a role.
4. Assign permission IDs from backend catalog.
5. Delete role with confirmation.

This page is root-only.

### 15.12 Admin Users

Route:

- `/admin-users`

Main files:

- `src/pages/AdminUsersPage.tsx`
- `src/features/adminUsers/adminUsersApi.ts`

Workflow:

1. Load admin users and available admin roles.
2. Create admin user with nickname, phone/email, password, and role.
3. Change a user’s assigned admin role.
4. Demote an admin user back to client-level access.

This page is root-only.

### 15.13 AI Assistant

Route:

- `/ai-assistant`

Popup routes:

- `/dashboard`
- `/fraud-reports`
- `/points`
- `/notifications`
- `/suggestions`
- `/slider-ads`
- `/categories`
- `/admin-chat`

Main files:

- `src/pages/AIAssistantPage.tsx`
- `src/features/aiAssistant/AIAssistantContext.tsx`
- `src/features/aiAssistant/dashboardSnapshot.ts`
- `src/features/aiAssistant/aiAssistantApi.ts`
- `src/features/aiAssistant/AIAssistantQuickChat.tsx`

Behavior:

- root-only full AI assistant page
- popup assistant available on selected routes for users with `VIEW_ANALYTICS` or root
- loads dashboard snapshot context from many dashboard APIs
- stores assistant settings and memory locally
- supports sessions/chats and “Agent Mode”
- can gate write actions behind confirmation phrases

Developer caution:

- this area is security-sensitive because it can trigger dashboard write actions
- do not broaden available write tools or routes casually

## 16. API Integration Rules

Key file:

- `src/core/infrastructure/api/constants.ts`

Rules already reflected in the codebase:

- endpoint constants belong in `constants.ts`
- backend response shape normalization should happen inside feature API files or contexts
- pages should not normalize inconsistent payloads directly
- auth-aware requests should use the existing `HttpClient`/container pattern where applicable

For new dashboard features, prefer this sequence:

1. add endpoint constants
2. add feature API service under `src/features/<feature>`
3. normalize backend shapes there
4. build page/components using the normalized shape only
5. wire route, sidebar, and permission mapping

## 17. State Management Patterns

The app uses plain React state plus contexts, not Redux.

Patterns currently in use:

- page-local `useState` and `useMemo` for CRUD/admin tables
- feature contexts for shared stateful workflows
  - auth
  - notifications
  - suggestions
  - KBZ verification
  - admin chat
  - AI assistant

When adding a new feature:

- use page-local state if the workflow stays inside one page
- introduce a feature context only when multiple components/pages need the same live workflow state

## 18. Testing Status

The repo contains smoke and unit tests under:

- `src/pages/__tests__`
- `src/features/**/__tests__`

Existing tests are strongest around AI assistant behavior and some page smoke coverage. New high-risk workflows should add at least smoke coverage if you touch:

- login/auth restore
- permissions
- route access
- AI assistant tool execution
- notifications

## 19. Known Constraints and Inconsistencies

These are important for future developers:

- the repo still contains older clean-architecture modules that are not the primary pattern for active admin dashboard features
- some legacy storage keys use `wms_*` naming even though this repo is now an admin dashboard
- login currently redirects to `/fraud-reports` after success, while route root redirect uses permission order
- route permission arrays use “any-of” semantics, not “all-of”
- backend payloads vary by endpoint, so normalization helpers are essential
- localization exists, but new UI strings must still be added carefully across locale bundles

## 20. Recommended Developer Workflow

When making a change:

1. identify the route/page involved
2. inspect the existing feature API/context first
3. confirm backend request/response fields exactly
4. update endpoint constants if needed
5. keep normalization in the feature API layer
6. keep page components focused on UI and workflow only
7. keep permission checks consistent across route and sidebar
8. add i18n keys for all new user-facing strings
9. run `npm run build`

## 21. Adding a New Admin Feature

Follow this project-specific checklist:

1. confirm backend endpoints
2. confirm request body fields exactly
3. confirm response shapes exactly
4. define permission key already provided by backend
5. add constants in `src/core/infrastructure/api/constants.ts`
6. add feature API file in `src/features/<feature>`
7. add page in `src/pages`
8. add route in `src/app/router/AppRouter.tsx`
9. add sidebar visibility in `src/widgets/layout/AppShell.tsx`
10. add access mapping in `src/features/adminPermissions/useAdminPermissions.ts`
11. add localization keys
12. run `npm run build`

## 22. Quick File Index

Use this list when onboarding:

- bootstrap: `src/main.tsx`
- provider stack: `src/app/App.tsx`
- router: `src/app/router/AppRouter.tsx`
- auth hook/provider: `src/core/presentation/hooks/useAuth.tsx`
- auth service: `src/core/application/services/AuthService.ts`
- auth repo: `src/core/infrastructure/repositories/ApiAuthRepository.ts`
- DI container: `src/core/infrastructure/di/container.ts`
- endpoints: `src/core/infrastructure/api/constants.ts`
- app shell: `src/widgets/layout/AppShell.tsx`
- permissions: `src/features/adminPermissions/useAdminPermissions.ts`
- notifications: `src/features/adminNotifications/AdminNotificationsContext.tsx`
- verification: `src/features/kbzVerification/VerificationWorkflowContext.tsx`
- AI assistant: `src/features/aiAssistant/AIAssistantContext.tsx`
- i18n config: `src/lib/i18n/index.ts`
- auth storage helpers: `src/lib/cookies.ts`

## 23. Maintenance Expectation

If the implementation changes, update this document in the same branch. This file is meant to stay aligned with the real code, not serve as a one-time overview.
