const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri:
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  cache: true,
  cacheMaxAge: 6 * 60 * 60 * 1000,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

const verifyFirebaseToken = (token) =>
  new Promise((resolve, reject) => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });

module.exports = { verifyFirebaseToken };
