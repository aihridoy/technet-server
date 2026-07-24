const app = require("./app");
const { connectDB } = require("./utils/db");
const { port } = require("./utils/config");

// Validate required env vars
const required = ["FIREBASE_PROJECT_ID"];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`WARNING: ${key} is not set. Authentication may fail.`);
  }
}

connectDB().catch(console.error);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
