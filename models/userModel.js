const { getDB } = require("../utils/db");

const userCollection = () => getDB().collection("users");

module.exports = { userCollection };
