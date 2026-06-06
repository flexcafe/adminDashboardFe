# AGENTS.md

This file applies to the entire repository.

## Purpose

Use this project as an admin dashboard frontend for role-based operational tools.
When implementing new features, prioritize:

- exact backend contract matching
- permission-aware UI behavior
- consistency with existing page, modal, table, and API-service patterns
- minimal, focused changes

## Tech Stack

- React with functional components and hooks
- TypeScript
- Vite
- Axios for most admin API integrations
- Framer Motion for modal/transition behavior
- Existing project CSS classes in `src/index.css` and related files
- i18n is present, but not every new feature is fully localized yet

## Architecture Expectations

When adding a new admin feature, follow this shape unless the existing feature pattern clearly differs:

1. Add endpoint constants in `src/core/infrastructure/api/constants.ts`
2. Add feature API service in `src/features/<feature>/<feature>Api.ts`
3. Add feature components in `src/features/<feature>/`
4. Add page entry in `src/pages/<Feature>Page.tsx`
5. Add route in `src/app/router/AppRouter.tsx`
6. Add sidebar item in `src/widgets/layout/AppShell.tsx`
7. Add permission mapping in `src/features/adminPermissions/useAdminPermissions.ts`

## API Rules

- Never guess request payload field names.
- Match backend request/response shapes exactly.
- If backend examples use fields like `nickname`, `adminRoleId`, or nested `permissions`, use those exact names.
- Normalize inconsistent response shapes inside the feature API service, not inside page components.
- Keep auth-aware axios behavior consistent with existing admin API files.
- Prefer flexible normalization helpers because backend payload shapes may vary slightly by endpoint.

## Permission Rules

- `ROOT_ADMIN` gets full access automatically.
- Non-root roles must use the authenticated user's real `permissions` array.
- Do not fetch root-only endpoints to resolve non-root permissions.
- Sidebar visibility and route access must use the same permission source.
- If a page should be root-only, make that explicit in `src/features/adminPermissions/useAdminPermissions.ts`.
- Do not invent new permission keys unless the backend explicitly provides them.

## CRUD Implementation Standard

For any new CRUD feature, the default expectation is:

- list page with loading, empty, and error states
- create modal or form
- update action
- delete or deactivate confirmation flow
- automatic refresh after successful mutation
- permission-aware route and sidebar entry

Recommended sequence:

1. confirm endpoint contract
2. define types
3. build API service
4. build table/list UI
5. build create/edit modal
6. wire mutations
7. add permission guard
8. run build

## UI Rules

- Reuse existing project classes before adding new styling systems.
- Do not introduce Tailwind unless the repo is already using it for that area.
- Match existing admin page patterns:
  - `page`
  - `pageHeader`
  - `metricCard`
  - `verificationTable`
  - `verificationActionButton`
  - `sliderModal`
- Prefer clean, compact admin layouts over custom one-off designs.
- If action cells become cramped, add focused CSS classes in `src/index.css`.

## Routing and Access

- Route guards must redirect to the first allowed page when appropriate.
- If the user lacks access and no allowed page exists, show the access denied view.
- Do not leave users on a forbidden default route if another permitted route exists.

## Auth and Session Rules

- Treat the authenticated user object as the source of truth for non-root permissions.
- Preserve and use:
  - `adminRoleName`
  - `adminRoleId`
  - `permissions`
  - `nickname` when present
- Be careful when changing login/logout behavior; avoid stale user sessions.

## Validation Rules

- Run `npm run build` after meaningful frontend changes.
- Fix compile errors caused by your changes.
- Do not attempt to fix unrelated warnings or bundle-size warnings unless asked.

## Change Discipline

- Keep changes surgical.
- Do not rename existing files or abstractions without strong reason.
- Do not rewrite unrelated modules.
- Do not add speculative abstractions for future features unless there is immediate reuse.

## When Adding a New Admin Feature

Use this prompt structure internally:

- endpoint list
- example request body
- example response body
- permission key
- table columns
- modal fields
- action flow
- refresh behavior
- route path
- sidebar label

If any of those are missing, prefer asking for the missing backend contract instead of guessing.
