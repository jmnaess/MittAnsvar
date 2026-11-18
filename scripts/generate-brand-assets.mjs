// Lager app-ikon, Android-ikonlag, oppstartsbilde og forhåndsvisning fra assets/brand/icon-source.svg.
// Kjør på nytt når ikonet endres: npm run brand:assets
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const SIZE = 1024;

const LIGHT_BACKGROUND = '#FFF4D1';
const DARK_BACKGROUND = '#1C1712';

// Android: logoen i et adaptivt ikon må ligge innenfor de midterste 66 av 108 dp.
const ADAPTIVE_SAFE_SHARE = 66 / 108;
// Oppstartsbildet vises 200 dp bredt (imageWidth). Med 2/3 blir reven ca. 120 dp høy, godt innenfor
// sirkelen på 192 dp som Android 12+ klipper til.
const SPLASH_SAFE_SHARE = 2 / 3;

// Sirklene som rommer figurene, i kildens koordinater (før transformen i SVG-en).
const BUST_CIRCLE = { x: 50, y: 50, radius: 40 };
const HEAD_CIRCLE = { x: 50, y: 38, radius: 32 };

// Figurene i kilden, i tegnerekkefølge. Skriptet finner dem etter plassering.
const SHAPE_COUNT = 15;
const LEFT_EAR = 0;
const RIGHT_EAR = 1;
const BODY = 4;
const HEAD = 5;
const FACE = 6;
const NOSE = 7;
const LEFT_EYE = 8;
const RIGHT_EYE = 9;

// Kroppen går ut av bildet i kilden. Frittstående får den en myk, buet underkant under medaljen.
const BUST_BODY_PATH = 'M34.4 60.8 L50 62.9 L65.6 60.8 L69.8 71.9 L70.6 82 Q50 96 29.4 82 L30.2 71.9 Z';

function readShapes(svg) {
  const shapes = svg.match(/<(?:path|circle)\b[^>]*\/>/g) ?? [];
  if (shapes.length !== SHAPE_COUNT) {
    throw new Error(
      `Forventet ${SHAPE_COUNT} figurer i icon-source.svg, fant ${shapes.length}. ` +
        'Oppdater figurnumrene i skriptet.',
    );
  }
  return shapes;
}

/** Utsnittet som gjør at sirkelen fyller den gitte andelen av bildet. */
function viewBoxFor({ x, y, radius }, safeShare) {
  const side = (2 * radius) / safeShare;
  return `${x - side / 2} ${y - side / 2} ${side} ${side}`;
}

function svgDocument(viewBox, content) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="${viewBox}">${content}</svg>`,
  );
}

function bustShapes(shapes) {
  return shapes
    .map((shape, index) => (index === BODY ? shape.replace(/ d="[^"]*"/, ` d="${BUST_BODY_PATH}"`) : shape))
    .join('');
}

function inWhite(shape) {
  return shape.replace(/#[0-9A-F]{6}/g, '#FFFFFF');
}

/**
 * Android bruker bare gjennomsiktigheten i dette laget. Ansiktet skjæres derfor ut av hodet,
 * mens en tynn kant, øynene og nesen beholdes så figuren leses som en rev.
 */
function headSilhouette(shapes) {
  const head = inWhite(shapes[HEAD]);
  const face = shapes[FACE].replace(/#[0-9A-F]{6}/g, '#000000');
  const outline = head.replace('fill="#FFFFFF"', 'fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linejoin="round"');
  const features = [NOSE, LEFT_EYE, RIGHT_EYE].map((index) => inWhite(shapes[index])).join('');

  return (
    `<mask id="face-cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">` +
    `<rect width="100" height="100" fill="#FFFFFF"/>${face}</mask>` +
    inWhite(shapes[LEFT_EAR]) +
    inWhite(shapes[RIGHT_EAR]) +
    `<g mask="url(#face-cutout)">${head}</g>` +
    outline +
    features
  );
}

function render(svg) {
  return sharp(svg).png({ compressionLevel: 9 });
}

function tile(input, background, size) {
  return sharp(input)
    .resize(size, size)
    .flatten({ background })
    .png()
    .toBuffer();
}

/** Samler ikon, forgrunn og oppstartsbilde på lys og mørk bakgrunn i ett bilde. */
async function writePreview(files) {
  const tileSize = 360;
  const gap = 24;
  const backgrounds = [LIGHT_BACKGROUND, DARK_BACKGROUND];
  const width = files.length * tileSize + (files.length + 1) * gap;
  const height = backgrounds.length * tileSize + (backgrounds.length + 1) * gap;

  const composites = await Promise.all(
    backgrounds.flatMap((background, row) =>
      files.map(async (file, column) => ({
        input: await tile(file, background, tileSize),
        left: gap + column * (tileSize + gap),
        top: gap + row * (tileSize + gap),
      })),
    ),
  );

  await sharp({ create: { width, height, channels: 3, background: '#808080' } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(join(ASSETS, 'brand', 'preview.png'));
}

async function main() {
  const source = await readFile(join(ASSETS, 'brand', 'icon-source.svg'), 'utf8');
  const shapes = readShapes(source);

  // Utsnittene er regnet i figurenes egne koordinater, så transformen i kilden brukes ikke her.
  const bust = bustShapes(shapes);
  const icon = join(ASSETS, 'icon.png');
  const foreground = join(ASSETS, 'android-icon-foreground.png');
  const monochrome = join(ASSETS, 'android-icon-monochrome.png');
  const splash = join(ASSETS, 'splash-icon.png');

  await sharp(Buffer.from(source), { density: (72 * SIZE) / 100 })
    .resize(SIZE, SIZE)
    .flatten({ background: LIGHT_BACKGROUND })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(icon);
  await render(svgDocument(viewBoxFor(BUST_CIRCLE, ADAPTIVE_SAFE_SHARE), bust)).toFile(foreground);
  await render(svgDocument(viewBoxFor(HEAD_CIRCLE, ADAPTIVE_SAFE_SHARE), headSilhouette(shapes))).toFile(monochrome);
  await render(svgDocument(viewBoxFor(BUST_CIRCLE, SPLASH_SAFE_SHARE), bust)).toFile(splash);

  await writePreview([icon, foreground, splash]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
