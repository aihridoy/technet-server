const express = require("express");
const cors = require("cors");
const { connectDB } = require("./utils/db");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const { port } = require("./utils/config");

app.use(cors());
app.use(express.json());

connectDB().catch(console.error);

app.use(productRoutes);
app.use(userRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
