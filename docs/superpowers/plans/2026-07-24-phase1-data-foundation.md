# Phase 1: Data Foundation (Reviews + Seed Data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-set `rating` integer and unstructured string comments with a real `reviews` collection (author, 1-5 rating, comment), recompute each product's `rating`/`ratingCount` from actual reviews, and seed 50+ realistic products with 5-8 reviews apiece so the catalog looks like a real store.

**Architecture:** Server gets a new `reviews` collection + `reviewController`/`reviewModel`, replacing the old embedded `product.comments` array and its controller functions. `index.js` splits into a testable `app.js` (routes/middleware only) + thin `index.js` (connects DB, starts listening) so Supertest can exercise real routes against an in-memory Mongo instance. Client swaps the old comment hooks for review hooks and gets a small isolated `StarRatingInput` component. Per the spec's "correction found during planning," the `rating` field name is kept as-is (now server-computed) rather than renamed to `ratingAvg`, to avoid touching four unrelated files that only read it.

**Tech Stack:** Express, native `mongodb` driver, Jest + Supertest + `mongodb-memory-server` (server tests); React, Redux Toolkit/RTK Query, Vitest + React Testing Library (client tests).

## Global Constraints

- Two repos: `technet-server` at `/Users/aihridoy/technet-server`, `technet-react-redux` at `/Users/aihridoy/technet-react-redux`. File paths below are relative to whichever repo the task names.
- Per user instruction: this phase is its own PR per repo (server PR, client PR). Follow the commit → push → PR → merge workflow after each repo's tasks are done and verified.
- Per spec decision: only **two** automated tests this phase (one server, one client, covering the two riskiest new pieces of logic: rating aggregation, star-input payload shaping). Every other task ends with a manual verification step (curl, `tsc --noEmit`, or `npm run build`), not a full TDD red/green cycle — matches the "key flows only" testing decision already made.
- Field naming: product rating field stays `rating` (float, 1 decimal), new field is `ratingCount` (int). Do not introduce `ratingAvg`.
- No Stripe, no real payment work this phase — out of scope, already decided.
- Seed script must refuse to run against a production DB without an explicit `--force` flag.

---

## Server tasks (`technet-server`)

### Task 1: Make the Express app testable + configurable DB

**Files:**
- Create: `app.js`
- Modify: `index.js`
- Modify: `utils/db.js`

**Interfaces:**
- Produces: `module.exports` of `app.js` is a configured Express app (no `listen`, no DB connect) — later tasks and the Task 3 test import this directly.
- Produces: `utils/db.js`'s `connectDB()` now honors `process.env.MONGO_URI` (full connection string) and `process.env.DB_NAME` (database name) when set, falling back to the existing Atlas construction otherwise.

- [ ] **Step 1: Extract `app.js` from `index.js`**

```js
// app.js
const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(productRoutes);
app.use(userRoutes);
app.use(orderRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

module.exports = app;
```

- [ ] **Step 2: Slim `index.js` down to bootstrapping**

```js
// index.js
const app = require("./app");
const { connectDB } = require("./utils/db");
const { port } = require("./utils/config");

connectDB().catch(console.error);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

- [ ] **Step 3: Make `utils/db.js` accept an override URI/DB name**

```js
// utils/db.js
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const uri =
  process.env.MONGO_URI ||
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pfan7vt.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME || "tech-net");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

const getDB = () => db;

module.exports = { connectDB, getDB, ObjectId };
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Expected: same `Example app listening on port 8000` output as before, `GET http://localhost:8000/products` still returns data.

- [ ] **Step 5: Commit**

```bash
git add app.js index.js utils/db.js
git commit -m "refactor: extract testable app.js, allow MONGO_URI override"
```

---

### Task 2: Reviews collection — model, controller, routes; force `role` default

**Files:**
- Create: `models/reviewModel.js`
- Create: `controllers/reviewController.js`
- Modify: `routes/productRoutes.js`
- Modify: `controllers/productController.js`
- Modify: `controllers/userController.js`

