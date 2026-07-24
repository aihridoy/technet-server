# Phase 3: Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing (currently unused) admin CRUD endpoints a real UI, protected by cryptographic Firebase ID token verification plus a Mongo `role` check — no service-account credential needed.

**Architecture:** Server gets a small middleware pair (`verifyToken.js` does the JWT verification, `requireAdmin.js` does the role gate) reused across three newly-protected/added endpoints. Client gets `role` threaded through Redux (fetched from the backend, never trusted from Firebase alone), a route guard mirroring the existing `PrivateRoute` pattern, and two admin pages built from already-installed shadcn components (`Sheet`, `Select`) — no new UI dependencies.

**Tech Stack:** `jsonwebtoken` + `jwks-rsa` (server, new), existing RTK Query / shadcn-ui / Firebase Auth (client, no new dependencies).

## Global Constraints

- Firebase project ID for token verification: `technet-3be44` (public identifier, goes in `FIREBASE_PROJECT_ID` env var — not a secret).
- Order status values: `pending`, `processing`, `shipped`, `delivered`, `cancelled` (decided in the original roadmap brainstorm).
- `createOrder` and the checkout flow are explicitly NOT touched — still trust a client-supplied `userEmail`, same as before this phase. Don't "fix" this as a drive-by; it's out of scope (Phase 2 territory).
- One PR per repo, per the established workflow (commit → push → PR → merge).
- Testing: one new server test (`requireAdmin`'s role-gating logic, mocked — no live network call to Google's JWKS in CI). No new client test this phase — the admin pages are UI-heavy CRUD forms with no novel logic branch comparable to Phase 1's `StarRatingInput`; manual verification (real login, real admin promotion) is the appropriate check here, consistent with "key flows only."

---

## Server tasks (`technet-server`)

### Task 1: Firebase token verification + `requireAdmin` middleware

**Files:**
- Create: `middleware/verifyToken.js`
- Create: `middleware/requireAdmin.js`
- Create: `tests/requireAdmin.test.js`
- Create: `.env.example`
- Modify: `.env` (add `FIREBASE_PROJECT_ID`, not committed — already gitignored)
- Modify: `package.json` (add `jsonwebtoken`, `jwks-rsa` dependencies)

**Interfaces:**
- Produces: `verifyFirebaseToken(token: string): Promise<DecodedToken>` from `verifyToken.js` — throws on invalid/expired/wrong-audience tokens, resolves to the decoded JWT payload (has `.email`) on success.
- Produces: `requireAdmin` Express middleware from `requireAdmin.js` — on success calls `next()` and sets `req.adminEmail`; on failure sends 401 (no/invalid token) or 403 (valid token, non-admin user). Later tasks in this plan import and use this middleware directly.

- [ ] **Step 1: Install dependencies**

```bash
npm install jsonwebtoken jwks-rsa
```

- [ ] **Step 2: Add `FIREBASE_PROJECT_ID` to `.env`**

