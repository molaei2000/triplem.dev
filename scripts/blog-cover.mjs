// @ts-check
/**
 * Blog cover tooling.
 *
 * A cover is a hand-drawn SVG in the *dark* palette at public/images/blog/<slug>.svg:
 * 1200×630, transparent background, art only. From it this script derives
 *   <slug>-light.svg  the same art with every colour swapped for its light-theme twin
 *   <slug>.png        the dark art on the surface colour, framed and marked, for Open Graph
 *
 *   node scripts/blog-cover.mjs check  <slug>|--all  validate; --all also checks every post has a cover
 *   node scripts/blog-cover.mjs build  <slug>|--all  validate, then write the light twin and the PNG
 *   node scripts/blog-cover.mjs ensure <slug>        build, falling back to a generated cover when the
 *                                                    drawn one is missing or invalid, and point
 *                                                    `cover:` in both locales' posts at it
 *
 * The design rules live in .github/blog-cover.md.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COVER_DIR = join(ROOT, "public", "images", "blog");
const POST_DIRS = ["en", "fa"].map((locale) => join(ROOT, "content", locale, "blog"));
const PUBLIC_PATH = "/images/blog";

const W = 1200;
const H = 630;
const MAX_BYTES = 40_000;
const MAX_ELEMENTS = 800;

/** Dark value → light value. These are the only colours a cover may use. */
const PALETTE = {
    "#121210": "#eae5da", // surface: knock-outs, fills that hide what is behind them
    "#191916": "#fbf8f2", // elevated: panels raised off the surface
    "#f2efe8": "#1b1a17", // ink: primary strokes
    "#a6a298": "#57534b", // subtle: secondary strokes
    "#6f6b63": "#8e887d", // muted: grids, guides, ticks
    "#c8a45c": "#8f6f2e", // gold: the one accent
};

const ELEMENTS = new Set([
    "svg",
    "g",
    "defs",
    "symbol",
    "use",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "linearGradient",
    "radialGradient",
    "stop",
    "pattern",
    "mask",
    "clipPath",
    "filter",
    "feGaussianBlur",
    "feOffset",
    "feFlood",
    "feComposite",
    "feBlend",
    "feMerge",
    "feMergeNode",
]);

const COLOR_ATTRS = ["fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"];
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const COLOR_VALUE = new RegExp(
    `(?<![\\w-])((?:${COLOR_ATTRS.join("|")})\\s*=\\s*["']\\s*)(#[0-9a-fA-F]{6})`,
    "g",
);

// ---------------------------------------------------------------------------------------------
// Validation

/** @param {string} raw */
function parseAttrs(raw) {
    return [...raw.matchAll(ATTR)].map((m) => [m[1], m[2] ?? m[3] ?? ""]);
}

/**
 * Checks a cover against the rules in .github/blog-cover.md.
 * @param {string} svg
 * @returns {string[]} problems; empty when the cover is valid
 */
function validate(svg) {
    /** @type {Set<string>} */
    const errors = new Set();
    const bytes = Buffer.byteLength(svg);
    if (bytes > MAX_BYTES) errors.add(`file is ${bytes} bytes; the limit is ${MAX_BYTES}`);
    if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<\?xml-stylesheet/i.test(svg)) {
        errors.add("DOCTYPE, ENTITY, CDATA and stylesheet instructions are not allowed");
    }

    const body = svg.replace(/^\uFEFF?\s*<\?xml[^?]*\?>/, "").replace(/<!--[\s\S]*?-->/g, "");
    /** @type {string[]} */
    const stack = [];
    let last = 0;
    let count = 0;
    let rootSeen = false;

    for (const m of body.matchAll(TAG)) {
        const between = body.slice(last, m.index).trim();
        if (between) errors.add(`text or malformed markup near "${between.slice(0, 40)}"`);
        last = (m.index ?? 0) + m[0].length;
        const [, closing, name = "", rawAttrs = "", selfClosing] = m;

        if (closing) {
            const open = stack.pop();
            if (open !== name) errors.add(`</${name}> closes <${open ?? "nothing"}>`);
            continue;
        }

        count++;
        if (!ELEMENTS.has(name)) errors.add(`<${name}> is not allowed`);
        const attrs = parseAttrs(rawAttrs);
        if (!rootSeen) {
            rootSeen = true;
            checkRoot(name, attrs, errors);
        } else if (stack.length === 0) {
            errors.add("only one root <svg> is allowed");
        }
        for (const [key, value] of attrs) checkAttr(name, key ?? "", value ?? "", errors);
        if (!selfClosing) stack.push(name);
    }

    if (!rootSeen) errors.add("no <svg> element found");
    if (body.slice(last).trim()) errors.add("content after the root element");
    if (stack.length) errors.add(`unclosed <${stack.join("> <")}>`);
    if (count > MAX_ELEMENTS) errors.add(`${count} elements; the limit is ${MAX_ELEMENTS}`);
    return [...errors];
}

