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
