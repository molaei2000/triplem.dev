/**
 * The default Open Graph image, public/og-image.png (1200×630): the /// mark at poster scale
 * on the surface colour, over the dot grid and inside the crop marks the blog covers use
 * (scripts/blog-cover.mjs). nuxt-seo-utils finds the file by name and adds og:image, with its
 * size and type, to every page that does not set its own.
 *
 *   node scripts/og-default.mjs
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "og-image.png");

const W = 1200;
const H = 630;
// The dark palette of the blog covers.
const SURFACE = "#121210";
const INK = "#f2efe8";
const MUTED = "#6f6b63";
const GOLD = "#c8a45c";

// app/assets/icons/mark.svg is a 48-unit box; nine times that fills the safe area.
const SCALE = 9;
const SIZE = 48 * SCALE;

const inset = 36;
const arm = 18;
const corners = [
    [inset, inset, 1, 1],
    [W - inset, inset, -1, 1],
    [inset, H - inset, 1, -1],
    [W - inset, H - inset, -1, -1],
]
    .map(([x = 0, y = 0, dx = 0, dy = 0]) => `M${x} ${y + dy * arm}V${y}H${x + dx * arm}`)
    .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1.4" fill="${MUTED}"/></pattern></defs>
<rect width="${W}" height="${H}" fill="${SURFACE}"/>
<rect x="120" y="90" width="960" height="450" fill="url(#dots)" opacity="0.55"/>
<g transform="translate(${(W - SIZE) / 2} ${(H - SIZE) / 2}) scale(${SCALE})" fill="none" stroke-width="4.4">
<path d="M6 42L18 6" stroke="${INK}"/><path d="M18 42L30 6" stroke="${GOLD}"/><path d="M30 42L42 6" stroke="${INK}"/>
</g>
<path d="${corners}" fill="none" stroke="${MUTED}" stroke-width="1.5"/>
</svg>`;

const { default: sharp } = await import("sharp");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`built ${OUT}`);
