const { connectDB, getDB } = require("../utils/db");

// Reliable watch images from Unsplash (specific photo IDs)
const IMAGES = {
  // Smart watches
  smartWatch1: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&h=400&fit=crop",
  smartWatch2: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=400&fit=crop",
  smartWatch3: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&h=400&fit=crop",
  smartWatch4: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=400&fit=crop",
  smartWatch5: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop",
  
  // Classic watches
  classicWatch1: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=600&h=400&fit=crop",
  classicWatch2: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&h=400&fit=crop",
  classicWatch3: "https://images.unsplash.com/photo-1539874754764-5a96559165b0?w=600&h=400&fit=crop",
  classicWatch4: "https://images.unsplash.com/photo-1526045431048-f857369baa09?w=600&h=400&fit=crop",
  classicWatch5: "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=600&h=400&fit=crop",
  
  // Sports watches
  sportsWatch1: "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=600&h=400&fit=crop",
  sportsWatch2: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&h=400&fit=crop",
  sportsWatch3: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&h=400&fit=crop",
  sportsWatch4: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&h=400&fit=crop",
  sportsWatch5: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=400&fit=crop",
  
  // Hybrid/special
  hybridWatch1: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=600&h=400&fit=crop",
  hybridWatch2: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=400&fit=crop",
  hybridWatch3: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=400&fit=crop",
};

