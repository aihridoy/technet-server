const { getDB } = require("../utils/db");

const reviewCollection = () => getDB().collection("reviews");

module.exports = { reviewCollection };
