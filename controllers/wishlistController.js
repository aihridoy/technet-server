const { wishlistCollection } = require("../models/wishlistModel");
const { verifyFirebaseToken } = require("../middleware/verifyToken");

exports.getWishlist = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).send({ status: false, error: "Missing auth token" });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseToken(token);
    } catch {
      return res.status(401).send({ status: false, error: "Invalid or expired token" });
    }

    if (!decoded.email) {
      return res.status(401).send({ status: false, error: "Token missing email claim" });
    }

    const wishlist = await wishlistCollection()
      .find({ userEmail: decoded.email })
      .toArray();

    res.send({ status: true, data: wishlist });
  } catch (err) {
    console.error("getWishlist error:", err.message);
    res.status(500).send({ status: false, error: "Failed to fetch wishlist" });
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).send({ status: false, error: "Missing auth token" });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseToken(token);
    } catch {
      return res.status(401).send({ status: false, error: "Invalid or expired token" });
    }

    if (!decoded.email) {
      return res.status(401).send({ status: false, error: "Token missing email claim" });
    }

    const { productId } = req.body;
    if (!productId) {
      return res.status(400).send({ status: false, error: "Product ID is required" });
    }

    const existing = await wishlistCollection().findOne({
      userEmail: decoded.email,
      productId,
    });

    if (existing) {
      await wishlistCollection().deleteOne({ _id: existing._id });
      res.send({ status: true, data: { wishlisted: false } });
    } else {
      await wishlistCollection().insertOne({
        userEmail: decoded.email,
        productId,
        createdAt: new Date().toISOString(),
      });
      res.send({ status: true, data: { wishlisted: true } });
    }
  } catch (err) {
    console.error("toggleWishlist error:", err.message);
    res.status(500).send({ status: false, error: "Failed to update wishlist" });
  }
};