/**
 * @param {string} name
 * @param {string[][]} attrs
 * @param {Set<string>} errors
 */
function checkRoot(name, attrs, errors) {
    if (name !== "svg") {
        errors.add("the root element must be <svg>");
        return;
    }
    const map = Object.fromEntries(attrs);
    if (map.xmlns !== "http://www.w3.org/2000/svg") {
        errors.add('the root needs xmlns="http://www.w3.org/2000/svg"');
    }
    if (map.viewBox !== `0 0 ${W} ${H}`) errors.add(`the root needs viewBox="0 0 ${W} ${H}"`);
    if ((map.width && map.width !== `${W}`) || (map.height && map.height !== `${H}`)) {
        errors.add(`width/height, when set, must be ${W} and ${H}`);
    }
}

/**
 * @param {string} el
 * @param {string} key
 * @param {string} value
 * @param {Set<string>} errors
 */
function checkAttr(el, key, value, errors) {
    const k = key.toLowerCase();
    const v = value.trim().toLowerCase();
    if (k === "style" || k === "class") {
        errors.add(`<${el}> ${key}: not allowed; use presentation attributes`);
    } else if (k.startsWith("on")) {
        errors.add(`<${el}> ${key}: event handlers are not allowed`);
    } else if (k === "href" || k === "xlink:href") {
        if (!/^#[\w-]+$/.test(value)) errors.add(`<${el}> ${key} must point inside the file (#id)`);
    } else if (k.includes(":") && k !== "xmlns:xlink") {
        errors.add(`<${el}> ${key}: namespaced attributes are not allowed`);
    }

    if (COLOR_ATTRS.includes(k) && !(v === "none" || v in PALETTE || /^url\(#[\w-]+\)$/.test(v))) {
        errors.add(
            `<${el}> ${key}="${value}" is off-palette; use ${Object.keys(PALETTE).join(", ")}, none or url(#id)`,
        );
    }
    if (/url\(/.test(v) && !/^url\(#[\w-]+\)$/.test(v)) {
        errors.add(`<${el}> ${key}: url() must reference an id in this file`);
    }
    if (/(?:javascript|data):|expression\(|rgba?\(|hsla?\(|var\(/.test(v)) {
        errors.add(`<${el}> ${key}="${value}" is not allowed`);
    }
}

// ---------------------------------------------------------------------------------------------
// Derived files

/** @param {string} svg */
const stripProlog = (svg) => svg.replace(/^\uFEFF?\s*<\?xml[^?]*\?>\s*/, "");

/**
 * The light-theme twin: every palette colour swapped for its light value.
 * @param {string} svg
 */
function toLight(svg) {
    return svg.replace(
        COLOR_VALUE,
        (_, prefix, hex) =>
            prefix + (PALETTE[/** @type {keyof PALETTE} */ (hex.toLowerCase())] ?? hex),
    );
}

/**
 * The Open Graph image: the dark art on the surface colour, with the crop marks and the
 * /// mark that frame covers on the site.
 * @param {string} svg
 */
function framed(svg) {
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
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#121210"/>
${stripProlog(svg)}
<path d="${corners}" fill="none" stroke="#6f6b63" stroke-width="1.5"/>
<g transform="translate(${W - 108} ${H - 100}) scale(0.75)" fill="none" stroke-width="4.4">
<path d="M6 42L18 6" stroke="#f2efe8"/><path d="M18 42L30 6" stroke="#c8a45c"/><path d="M30 42L42 6" stroke="#f2efe8"/>
</g>
</svg>`;
}

/** @param {string} slug */
const coverFile = (slug) => join(COVER_DIR, `${slug}.svg`);

/** @param {string} slug */
async function build(slug) {
    const svg = readFileSync(coverFile(slug), "utf8");
    const errors = validate(svg);
    if (errors.length) throw new CoverError(slug, errors);
    writeFileSync(join(COVER_DIR, `${slug}-light.svg`), toLight(svg));
    const { default: sharp } = await import("sharp");
    await sharp(Buffer.from(framed(svg)))
        .png({ compressionLevel: 9 })
        .toFile(join(COVER_DIR, `${slug}.png`));
    console.log(`built ${slug}: -light.svg, .png`);
}

// ---------------------------------------------------------------------------------------------
// Fallback cover

/** @param {string} s */
function fnv1a(s) {
    let h = 0x811c9dc5;
    for (const c of s) {
        h ^= c.codePointAt(0) ?? 0;
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** @param {number} seed */
function mulberry32(seed) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A deterministic cover for when none was drawn: the site mark at poster scale over a dot
 * grid, crossed by a ruler, balanced by a panel of code bars. Same slug, same picture.
 * @param {string} slug
 */
function fallback(slug) {
    const rand = mulberry32(fnv1a(slug));
    const pick = (/** @type {number} */ lo, /** @type {number} */ hi) =>
        lo + Math.floor(rand() * (hi - lo + 1));

    // Slashes keep the mark's slope (1 across, 3 up) and spacing.
    const top = 90;
    const bottom = 540;
    const run = (bottom - top) / 3;
    // The mark takes one side; a panel of "code" bars balances it on the other.
    const markLeft = rand() < 0.5;
    const x0 = markLeft ? pick(150, 250) : pick(500, 600);
    const gold = pick(0, 2);
    const ruler = pick(4, 11) * 40 + 10;

    const slashes = [0, 1, 2]
        .map((i) => {
            const x = x0 + i * run;
            const accent = i === gold;
            const echo = [-1, 1]
                .map(
                    (side) =>
                        `<path d="M${x + side * 22} ${bottom}L${x + run + side * 22} ${top}" stroke="#6f6b63" stroke-opacity="0.45"/>`,
                )
                .join("");
            return `${echo}<path d="M${x} ${bottom}L${x + run} ${top}" stroke="${accent ? "#c8a45c" : "#f2efe8"}" stroke-width="${accent ? 4 : 2.5}"/>`;
        })
        .join("");

    const ticks = Array.from({ length: 25 }, (_, i) => {
        const x = 120 + i * 40;
        const h = i % 5 === 0 ? 14 : 7;
        return `M${x} ${ruler - h}V${ruler}`;
    }).join("");
    const node = x0 + gold * run + (bottom - ruler) / 3;

    const px = markLeft ? 760 : 160;
    const py = pick(140, 200);
    const rows = pick(4, 7);
    const ph = 76 + rows * 28;
    const bars = Array.from({ length: rows }, (_, i) => {
        const indent = pick(0, 2) * 20;
        const width = pick(60, 200 - indent);
        const fill = i === 1 ? "#a6a298" : "#6f6b63";
        return `<rect x="${px + 24 + indent}" y="${py + 64 + i * 28}" width="${width}" height="8" rx="4" fill="${fill}"/>`;
    }).join("");
    const panel = `<rect x="${px}" y="${py}" width="280" height="${ph}" rx="12" fill="#191916" stroke="#a6a298" stroke-width="2"/>
<path d="M${px} ${py + 40}H${px + 280}" stroke="#a6a298" stroke-width="1.5" stroke-opacity="0.6"/>
<circle cx="${px + 22}" cy="${py + 20}" r="4" fill="#6f6b63"/><circle cx="${px + 38}" cy="${py + 20}" r="4" fill="#6f6b63"/><circle cx="${px + 54}" cy="${py + 20}" r="4" fill="#6f6b63"/>
${bars}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="none" stroke-linecap="round">
<defs><pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1.4" fill="#6f6b63"/></pattern></defs>
<rect x="120" y="90" width="960" height="450" fill="url(#dots)" opacity="0.55"/>
<path d="M120 ${ruler}H1080${ticks}" stroke="#6f6b63" stroke-width="1.5"/>
${panel}
${slashes}
<circle cx="${node}" cy="${ruler}" r="9" fill="#121210" stroke="#c8a45c" stroke-width="2.5"/>
</svg>
`;
}

// ---------------------------------------------------------------------------------------------
// Posts

/**
 * Sets `cover:` in a post's frontmatter (after `date:`), keeping its line endings.
 * @param {string} file
 * @param {string} value
 */
function setCover(file, value) {
    const src = readFileSync(file, "utf8");
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) throw new Error(`${file} has no frontmatter`);
    const lines = (fm[1] ?? "").split(/\r?\n/);
    const line = `cover: ${value}`;
    const at = lines.findIndex((l) => /^cover:/.test(l));
    if (at >= 0) lines[at] = line;
    else {
        const date = lines.findIndex((l) => /^date:/.test(l));
        lines.splice(date >= 0 ? date + 1 : lines.length, 0, line);
    }
    const out = `---${eol}${lines.join(eol)}${eol}---${src.slice(fm[0].length)}`;
    if (out !== src) writeFileSync(file, out);
}

/** @param {string} file */
function readCover(file) {
    const fm = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return fm?.[1]?.match(/^cover:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
}

/** Every post must point at a cover whose light twin and PNG exist. */
function checkPosts() {
    /** @type {string[]} */
    const problems = [];
    for (const dir of POST_DIRS) {
        if (!existsSync(dir)) continue;
        for (const name of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
            const file = join(dir, name);
            const rel = file.slice(ROOT.length + 1).replaceAll("\\", "/");
            const cover = readCover(file);
            if (!cover) {
                problems.push(`${rel}: no cover (run: node scripts/blog-cover.mjs ensure <slug>)`);
                continue;
            }
            const base = cover.replace(/\.svg$/, "");
            for (const suffix of [".svg", "-light.svg", ".png"]) {
                if (!existsSync(join(ROOT, "public", `${base}${suffix}`))) {
                    problems.push(`${rel}: missing public${base}${suffix}`);
                }
            }
        }
    }
    return problems;
}

// ---------------------------------------------------------------------------------------------
// CLI

class CoverError extends Error {
    /**
     * @param {string} slug
     * @param {string[]} errors
     */
    constructor(slug, errors) {
        super(`${slug}.svg is invalid:\n  - ${errors.join("\n  - ")}`);
    }
}

function allSlugs() {
    if (!existsSync(COVER_DIR)) return [];
    return readdirSync(COVER_DIR)
        .filter((f) => f.endsWith(".svg") && !f.endsWith("-light.svg"))
        .map((f) => f.slice(0, -4))
        .sort();
}

/** @param {string} slug */
async function ensure(slug) {
    const file = coverFile(slug);
    let reason = "";
    if (!existsSync(file)) reason = "no cover was drawn";
    else {
        const errors = validate(readFileSync(file, "utf8"));
        if (errors.length)
            reason = `the drawn cover was invalid (${errors.slice(0, 3).join("; ")})`;
    }
    if (reason) {
        writeFileSync(file, fallback(slug));
        console.log(`Used the generated fallback cover: ${reason}.`);
    }
    await build(slug);
    for (const dir of POST_DIRS) {
        const post = join(dir, `${slug}.md`);
        if (existsSync(post)) setCover(post, `${PUBLIC_PATH}/${slug}.svg`);
        else console.warn(`warning: ${post} does not exist`);
    }
}

async function main() {
    const [command, target] = process.argv.slice(2);
    const usage = "usage: node scripts/blog-cover.mjs <check|build|ensure> <slug>|--all";
    if (!command || !target || !["check", "build", "ensure"].includes(command)) {
        throw new Error(usage);
    }
    if (target !== "--all" && !SLUG.test(target)) throw new Error(`invalid slug "${target}"`);
    if (command === "ensure") {
        if (target === "--all") throw new Error("ensure takes a single slug");
        return ensure(target);
    }

    const slugs = target === "--all" ? allSlugs() : [target];
    /** @type {string[]} */
    const failures = [];
    for (const slug of slugs) {
        if (!existsSync(coverFile(slug))) {
            failures.push(`${slug}.svg does not exist`);
            continue;
        }
        try {
            if (command === "build") await build(slug);
            else {
                const svg = readFileSync(coverFile(slug), "utf8");
                const errors = validate(svg);
                if (errors.length) throw new CoverError(slug, errors);
                const light = join(COVER_DIR, `${slug}-light.svg`);
                if (existsSync(light) && readFileSync(light, "utf8") !== toLight(svg)) {
                    throw new Error(`${slug}-light.svg is out of date (run: pnpm covers)`);
                }
            }
        } catch (error) {
            failures.push(error instanceof Error ? error.message : String(error));
        }
    }
    if (command === "check" && target === "--all") failures.push(...checkPosts());
    if (failures.length) throw new Error(failures.join("\n"));
    if (command === "check") console.log(`covers ok (${slugs.length})`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