**Interfaces:**
- Consumes: `getDB()`, `ObjectId` from `utils/db.js` (Task 1).
- Produces: `reviewCollection()` from `reviewModel.js`. `addReview(req, res)` and `getReviews(req, res)` from `reviewController.js`, mounted at `POST /product/:productId/reviews` and `GET /product/:productId/reviews`. Every product document gains `rating` (float) and `ratingCount` (int) kept in sync by `addReview`.

- [ ] **Step 1: Add `models/reviewModel.js`**

```js
const { getDB } = require("../utils/db");

const reviewCollection = () => getDB().collection("reviews");

module.exports = { reviewCollection };
```

- [ ] **Step 2: Add `controllers/reviewController.js`**

```js
const { ObjectId } = require("../utils/db");
const { reviewCollection } = require("../models/reviewModel");
const { productCollection } = require("../models/productModel");

const recomputeProductRating = async (productId) => {
  const agg = await reviewCollection()
    .aggregate([
      { $match: { productId: new ObjectId(productId) } },
      {
        $group: {
          _id: "$productId",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const { avg = 0, count = 0 } = agg[0] || {};
  await productCollection().updateOne(
    { _id: new ObjectId(productId) },
    { $set: { rating: Math.round(avg * 10) / 10, ratingCount: count } }
  );
};

exports.addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { authorEmail, authorName, rating, comment } = req.body;

    if (!authorEmail || !rating || !comment) {
      return res.status(400).send({
        status: false,
        error: "authorEmail, rating and comment are required",
      });
    }
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .send({ status: false, error: "rating must be between 1 and 5" });
    }

    const review = {
      productId: new ObjectId(productId),
      authorEmail,
      authorName: authorName || authorEmail.split("@")[0],
      rating: Number(rating),
      comment,
      createdAt: new Date().toISOString(),
    };

    await reviewCollection().insertOne(review);
    await recomputeProductRating(productId);

    res.send({ status: true, data: review });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await reviewCollection()
      .find({ productId: new ObjectId(productId) })
      .sort({ createdAt: -1 })
      .toArray();
    res.send({ status: true, data: reviews });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
```

- [ ] **Step 3: Remove the old comment endpoints from `controllers/productController.js`**

Delete the `exports.addComment` and `exports.getComments` functions (lines currently ~44-73). Leave `getProducts`, `getProductById`, `addProduct`, `deleteProduct`, `searchProducts` untouched.

- [ ] **Step 4: Update `routes/productRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  addProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/productController");
const { addReview, getReviews } = require("../controllers/reviewController");

router.get("/products", getProducts);
router.get("/product/:id", getProductById);
router.post("/product", addProduct);
router.delete("/product/:id", deleteProduct);
router.get("/search", searchProducts);
router.post("/product/:productId/reviews", addReview);
router.get("/product/:productId/reviews", getReviews);

module.exports = router;
```

- [ ] **Step 5: Force `role` default in `controllers/userController.js`**

```js
const { userCollection } = require("../models/userModel");

exports.addUser = async (req, res) => {
  try {
    const { email, ...rest } = req.body;
    const result = await userCollection().insertOne({
      email,
      ...rest,
      role: "customer",
    });
    res.send(result);
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getUserByEmail = async (req, res) => {
  try {
    const result = await userCollection().findOne({ email: req.params.email });
    if (result?.email) {
      return res.send({ status: true, data: result });
    }
    res.send({ status: false });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
```

`role: "customer"` is spread last so it always wins even if a client sends its own `role` in the request body — closes a self-escalation path before Phase 2's auth hardening even lands.

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, then in another terminal:
```bash
curl -X POST http://localhost:8000/product -H "Content-Type: application/json" \
  -d '{"name":"Test","image":"x","price":10,"features":[],"status":true,"rating":0,"ratingCount":0}'
# copy the insertedId from the response, then:
curl -X POST http://localhost:8000/product/<insertedId>/reviews -H "Content-Type: application/json" \
  -d '{"authorEmail":"a@example.com","authorName":"A","rating":5,"comment":"Great"}'
curl http://localhost:8000/product/<insertedId>
```
Expected: last call shows `"rating":5,"ratingCount":1`.