const CATEGORIES = [
  {
    name: "Haylou Smart Watches",
    items: [
      { name: "Haylou RS3", image: IMAGES.smartWatch1, price: 49, features: ["1.78 inch AMOLED display", "Heart rate & SpO2 monitoring", "14-day battery life", "5ATM water resistant"] },
      { name: "Haylou Solar Plus", image: IMAGES.smartWatch2, price: 39, features: ["1.47 inch TFT display", "Blood oxygen monitoring", "12-day battery life", "IP68 water resistant"] },
      { name: "Haylou GST", image: IMAGES.smartWatch3, price: 35, features: ["1.43 inch AMOLED display", "Always-on display", "10-day battery life", "Bluetooth calling"] },
      { name: "Haylou RS4", image: IMAGES.smartWatch4, price: 45, features: ["1.78 inch AMOLED display", "GPS built-in", "14-day battery life", "100+ sport modes"] },
      { name: "Haylou LS02", image: IMAGES.smartWatch5, price: 29, features: ["1.4 inch TFT display", "Heart rate monitor", "20-day battery life", "IP68 water resistant"] },
      { name: "Haylou RT 2", image: IMAGES.smartWatch1, price: 42, features: ["1.32 inch AMOLED display", "Heart rate monitor", "10-day battery life", "IP68 water resistant"] },
      { name: "Haylou Pop Talk", image: IMAGES.smartWatch2, price: 32, features: ["1.63 inch TFT display", "Bluetooth calling", "7-day battery life", "IP67 water resistant"] },
    ],
  },
  {
    name: "Apple Watches",
    items: [
      { name: "Apple Watch SE 2", image: IMAGES.smartWatch3, price: 249, features: ["1.78 inch OLED display", "Heart rate & ECG", "18-hour battery life", "Water resistant 50m"] },
      { name: "Apple Watch Series 9", image: IMAGES.smartWatch4, price: 399, features: ["1.9 inch OLED display", "Always-on Retina display", "18-hour battery life", "Blood oxygen sensor"] },
      { name: "Apple Watch Ultra 2", image: IMAGES.smartWatch5, price: 799, features: ["1.93 inch OLED display", "Action button", "36-hour battery life", "100m water resistant"] },
      { name: "Apple Watch Series 8", image: IMAGES.smartWatch1, price: 349, features: ["1.9 inch OLED display", "Temperature sensing", "18-hour battery life", "Crash detection"] },
      { name: "Apple Watch Hermès", image: IMAGES.smartWatch2, price: 1299, features: ["1.9 inch OLED display", "Exclusive Hermès bands", "18-hour battery life", "Limited edition"] },
    ],
  },
  {
    name: "Samsung Galaxy Watches",
    items: [
      { name: "Samsung Galaxy Watch 6", image: IMAGES.smartWatch4, price: 299, features: ["1.4 inch Super AMOLED", "BioActive sensor", "40-hour battery life", "5ATM water resistant"] },
      { name: "Samsung Galaxy Watch 6 Classic", image: IMAGES.smartWatch5, price: 399, features: ["1.47 inch Super AMOLED", "Rotating bezel", "40-hour battery life", "Sapphire crystal glass"] },
      { name: "Samsung Galaxy Watch 5", image: IMAGES.smartWatch1, price: 249, features: ["1.4 inch Super AMOLED", "BioActive sensor", "40-hour battery life", "IP68 water resistant"] },
      { name: "Samsung Galaxy Watch 5 Pro", image: IMAGES.smartWatch2, price: 449, features: ["1.4 inch Super AMOLED", "Titanium frame", "45-hour battery life", "Sapphire crystal glass"] },
      { name: "Samsung Galaxy Watch 4", image: IMAGES.smartWatch3, price: 199, features: ["1.4 inch Super AMOLED", "BioActive sensor", "40-hour battery life", "5ATM water resistant"] },
    ],
  },
  {
    name: "Garmin Watches",
    items: [
      { name: "Garmin Venu 3", image: IMAGES.sportsWatch1, price: 449, features: ["1.4 inch AMOLED display", "Advanced sleep tracking", "14-day battery life", "Bluetooth calling"] },
      { name: "Garmin Forerunner 265", image: IMAGES.sportsWatch2, price: 449, features: ["1.3 inch AMOLED display", "Advanced training metrics", "13-day battery life", "5ATM water resistant"] },
      { name: "Garmin Forerunner 965", image: IMAGES.sportsWatch3, price: 599, features: ["1.4 inch AMOLED display", "Training readiness", "23-day battery life", "Multi-band GPS"] },
      { name: "Garmin Fenix 7X", image: IMAGES.sportsWatch4, price: 799, features: ["1.4 inch MIP display", "Solar charging", "37-day battery life", "10ATM water resistant"] },
      { name: "Garmin Vivoactive 5", image: IMAGES.sportsWatch5, price: 299, features: ["1.3 inch AMOLED display", "Body battery energy", "11-day battery life", "5ATM water resistant"] },
      { name: "Garmin Instinct 2", image: IMAGES.sportsWatch1, price: 349, features: ["1.2 inch MIP display", "Military-grade durability", "28-day battery life", "100m water resistant"] },
      { name: "Garmin Enduro 2", image: IMAGES.sportsWatch2, price: 1099, features: ["1.4 inch MIP display", "Solar charging", "46-day battery life", "100m water resistant"] },
    ],
  },
  {
    name: "Casio Watches",
    items: [
      { name: "Casio G-Shock GA-2100", image: IMAGES.sportsWatch3, price: 99, features: ["Carbon Core Guard", "200m water resistant", "World time (38 cities)", "LED light"] },
      { name: "Casio G-Shock DW-5600", image: IMAGES.sportsWatch4, price: 69, features: ["Classic square design", "200m water resistant", "Stopwatch function", "Multi-function alarm"] },
      { name: "Casio G-Shock Mudmaster", image: IMAGES.sportsWatch5, price: 549, features: ["Mud resistant structure", "Solar powered", "Multi-band 6 atomic timekeeping", "200m water resistant"] },
      { name: "Casio Edifice EFV-100D", image: IMAGES.classicWatch1, price: 89, features: ["Stainless steel case", "100m water resistant", "Analog-digital display", "Chronograph function"] },
      { name: "Casio Pro Trek PRW-61", image: IMAGES.sportsWatch1, price: 499, features: ["Triple sensor", "Solar powered", "Multi-band 6 atomic timekeeping", "200m water resistant"] },
      { name: "Casio G-Shock Rangeman", image: IMAGES.sportsWatch2, price: 399, features: ["Triple sensor", "Solar powered", "200m water resistant", "Mud resistant"] },
    ],
  },
  {
    name: "Seiko Watches",
    items: [
      { name: "Seiko 5 Sports SRPD", image: IMAGES.classicWatch2, price: 275, features: ["Automatic movement", "42.5mm case diameter", "100m water resistant", "See-through case back"] },
      { name: "Seiko Presage SRPB41", image: IMAGES.classicWatch3, price: 425, features: ["Automatic movement", "40.5mm case diameter", "50m water resistant", "Blue enamel dial"] },
      { name: "Seiko Prospex SBDC101", image: IMAGES.classicWatch4, price: 599, features: ["Automatic movement", "42.3mm case diameter", "200m water resistant", "Unidirectional rotating bezel"] },
      { name: "Seiko Astron SSH107", image: IMAGES.classicWatch5, price: 2499, features: ["GPS solar movement", "42.9mm case diameter", "100m water resistant", "Time zone adjustment"] },
      { name: "Seiko Kinetic SKA781", image: IMAGES.classicWatch1, price: 375, features: ["Kinetic movement", "42mm case diameter", "100m water resistant", "Power reserve indicator"] },
      { name: "Seiko Cocktail Time", image: IMAGES.classicWatch2, price: 445, features: ["Automatic movement", "40.5mm case diameter", "50m water resistant", "Unique dial pattern"] },
    ],
  },
  {
    name: "Orient Watches",
    items: [
      { name: "Orient Bambino Version 2", image: IMAGES.classicWatch3, price: 179, features: ["Automatic movement", "40.5mm case diameter", "50m water resistant", "Domed crystal"] },
      { name: "Orient Mako III", image: IMAGES.classicWatch4, price: 299, features: ["Automatic movement", "41.5mm case diameter", "200m water resistant", "Day/date display"] },
      { name: "Orient Star Semi-Skeleton", image: IMAGES.classicWatch5, price: 499, features: ["Automatic movement", "41mm case diameter", "50m water resistant", "Open heart dial"] },
      { name: "Orient Ray II", image: IMAGES.classicWatch1, price: 199, features: ["Automatic movement", "41.5mm case diameter", "200m water resistant", "Day/date display"] },
      { name: "Orient Kamasu", image: IMAGES.classicWatch2, price: 349, features: ["Automatic movement", "41.8mm case diameter", "200m water resistant", "Sapphire crystal"] },
    ],
  },
  {
    name: "Citizen Watches",
    items: [
      { name: "Citizen Eco-Drive BM7108", image: IMAGES.classicWatch3, price: 225, features: ["Eco-Drive solar powered", "Stainless steel bracelet", "100m water resistant", "Date display"] },
      { name: "Citizen Promaster Diver", image: IMAGES.classicWatch4, price: 399, features: ["Automatic movement", "42mm case diameter", "200m water resistant", "Unidirectional bezel"] },
      { name: "Citizen Attesa AT8120", image: IMAGES.classicWatch5, price: 599, features: ["Eco-Drive movement", "Titanium case", "200m water resistant", "World time"] },
      { name: "Citizen Nighthawk BJ7000", image: IMAGES.classicWatch1, price: 475, features: ["Eco-Drive movement", "Pilot watch design", "200m water resistant", "Slide rule bezel"] },
      { name: "Citizen Brycen AM8050", image: IMAGES.classicWatch2, price: 325, features: ["Eco-Drive movement", "Stainless steel case", "100m water resistant", "Chronograph function"] },
    ],
  },
  {
    name: "Fitbit Watches",
    items: [
      { name: "Fitbit Versa 4", image: IMAGES.hybridWatch1, price: 229, features: ["1.58 inch AMOLED display", "Built-in GPS", "6+ day battery life", "Water resistant 50m"] },
      { name: "Fitbit Sense 2", image: IMAGES.hybridWatch2, price: 299, features: ["1.58 inch AMOLED display", "EDA sensor for stress", "6+ day battery life", "ECG app"] },
      { name: "Fitbit Charge 5", image: IMAGES.hybridWatch3, price: 149, features: ["1.04 inch AMOLED display", "Built-in GPS", "7-day battery life", "EDA sensor"] },
      { name: "Fitbit Luxe", image: IMAGES.hybridWatch1, price: 99, features: ["1.04 inch AMOLED display", "Stress management score", "5-day battery life", "Water resistant 50m"] },
      { name: "Fitbit Inspire 3", image: IMAGES.hybridWatch2, price: 79, features: ["1.04 inch AMOLED display", "Daily Readiness Score", "10-day battery life", "Water resistant 50m"] },
    ],
  },
  {
    name: "Amazfit Watches",
    items: [
      { name: "Amazfit GTR 4", image: IMAGES.hybridWatch3, price: 199, features: ["1.43 inch AMOLED display", "GPS with dual-band", "14-day battery life", "150+ sport modes"] },
      { name: "Amazfit T-Rex Ultra", image: IMAGES.sportsWatch5, price: 399, features: ["1.39 inch AMOLED display", "Military-grade durability", "20-day battery life", "100m water resistant"] },
      { name: "Amazfit GTS 4", image: IMAGES.hybridWatch1, price: 149, features: ["1.75 inch AMOLED display", "GPS with dual-band", "8-day battery life", "5ATM water resistant"] },
      { name: "Amazfit Bip U Pro", image: IMAGES.hybridWatch2, price: 69, features: ["1.43 inch TFT display", "Built-in GPS", "9-day battery life", "5ATM water resistant"] },
      { name: "Amazfit Active", image: IMAGES.hybridWatch3, price: 99, features: ["1.75 inch AMOLED display", "GPS built-in", "14-day battery life", "5ATM water resistant"] },
    ],
  },
  {
    name: "Huawei Watches",
    items: [
      { name: "Huawei Watch GT 4", image: IMAGES.smartWatch1, price: 299, features: ["1.43 inch AMOLED display", "GPS with dual-band", "14-day battery life", "5ATM water resistant"] },
      { name: "Huawei Watch 4 Pro", image: IMAGES.smartWatch2, price: 499, features: ["1.5 inch AMOLED display", "ECG monitoring", "4.5-day battery life", "5ATM water resistant"] },
      { name: "Huawei Watch Fit 3", image: IMAGES.smartWatch3, price: 149, features: ["1.82 inch AMOLED display", "GPS built-in", "9-day battery life", "5ATM water resistant"] },
      { name: "Huawei Watch D2", image: IMAGES.smartWatch4, price: 399, features: ["1.82 inch AMOLED display", "Blood pressure monitoring", "4.5-day battery life", "IP68 water resistant"] },
      { name: "Huawei Watch Ultimate", image: IMAGES.smartWatch5, price: 799, features: ["1.5 inch LTPO AMOLED", "100m water resistant", "14-day battery life", "Titanium case"] },
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
  const usingRealDatabase = !process.env.MONGO_URI;
  if (usingRealDatabase && !process.argv.includes("--force")) {
    console.error(
      "Refusing to seed the real database without --force. Set MONGO_URI to target a local/test database, or pass --force to proceed."
    );
    process.exit(1);
  }

  await connectDB();
  const db = getDB();

  await db.collection("products").deleteMany({});
  await db.collection("reviews").deleteMany({});

  const products = [];
  CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      products.push({
        name: item.name,
        image: item.image,
        price: item.price,
        features: item.features,
        status: Math.random() > 0.3,
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
