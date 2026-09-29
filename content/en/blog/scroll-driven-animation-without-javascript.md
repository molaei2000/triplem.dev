---
title: Scroll-driven animation without JavaScript
description: How the experience timeline on this site draws itself with animation-timeline, and what happens in browsers that can't.
date: 2026-07-18
tags: [CSS, Motion]
draft: true
---

The gold line on the experience timeline draws itself as you scroll. There's no scroll listener and no animation library behind it: just CSS.

## The whole effect

```css [timeline.css]
@supports (animation-timeline: view()) {
  .draw {
    animation: draw linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 60%;
  }

  @keyframes draw {
    from { transform: scaleY(0); }
    to { transform: scaleY(1); }
  }
}

@media (prefers-reduced-motion: reduce) {
  .draw { animation: none; transform: none; }
}
```

`animation-timeline: view()` swaps time for the element's position in the viewport. `animation-range` says when to start and finish: from the moment the line is 10% into view until it has covered 60% of it.

## Why it degrades well

Browsers without scroll timelines skip the `@supports` block and simply show the finished line. Nobody gets a broken state, and nobody downloads code for an effect they can't see.

Because the animation only touches `transform`, it can run off the main thread, so a busy page doesn't make it stutter.

## Respect the reader

The reduced-motion query turns the effect off completely. Motion should explain structure; when a reader has asked for less of it, the structure is still there without it.
