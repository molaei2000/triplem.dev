---
title: "Next.js pro tip: a page-level auth check does not protect the Server Action inside it"
description: "Server Actions are reachable by direct POST. Re-check authentication and ownership inside every action, and keep the logic in a server-only data access layer."
date: 2026-10-20
cover: /images/blog/2026-10-20-nextjs-server-action-authz.svg
tags: [next.js, pro-tip, security]
draft: false
---

Nothing substantive and new landed in the last 72 hours that we haven't covered. Next.js 16.4.2 is dated October 15 and the 16.5 line is still canary. Vite only shipped `create-vite` scaffolding updates, and Vue is on a 3.6 release candidate. So today is a pro tip, and it's Next.js's turn after the last Nuxt one. Everything below was checked against the current [Data Security guide](https://nextjs.org/docs/app/guides/data-security) and the [Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data) page.

The tip: **an auth check in a `page.tsx` guards the UI that is rendered. It does not guard the Server Action defined in or imported by that page.** The action is its own entry point and has to verify the caller itself.

## The common mistake

```tsx
// app/admin/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user?.isAdmin) redirect("/login");

    return (
        <form
            action={async () => {
                "use server";
                await db.record.deleteMany(); // no check here
            }}
        >
            <button>Delete records</button>
        </form>
    );
}
```

It looks safe: non-admins are redirected and never see the button. But the docs state plainly that an exported Server Action is reachable through a direct POST request, not only through your UI. The redirect decides which markup is rendered; it says nothing about who may invoke the function.

Next.js does harden this somewhat. Action IDs are encrypted and non-deterministic, they are cached for at most 14 days and regenerated on a new build, and unused actions are removed from the client bundle. The guide is explicit that this only reduces risk when an auth layer is missing, and that you should still treat actions as publicly POSTable and verify auth inside each one.

## Fix 1: re-verify inside the action

```tsx
action={async () => {
    "use server";
    const session = await auth();
    if (!session?.user?.isAdmin) throw new Error("Unauthorized");
    await db.record.deleteMany();
}}
```

The duplicate `auth()` call is the point. If your `auth()` helper reads `cookies()`, it works the same in both places, and wrapping it in React's `cache` keeps repeated calls within one request cheap.

## Fix 2: authentication is not authorization

"Is someone logged in?" is not enough once the action takes an identifier. The docs' example for an IDOR-safe delete loads the resource and compares its owner:

```ts
"use server";

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const post = await db.post.findUnique({ where: { id: postId } });
    if (post.authorId !== session.user.id) throw new Error("Forbidden");

    await db.post.delete({ where: { id: postId } });
}
```

Anything that arrives as an argument, a `FormData` field, a header or a `searchParams` value is client-controlled. The guide's rule is to validate it on every call. A hidden `<input name="id">` is not a permission.

## Fix 3: keep `"use server"` files thin

Repeating those checks in dozens of actions is how one gets forgotten. The guide suggests applying the same Data Access Layer used for reads to mutations: auth, authorization and database access live in a module marked `import "server-only"`, and the action only delegates and then revalidates.

```ts
// data/posts.ts
import "server-only";

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const post = await db.post.findUnique({ where: { id: postId } });
    if (post.authorId !== session.user.id) throw new Error("Forbidden");
    await db.post.delete({ where: { id: postId } });
}
```

```ts
// app/actions.ts
"use server";

import { deletePost } from "@/data/posts";
import { revalidatePath } from "next/cache";

export async function deletePostAction(postId: string) {
    await deletePost(postId); // auth + authz happen inside the DAL
    revalidatePath("/posts");
}
```

Two benefits. The audit surface shrinks to one directory: the guide's audit checklist asks whether database access is delegated to a `server-only` DAL and whether environment variables are touched outside it. And an action that forgets its own checks still can't skip the DAL's, because the DAL is the only code that can reach the database. The docs add that `import "server-only"` also works in the `"use server"` file itself, even when a Client Component imports it for `useActionState`.

## Two related details

**Return values are serialized to the client.** Returning `db.user.update(...)` hands the browser the entire record. Return `{ success: true }` or a minimal DTO instead.

**Closures are encrypted, not secret.** An inline action captures variables from the enclosing render. Those values travel to the client and back, and Next.js encrypts them with a per-action key generated at build time. The guide says not to rely on that encryption alone for sensitive values. If you self-host on several instances, the keys differ per build and server unless you set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a base64 AES key (16, 24 or 32 bytes; `openssl rand -base64 32` works).

## Trade-offs and caveats

- **Extra work per action.** An extra `auth()` and sometimes a database lookup run on every mutation. That is the price of correctness. `cache()` dedupes the session read, and the ownership query is usually something the mutation needs anyway.
- **CSRF is mostly handled for you.** Actions use POST only, and Next.js compares the `Origin` header to `Host` (or `X-Forwarded-Host`) and aborts on mismatch. Behind a reverse proxy where those differ, you configure `experimental.serverActions.allowedOrigins`. It isn't a replacement for authorization.
- **Rate limit expensive actions.** The guide recommends it for things like sending email or database writes, and points at its Backend for Frontend guide for an example.
- **A DAL is not mandatory.** The guide also describes calling existing HTTP APIs with a zero-trust stance, which is fine when a separate backend team already enforces authorization. The advice is to pick one approach per project and not mix them.
- **Inline checks are fine for small apps.** If you have three actions, an `auth()` call at the top of each is perfectly reasonable. The DAL pays off when the count grows and consistency becomes the problem.

## Quick review checklist

1. Does every `"use server"` function call `auth()` itself, not rely on the page?
2. Does it check ownership of the specific resource, not just login state?
3. Are its arguments validated, and is the return value minimal?
4. Is database access only reachable through a `server-only` module?
5. Is `redirect()` or `revalidatePath()` called after the mutation, with `revalidatePath` first, since `redirect` throws and stops later code?

## Sources

- https://nextjs.org/docs/app/guides/data-security
- https://nextjs.org/docs/app/getting-started/mutating-data
- https://github.com/vercel/next.js/releases
- https://github.com/vitejs/vite/releases
- https://github.com/vuejs/core/releases
