const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS app icon sizes needed
const sizes = [
  { size: 20, scales: [1, 2, 3] },   // Notification
  { size: 29, scales: [1, 2, 3] },   // Settings
  { size: 40, scales: [1, 2, 3] },   // Spotlight
  { size: 60, scales: [2, 3] },      // App icon (iPhone)
  { size: 76, scales: [1, 2] },      // App icon (iPad)
  { size: 83.5, scales: [2] },       // App icon (iPad Pro)
  { size: 1024, scales: [1] },       // App Store
];

// Use the final icon (Anthony's ChatGPT creation)
const inputPng = path.join(__dirname, '../public/app-icon-final.png');
const outputDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const contents = {
    images: [],
    info: { author: 'xcode', version: 1 }
  };

  for (const { size, scales } of sizes) {
    for (const scale of scales) {
      const pixelSize = Math.round(size * scale);
      const filename = `icon-${size}@${scale}x.png`;
      const outputPath = path.join(outputDir, filename);

      await sharp(inputPng)
        .resize(pixelSize, pixelSize)
        .png()
        .toFile(outputPath);

      console.log(`Generated: ${filename} (${pixelSize}x${pixelSize})`);

      contents.images.push({
        filename,
        idiom: size >= 76 ? 'ipad' : 'iphone',
        scale: `${scale}x`,
        size: `${size}x${size}`
      });
    }
  }

  // Add universal 1024 for App Store
  contents.images.push({
    filename: 'icon-1024@1x.png',
    idiom: 'ios-marketing',
    scale: '1x',
    size: '1024x1024'
  });

  // Write Contents.json
  fs.writeFileSync(
    path.join(outputDir, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );

  console.log('\\nContents.json updated!');
  console.log('App icons generated successfully! 🎉');
}

generateIcons().catch(console.error);
