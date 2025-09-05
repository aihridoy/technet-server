const { userCollection } = require("../models/userModel");

exports.addUser = async (req, res) => {
  try {
    const result = await userCollection().insertOne(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getUserByEmail = async (req, res) => {
  try {
    const result = await userCollection().findOne({ email: req.params.email });
    if (result?.email) {
      return res.send({ status: true, data: result });
    }
    res.send({ status: false });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
