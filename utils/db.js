const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

let client;
let db;

const connectDB = async () => {
  const uri =
    process.env.MONGO_URI ||
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pfan7vt.mongodb.net/?retryWrites=true&w=majority`;

  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
  });

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