Append this line to the existing `.env` file (it's gitignored, so this is a local-only edit, not a commit):
```
FIREBASE_PROJECT_ID=technet-3be44
```

- [ ] **Step 3: Add `.env.example`**

```
DB_USER=
DB_PASS=
FIREBASE_PROJECT_ID=technet-3be44
PORT=8000
```

- [ ] **Step 4: Write `middleware/verifyToken.js`**

```js
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri:
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  cache: true,
  cacheMaxAge: 6 * 60 * 60 * 1000,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

const verifyFirebaseToken = (token) =>
  new Promise((resolve, reject) => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });

module.exports = { verifyFirebaseToken };
```

- [ ] **Step 5: Write `middleware/requireAdmin.js`**

```js
const { verifyFirebaseToken } = require("./verifyToken");
const { userCollection } = require("../models/userModel");

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).send({ status: false, error: "Missing auth token" });
    }

    const decoded = await verifyFirebaseToken(token);
    const email = decoded.email;
    if (!email) {
      return res.status(401).send({ status: false, error: "Invalid token" });
    }

    const user = await userCollection().findOne({ email });
    if (!user || user.role !== "admin") {
      return res.status(403).send({ status: false, error: "Admin access required" });
    }

    req.adminEmail = email;
    next();
  } catch (err) {
    res.status(401).send({ status: false, error: "Invalid or expired token" });
  }
};

module.exports = { requireAdmin };
```

- [ ] **Step 6: Write the failing test**

```js
// tests/requireAdmin.test.js
jest.mock("../middleware/verifyToken", () => ({
  verifyFirebaseToken: jest.fn(),
}));
jest.mock("../models/userModel", () => ({
  userCollection: jest.fn(),
}));

const { verifyFirebaseToken } = require("../middleware/verifyToken");
const { userCollection } = require("../models/userModel");
const { requireAdmin } = require("../middleware/requireAdmin");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("requireAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects requests with no Authorization header", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a verified non-admin user", async () => {
    verifyFirebaseToken.mockResolvedValue({ email: "customer@example.com" });
    userCollection.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ email: "customer@example.com", role: "customer" }),
    });
    const req = { headers: { authorization: "Bearer sometoken" } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows a verified admin user through", async () => {
    verifyFirebaseToken.mockResolvedValue({ email: "admin@example.com" });
    userCollection.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ email: "admin@example.com", role: "admin" }),
    });
    const req = { headers: { authorization: "Bearer sometoken" } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.adminEmail).toBe("admin@example.com");
  });
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test`
Expected: `Tests: 4 passed, 4 total` (3 new `requireAdmin` tests + the existing `review.test.js` aggregation test). This should pass immediately since the implementation already exists — it's confirming correctness, not red-green from scratch.

- [ ] **Step 8: Commit**

```bash
git add middleware/verifyToken.js middleware/requireAdmin.js tests/requireAdmin.test.js .env.example package.json package-lock.json
git commit -m "feat: add Firebase token verification and requireAdmin middleware"
```

(`.env` itself is gitignored — do not attempt to add or commit it.)

---

### Task 2: Product admin endpoints

**Files:**
- Modify: `controllers/productController.js`
- Modify: `routes/productRoutes.js`

**Interfaces:**
- Consumes: `requireAdmin` from `middleware/requireAdmin.js` (Task 1).
- Produces: `PATCH /product/:id` (admin-only product edit). `POST /product` and `DELETE /product/:id` gain `requireAdmin` (previously unprotected).

- [ ] **Step 1: Add `updateProduct` to `controllers/productController.js`**

Add this export alongside the existing ones (don't touch `getProducts`, `getProductById`, `addProduct`, `deleteProduct`, `searchProducts`):

```js
exports.updateProduct = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await productCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    res.send({ status: true, data: result });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
```

- [ ] **Step 2: Update `routes/productRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/productController");
const { addReview, getReviews } = require("../controllers/reviewController");
const { requireAdmin } = require("../middleware/requireAdmin");

router.get("/products", getProducts);
router.get("/product/:id", getProductById);
router.post("/product", requireAdmin, addProduct);
router.patch("/product/:id", requireAdmin, updateProduct);
router.delete("/product/:id", requireAdmin, deleteProduct);
router.get("/search", searchProducts);
router.post("/product/:productId/reviews", addReview);
router.get("/product/:productId/reviews", getReviews);

module.exports = router;
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, then:
```bash
curl -X POST http://localhost:8000/product -H "Content-Type: application/json" -d '{"name":"test"}'
```
Expected: `{"status":false,"error":"Missing auth token"}` with HTTP 401 — confirms the route is no longer wide open. (The success path — a real admin token — can only be exercised from the client after Task 4-5 land; that's expected, not a gap here.)

- [ ] **Step 4: Commit**

```bash
git add controllers/productController.js routes/productRoutes.js
git commit -m "feat: protect product mutation routes, add admin product edit endpoint"
```

---

### Task 3: Order admin endpoints

**Files:**
- Modify: `controllers/orderController.js`
- Modify: `routes/orderRoutes.js`

**Interfaces:**
- Consumes: `requireAdmin` (Task 1), `verifyFirebaseToken` (Task 1).
- Produces: `GET /orders/mine` (any authenticated user's own orders, scoped by verified token email). `GET /orders` becomes admin-only. `PATCH /order/:id/status` (admin-only status update).

- [ ] **Step 1: Update `controllers/orderController.js`**

```js
const { orderCollection } = require("../models/orderModel");
const { ObjectId } = require("../utils/db");
const { verifyFirebaseToken } = require("../middleware/verifyToken");

exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    if (
      !orderData.userEmail ||
      !orderData.products ||
      orderData.products.length === 0
    ) {
      return res
        .status(400)
        .send({ status: false, error: "User email and products are required" });
    }

    const result = await orderCollection().insertOne(orderData);
    res.send({ status: true, data: result });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await orderCollection().find({}).toArray();
    res.send({ status: true, data: orders });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).send({ status: false, error: "Missing auth token" });
    }
    const decoded = await verifyFirebaseToken(token);
    const orders = await orderCollection()
      .find({ userEmail: decoded.email })
      .toArray();
    res.send({ status: true, data: orders });
  } catch (err) {
    res.status(401).send({ status: false, error: "Invalid or expired token" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .send({ status: false, error: "Invalid status value" });
    }
    const result = await orderCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } }
    );
    res.send({ status: true, data: result });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
