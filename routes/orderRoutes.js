const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getMyOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { requireAdmin } = require("../middleware/requireAdmin");

router.post("/order", createOrder);
router.get("/orders", requireAdmin, getOrders);
router.get("/orders/mine", getMyOrders);
router.patch("/order/:id/status", requireAdmin, updateOrderStatus);

module.exports = router;
