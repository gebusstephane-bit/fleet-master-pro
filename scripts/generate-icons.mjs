/**
 * generate-icons.mjs
 * Génère les icônes PWA depuis logo-icon.svg vers public/icons/
 * Usage : node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// SVG 512x512 — version agrandie du logo FleetMaster
const ICON_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#09090B"/>
  <g transform="translate(64, 64)">
    <!-- Centre -->
    <circle cx="192" cy="192" r="52" fill="#3B82F6"/>
    <!-- 6 nœuds satellites -->
    <circle cx="192" cy="52"  r="30" fill="#FAFAFA"/>
    <circle cx="312" cy="112" r="30" fill="#FAFAFA"/>
    <circle cx="312" cy="272" r="30" fill="#FAFAFA"/>
    <circle cx="192" cy="332" r="30" fill="#FAFAFA"/>
    <circle cx="72"  cy="272" r="30" fill="#FAFAFA"/>
    <circle cx="72"  cy="112" r="30" fill="#FAFAFA"/>
    <!-- Liaisons -->
    <line x1="192" y1="192" x2="192" y2="82"  stroke="#FAFAFA" stroke-width="14" stroke-linecap="round"/>
    <line x1="192" y1="192" x2="293" y2="122" stroke="#FAFAFA" stroke-width="14" stroke-linecap="round"/>
    <line x1="192" y1="192" x2="293" y2="262" stroke="#FAFAFA" stroke-width="14" stroke-linecap="round"/>
    <line x1="192" y1="192" x2="192" y2="302" stroke="#FAFAFA" stroke-width="14" stroke-linecap="round"/>
    <line x1="192" y1="192" x2="91"  y2="262" stroke="#FAFAFA" stroke-width="14" stroke-linecap="round"/>
    <line x1="192" y1="192" x2="91"  y2="122" stroke="#FAFAFA" stroke-width="14" stroke-linecap="round"/>
  </g>
</svg>`;

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  const svgBuffer = Buffer.from(ICON_SVG);

  for (const size of SIZES) {
    const outPath = join(ROOT, 'public', 'icons', `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✓ icon-${size}x${size}.png`);
  }

  // apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(ROOT, 'public', 'icons', 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // Copie du SVG original pour la version vector (maskable)
  writeFileSync(join(ROOT, 'public', 'icons', 'icon.svg'), ICON_SVG);
  console.log('✓ icon.svg');

  console.log('\n🎉 Toutes les icônes générées dans public/icons/');
}

run().catch((err) => { console.error(err); process.exit(1); });
