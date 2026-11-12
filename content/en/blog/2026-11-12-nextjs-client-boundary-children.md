---
title: "Next.js pro tip: 'use client' pulls in what you import, not what you pass as children"
description: "A Client Component bundles its imports, but not Server Components passed as children or props. How to place the boundary, slot server output and avoid compound-component traps."
date: 2026-11-12
cover: /images/blog/2026-11-12-nextjs-client-boundary-children.svg
tags: [next.js, pro-tip, performance]
draft: false
---

The most common reason a Next.js App Router bundle is bigger than it should be is not a heavy library. It is a `'use client'` directive placed one file too high. A wrapper becomes a Client Component, and everything it imports quietly follows it into the browser.

This is checked against the current [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) page and the [Server and Client Boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary) guide (both last updated 2026-10-05).

## The two rules of the boundary

The boundary guide reduces the directive to two rules:

- **Code** crosses through imports. Whatever a Client Component imports is pulled into the client bundle.
- **Data** crosses through props, and it must be serializable. Functions such as event handlers cannot cross. A Server Function marked with `'use server'` crosses as a reference.

The first rule is the one that bites. Once a file has `'use client'`, its imports and the components it renders directly are part of the client module graph. You do not need the directive on every file below it.

The second rule is the escape hatch. A rendered React element is serializable data, so it can cross. The docs state that Server Components passed as `children` or other props are not imported into the Client Component's module graph: they render on the server and arrive as output.

## The mistake: the boundary at the top

```tsx
// app/ui/shell.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar"; // static markup, a markdown renderer, a date library...
import { Footer } from "./footer";

export function Shell({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button onClick={() => setOpen(!open)}>Menu</button>
            {open && <Sidebar />}
            {children}
            <Footer />
        </div>
    );
}
```

The only interactive thing here is one boolean. But `Sidebar` and `Footer` are imported from a Client Component, so their code, and whatever they import, ship to the browser and run again during hydration. The docs recommend the opposite: put `'use client'` on the files that define interactive components rather than on large parts of the UI.

## Fix 1: shrink the client piece to the interactive part

```tsx
// app/ui/menu-toggle.tsx
"use client";

import { useState } from "react";

export function MenuToggle({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(!open)}>Menu</button>
            {open && children}
        </>
    );
}
```

```tsx
// app/layout.tsx  (Server Component by default)
import { MenuToggle } from "./ui/menu-toggle";
import { Sidebar } from "./ui/sidebar";
import { Footer } from "./ui/footer";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <MenuToggle>
                <Sidebar />
            </MenuToggle>
            {children}
            <Footer />
        </>
    );
}
```

`Sidebar` is imported by the layout, which is a Server Component, so it renders on the server. `MenuToggle` receives its output as `children` and decides only whether to show it. The guide describes the same split with an owner and a parent: the component whose source contains the JSX (the owner) decides where it renders, and the component that merely contains it in the tree (the parent) just places it.

One detail to keep in mind: the slot is still rendered on the server even when the client state hides it. The RSC payload carries the output of `Sidebar` whether or not `open` is true. You trade a little payload for zero client code.

## Fix 2: providers go as deep as possible

The same logic applies to context providers. The docs show a `ThemeProvider` marked `'use client'` that accepts `children`, rendered in the root layout, and add a recommendation: render providers as deep as possible in the tree, wrapping `{children}` instead of the entire `<html>` document, because that makes it easier for Next.js to optimize the static parts of your Server Components.

```tsx
// app/layout.tsx
import ThemeProvider from "./theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <body>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
```

The provider is a Client Component, but because `children` is passed in, the pages inside it stay Server Components.

## Fix 3: wrap, do not mark, shared components

If a shared component uses `useState` but lives in a module you do not want to turn into a client entry everywhere, the boundary guide suggests a thin Client Component wrapper that imports it and carries the directive. The shared module stays unchanged and the boundary sits closer to application code. The same approach works for third-party components that use client-only features without declaring `'use client'`: re-export them from a file that has the directive, as the docs' `Carousel` example does.

## Trap: compound components across the boundary

Static members such as `Menu.Item` or `Tabs.Panel` work inside one graph. The guide warns that they break when a static member crosses the boundary: a Server Component importing a Client Component gets a client reference rather than the function, so `Menu.Item` is `undefined` and React throws "Element type is invalid."

```tsx
// app/ui/menu.tsx
"use client";

export function Menu({ children }: { children: React.ReactNode }) {
    return <ul>{children}</ul>;
}
export function MenuItem({ children }: { children: React.ReactNode }) {
    return <li>{children}</li>;
}
// Menu.Item = MenuItem would be undefined when used from a Server Component.
```

The docs' fix is to expose the pieces as named exports when Server Components need them. Keep the static-property style for use between Client Components only.

## Trap: serializable props only

Passing an `onClick` from a Server Component to a Client Component throws. The guide notes that the TypeScript plugin allows function props named `action` or ending in `Action`, since a Server Function cannot be told apart from a plain function by type, and flags other function props. Treat props crossing the boundary as data: they are also serialized into the payload sent to the browser, so do not pass whole database rows when the component needs one field.

## Guard the other direction with server-only

Code can also leak the wrong way. Import `server-only` into modules that read secrets, and importing them from a Client Component becomes a build-time error. In Next.js the package is optional to install, but you may add it if your lint rules flag extraneous imports; Next.js handles those imports itself and provides its own type declarations. Unprefixed environment variables are replaced with an empty string in client code, so a misplaced import fails quietly at run time unless you add the guard.

## Trade-offs and when the original is fine

- Slotting costs payload, not bundle. If a hidden slot is large, render it conditionally in a Server Component or stream it behind Suspense instead.
- A small leaf that is nearly all interactive can simply be a Client Component with its imports. Splitting a 40-line component into three files to save nothing is churn.
- Client Components also render on the server for the initial HTML, as the guide spells out, so moving code out of the client graph reduces shipped and hydrated JavaScript, not the work of the first server render.
- Measure before and after with your bundle analyzer. The claim is structural, so confirm your own routes actually shrink.

## Sources

- [Server and Client Components, Next.js docs](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [The Server and Client Boundary, Next.js docs](https://nextjs.org/docs/app/guides/server-and-client-boundary)
