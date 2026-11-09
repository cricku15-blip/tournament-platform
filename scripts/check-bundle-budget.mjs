import fs from "fs";
import path from "path";
import zlib from "zlib";

const MAX_LANDING_GZIP_KB = 150;
const manifestPath = path.resolve(".next/build-manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("❌ .next/build-manifest.json not found. Run 'next build' first.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const landingFiles = new Set();

// Gather root landing page chunks and common shared chunks
const pages = ["/", "/page"];
for (const p of pages) {
  if (manifest.pages[p]) {
    manifest.pages[p].forEach((f) => landingFiles.add(f));
  }
}

// Add root app chunks if present
if (manifest.rootMainFiles) {
  manifest.rootMainFiles.forEach((f) => landingFiles.add(f));
}

let totalBytes = 0;
let totalGzipBytes = 0;

for (const file of landingFiles) {
  if (!file.endsWith(".js")) continue;
  const filePath = path.resolve(".next", file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    totalBytes += content.length;
    totalGzipBytes += gzipped.length;
  }
}

const totalGzipKb = (totalGzipBytes / 1024).toFixed(2);
console.log(`📦 Landing Page JS Bundle: ${totalGzipKb} KB (gzipped) [Max allowed: ${MAX_LANDING_GZIP_KB} KB]`);

if (Number(totalGzipKb) > MAX_LANDING_GZIP_KB) {
  console.error(
    `❌ Bundle budget exceeded! ${totalGzipKb} KB > ${MAX_LANDING_GZIP_KB} KB limit.`
  );
  process.exit(1);
} else {
  console.log("✅ Landing page bundle budget respected!");
}
