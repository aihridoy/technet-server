const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  addProduct,
  deleteProduct,
  addComment,
  getComments,
} = require("../controllers/productController");

router.get("/products", getProducts);
router.get("/product/:id", getProductById);
router.post("/product", addProduct);
router.delete("/product/:id", deleteProduct);
router.post("/comment/:id", addComment);
router.get("/comment/:id", getComments);

module.exports = router;
