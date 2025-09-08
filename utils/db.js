const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pfan7vt.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("tech-net");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

const getDB = () => db;

module.exports = { connectDB, getDB, ObjectId };
