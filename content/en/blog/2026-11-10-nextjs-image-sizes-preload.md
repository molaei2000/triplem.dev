---
title: "Next.js pro tip: a fill image without sizes downloads for a full-width viewport, and preload is not the new priority"
description: "next/image with fill and no sizes assumes a 100vw layout and ships an oversized srcset. How sizes shapes srcset, when preload helps and why fetchPriority is often better."
date: 2026-11-10
cover: /images/blog/2026-11-10-nextjs-image-sizes-preload.svg
tags: [next.js, pro-tip, performance]
draft: false
---

Two `next/image` habits survive code review because nothing breaks: a `fill` image in a card grid with no `sizes`, and a mechanical rename of `priority` to `preload` during the Next.js 16 upgrade. Both change what the browser downloads and when. Neither shows up as an error, only as a worse LCP and a heavier network tab.

Everything below is checked against the current [`next/image` reference](https://nextjs.org/docs/app/api-reference/components/image) (last updated 2026-11-06).

## Mistake 1: `fill` without `sizes`

```tsx
// app/components/product-card.tsx
import Image from "next/image";

export function ProductCard({ src, name }: { src: string; name: string }) {
    return (
        <div className="relative aspect-4/3">
            {/* In a 3-column grid, each card is about a third of the viewport. */}
            <Image fill src={src} alt={name} />
        </div>
    );
}
```

The docs state that if `sizes` is missing, the browser assumes the image is as wide as the viewport (`100vw`) and may download an unnecessarily large file. The component also changes how it builds `srcset` depending on what you pass:

- `width` set, no `sizes`: a limited `srcset` (the docs give 1x and 2x as the example), meant for fixed-size images.
- `fill`, no `sizes`: a `srcset` from `deviceSizes` only, as if the image spans the full viewport.
- `sizes` set: a full width-descriptor `srcset` (640w, 750w and so on), built for responsive layouts.

So in the grid above, a one-third-width card on a wide screen asks the browser to pick a candidate for a full-width slot. The browser does what it was told. The page pays for it in bytes, and on LCP images, in time.

### The fix

Describe the layout the way your CSS does, with media conditions first and a fallback last:

```tsx
<Image
    fill
    src={src}
    alt={name}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

The docs say to reach for `sizes` when the image uses `fill`, or when CSS makes it responsive. The value must mirror your real layout. If the grid becomes four columns at a new breakpoint and `sizes` still says `33vw`, the browser will quietly pick a candidate that is too large or too small. Treat `sizes` like a second copy of a breakpoint table and keep it next to the CSS it describes, ideally in the same component.

### What `imageSizes` does here

With `sizes`, Next.js builds the `srcset` from `imageSizes` concatenated with `deviceSizes`. The reference notes that `imageSizes` is only used for images that provide `sizes`, and that its entries should all be smaller than the smallest `deviceSizes` entry. If your design has small thumbnails, say 48 or 96 px wide, those widths belong in `imageSizes`. A thumbnail with no `sizes` never uses them.

## Mistake 2: treating `preload` as a drop-in for `priority`

The reference says that since Next.js 16, `priority` is deprecated in favour of `preload`, to make the behaviour explicit. The version table lists this under `v16.0.0`: the `preload` prop was added and `priority` deprecated. So the upgrade nudge is real.

But read what `preload` does. With `true`, it inserts a `<link>` in the document `<head>` to preload the image. That is all. The docs list when it makes sense:

- the image is the LCP element;
- it is above the fold, typically a hero;
- you want loading to begin from `<head>`, before the browser would discover it in `<body>`.

And when not to use it:

- several images could be the LCP element depending on the viewport;
- you are already using `loading`;
- you are already using `fetchPriority`.

The last sentence of that section is the one to remember: in most cases, the docs recommend `loading="eager"` or `fetchPriority="high"` instead of `preload`.

```tsx
// Hero whose position is stable across viewports
<Image src={hero} alt="" sizes="100vw" fetchPriority="high" loading="eager" />

// Only if the hero is genuinely discovered late and is always the LCP element
<Image src={hero} alt="" sizes="100vw" preload />
```

Note that the docs say not to combine `preload` with `loading` or `fetchPriority`, so pick one strategy per image.

### The art-direction trap

A common pattern renders two images, one for mobile and one for desktop, and hides one with CSS. The reference has an art-direction example for exactly this, and its note is blunt: the default `loading="lazy"` makes sure only the right image loads. You cannot use `preload` or `loading="eager"` there, because both images would load. The suggested tool is `fetchPriority="high"`. A blanket `priority` to `preload` rename on that component doubles the hero download on every device.

## Trade-offs and when the original is fine

- **A fixed-size image with `width` and `height` and no `sizes` is fine.** The limited 1x/2x `srcset` is what you want for an avatar that is always 64 px.
- **`sizes="100vw"` on a true full-bleed hero is correct,** and you gain nothing by being clever. The `fill`-without-`sizes` case only hurts when the real slot is narrower than the viewport.
- **`preload` is not wrong,** it is narrower than `priority` sounded. For a single known LCP image that sits late in the markup, starting the fetch from `<head>` is what you want.
- **`sizes` is a hint, not a constraint.** The browser may still choose differently, and the docs only promise it will use `sizes` to choose from the generated `srcset`.

## A quick audit

1. Grep for `fill` and check each match has `sizes` that mirrors the CSS grid.
2. Grep for `preload` and `priority`. For each, ask whether that image is always the LCP element at every viewport. If not, use `fetchPriority="high"` instead.
3. Check the network panel for the largest candidate chosen on a mid-size viewport. If the downloaded width is far above the rendered CSS width times the device pixel ratio, `sizes` is wrong or missing.

Also remember that the same version table records that in Next.js 16 the default `qualities` configuration changed to `[75]`. If you pass other `quality` values, the docs say a value outside a configured `qualities` list is coerced to the closest allowed entry, and development logs a warning. Add the values you really use to the allowlist rather than discovering the coercion in production.

## Sources

- [Next.js docs: Image component](https://nextjs.org/docs/app/api-reference/components/image)
