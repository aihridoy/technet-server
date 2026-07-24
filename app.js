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
