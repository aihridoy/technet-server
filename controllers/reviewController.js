const { ObjectId } = require("../utils/db");
const { reviewCollection } = require("../models/reviewModel");
const { productCollection } = require("../models/productModel");

const recomputeProductRating = async (productId) => {
  const agg = await reviewCollection()
    .aggregate([
      { $match: { productId: new ObjectId(productId) } },
      {
        $group: {
          _id: "$productId",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const { avg = 0, count = 0 } = agg[0] || {};
  await productCollection().updateOne(
    { _id: new ObjectId(productId) },
    { $set: { rating: Math.round(avg * 10) / 10, ratingCount: count } }
  );
};

exports.addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { authorEmail, authorName, rating, comment } = req.body;

    if (!authorEmail || !rating || !comment) {
      return res.status(400).send({
        status: false,
        error: "authorEmail, rating and comment are required",
      });
    }
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .send({ status: false, error: "rating must be between 1 and 5" });
    }

    const review = {
      productId: new ObjectId(productId),
      authorEmail,
      authorName: authorName || authorEmail.split("@")[0],
      rating: Number(rating),
      comment,
      createdAt: new Date().toISOString(),
    };

    await reviewCollection().insertOne(review);
    await recomputeProductRating(productId);

    res.send({ status: true, data: review });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await reviewCollection()
      .find({ productId: new ObjectId(productId) })
      .sort({ createdAt: -1 })
      .toArray();
    res.send({ status: true, data: reviews });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};
