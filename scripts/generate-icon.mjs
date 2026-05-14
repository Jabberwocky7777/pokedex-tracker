/**
 * generate-icon.mjs
 *
 * Converts resources/icon.svg → 1024×1024 PNG and writes it to the iOS
 * asset catalogue slot that Xcode uses for all device sizes.
 *
 * Usage: node scripts/generate-icon.mjs
 *   or:  npm run generate:icon
 *
 * sharp is already available as a transitive dependency of @capacitor/assets.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root    = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "resources", "icon.svg");
const outPath = join(
  root,
  "ios", "App", "App", "Assets.xcassets",
  "AppIcon.appiconset", "AppIcon-512@2x.png",
);

console.log("Generating app icon…");
console.log("  Source:", svgPath);
console.log("  Output:", outPath);

const svgBuffer = readFileSync(svgPath);

await sharp(svgBuffer)
  .resize(1024, 1024)
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outPath);

console.log("✅  Icon written successfully.");
