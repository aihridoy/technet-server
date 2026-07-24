const express = require("express");
const router = express.Router();
const { getWishlist, toggleWishlist } = require("../controllers/wishlistController");

router.get("/wishlist", getWishlist);
router.post("/wishlist/toggle", toggleWishlist);

module.exports = router;
