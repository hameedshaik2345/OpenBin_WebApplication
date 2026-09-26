require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../src/config/database");

async function main() {
  console.log("loading transactionService...");
  require("../src/services/transactionService");
  console.log("loaded");
  const catalogService = require("../src/services/catalogService");
  console.log("finding material...");
  console.log(await catalogService.findMaterialByCode("PET"));
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
