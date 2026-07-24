# Phase 3: Admin Dashboard

Part of the technet portfolio roadmap (tracked in Claude project memory as `project_portfolio_roadmap`). Spans both repos. Written and decided without an interactive brainstorm round — the user granted full creative freedom and asked not to be interrupted with questions for this phase.

## Problem

The original roadmap scoped Phase 3 ("admin dashboard — product CRUD UI, order status management UI") as depending on Phase 2 (Firebase Admin token verification). Phase 2 was explicitly skipped. Building an "admin" dashboard with zero server-side protection would just be a public CRUD panel with a misleading label — not acceptable per this project's own stated security posture (the original audit flagged unprotected mutation routes as the #1 issue). This phase includes the minimum viable protection needed to make "admin" mean something, scoped only to the new admin actions — not a full re-litigation of Phase 2's broader scope.

## Decision: token verification without a service account

Firebase ID tokens are standard RS256-signed JWTs. They can be cryptographically verified using Google's public signing keys, without needing the Firebase Admin SDK or a service-account credential (which would require asking the user for a new secret — avoided per "don't ask" for this phase). This is a documented, widely-used pattern:

- Fetch signing keys from `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` (via `jwks-rsa`, which handles key caching/rotation by `kid`).
- Verify with `jsonwebtoken`: algorithm `RS256`, issuer `https://securetoken.google.com/<project-id>`, audience `<project-id>`.
- `<project-id>` is `technet-3be44` — the same public Firebase project ID already present in the client's `.env.local` as `VITE_FIREBASE_PROJECT_ID`. It's a public identifier (visible in every client bundle and browser network request), not a secret, so no new credential is needed from the user.
- On success, the token's `email` claim is cryptographically trustworthy — a meaningful upgrade over today's checkout flow, which trusts a client-supplied email with zero verification.

This closes the original audit's core finding (`POST/DELETE /product` unprotected) as a side effect of building the admin dashboard, without expanding scope into a full auth rewrite of every mutation route (`createOrder` stays as today — verifying it is Phase 2 territory, not reopened here).

## Scope

### Server (`technet-server`)

- `middleware/verifyToken.js`: `verifyFirebaseToken(token)` — verifies a Firebase ID token as described above, returns the decoded payload or throws.
- `middleware/requireAdmin.js`: Express middleware — extracts `Authorization: Bearer <token>`, verifies it, looks up the user by the token's verified email, checks `role === "admin"` in Mongo, 401/403 on failure, attaches `req.adminEmail` on success.
- `POST /product` and `DELETE /product/:id` (existing, currently unprotected) gain `requireAdmin`.
- `PATCH /product/:id` (new): admin-only product edit.
- `GET /orders` (existing, currently unprotected and returns every user's personal data — a real privacy gap discovered while scoping this phase) becomes admin-only via `requireAdmin`.
- `GET /orders/mine` (new): returns only the requesting user's own orders, scoped by the token's verified email (not a client-supplied parameter) — replaces the client's current pattern of fetching *all* orders and filtering client-side.
- `PATCH /order/:id/status` (new): admin-only order status update. Valid values: `pending`, `processing`, `shipped`, `delivered`, `cancelled` (the lifecycle decided back in the original roadmap brainstorm).
- New dependencies: `jsonwebtoken`, `jwks-rsa`.
- New env var: `FIREBASE_PROJECT_ID=technet-3be44` in `.env` (already-gitignored, not a new secret — see above).
- One test: `requireAdmin`'s role-gating logic, with `verifyFirebaseToken` mocked via `jest.mock` (no live network call to Google's JWKS endpoint in CI — that would be flaky/slow). This is the one meaningful new logic branch this phase adds; matches the established "key flows only" testing decision.

### Client (`technet-react-redux`)

- `userSlice.ts`: add `role: string | null` to user state. `createUser` (signup) always defaults to `role: 'customer'` (true by construction — the server also forces this default, and no signup can ever be an admin at creation time). `loginUser` and `signInWithGoogle` fetch the real role from `GET /user/:email` after Firebase auth succeeds, falling back to `'customer'` if the user document doesn't exist yet (handles the Google-signup race where the Mongo doc hasn't been created yet — fails closed, never silently grants admin). New `fetchCurrentUser` thunk does the same fetch, used by `App.tsx`'s `onAuthStateChanged` to restore role on page reload. `logoutUser` clears role along with email.
- `apiSlice.ts`: `prepareHeaders` attaches the current Firebase user's ID token (`auth.currentUser?.getIdToken()`) as `Authorization: Bearer <token>` on every request. Harmless for non-admin endpoints (they don't check it); required for the new admin endpoints.
- `AdminRoute.tsx` (new, mirrors `PrivateRoute`): redirects to `/` unless `user.role === 'admin'`.
- Routes: `/admin` (index shell with links), `/admin/products`, `/admin/orders`, all wrapped in `AdminRoute`.
- Navbar: an "Admin" link, visible only when `user.role === 'admin'`.
- `productApi.ts`: new `updateProduct` mutation (`PATCH /product/:id`).
- `orderApi.ts`: new `updateOrderStatus` mutation (`PATCH /order/:id/status`) and `getMyOrders` query (`GET /orders/mine`), replacing `getOrders` in `Profile.tsx` (which would otherwise break once `GET /orders` becomes admin-gated — a real regression this phase must not introduce). `getOrders` (all orders) is kept for the new admin Orders page.
- `AdminProducts.tsx` (new page): table of all products, add/edit via a `Sheet` slide-over form (reusing the existing shadcn `Sheet`/`Input`/`Textarea`/`Switch` components, the same pattern already used in `Checkout.tsx`), delete with a confirm.
- `AdminOrders.tsx` (new page): table of all orders, a `Select` dropdown per row (existing shadcn `Select` component, not yet used elsewhere in this app) to change status, calling `updateOrderStatus` on change.
- `AdminDashboard.tsx` (new page): minimal `/admin` index — two links to Products and Orders.

## Out of scope

Re-verifying `createOrder`'s `userEmail` against the token (checkout flow keeps today's trust model — a full audit of every write path is Phase 2 territory, deliberately not reopened here). Pagination on the new admin tables (Phase 4). Broader test coverage beyond the one `requireAdmin` test (Phase 5). Image upload for product creation (products still take an image URL string, as today).

## Risk accepted, disclosed

`createOrder` and the checkout flow are unchanged — a client can still claim any `userEmail` when placing an order, same as before this phase. This phase only adds real verification to the *admin* surface being built now, not a blanket fix. Flagging this explicitly so it isn't mistaken for a broader security pass.
