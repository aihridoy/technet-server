const { verifyFirebaseToken } = require("./verifyToken");
const { userCollection } = require("../models/userModel");

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).send({ status: false, error: "Missing auth token" });
    }

    const decoded = await verifyFirebaseToken(token);
    const email = decoded.email;
    if (!email) {
      return res.status(401).send({ status: false, error: "Invalid token" });
    }

    const user = await userCollection().findOne({ email });
    if (!user || user.role !== "admin") {
      return res.status(403).send({ status: false, error: "Admin access required" });
    }

    req.adminEmail = email;
    next();
  } catch (err) {
    res.status(401).send({ status: false, error: "Invalid or expired token" });
  }
};

module.exports = { requireAdmin };
