---
title: "Next.js pro tip: mark data modules server-only and return DTOs, because props to a Client Component are public"
description: "Passing a whole database row to a 'use client' component ships every field to the browser. Use server-only, a data access layer and DTOs to keep private data out."
date: 2026-11-26
cover: /images/blog/2026-11-26-nextjs-server-only-dto.svg
tags: [next.js, pro-tip, security]
draft: false
---

Nothing stable and new landed in the last 72 hours that we haven't covered. The [vuejs/core releases page](https://github.com/vuejs/core/releases) still shows only 3.6 release candidates (rc.16 on 20 Nov) with 3.5.46 as the stable line, the [Vite releases page](https://github.com/vitejs/vite/releases) shows an 8.4 beta, and the [Node.js blog](https://nodejs.org/en/blog) lists only a 27 alpha after the 11 Nov security releases. The last pro tip was about Nuxt, so today is Next.js, checked against the [data security guide](https://nextjs.org/docs/app/guides/data-security) and the [Server and Client Components page](https://nextjs.org/docs/app/getting-started/server-and-client-components).

The tip: **props you pass from a Server Component to a Client Component are serialized into the RSC payload and sent to the browser. Treat every such prop as public, and make the boundary explicit with `server-only` modules that return small, purpose-built DTOs.**

## The common mistake

Component-level data access is convenient: query in the page, hand the result to an interactive component.

```tsx
// app/[slug]/page.tsx
import Profile from "./ui/profile";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`;
    return <Profile user={rows[0]} />; // every column of the row
}
```

```tsx
// app/[slug]/ui/profile.tsx
"use client";

export default function Profile({ user }: { user: User }) {
    return <h1>{user.name}</h1>;
}
```

The component only renders `name`, but the prop is the whole row. The data guide uses almost exactly this example and labels it as exposing all fields to the client. The RSC payload carries the props passed to Client Components, so an email, a phone number or an internal flag in that row ends up in that payload, whether or not any JSX reads it.

The broad `user: User` type makes it worse. It tells the next developer that passing everything is fine, and nothing fails when they do.

## Why environment variables don't save you here

Secrets are a separate, narrower problem. Per the docs, only variables prefixed with `NEXT_PUBLIC_` reach the client bundle; others are replaced with an empty string. So a data function that reads `process.env.API_KEY` and gets imported into a Client Component will fail at runtime, not leak the key. That is a safety net, not a design: you find the mistake when something breaks, and nothing protects the data that the function returns.

Rows you fetched on the server are not covered by that rule at all. Once you hand them to a Client Component as props, they are data the browser receives.

## Fix 1: `server-only` turns a runtime surprise into a build error

Put `import "server-only"` at the top of any module that talks to the database, reads secrets or contains internal business logic:

```ts
// data/posts.ts
import "server-only";

export async function getPostRow(id: string) {
    // ...
}
```

If a Client Component imports that module, directly or through another import, the build fails. The docs state that installing the `server-only` and `client-only` packages is optional, because Next.js handles those imports itself and doesn't use the npm package contents. You may still install it if your lint rules flag extraneous dependencies, and the docs also mention Next.js ships its own type declarations for configurations with `noUncheckedSideEffectImports`.

`client-only` is the mirror image, for modules that touch `window`.

## Fix 2: a data access layer that returns DTOs

The guide recommends a dedicated Data Access Layer (DAL) for new projects: server-only code that performs authorization checks and returns minimal Data Transfer Objects. Adapted from its example:

```ts
// data/user-dto.ts
import "server-only";
import { getCurrentUser } from "./auth";

export async function getProfileDTO(slug: string) {
    const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`;
    const userData = rows[0];
    const viewer = await getCurrentUser();

    return {
        username: userData.username,
        phonenumber:
            viewer.isAdmin || userData.team === viewer.team ? userData.phonenumber : null,
    };
}
```

```tsx
// app/[slug]/page.tsx
import { getProfileDTO } from "@/data/user-dto";
import Profile from "./ui/profile";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const profile = await getProfileDTO(slug);
    return <Profile user={profile} />;
}
```

Now the type of `user` in `Profile` can be the DTO's own shape, and a new column added to the table never reaches the browser unless someone deliberately adds it to the DTO. The authorization rule (who may see the phone number) lives next to the query, not scattered across pages.

Two details from the guide worth copying. First, wrap the "who is the caller" helper in React's `cache`, so any function can read it without threading it through props; the docs note this discourages passing the user object from Server Component to Server Component and risking a pass into a Client Component. Second, only the DAL should touch `process.env`.

## Mutations follow the same rule

The guide applies the pattern to writes too: keep authentication, authorization and database logic in a `server-only` module and let the `"use server"` action stay thin:

```ts
// app/actions.ts
"use server";

import { deletePost } from "@/data/posts";
import { revalidatePath } from "next/cache";

export async function deletePostAction(postId: string) {
    await deletePost(postId); // auth and ownership checks happen inside the DAL
    revalidatePath("/posts");
}
```

Also return only what the UI needs from an action. The docs show returning the full updated record as the bad version and `{ success: true }` as the good one, because return values are serialized to the client too.

## An extra layer: tainting

The guide also describes React's taint APIs, `experimental_taintObjectReference` for objects and `experimental_taintUniqueValue` for specific values, enabled with `experimental: { taint: true }` in `next.config.js`. They block tainted values from being passed to the client. The docs are explicit that this is an additional layer and that you should still filter data in the DAL. Note the `experimental_` prefix: it's not a stable API, so don't make it your only control.

## Trade-offs

- **More files and indirection.** A DAL is overhead for a prototype. The docs themselves position component-level access for prototypes and learning, and recommend picking one approach per codebase instead of mixing them.
- **DTO drift.** A DTO you forget to update silently omits a field the UI needs. That is the cheaper failure: a missing field shows up in review, a leaked field doesn't.
- **`server-only` is a build-time boundary, not authorization.** It prevents importing, not calling. Server Actions are still reachable by direct POST, so each action must verify the caller and ownership of the resource, as the guide stresses.

## When the simple pattern is fine

If a component receives a single primitive such as `likes: number`, as in the docs' `LikeButton` example, there is nothing to leak and no DTO is needed. The rule of thumb is to look at every `"use client"` file's props: if the type accepts a whole entity, narrow it to the fields it renders, and have the server produce exactly that shape.

## Sources

- [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security)
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vitejs/vite releases](https://github.com/vitejs/vite/releases)
- [Node.js blog](https://nodejs.org/en/blog)
- [Next.js blog](https://nextjs.org/blog)
- [TypeScript DevBlog](https://devblogs.microsoft.com/typescript/)
