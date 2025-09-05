const express = require("express");
const router = express.Router();
const { addUser, getUserByEmail } = require("../controllers/userController");

router.post("/user", addUser);
router.get("/user/:email", getUserByEmail);

module.exports = router;
