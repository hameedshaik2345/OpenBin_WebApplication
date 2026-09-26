require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../src/config/database");
const catalogService = require("../src/services/catalogService");

async function main() {
  console.log("materials direct", await catalogService.findMaterialByCode("PET"));
  console.log("price", await catalogService.getCurrentPrice(
    (await catalogService.findMaterialByCode("PET")).material_id
  ));
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