```

- [ ] **Step 2: Update `routes/orderRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { requireAdmin } = require("../middleware/requireAdmin");

router.post("/order", createOrder);
router.get("/orders", requireAdmin, getOrders);
router.get("/orders/mine", getMyOrders);
router.patch("/order/:id/status", requireAdmin, updateOrderStatus);

module.exports = router;
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, then:
```bash
curl http://localhost:8000/orders
```
Expected: `{"status":false,"error":"Missing auth token"}`, HTTP 401 — `/orders` is no longer public. Then:
```bash
curl http://localhost:8000/orders/mine
```
Expected: same 401 (no token supplied) — confirms `/orders/mine` requires *some* verified identity, just not an admin one. Full success-path verification (a real logged-in non-admin user seeing only their own orders) happens after the client tasks land.

- [ ] **Step 4: Commit**

```bash
git add controllers/orderController.js routes/orderRoutes.js
git commit -m "feat: gate order listing behind admin/verified-owner, add order status update"
```

---

## Client tasks (`technet-react-redux`)

### Task 4: Role in Redux + token attached to every request

**Files:**
- Modify: `src/redux/features/user/userSlice.ts`
- Modify: `src/redux/api/apiSlice.ts`
- Modify: `src/App.tsx`
- Modify: `src/layouts/Navbar.tsx`

**Interfaces:**
- Produces: `state.user.user.role: string | null` in Redux. `fetchCurrentUser(email)` thunk (used to restore role on page reload). `logoutUser()` now clears role too. The plain `setUser` action is removed (its two call sites are replaced below) — no other file references it (confirmed via repo-wide grep before writing this plan).
- Produces: every RTK Query request now carries `Authorization: Bearer <firebase-id-token>` when a user is signed in — required by Task 6/7's admin mutations, harmless for every other endpoint (none of them check it).

- [ ] **Step 1: Replace `src/redux/features/user/userSlice.ts`**

```ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface IUser {
  user: {
    email: string | null;
    role: string | null;
  };
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

interface ICredentials {
  email: string;
  password: string;
}

const initialState: IUser = {
  user: {
    email: null,
    role: null,
  },
  isLoading: false,
  isError: false,
  error: null,
};

const fetchRole = async (email: string): Promise<string> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/${email}`);
    const json = await res.json();
    return json?.data?.role || 'customer';
  } catch {
    return 'customer';
  }
};

export const createUser = createAsyncThunk(
  'user/createUser',
  async ({ email, password }: ICredentials) => {
    const data = await createUserWithEmailAndPassword(auth, email, password);
    return { email: data.user.email, role: 'customer' };
  }
);

export const loginUser = createAsyncThunk(
  'user/loginUser',
  async ({ email, password }: ICredentials) => {
    const data = await signInWithEmailAndPassword(auth, email, password);
    const role = await fetchRole(data.user.email as string);
    return { email: data.user.email, role };
  }
);

