const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectDB, disconnectDB } = require("../utils/db");
const app = require("../app");

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.DB_NAME = "test-tech-net";
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongod.stop();
});

test("posting reviews recomputes the product's rating average and count", async () => {
  const productInsert = await request(app).post("/product").send({
    name: "Test Widget",
    image: "https://example.com/x.png",
    price: 10,
    features: ["a"],
    status: true,
    rating: 0,
    ratingCount: 0,
  });
  const productId = productInsert.body.insertedId;

  await request(app).post(`/product/${productId}/reviews`).send({
    authorEmail: "a@example.com",
    authorName: "A",
    rating: 5,
    comment: "Great!",
  });

  const res = await request(app).post(`/product/${productId}/reviews`).send({
    authorEmail: "b@example.com",
    authorName: "B",
    rating: 3,
    comment: "OK",
  });

  expect(res.status).toBe(200);

  const productRes = await request(app).get(`/product/${productId}`);
  expect(productRes.body.rating).toBe(4);
  expect(productRes.body.ratingCount).toBe(2);
});
