const express = require("express");
const router = express.Router();
const { createOrder, getOrders } = require("../controllers/orderController");

router.post("/order", createOrder);
router.get("/orders", getOrders);

module.exports = router;
