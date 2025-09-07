const { orderCollection } = require("../models/orderModel");

exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    if (
      !orderData.userEmail ||
      !orderData.products ||
      orderData.products.length === 0
    ) {
      return res
        .status(400)
        .send({ status: false, error: "User email and products are required" });
    }

    // Insert order into MongoDB
    const result = await orderCollection().insertOne(orderData);
    res.send({ status: true, data: result });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
