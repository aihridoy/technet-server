const app = require("./app");
const { connectDB } = require("./utils/db");
const { port } = require("./utils/config");

connectDB().catch(console.error);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
