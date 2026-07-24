const { productCollection } = require("../models/productModel");
const { ObjectId } = require("../utils/db");

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const products = await productCollection()
      .find({})
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await productCollection().countDocuments({});

    res.send({
      status: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total,
      },
    });
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

exports.updateProduct = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await productCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    res.send({ status: true, data: result });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { name } = req.query;
    let query = {};
    if (name) {
      query = { name: { $regex: new RegExp(name, "i") } };
    }
    const products = await productCollection().find(query).toArray();
    res.send({ status: true, data: products });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