export const signInWithGoogle = createAsyncThunk(
  'user/signInWithGoogle',
  async () => {
    const provider = new GoogleAuthProvider();
    const data = await signInWithPopup(auth, provider);
    const role = await fetchRole(data.user.email as string);
    return {
      email: data.user.email,
      role,
      displayName: data.user.displayName,
      photoURL: data.user.photoURL,
      uid: data.user.uid,
    };
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async (email: string) => {
    const role = await fetchRole(email);
    return { email, role };
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    logoutUser: (state) => {
      state.user.email = null;
      state.user.role = null;
      state.isError = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.user.email = action.payload.email;
        state.user.role = action.payload.role;
        state.isLoading = false;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.user.email = null;
        state.user.role = null;
        state.isLoading = false;
        state.isError = true;
        state.error = action.error.message!;
      })
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user.email = action.payload.email;
        state.user.role = action.payload.role;
        state.isLoading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.user.email = null;
        state.user.role = null;
        state.isLoading = false;
        state.isError = true;
        state.error = action.error.message!;
      })
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.user.email = action.payload.email;
        state.user.role = action.payload.role;
        state.isLoading = false;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.user.email = null;
        state.user.role = null;
        state.isLoading = false;
        state.isError = true;
        state.error = action.error.message!;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user.email = action.payload.email;
        state.user.role = action.payload.role;
        state.isLoading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setLoading, logoutUser } = userSlice.actions;
