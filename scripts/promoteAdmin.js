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
