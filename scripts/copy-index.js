const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const src = path.join(root, "webapp", "public", "templates-index.json");
const dest = path.join(root, "explorer", "public", "templates-index.json");
if (!fs.existsSync(src)) {
  console.warn("copy-index: source not found, run npm run build:index first");
  process.exit(0);
}
fs.copyFileSync(src, dest);
console.log("copy-index: copied templates-index.json to explorer/public");