export default userSlice.reducer;
```

- [ ] **Step 2: Replace `src/redux/api/apiSlice.ts`**

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { auth } from '@/lib/firebase';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Review', 'Product', 'User', 'Order'],
  endpoints: () => ({}),
});
```

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { onAuthStateChanged } from 'firebase/auth';
import { Toaster } from './components/ui/Toaster';
import MainLayout from './layouts/MainLayout';
import { auth } from './lib/firebase';
import { useAppDispatch } from './redux/hook';
import { setLoading, logoutUser, fetchCurrentUser } from './redux/features/user/userSlice';
import { useEffect } from 'react';

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        dispatch(fetchCurrentUser(user.email));
      } else {
        dispatch(logoutUser());
        dispatch(setLoading(false));
      }
    });
  }, [dispatch]);

  return (
    <div>
      <Toaster />
      <MainLayout />
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Update `src/layouts/Navbar.tsx`**

Change the import (remove `setUser`, it no longer exists):
```tsx
import { logoutUser } from '@/redux/features/user/userSlice';
```

Change `handleLogout`:
```tsx
const handleLogout = () => {
  signOut(auth).then(() => {
    dispatch(logoutUser());
  });
};
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` — expected clean (confirms no leftover references to the removed `setUser` action anywhere).
Run: `npm run build` — expected to succeed.
Run: `npm test` — expected `StarRatingInput` tests still pass (unrelated to this change, confirms nothing broke).

- [ ] **Step 6: Commit**

```bash
git add src/redux/features/user/userSlice.ts src/redux/api/apiSlice.ts src/App.tsx src/layouts/Navbar.tsx
git commit -m "feat: track user role in Redux, attach Firebase ID token to all API requests"
```

---

### Task 5: Admin route guard + routing + nav link

**Files:**
- Create: `src/routes/AdminRoute.tsx`
- Modify: `src/routes/routes.tsx`
- Modify: `src/layouts/Navbar.tsx`

**Interfaces:**
- Consumes: `state.user.user.role` (Task 4).
- Produces: `<AdminRoute>` wrapper component. Later tasks' pages (`AdminDashboard`, `AdminProducts`, `AdminOrders`) are wrapped in it via `routes.tsx`.

- [ ] **Step 1: Create `src/routes/AdminRoute.tsx`**

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/redux/hook';
import { ReactNode } from 'react';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAppSelector((state) => state.user);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user.email || user.role !== 'admin') {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Update `src/routes/routes.tsx`**

Add these imports alongside the existing ones:
```tsx
import AdminRoute from './AdminRoute';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminOrders from '@/pages/admin/AdminOrders';
```

Add these three route objects as children of the root `/` route (alongside the existing `/checkout`, `/profile` entries — same nesting level, same `App` layout):
```tsx
{
  path: '/admin',
  element: (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  ),
},
{
  path: '/admin/products',
  element: (
    <AdminRoute>
      <AdminProducts />
    </AdminRoute>
  ),
},
{
  path: '/admin/orders',
  element: (
    <AdminRoute>
      <AdminOrders />
    </AdminRoute>
  ),
},
```

(These reference `AdminDashboard`/`AdminProducts`/`AdminOrders`, created in Tasks 6-8 below — this task's own `tsc`/build check will fail until those exist. That's expected for this step order; the full check happens once Task 8 is done. If you're executing this task standalone, note it in your report as `DONE_WITH_CONCERNS` rather than treating the expected transient build failure as a blocker.)

- [ ] **Step 3: Add an admin nav link in `src/layouts/Navbar.tsx`**

In the account dropdown, right after the existing Profile link:
```tsx
<Link to="/profile">
  <DropdownMenuItem>Profile</DropdownMenuItem>
</Link>
{user.role === 'admin' && (
  <Link to="/admin">
    <DropdownMenuItem>Admin Dashboard</DropdownMenuItem>
  </Link>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/AdminRoute.tsx src/routes/routes.tsx src/layouts/Navbar.tsx
git commit -m "feat: add admin route guard, admin routes, and nav link"
```

---

### Task 6: Product admin API + Products management page

**Files:**
- Modify: `src/redux/features/products/productApi.ts`
- Create: `src/pages/admin/AdminProducts.tsx`

**Interfaces:**
- Produces: `useAddProductMutation`, `useUpdateProductMutation`, `useDeleteProductMutation` hooks. `AdminProducts` page component, imported by `routes.tsx` (Task 5).

- [ ] **Step 1: Replace `src/redux/features/products/productApi.ts`**

```ts
import { api } from '@/redux/api/apiSlice';

const productApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query({
      query: () => ({ url: '/products' }),
      providesTags: ['Product'],
    }),
    getProduct: build.query({
      query: (id) => ({
        url: `/product/${id}`,
      }),
    }),
    addProduct: build.mutation({
      query: (data) => ({
        url: '/product',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: build.mutation({
      query: ({ id, data }) => ({
        url: `/product/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: build.mutation({
      query: (id) => ({
        url: `/product/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    addReview: build.mutation({
      query: ({ productId, data }) => ({
        url: `/product/${productId}/reviews`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Review', id: productId },
      ],
    }),
    getReviews: build.query({
      query: (productId) => ({
        url: `/product/${productId}/reviews`,
      }),
      providesTags: (_result, _error, productId) => [
        { type: 'Review', id: productId },
      ],
    }),
    searchProducts: build.query({
      query: (name) => ({ url: `/search?name=${name}` }),
    }),
  }),
});

export const {
  useGetProductQuery,
  useGetProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetReviewsQuery,
  useAddReviewMutation,
  useSearchProductsQuery,
} = productApi;
```

- [ ] **Step 2: Create `src/pages/admin/AdminProducts.tsx`**

```tsx
import { useState } from 'react';
import {
  useGetProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '@/redux/features/products/productApi';
import { IProduct } from '@/types/globalTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/use-toast';

interface ProductFormState {
  name: string;
  image: string;
  price: string;
  features: string;
  status: boolean;
}

const emptyForm: ProductFormState = {
  name: '',
  image: '',
  price: '',
  features: '',
  status: true,
};

export default function AdminProducts() {
  const { data, isLoading } = useGetProductsQuery(undefined);
  const [addProduct, { isLoading: isAdding }] = useAddProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);

  const products: IProduct[] = data?.data || [];

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (product: IProduct) => {
    setEditingId(String(product._id));
    setForm({
      name: product.name,
      image: product.image,
      price: String(product.price),
      features: product.features.join('\n'),
      status: product.status,
    });
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      image: form.image,
      price: Number(form.price),
      features: form.features.split('\n').filter((f) => f.trim() !== ''),
      status: form.status,
    };

    try {
      if (editingId) {
        await updateProduct({ id: editingId, data: payload }).unwrap();
        toast({ description: 'Product updated' });
      } else {
        await addProduct({ ...payload, rating: 0, ratingCount: 0 }).unwrap();
        toast({ description: 'Product created' });
      }
      setOpen(false);
    } catch (err) {
      toast({ description: 'Failed to save product', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id).unwrap();
      toast({ description: 'Product deleted' });
    } catch (err) {
      toast({ description: 'Failed to delete product', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button onClick={openCreate}>Add Product</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingId ? 'Edit Product' : 'New Product'}</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.status}
                  onCheckedChange={(checked) => setForm({ ...form, status: checked })}
                />
                <Label>In stock</Label>
              </div>
              <Button type="submit" disabled={isAdding || isUpdating} className="w-full">
                {editingId ? 'Save Changes' : 'Create Product'}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Price</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-t">
                  <td className="p-3">{product.name}</td>
                  <td className="p-3">${product.price}</td>
                  <td className="p-3">
                    {product.rating} ({product.ratingCount ?? 0})
                  </td>
                  <td className="p-3">
                    {product.status ? 'In stock' : 'Out of stock'}
                  </td>
                  <td className="p-3 flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(String(product._id))}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expected clean.

- [ ] **Step 4: Commit**

```bash
git add src/redux/features/products/productApi.ts src/pages/admin/AdminProducts.tsx
git commit -m "feat: add product admin API hooks and products management page"
```

---

### Task 7: Order admin API + Orders management page + Profile fix

**Files:**
- Modify: `src/redux/features/order/orderApi.ts`
- Modify: `src/pages/Profile.tsx`
- Create: `src/pages/admin/AdminOrders.tsx`

**Interfaces:**
- Consumes: `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` from `src/components/ui/select.tsx` (already installed, unused elsewhere in the app).
- Produces: `useGetMyOrdersQuery`, `useUpdateOrderStatusMutation` hooks. `AdminOrders` page, imported by `routes.tsx` (Task 5).

- [ ] **Step 1: Replace `src/redux/features/order/orderApi.ts`**

```ts
import { api } from '@/redux/api/apiSlice';

const orderApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query({
      query: () => ({ url: '/orders' }),
      providesTags: ['Order'],
    }),
    getMyOrders: build.query({
      query: () => ({ url: '/orders/mine' }),
      providesTags: ['Order'],
    }),
    createOrder: build.mutation({
      query: (orderData) => ({
        url: '/order',
        method: 'POST',
        body: orderData,
      }),
      invalidatesTags: ['Order'],
    }),
    updateOrderStatus: build.mutation({
      query: ({ id, status }) => ({
        url: `/order/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrdersQuery,
  useGetMyOrdersQuery,
  useUpdateOrderStatusMutation,
} = orderApi;
```

- [ ] **Step 2: Update `src/pages/Profile.tsx`**

`GET /orders` is now admin-only (Task 3), so `Profile.tsx`'s current call to `useGetOrdersQuery` plus client-side filtering would break for regular users. Replace the query and simplify — the server now does the scoping via the verified token:

Change:
```tsx
const { data, isLoading, error } = useGetOrdersQuery(undefined, {
  refetchOnMountOrArgChange: true,
});

// Filter orders by user email
const userOrders = user?.email
  ? data?.data?.filter((order: Order) => order.userEmail === user.email) || []
  : [];
```
to:
```tsx
const { data, isLoading, error } = useGetMyOrdersQuery(undefined, {
  refetchOnMountOrArgChange: true,
  skip: !user?.email,
});

const userOrders = data?.data || [];
```

Update the import line from `useGetOrdersQuery` to `useGetMyOrdersQuery`:
```tsx
import { useGetMyOrdersQuery } from '@/redux/features/order/orderApi';
```

- [ ] **Step 3: Create `src/pages/admin/AdminOrders.tsx`**

```tsx
import {
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
} from '@/redux/features/order/orderApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

interface AdminOrder {
  _id: string;
  userEmail: string;
  name: string;
  city: string;
  total: number;
  status: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const { data, isLoading } = useGetOrdersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const orders: AdminOrder[] = data?.data || [];

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateOrderStatus({ id, status }).unwrap();
      toast({ description: 'Order status updated' });
    } catch (err) {
      toast({ description: 'Failed to update order status', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Orders</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">City</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-t">
                  <td className="p-3">#{order._id.slice(-6)}</td>
                  <td className="p-3">
                    {order.name}
                    <div className="text-xs text-gray-500">{order.userEmail}</div>
                  </td>
                  <td className="p-3">{order.city}</td>
                  <td className="p-3">${order.total.toFixed(2)}</td>
                  <td className="p-3">
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order._id, value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expected clean.

- [ ] **Step 5: Commit**

```bash
git add src/redux/features/order/orderApi.ts src/pages/Profile.tsx src/pages/admin/AdminOrders.tsx
git commit -m "feat: add order admin API hooks and orders management page, fix Profile to use verified own-orders endpoint"
```

---

### Task 8: Admin dashboard shell + full end-to-end verification

**Files:**
- Create: `src/pages/admin/AdminDashboard.tsx`

**Interfaces:**
- Produces: the `/admin` index page, imported by `routes.tsx` (Task 5). This is the last file `routes.tsx` needs — after this task, the whole app should build cleanly and be manually verifiable end-to-end.

- [ ] **Step 1: Create `src/pages/admin/AdminDashboard.tsx`**

```tsx
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold mb-8">Admin Dashboard</h1>
      <div className="flex justify-center gap-6">
        <Link
          to="/admin/products"
          className="px-8 py-6 border rounded-xl hover:shadow-lg transition-shadow text-lg font-medium"
        >
          Manage Products
        </Link>
        <Link
          to="/admin/orders"
          className="px-8 py-6 border rounded-xl hover:shadow-lg transition-shadow text-lg font-medium"
        >
          Manage Orders
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Full build verification**

Run: `npx tsc --noEmit` — expected clean (this is the first point where `routes.tsx`'s admin imports all resolve).
Run: `npm run build` — expected to succeed.
Run: `npm test` — expected `StarRatingInput` tests still pass.

- [ ] **Step 3: Manual end-to-end verification**

This is the first point real login-based verification is possible (needs both repos' servers running):
1. Start `technet-server` (`npm run dev`) and `technet-react-redux` (`npm run dev`).
2. Sign up a real account through the app if you don't already have one, then run `npm run promote-admin -- <that-email>` in `technet-server` to grant it `role: "admin"`.
3. Log in as that account. Confirm the Navbar shows "Admin Dashboard" in the account dropdown.
4. Visit `/admin` → confirm both cards render and link correctly.
5. Visit `/admin/products` → create a product, edit it, delete it. Confirm each action succeeds and the list updates.
6. Visit `/admin/orders` → change an order's status via the dropdown. Confirm it persists (reload the page, status should stick).
7. Log out, log in as a non-admin account (or don't promote a second test account at all) → confirm `/admin` redirects to `/` and no "Admin Dashboard" link appears in the nav.
8. Visit `/profile` as the non-admin account → confirm order history still loads correctly (this is the regression check for the `Profile.tsx` change in Task 7 — it must keep working for regular users).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx
git commit -m "feat: add admin dashboard shell page"
```

---

## Self-Review Notes

- **Spec coverage:** token verification + requireAdmin (Task 1), product admin endpoints (Task 2), order admin endpoints (Task 3), role in Redux + token attachment (Task 4), route guard + nav (Task 5), product admin UI (Task 6), order admin UI + Profile regression fix (Task 7), dashboard shell + full e2e verification (Task 8). Every spec section has a task. `createOrder` deliberately untouched, matching the spec's disclosed risk.
- **Type consistency:** `IProduct`/`IReview` types (from Phase 1) reused unchanged. `AdminOrder` is a new, task-local interface in `AdminOrders.tsx` — intentionally not unified with `Profile.tsx`'s existing `Order` interface, since the two components need different subsets of fields and this codebase's existing pattern (see `Home.tsx`, `Navbar.tsx`) already uses page-local product/order shape interfaces rather than a single shared one.
- **No placeholders:** every step has complete, runnable code.
- **Known sequencing quirk:** Task 5 references `AdminDashboard`/`AdminProducts`/`AdminOrders` before Tasks 6-8 create them — `tsc`/build will not go fully green until Task 8 lands. This is called out explicitly in Task 5 itself so it isn't mistaken for a broken task.
