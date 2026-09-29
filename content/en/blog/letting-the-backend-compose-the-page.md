---
title: Letting the backend compose the page
description: A small, typed block registry that renders pages from backend data, without turning the front end into a template engine.
date: 2026-08-24
tags: [Architecture, Next.js]
draft: true
---

Marketing pages change weekly; deploys shouldn't have to. A page builder lets the backend decide *which* blocks a page has and in what order, while the front end still decides *how* each block looks and behaves.

## Blocks are data

Each block is a plain object with a `type` and the fields it needs. A discriminated union describes all of them, and validation happens once, at the edge.

```tsx [blocks.tsx]
const Block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hero"), title: z.string(), cta: z.string().optional() }),
  z.object({ type: z.literal("faq"), items: z.array(z.object({ q: z.string(), a: z.string() })) }),
]);
type Block = z.infer<typeof Block>;

const registry: { [K in Block["type"]]: ComponentType<Extract<Block, { type: K }>> } = {
  hero: HeroBlock,
  faq: FaqBlock,
};

export function Blocks({ blocks }: { blocks: unknown[] }) {
  return blocks.map((raw, i) => {
    const block = Block.safeParse(raw);
    if (!block.success) return null; // unknown or broken: skip it, log it, keep rendering
    const Component = registry[block.data.type] as ComponentType<Block>;
    return <Component key={i} {...block.data} />;
  });
}
```

## Fail soft, loudly

A new block type shipped by the backend before the front end knows it must not take the page down. Unknown blocks render nothing and report themselves, so the page degrades by one section instead of to an error screen.

## Keep the registry boring

The registry is a map, not a framework. Adding a block is three steps: a schema, a component, one line in the map. When it grows past that, the design is asking for a second page type, not a cleverer builder.
