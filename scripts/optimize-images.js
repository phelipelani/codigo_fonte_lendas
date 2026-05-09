const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'src', 'assets');
const ICONES = path.join(ASSETS, 'icones');

// Config
const ICON_MAX = 256;
const LOGO_MAX_WIDTH = 512;
const WEBP_QUALITY = 80;

async function convertToWebp(inputPath, maxWidth, maxHeight) {
  const filename = path.basename(inputPath);
  const outputPath = inputPath.replace(/\.png$/i, '.webp');

  try {
    const metadata = await sharp(inputPath).metadata();
    let pipeline = sharp(inputPath);

    const needsResize =
      (maxWidth && metadata.width > maxWidth) ||
      (maxHeight && metadata.height > maxHeight);

    if (needsResize) {
      pipeline = pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    await pipeline.webp({ quality: WEBP_QUALITY }).toFile(outputPath);

    const originalSize = fs.statSync(inputPath).size;
    const newSize = fs.statSync(outputPath).size;
    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);

    console.log(
      `  ${filename} => .webp | ${(originalSize / 1024).toFixed(0)}KB -> ${(newSize / 1024).toFixed(0)}KB (${savings}% smaller)${needsResize ? ' [resized]' : ''}`
    );
  } catch (err) {
    console.error(`  ERROR processing ${filename}: ${err.message}`);
  }
}

async function main() {
  console.log('=== Futlendas Image Optimization ===\n');

  // 1. Icons in src/assets/icones/
  console.log('Processing icons (max 256x256):');
  const iconFiles = fs.readdirSync(ICONES).filter((f) => f.endsWith('.png'));
  for (const file of iconFiles) {
    await convertToWebp(path.join(ICONES, file), ICON_MAX, ICON_MAX);
  }

  // 2. Logo
  console.log('\nProcessing Logo (max 512px wide):');
  const logoPath = path.join(ASSETS, 'Logo.png');
  if (fs.existsSync(logoPath)) {
    await convertToWebp(logoPath, LOGO_MAX_WIDTH, undefined);
  }

  // 3. Team color logos (Amarelo, Azul, Preto, Rosa)
  console.log('\nProcessing team logos (max 256x256):');
  const teamLogos = ['Amarelo.png', 'Azul.png', 'Preto.png', 'Rosa.png'];
  for (const file of teamLogos) {
    const filePath = path.join(ASSETS, file);
    if (fs.existsSync(filePath)) {
      await convertToWebp(filePath, ICON_MAX, ICON_MAX);
    }
  }

  // 4. Other large PNGs in assets root
  console.log('\nProcessing other assets:');
  const otherFiles = ['lenda coin.png', 'icone Rosa (Sao Paulando).png'];
  for (const file of otherFiles) {
    const filePath = path.join(ASSETS, file);
    if (fs.existsSync(filePath)) {
      await convertToWebp(filePath, LOGO_MAX_WIDTH, undefined);
    }
  }

  console.log('\nDone! WebP files created alongside originals.');
}

main().catch(console.error);
