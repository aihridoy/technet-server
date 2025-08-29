require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pfan7vt.mongodb.net/?retryWrites=true&w=majority`;

// MongoClient setup
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    // ✅ Connect to MongoDB first
    await client.connect();

    // Select DB and collections
    const db = client.db("tech-net");
    const productCollection = db.collection("products");
    const userCollection = db.collection("users"); // ✅ now defined

    // --- Products routes ---

    app.get("/products", async (req, res) => {
      const products = await productCollection.find({}).toArray();
      res.send({ status: true, data: products });
    });

    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/comment/:id", async (req, res) => {
      const productId = req.params.id;
      const comment = req.body.comment;

      const result = await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $push: { comments: comment } }
      );

      if (result.modifiedCount !== 1) {
        return res.json({ error: "Product not found or comment not added" });
      }

      res.json({ message: "Comment added successfully" });
    });

    app.get("/comment/:id", async (req, res) => {
      const productId = req.params.id;
      const result = await productCollection.findOne(
        { _id: new ObjectId(productId) },
        { projection: { _id: 0, comments: 1 } }
      );

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "Product not found" });
      }
    });

    // --- Users routes ---

    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });

      if (result?.email) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });
  } catch (err) {
    console.error("Database connection failed:", err);
  }
};

// Run the server
run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
