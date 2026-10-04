# Blog cover spec

Every post on triplem.dev has a cover: a small piece of line art about the article, drawn as SVG in the site's own visual language. The same cover shows up in three places: the blog list rows, the featured card, and the post header. It is also rendered to a PNG for social previews.

Covers are hand-written SVG markup. They are not photos, not stock illustrations, and not AI images. `scripts/blog-cover.mjs` validates them and derives the other files from them.

## Files

| File                                  | Who writes it          | What it is                                      |
| ------------------------------------- | ---------------------- | ----------------------------------------------- |
| `public/images/blog/<slug>.svg`       | you                    | the cover, dark palette, transparent background |
| `public/images/blog/<slug>-light.svg` | `blog-cover.mjs build` | same art in the light palette                   |
| `public/images/blog/<slug>.png`       | `blog-cover.mjs build` | 1200×630 Open Graph image, framed and marked    |

The post's frontmatter points at the dark file: `cover: /images/blog/<slug>.svg`. Both locales use the same cover. `node scripts/blog-cover.mjs ensure <slug>` builds the derived files and writes that line into both posts.

## Canvas

Start the root element exactly like this. Leave the background transparent; the site and the PNG paint it.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none" stroke-linecap="round" stroke-linejoin="round">
```

Keep the subject inside the safe area, x 120–1080 and y 90–540. The frame (crop marks in the corners, and the /// mark at the bottom right of the PNG) is added for you. Do not draw it.

Cards crop nothing, but in the list rows a cover is about 280px wide, so the idea has to read at a quarter of its size. One clear subject, large, with quiet supporting detail around it.

## Palette

Draw the cover in the **dark** palette. These six values are the only colours allowed (lowercase hex). The build swaps each one for its light twin.

| Role     | Dark      | Light     | Use for                                          |
| -------- | --------- | --------- | ------------------------------------------------ |
| surface  | `#121210` | `#eae5da` | fills that hide what is behind them (knock-outs) |
| elevated | `#191916` | `#fbf8f2` | panels, cards, windows raised off the surface    |
| ink      | `#f2efe8` | `#1b1a17` | the subject's main strokes                       |
| subtle   | `#a6a298` | `#57534b` | secondary strokes                                |
| muted    | `#6f6b63` | `#8e887d` | grids, guides, ticks, dimension lines            |
| gold     | `#c8a45c` | `#8f6f2e` | the one accent: the point of the article         |

Use gold once, on the thing the article is about: the patched node, the new API, the fixed path. Depth comes from `opacity`, `stroke-opacity` and `fill-opacity`, not from extra colours. Gradients are fine if their stops use palette colours.

## Style

The site is editorial and technical: thin lines, generous space, blueprint precision. Covers should look like a diagram from a well-set engineering book.

Strokes are 1.5–2 for detail, 2.5–3 for the subject, and 4 at most for the gold accent. Use round caps and joins. Fills are rare: use surface for knock-outs and elevated for panels.

A muted dot or line grid, a ruler, dimension lines or coordinate ticks make good backgrounds. Keep them at 0.3–0.6 opacity.

## Picking the motif

Draw the article's idea, not its logo.

| Article                          | Motif ideas                                                                |
| -------------------------------- | -------------------------------------------------------------------------- |
| security release / CVE           | a request path through a stack of layers, one breach point patched in gold |
| new release / RC / version bump  | a version timeline or branch graph, the new tag in gold                    |
| performance                      | a before/after waveform or bar race, the gained margin in gold             |
| rendering, compilers, reactivity | a component tree or dependency graph, the changed edge in gold             |
| data fetching, caching           | requests fanning into a cache store, the hit path in gold                  |
| a pro tip about one API          | a stylised code window (blocks, not text) with the key line in gold        |

## Rules

The validator enforces these.

- Allowed elements: `svg g defs symbol use path rect circle ellipse line polyline polygon linearGradient radialGradient stop pattern mask clipPath filter feGaussianBlur feOffset feFlood feComposite feBlend feMerge feMergeNode`.
- No `<text>`. Letters don't flip for Persian and don't scale down to card size, so suggest code or labels with rounded bars.
- No `<image>`, `<script>`, `<style>`, `<foreignObject>` and no animation.
- No `style` or `class` attributes and no event handlers. Use presentation attributes such as `stroke="#f2efe8"`.
- `href` and `url()` may only point at ids in the same file (`#id`, `url(#id)`).
- Colours (`fill`, `stroke`, `stop-color`, `flood-color`) must be from the palette, `none`, or `url(#id)`.
- No logos, brand marks, mascots or trademarked shapes, ours included. The frame adds the site mark.
- 40 KB at most and 800 elements at most. Prefer a few long paths over many short ones, and use `<pattern>` for grids.

## Loop

1. Write `public/images/blog/<slug>.svg`.
2. Run `node scripts/blog-cover.mjs check <slug>` and fix anything it reports.
3. Run `node scripts/blog-cover.mjs build <slug>`, then look at `public/images/blog/<slug>.png`. Ask whether the subject is obvious at a glance, whether it reads at a quarter of its size, and whether gold is on the right thing. Revise if any answer is no.
4. Run `node scripts/blog-cover.mjs ensure <slug>`. It builds the derived files and sets `cover:` in both posts. If the SVG is still missing or invalid, it writes a generated fallback cover instead, so a post is never left without one.

`pnpm covers` rebuilds every cover, and `pnpm covers:check` (part of `pnpm check`) validates all of them. It also checks that every post points at a cover whose derived files exist, and that each light twin is up to date.