- [ ] **Step 7: Commit**

```bash
git add models/reviewModel.js controllers/reviewController.js routes/productRoutes.js controllers/productController.js controllers/userController.js
git commit -m "feat: replace embedded comments with reviews collection + rating aggregation"
```

---

### Task 3: Automated test — review aggregation (the one server test this phase)

**Files:**
- Create: `tests/review.test.js`
- Modify: `package.json` (add devDependencies + test script)

**Interfaces:**
- Consumes: `app.js` (Task 1), review routes (Task 2).

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev jest supertest mongodb-memory-server
```

- [ ] **Step 2: Add test script and Jest config to `package.json`**

Add to `scripts`: `"test": "jest --runInBand"`.
Add a top-level key: `"jest": { "testTimeout": 30000 }` (mongodb-memory-server's first download/boot can be slow).

- [ ] **Step 3: Write the failing test**

```js
// tests/review.test.js
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectDB } = require("../utils/db");
const app = require("../app");

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.DB_NAME = "test-tech-net";
  await connectDB();
});

afterAll(async () => {
  await mongod.stop();
});

test("posting reviews recomputes the product's rating average and count", async () => {
  const productInsert = await request(app).post("/product").send({
    name: "Test Widget",
    image: "https://example.com/x.png",
    price: 10,
    features: ["a"],
    status: true,
    rating: 0,
    ratingCount: 0,
  });
  const productId = productInsert.body.insertedId;

  await request(app).post(`/product/${productId}/reviews`).send({
    authorEmail: "a@example.com",
    authorName: "A",
    rating: 5,
    comment: "Great!",
  });

  const res = await request(app).post(`/product/${productId}/reviews`).send({
    authorEmail: "b@example.com",
    authorName: "B",
    rating: 3,
    comment: "OK",
  });

  expect(res.status).toBe(200);

  const productRes = await request(app).get(`/product/${productId}`);
  expect(productRes.body.rating).toBe(4);
  expect(productRes.body.ratingCount).toBe(2);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `PASS tests/review.test.js` — this test should pass on first run since Task 2's implementation already exists; if it fails, the assertion is telling you the aggregation logic is wrong, not that a feature is missing.

- [ ] **Step 5: Commit**

```bash
git add tests/review.test.js package.json package-lock.json
git commit -m "test: cover review rating aggregation with supertest + mongodb-memory-server"
```

---

### Task 4: Admin promotion script

**Files:**
- Create: `scripts/promoteAdmin.js`
- Modify: `package.json` (add `promote-admin` script)

**Interfaces:**
- Consumes: `connectDB`, `getDB` from `utils/db.js`.

- [ ] **Step 1: Write `scripts/promoteAdmin.js`**

```js
const { connectDB, getDB } = require("../utils/db");

async function promote() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/promoteAdmin.js <email>");
    process.exit(1);
  }

  await connectDB();
  const result = await getDB()
    .collection("users")
    .updateOne({ email }, { $set: { role: "admin" } });

  if (result.matchedCount === 0) {
    console.error(
      `No user found with email ${email}. Sign up through the app first, then promote.`
    );
    process.exit(1);
  }

  console.log(`${email} promoted to admin.`);
  process.exit(0);
}

promote().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add script entry to `package.json`**

Add to `scripts`: `"promote-admin": "node scripts/promoteAdmin.js"`.

- [ ] **Step 3: Verify manually**

Sign up through the running client with a real email, then:
```bash
npm run promote-admin -- your@email.com
```
Expected: `your@email.com promoted to admin.` Confirm via `curl http://localhost:8000/user/your@email.com` shows `"role":"admin"`.

- [ ] **Step 4: Commit**

```bash
git add scripts/promoteAdmin.js package.json
git commit -m "feat: add admin promotion script"
```

---

### Task 5: Seed script — 50+ products, 5-8 reviews each

**Files:**
- Create: `scripts/seed.js`
- Modify: `package.json` (add `seed` script)

**Interfaces:**
- Consumes: `connectDB`, `getDB` from `utils/db.js`.

- [ ] **Step 1: Write `scripts/seed.js`**

```js
const { connectDB, getDB } = require("../utils/db");

const CATEGORIES = [
  {
    name: "CPU",
    items: [
      "AMD Ryzen 5 5600X",
      "AMD Ryzen 7 5800X",
      "AMD Ryzen 9 5900X",
      "Intel Core i5-12400F",
      "Intel Core i7-12700K",
    ],
    priceRange: [150, 450],
    image: "https://picsum.photos/seed/cpu/600/400",
    features: [
      "6-12 core / 12-24 thread",
      "Unlocked for overclocking",
      "Compatible with AM4/LGA1700 motherboards",
      "Includes stock cooler",
    ],
  },
  {
    name: "GPU",
    items: [
      "NVIDIA RTX 4060",
      "NVIDIA RTX 4070",
      "NVIDIA RTX 4080",
      "AMD Radeon RX 7600",
      "AMD Radeon RX 7800 XT",
    ],
    priceRange: [280, 1100],
    image: "https://picsum.photos/seed/gpu/600/400",
    features: [
      "Ray tracing support",
      "8-16GB GDDR6/GDDR6X VRAM",
      "Triple fan cooling",
      "DisplayPort 1.4a + HDMI 2.1",
    ],
  },
  {
    name: "Motherboard",
    items: [
      "ASUS B550M-Plus",
      "MSI B660M Pro",
      "Gigabyte Z790 Aorus Elite",
      "ASRock B650M Pro",
    ],
    priceRange: [90, 280],
    image: "https://picsum.photos/seed/motherboard/600/400",
    features: [
      "ATX/Micro-ATX form factor",
      "PCIe 4.0 support",
      "M.2 NVMe slots",
      "USB 3.2 Gen 2 ports",
    ],
  },
  {
    name: "RAM",
    items: [
      "Corsair Vengeance 16GB DDR4",
      "Corsair Vengeance 32GB DDR5",
      "G.Skill Trident Z 16GB DDR4",
      "Kingston Fury 32GB DDR4",
    ],
    priceRange: [35, 160],
    image: "https://picsum.photos/seed/ram/600/400",
    features: [
      "3200-6000MHz clock speed",
      "Low profile heat spreader",
      "XMP/EXPO support",
      "Dual channel kit",
    ],
  },
  {
    name: "Storage",
    items: [
      "Samsung 980 Pro 1TB NVMe",
      "WD Black SN770 500GB NVMe",
      "Crucial MX500 1TB SSD",
      "Seagate Barracuda 2TB HDD",
      "Kingston NV2 2TB NVMe",
    ],
    priceRange: [30, 180],
    image: "https://picsum.photos/seed/storage/600/400",
    features: [
      "PCIe Gen4 x4 interface",
      "Up to 7000MB/s read speed",
      "5-year limited warranty",
      "M.2 2280 form factor",
    ],
  },
  {
    name: "PSU",
    items: [
      "Corsair RM750x 750W",
      "EVGA 600 BR 600W",
      "Seasonic Focus GX-850 850W",
      "Cooler Master MWE 650W",
    ],
    priceRange: [55, 170],
    image: "https://picsum.photos/seed/psu/600/400",
    features: [
      "80+ Gold certified",
      "Fully modular cabling",
      "Quiet fan profile",
      "10-year warranty",
    ],
  },
  {
    name: "Case",
    items: [
      "NZXT H510",
      "Corsair 4000D Airflow",
      "Lian Li Lancool 215",
      "Fractal Design Meshify C",
    ],
    priceRange: [60, 150],
    image: "https://picsum.photos/seed/case/600/400",
    features: [
      "Tempered glass side panel",
      "Pre-installed case fans",
      "Cable management channels",
      "Supports ATX/Micro-ATX/Mini-ITX",
    ],
  },
  {
    name: "Monitor",
    items: [
      "LG 27GP850 27\" 165Hz",
      "Samsung Odyssey G5 32\"",
      "ASUS TUF VG249Q 24\"",
      "Dell S2721DGF 27\"",
      "AOC 24G2 24\"",
    ],
    priceRange: [140, 420],
    image: "https://picsum.photos/seed/monitor/600/400",
    features: [
      "1ms response time",
      "144Hz+ refresh rate",
      "FreeSync/G-Sync compatible",
      "QHD/FHD resolution",
    ],
  },
  {
    name: "Prebuilt PC",
    items: [
      "Technet Starter Gaming PC",
      "Technet Ryzen Streaming PC",
      "Technet RTX Enthusiast PC",
      "Technet Compact Office PC",
    ],
    priceRange: [900, 2500],
    image: "https://picsum.photos/seed/prebuilt/600/400",
    features: [
      "Pre-assembled and stress-tested",
      "1-year parts and labor warranty",
      "Windows 11 pre-installed",
      "Free shipping and setup guide",
    ],
  },
  {
    name: "Laptop",
    items: [
      "Technet Ryzen 5 Laptop 15\"",
      "Technet Core i5 Laptop 14\"",
      "Technet RTX Gaming Laptop 16\"",
      "Technet Ultralight 13\"",
      "Technet Core i7 Business Laptop",
    ],
    priceRange: [500, 1800],
    image: "https://picsum.photos/seed/laptop/600/400",
    features: [
      "Full HD IPS display",
      "8-32GB RAM configurations",
      "Backlit keyboard",
      "Up to 10-hour battery life",
    ],
  },
  {
    name: "Keyboard",
    items: [
      "Logitech G413 Mechanical",
      "Razer BlackWidow V4",
      "Keychron K8 Wireless",
      "SteelSeries Apex 3",
    ],
    priceRange: [25, 130],
    image: "https://picsum.photos/seed/keyboard/600/400",
    features: [
      "Mechanical/hybrid switches",
      "Per-key RGB lighting",
      "Wired/wireless connectivity",
      "N-key rollover",
    ],
  },
  {
    name: "Mouse",
    items: [
      "Logitech G305 Wireless",
      "Razer DeathAdder V3",
      "SteelSeries Rival 3",
      "Corsair Harpoon RGB",
    ],
    priceRange: [15, 90],
    image: "https://picsum.photos/seed/mouse/600/400",
    features: [
      "Up to 26000 DPI sensor",
      "Lightweight design",
      "Programmable side buttons",
      "Up to 250-hour battery life",
    ],
  },
  {
    name: "Headset",
    items: [
      "HyperX Cloud II",
      "SteelSeries Arctis 7",
      "Logitech G435 Wireless",
      "Corsair HS55",
    ],
    priceRange: [30, 150],
    image: "https://picsum.photos/seed/headset/600/400",
    features: [
      "7.1 surround sound",
      "Noise-cancelling microphone",
      "Memory foam ear cushions",
      "Multi-platform compatibility",
    ],
  },
];

const AUTHOR_POOL = [
  "Alex Chen",
  "Priya Patel",
  "Jordan Smith",
  "Maria Garcia",
  "Sam Lee",
  "Riley Johnson",
  "Taylor Brown",
  "Casey Kim",
  "Morgan Davis",
  "Jamie Wilson",
  "Drew Martinez",
  "Avery Thompson",
];

const COMMENT_TEMPLATES = {
  5: [
    "Exceeded my expectations, works perfectly.",
    "Best purchase I've made this year.",
    "Rock solid, no issues after months of use.",
    "Exactly as described, fast shipping too.",
  ],
  4: [
    "Very good overall, minor nitpicks only.",
    "Does what it says, happy with it.",
    "Solid choice for the price.",
    "Would recommend to a friend.",
  ],
  3: [
    "It's fine, nothing special.",
    "Does the job but had a rough start.",
    "Average experience, works as expected.",
  ],
  2: [
    "Had some issues out of the box.",
    "Not quite what I expected for the price.",
  ],
  1: [
    "Disappointed, wouldn't buy again.",
    "Had to contact support more than once.",
  ],
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRating() {
  const r = Math.random();
  if (r < 0.5) return 5;
  if (r < 0.8) return 4;
  if (r < 0.93) return 3;
  if (r < 0.98) return 2;
  return 1;
}

function randomDateWithinMonths(months) {
  const now = Date.now();
  const past = now - months * 30 * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past)).toISOString();
}

async function seed() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("Refusing to seed a production database without --force");
    process.exit(1);
  }

  await connectDB();
  const db = getDB();

  await db.collection("products").deleteMany({});
  await db.collection("reviews").deleteMany({});

  const products = [];
  CATEGORIES.forEach((cat) => {
    cat.items.forEach((itemName) => {
      products.push({
        name: itemName,
        image: cat.image,
        price: randomInt(cat.priceRange[0], cat.priceRange[1]),
        features: cat.features,
        status: Math.random() > 0.08,
        rating: 0,
        ratingCount: 0,
        category: cat.name,
      });
    });
  });

  const insertResult = await db.collection("products").insertMany(products);
  const productIds = Object.values(insertResult.insertedIds);

  for (const productId of productIds) {
    const reviewCount = randomInt(5, 8);
    const reviews = [];
    for (let i = 0; i < reviewCount; i++) {
      const rating = weightedRating();
      const author = pick(AUTHOR_POOL);
      reviews.push({
        productId,
        authorEmail: `${author.toLowerCase().replace(" ", ".")}@example.com`,
        authorName: author,
        rating,
        comment: pick(COMMENT_TEMPLATES[rating]),
        createdAt: randomDateWithinMonths(6),
      });
    }
    await db.collection("reviews").insertMany(reviews);
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await db
      .collection("products")
      .updateOne(
        { _id: productId },
        { $set: { rating: Math.round(avg * 10) / 10, ratingCount: reviews.length } }
      );
  }

  console.log(`Seeded ${products.length} products with reviews.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add script entry to `package.json`**

Add to `scripts`: `"seed": "node scripts/seed.js"`.

- [ ] **Step 3: Verify manually**

Run: `npm run seed`
Expected: `Seeded 57 products with reviews.` Then `curl http://localhost:8000/products | json_pp | grep -c '"name"'` (or open in browser) shows 57 products, each with `rating` between 1-5 and `ratingCount` between 5-8.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.js package.json
git commit -m "feat: add seed script for 50+ products with reviews"
```

---

## Client tasks (`technet-react-redux`)

### Task 6: Types + API hooks — swap comments for reviews

**Files:**
- Modify: `src/types/globalTypes.ts`
- Modify: `src/redux/api/apiSlice.ts`
- Modify: `src/redux/features/products/productApi.ts`

**Interfaces:**
- Produces: `IReview` type. `useGetReviewsQuery(productId)`, `useAddReviewMutation()` replacing `useGetCommentQuery`/`usePostCommentMutation`.

- [ ] **Step 1: Update `src/types/globalTypes.ts`**

```ts
export interface IProduct {
  _id: number;
  name: string;
  image: string;
  price: number;
  features: string[];
  status: boolean;
  rating: number;
  ratingCount: number;
  quantity?: number;
}

export interface IReview {
  _id: string;
  productId: string;
  authorEmail: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}
```

- [ ] **Step 2: Rename `Comment` tag to `Review` in `src/redux/api/apiSlice.ts`**

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_BASE_URL }),
  tagTypes: ['Review', 'Product', 'User', 'Order'],
  endpoints: () => ({}),
});
```

- [ ] **Step 3: Update `src/redux/features/products/productApi.ts`**

```ts
import { api } from '@/redux/api/apiSlice';

const productApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query({
      query: () => ({ url: '/products' }),
    }),
    getProduct: build.query({
      query: (id) => ({
        url: `/product/${id}`,
      }),
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
  useGetReviewsQuery,
  useAddReviewMutation,
  useSearchProductsQuery,
} = productApi;
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no new type errors (existing unrelated errors, if any, are pre-existing — only check nothing new appears referencing `productApi.ts`, `apiSlice.ts`, or `globalTypes.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/types/globalTypes.ts src/redux/api/apiSlice.ts src/redux/features/products/productApi.ts
git commit -m "refactor: swap comment hooks for review hooks, add ratingCount"
```

---

### Task 7: `StarRatingInput` component + automated test (the one client test this phase)

**Files:**
- Create: `src/components/StarRatingInput.tsx`
- Create: `src/components/StarRatingInput.test.tsx`
- Modify: `package.json` (add devDependencies + test script)
- Modify: `vite.config.ts`
- Create: `src/setupTests.ts`

**Interfaces:**
- Produces: `<StarRatingInput value={number} onChange={(rating: number) => void} />` — a controlled, presentational 5-star clickable input with no Redux/RTK Query dependency, so it's testable in isolation.

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Wire Vitest into `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
  },
});
```

- [ ] **Step 3: Add `src/setupTests.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add test script to `package.json`**

