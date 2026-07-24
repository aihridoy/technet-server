// tests/requireAdmin.test.js
jest.mock("../middleware/verifyToken", () => ({
  verifyFirebaseToken: jest.fn(),
}));
jest.mock("../models/userModel", () => ({
  userCollection: jest.fn(),
}));

const { verifyFirebaseToken } = require("../middleware/verifyToken");
const { userCollection } = require("../models/userModel");
const { requireAdmin } = require("../middleware/requireAdmin");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("requireAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects requests with no Authorization header", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a verified non-admin user", async () => {
    verifyFirebaseToken.mockResolvedValue({ email: "customer@example.com" });
    userCollection.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ email: "customer@example.com", role: "customer" }),
    });
    const req = { headers: { authorization: "Bearer sometoken" } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows a verified admin user through", async () => {
    verifyFirebaseToken.mockResolvedValue({ email: "admin@example.com" });
    userCollection.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ email: "admin@example.com", role: "admin" }),
    });
    const req = { headers: { authorization: "Bearer sometoken" } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.adminEmail).toBe("admin@example.com");
  });
});
