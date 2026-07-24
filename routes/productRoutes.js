const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/productController");
const { addReview, getReviews } = require("../controllers/reviewController");
const { requireAdmin } = require("../middleware/requireAdmin");

router.get("/products", getProducts);
router.get("/product/:id", getProductById);
router.post("/product", requireAdmin, addProduct);
router.patch("/product/:id", requireAdmin, updateProduct);
router.delete("/product/:id", requireAdmin, deleteProduct);
router.get("/search", searchProducts);
router.post("/product/:productId/reviews", addReview);
router.get("/product/:productId/reviews", getReviews);

module.exports = router;
