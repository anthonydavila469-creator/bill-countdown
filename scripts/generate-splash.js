const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, '../public/splash.svg');
const outputDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/Splash.imageset');

async function generateSplash() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate splash at 2732x2732 (largest iPad size, will scale down)
  const sizes = [
    { name: 'splash-2732x2732.png', size: 2732 },
    { name: 'splash-2732x2732-1.png', size: 2732 },
    { name: 'splash-2732x2732-2.png', size: 2732 },
  ];

  for (const { name, size } of sizes) {
    const outputPath = path.join(outputDir, name);
    
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${name}`);
  }

  // Write Contents.json
  const contents = {
    images: [
      { filename: 'splash-2732x2732.png', idiom: 'universal', scale: '1x' },
      { filename: 'splash-2732x2732-1.png', idiom: 'universal', scale: '2x' },
      { filename: 'splash-2732x2732-2.png', idiom: 'universal', scale: '3x' }
    ],
    info: { author: 'xcode', version: 1 }
  };

  fs.writeFileSync(
    path.join(outputDir, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );

  console.log('\\nSplash screen generated successfully! 🎉');
}

generateSplash().catch(console.error);
