const { productCollection } = require("../models/productModel");
const { ObjectId } = require("../utils/db");

exports.getProducts = async (req, res) => {
  try {
    const products = await productCollection().find({}).toArray();
    res.send({ status: true, data: products });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const result = await productCollection().findOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const result = await productCollection().insertOne(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const result = await productCollection().deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const result = await productCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { comments: req.body.comment } }
    );
    if (result.modifiedCount !== 1) {
      return res.json({ error: "Product not found or comment not added" });
    }
    res.json({ message: "Comment added successfully" });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const result = await productCollection().findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { _id: 0, comments: 1 } }
    );
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
