const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const sourceImage = path.join(__dirname, "../public/elastic-logo.png");
const outputDir = path.join(__dirname, "../public");

// Create logo192.png (192x192)
sharp(sourceImage)
  .resize(192, 192)
  .toFile(path.join(outputDir, "logo192.png"))
  .then(() => console.log("Created logo192.png"))
  .catch((err) => console.error("Error creating logo192.png:", err));

// Create logo512.png (512x512)
sharp(sourceImage)
  .resize(512, 512)
  .toFile(path.join(outputDir, "logo512.png"))
  .then(() => console.log("Created logo512.png"))
  .catch((err) => console.error("Error creating logo512.png:", err));

// For favicon.ico, we'll create several sizes and convert them
// Since this is a bit more complex, for now we'll just copy the original as favicon
fs.copyFileSync(sourceImage, path.join(outputDir, "favicon.ico"));
console.log("Created favicon.ico");

console.log("Icons generated successfully");
