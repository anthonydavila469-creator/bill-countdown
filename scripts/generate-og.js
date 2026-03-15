const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// === Background: solid dark purple gradient ===
const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
bgGrad.addColorStop(0, '#110820');
bgGrad.addColorStop(0.5, '#1a0e30');
bgGrad.addColorStop(1, '#0d0618');
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// === Large violet glow orb (center) — STRONG opacity ===
const glowX = WIDTH / 2;
const glowY = HEIGHT * 0.4;
const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 350);
glow.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
glow.addColorStop(0.3, 'rgba(139, 92, 246, 0.25)');
glow.addColorStop(0.7, 'rgba(99, 52, 206, 0.08)');
glow.addColorStop(1, 'rgba(139, 92, 246, 0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// === Top badge: "Smart Bill Tracking & Reminders" — SOLID VIOLET ===
const badgeText = 'Smart Bill Tracking & Reminders';
ctx.font = '600 18px "Helvetica Neue", Arial, sans-serif';
const badgeWidth = ctx.measureText(badgeText).width + 48;
const badgeHeight = 38;
const badgeX = (WIDTH - badgeWidth) / 2;
const badgeY = 155;

// Badge background — SOLID purple, not transparent
ctx.beginPath();
ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 19);
ctx.fillStyle = '#7C3AED';
ctx.fill();

// Badge text — WHITE on purple
ctx.fillStyle = '#FFFFFF';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(badgeText, WIDTH / 2, badgeY + badgeHeight / 2);

// === "Duezo" logo text — "Due" white, "zo" violet ===
ctx.font = 'bold 96px "Helvetica Neue", Arial, sans-serif';
ctx.textBaseline = 'middle';

// Measure parts to center the full word
const dueMeasure = ctx.measureText('Due');
const zoMeasure = ctx.measureText('zo');
const fullWidth = dueMeasure.width + zoMeasure.width;
const startX = (WIDTH - fullWidth) / 2;

// Strong violet glow behind text
ctx.shadowColor = '#8B5CF6';
ctx.shadowBlur = 50;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;

// "Due" in white
ctx.textAlign = 'left';
ctx.fillStyle = '#FFFFFF';
ctx.fillText('Due', startX, 275);
ctx.fillText('Due', startX, 275);

// "zo" in violet
ctx.fillStyle = '#8B5CF6';
ctx.fillText('zo', startX + dueMeasure.width, 275);
ctx.fillText('zo', startX + dueMeasure.width, 275);

// Reset shadow
ctx.shadowColor = 'transparent';
ctx.shadowBlur = 0;

// === Tagline ===
ctx.textAlign = 'center';
ctx.font = '400 32px "Helvetica Neue", Arial, sans-serif';
ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
ctx.fillText('Never Miss a Bill Again', WIDTH / 2, 355);

// === Violet accent line — BOLD ===
const lineWidth = 160;
const lineGrad = ctx.createLinearGradient(WIDTH/2 - lineWidth/2, 0, WIDTH/2 + lineWidth/2, 0);
lineGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
lineGrad.addColorStop(0.3, '#8B5CF6');
lineGrad.addColorStop(0.7, '#8B5CF6');
lineGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
ctx.strokeStyle = lineGrad;
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(WIDTH/2 - lineWidth/2, 405);
ctx.lineTo(WIDTH/2 + lineWidth/2, 405);
ctx.stroke();

// === Bottom URL ===
ctx.textAlign = 'center';
ctx.font = '400 22px "Helvetica Neue", Arial, sans-serif';
ctx.fillStyle = '#A78BFA';
ctx.fillText('duezo.app', WIDTH / 2, 470);

// === Save ===
const outPath = path.join(__dirname, '..', 'public', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log(`✅ OG image saved to ${outPath} (${buffer.length} bytes)`);
console.log(`   Dimensions: ${WIDTH}x${HEIGHT}`);
