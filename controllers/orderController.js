const { orderCollection } = require("../models/orderModel");
const { ObjectId } = require("../utils/db");
const { verifyFirebaseToken } = require("../middleware/verifyToken");

exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    if (
      !orderData.userEmail ||
      !orderData.products ||
      orderData.products.length === 0
    ) {
      return res
        .status(400)
        .send({ status: false, error: "User email and products are required" });
    }

    const result = await orderCollection().insertOne(orderData);
    res.send({ status: true, data: result });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await orderCollection().find({}).toArray();
    res.send({ status: true, data: orders });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).send({ status: false, error: "Missing auth token" });
    }
    const decoded = await verifyFirebaseToken(token);
    const orders = await orderCollection()
      .find({ userEmail: decoded.email })
      .toArray();
    res.send({ status: true, data: orders });
  } catch (err) {
    res.status(401).send({ status: false, error: "Invalid or expired token" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .send({ status: false, error: "Invalid status value" });
    }
    const result = await orderCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } }
    );
    res.send({ status: true, data: result });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
