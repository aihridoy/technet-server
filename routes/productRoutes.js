const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  addProduct,
  deleteProduct,
  addComment,
  getComments,
  searchProducts,
} = require("../controllers/productController");

router.get("/products", getProducts);
router.get("/product/:id", getProductById);
router.post("/product", addProduct);
router.delete("/product/:id", deleteProduct);
router.post("/comment/:id", addComment);
router.get("/comment/:id", getComments);
router.get("/search", searchProducts);

module.exports = router;
