# Phase 1: Data Foundation — Review Schema + Seed Data

Part of the technet portfolio roadmap (tracked in Claude project memory as `project_portfolio_roadmap`). Spans both repos: `technet-server` (schema, seed script) and `technet-react-redux` (review UI, price filter range).

## Problem

Product ratings today are a single hand-set integer on the product doc (`rating: 3`). Comments are unstructured strings with no author or rating — can't produce "5+ reviews and ratings per product" from this. Also only ~a handful of products exist in the live DB; portfolio needs 50+ to look like a real catalog.

## Data model changes (server)

New `reviews` collection, one document per review:

```js
{
  _id: ObjectId,
  productId: ObjectId,       // ref to products._id
  authorEmail: string,       // from Firebase-authenticated user
  authorName: string,        // display name, falls back to email local-part
  rating: number,            // 1-5 integer
  comment: string,
  createdAt: ISODate string
}
```

Product doc gains two denormalized fields, recomputed whenever a review is inserted:

```js
{
  ...existing fields,
  ratingAvg: number,   // mean of all reviews for this product, rounded to 1 decimal
  ratingCount: number
}
```

Recompute happens in the `addReview` controller via a Mongo aggregation (`$avg`, `$count`) right after insert, then a single `updateOne` on the product doc. Cheap at this scale, no background job needed.

`product.comments` (the old embedded string array) is dropped in favor of the `reviews` collection. `getComments`/`addComment`/`postComment`/`getComment` endpoints and their client hooks are replaced by `getReviews`/`addReview` (`GET/POST /product/:id/reviews`).

## Auth note (scoped down for this phase)

Full token verification is Phase 2. For Phase 1, `authorEmail`/`authorName` on a posted review come from the request body (client sends the logged-in Firebase user's email/displayName) same trust level as today's `POST /user`. Not hardened yet — that's what Phase 2 closes. Documented here so it isn't mistaken for the final state.

## Admin seeding

No fake Firebase accounts. Flow:
1. User signs up normally through the existing client flow (Firebase account + `POST /user` insert, `role` always forced to `"customer"` server-side regardless of request body — prevents self-escalation).
2. A small server script `scripts/promoteAdmin.js <email>` flips that user's `role` to `"admin"` in Mongo. Run once, manually, by the project owner after signing up with their own email.

`role` field added to user doc now (`"customer"` default) even though nothing enforces it until Phase 2 — avoids a second migration later.

## Seed script (`technet-server/scripts/seed.js`)

- `node scripts/seed.js` — wipes `products` and `reviews` collections, inserts fresh data. Guarded by a `--force` flag or `NODE_ENV !== production` check so it can't be run against a live prod DB by accident.
- 50+ products across categories matching an actual PC/tech store: CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Monitor, Prebuilt PC, Laptop, Keyboard, Mouse, Headset. Fields match `IProduct` on the client (`name`, `image`, `price`, `features`, `status`, plus new `ratingAvg`/`ratingCount`).
- Prices span a realistic range: ~$15 (mouse) to ~$2500 (prebuilt PC) — wider than today's data.
- Images: stable placeholder/stock photo URLs (picsum.photos or unsplash source URLs keyed by category), not uploads — real image upload is out of scope for this phase.
- 5-8 reviews per product, generated from a small pool of author names + comment templates combined with randomized 1-5 ratings (weighted toward 4-5, realistic for a store that isn't failing), timestamps spread over the last ~6 months.

## Client changes (`technet-react-redux`)

- `globalTypes.ts`: `IProduct` gains `ratingAvg: number; ratingCount: number` (replaces bare `rating`).
- `ProductReview.tsx`: star-rating input (1-5) alongside the existing comment textarea when posting; review list shows author name, star rating, comment, relative date instead of a plain string list.
- `ProductCard.tsx` / product details: display `ratingAvg` (e.g. "4.3 ★ (7)") instead of the old raw `rating` integer.
- `productApi.ts`: swap `getComment`/`postComment` for `getReviews`/`addReview` hitting the new endpoints.
- Price slider max on `Products.tsx` (currently hardcoded `max={150}`) bumped to match the new price range (e.g. 2500) — otherwise the filter can't reach most of the seeded catalog.

## Testing

Per the "key flows only" decision: one server test (Supertest) covering `addReview` → aggregation → product `ratingAvg` update; one client test (Vitest) covering the star-rating input renders and submits the right payload. Full test suite build-out is Phase 5 — these two are written now because they'd otherwise never get retrofitted once the review UI ships.

## Out of scope for this phase

Auth hardening (Phase 2), admin UI to manage products/orders (Phase 3), pagination on the reviews list or products list (Phase 4), CI (Phase 6), real image upload, Stripe (explicitly skipped per user).
