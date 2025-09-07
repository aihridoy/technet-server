const { getDB } = require("../utils/db");

const orderCollection = () => getDB().collection("orders");

module.exports = { orderCollection };
