const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  addProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/productController");
const { addReview, getReviews } = require("../controllers/reviewController");

router.get("/products", getProducts);
router.get("/product/:id", getProductById);
router.post("/product", addProduct);
router.delete("/product/:id", deleteProduct);
router.get("/search", searchProducts);
router.post("/product/:productId/reviews", addReview);
router.get("/product/:productId/reviews", getReviews);

module.exports = router;