Add to `scripts`: `"test": "vitest run"`.

- [ ] **Step 5: Write the failing test**

```tsx
// src/components/StarRatingInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRatingInput from './StarRatingInput';

describe('StarRatingInput', () => {
  it('calls onChange with the clicked star value', () => {
    const handleChange = vi.fn();
    render(<StarRatingInput value={0} onChange={handleChange} />);

    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[3]);

    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('renders exactly 5 stars', () => {
    render(<StarRatingInput value={3} onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './StarRatingInput'`.

- [ ] **Step 7: Write `src/components/StarRatingInput.tsx`**

```tsx
import { useState } from 'react';
import { Star } from 'lucide-react';

interface IProps {
  value: number;
  onChange: (rating: number) => void;
}

export default function StarRatingInput({ value, onChange }: IProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            type="button"
            key={starValue}
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`Rate ${starValue} stars`}
          >
            <Star
              className={`w-6 h-6 ${
                starValue <= (hoverRating || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test`
Expected: PASS, 2 tests.

- [ ] **Step 9: Commit**

```bash
git add src/components/StarRatingInput.tsx src/components/StarRatingInput.test.tsx src/setupTests.ts vite.config.ts package.json package-lock.json
git commit -m "test: add StarRatingInput with isolated vitest coverage"
```

---

### Task 8: Rewrite `ProductReview.tsx` to use reviews + `StarRatingInput`

**Files:**
- Modify: `src/components/ProductReview.tsx`

**Interfaces:**
- Consumes: `useGetReviewsQuery`, `useAddReviewMutation` (Task 6), `StarRatingInput` (Task 7), `useAppSelector` for `state.user.user.email`.

- [ ] **Step 1: Replace the component**

```tsx
import { ChangeEvent, FormEvent, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { FiSend } from 'react-icons/fi';
import { Star } from 'lucide-react';
import StarRatingInput from './StarRatingInput';
import {
  useGetReviewsQuery,
  useAddReviewMutation,
} from '@/redux/features/products/productApi';
import { useAppSelector } from '@/redux/hook';
import { IReview } from '@/types/globalTypes';

interface IProps {
  id: string;
}

export default function ProductReview({ id }: IProps) {
  const { user } = useAppSelector((state) => state.user);
  const [addReview, { isLoading }] = useAddReviewMutation();
  const { data } = useGetReviewsQuery(id, { refetchOnMountOrArgChange: true });
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(0);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputValue.trim() || selectedRating === 0 || !user?.email) return;
    addReview({
      productId: id,
      data: {
        authorEmail: user.email,
        authorName: user.email.split('@')[0],
        rating: selectedRating,
        comment: inputValue,
      },
    });
    setInputValue('');
    setSelectedRating(0);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const reviews: IReview[] = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto mt-5 px-4 md:px-0 mb-5">
      <form
        className="flex flex-col gap-3 border border-gray-200 rounded-lg p-4"
        onSubmit={handleSubmit}
      >
        <StarRatingInput value={selectedRating} onChange={setSelectedRating} />
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 items-end sm:items-center">
          <Textarea
            className="flex-1 min-h-[60px] sm:min-h-[40px]"
            placeholder={
              user?.email ? 'Write a review...' : 'Log in to write a review'
            }
            value={inputValue}
            onChange={handleChange}
            disabled={!user?.email}
          />
          <Button
            type="submit"
            disabled={!user?.email || isLoading}
            className="rounded-full h-10 w-10 p-2 text-[25px] flex-shrink-0"
          >
            <FiSend />
          </Button>
        </div>
      </form>

      <div className="mt-8 space-y-5">
        {reviews.map((review) => (
          <div
            key={review._id}
            className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg"
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>
                {review.authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm sm:text-base">
                  {review.authorName}
                </span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`w-3.5 h-3.5 ${
                        index < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm sm:text-base break-words mt-1">
                {review.comment}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, open a product details page while logged in, submit a star rating + comment.
Expected: review appears in the list immediately (RTK Query tag invalidation refetches), page reload shows it persisted.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductReview.tsx
git commit -m "feat: rewrite ProductReview with star ratings and real reviews"
```

---

### Task 9: Show `ratingCount` on product card and details page

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/pages/ProductDetails.tsx`

- [ ] **Step 1: Update `ProductCard.tsx`**

Change:
```tsx
<p className="text-sm sm:text-base">Rating: {product?.rating}</p>
```
to:
```tsx
<p className="text-sm sm:text-base">
  Rating: {product?.rating} ({product?.ratingCount ?? 0})
</p>
```

- [ ] **Step 2: Update `ProductDetails.tsx`**

Change (around line 218-220):
```tsx
<span className="text-lg md:text-xl font-medium">
  {data.rating}
</span>
```
to:
```tsx
<span className="text-lg md:text-xl font-medium">
  {data.rating} <span className="text-sm text-gray-500">({data.ratingCount} reviews)</span>
</span>
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, visit `/products` and a product details page.
Expected: both show `rating (count)`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductCard.tsx src/pages/ProductDetails.tsx
git commit -m "feat: display review count alongside rating"
```

---

### Task 10: Bump price filter range to match the new catalog

**Files:**
- Modify: `src/pages/Products.tsx`
- Modify: `src/redux/features/products/productSlice.ts`

**Interfaces:**
- Consumes: seeded product prices now range up to ~$2500 (Task 5). The existing `max={150}` slider can't reach most of the catalog.

- [ ] **Step 1: Update `src/redux/features/products/productSlice.ts`**

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IProduct {
  status: boolean;
  priceRange: number;
}

const initialState: IProduct = {
  status: false,
  priceRange: 2500,
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    toggleStatus: (state) => {
      state.status = !state.status;
    },
    setPriceRange: (state, action: PayloadAction<number>) => {
      state.priceRange = action.payload;
    },
  },
});

export const { toggleStatus, setPriceRange } = productSlice.actions;
export default productSlice.reducer;
```

- [ ] **Step 2: Update the slider in `src/pages/Products.tsx`**

Change:
```tsx
<Slider
  defaultValue={[150]}
  max={150}
  min={0}
  step={1}
  onValueChange={(value) => handleSlider(value)}
  className="w-full"
/>
```
to:
```tsx
<Slider
  defaultValue={[2500]}
  max={2500}
  min={0}
  step={10}
  onValueChange={(value) => handleSlider(value)}
  className="w-full"
/>
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, visit `/products`, drag the price slider.
Expected: slider reaches $2500, filtering shows/hides prebuilt PCs and laptops correctly at the high end.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Products.tsx src/redux/features/products/productSlice.ts
git commit -m "feat: bump price filter range for expanded catalog"
```

---

## Self-Review Notes

- **Spec coverage:** review schema (Task 2), denormalized rating/count (Task 2/3), admin seeding via promote script (Task 4), 50+ products with 5-8 reviews (Task 5), client review UI (Task 6/8), rating display (Task 9), price slider (Task 10, called out in spec's client section). Auth hardening explicitly deferred to Phase 2 per spec — not a gap, a boundary.
- **Type consistency checked:** `IReview` fields (`authorEmail`, `authorName`, `rating`, `comment`, `createdAt`) match what `reviewController.js`'s `addReview` writes and what `ProductReview.tsx` reads. `ratingCount` name matches across `globalTypes.ts`, `reviewController.js`, `ProductCard.tsx`, `ProductDetails.tsx`.
- **No placeholders:** every step above has runnable code or an exact command with an expected output.
