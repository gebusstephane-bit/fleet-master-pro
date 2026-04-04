const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "images", "landing");

async function convert() {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));

  for (const file of files) {
    const input = path.join(dir, file);
    const output = path.join(dir, file.replace(".png", ".webp"));
    const before = fs.statSync(input).size;

    await sharp(input).webp({ quality: 80 }).toFile(output);

    const after = fs.statSync(output).size;
    const reduction = (((before - after) / before) * 100).toFixed(1);
    console.log(
      `${file}: ${(before / 1024 / 1024).toFixed(1)} Mo → ${(after / 1024 / 1024).toFixed(1)} Mo (-${reduction}%)`
    );
  }

  console.log("\nDone.");
}

convert().catch(console.error);
