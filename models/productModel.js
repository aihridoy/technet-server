const { getDB } = require("../utils/db");

const productCollection = () => getDB().collection("products");

module.exports = { productCollection };
