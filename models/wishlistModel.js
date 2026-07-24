const { getDB } = require("../utils/db");

const wishlistCollection = () => getDB().collection("wishlists");

module.exports = { wishlistCollection };
