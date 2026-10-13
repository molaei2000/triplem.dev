---
title: "نکتهٔ حرفه‌ای Next.js: با preload() و Promise.all آبشار درخواست‌ها را از بین ببرید"
description: "چند await پشت‌سرهم در Server Component درخواست‌ها را پشت هم می‌چیند. درخواست را زودتر شروع کنید، قبل از کار مسدودکننده preload کنید و با fetch یا React.cache یکی‌شان کنید."
date: 2026-10-13
cover: /images/blog/2026-10-13-nextjs-preload-waterfalls.svg
tags: [next.js, pro-tip, data-fetching]
draft: false
---

در ۷۲ ساعت گذشته چیز مهم و تازه‌ای منتشر نشد که قبلاً پوشش نداده باشیم. وصلهٔ Vite 8.3.4 مربوط به ۸ اکتبر است و Next.js 16.5 هنوز در نسخه‌های canary است. پس امروز یک نکتهٔ حرفه‌ای داریم و نوبت Next.js است. همهٔ مطالب زیر با مستندات فعلی [Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) (نسخهٔ 16.4.0 در زمان نوشتن) تطبیق داده شده است.

نکته: **در یک Server Component، دو `await` پشت‌سرهم یک آبشار (waterfall) است، حتی وقتی درخواست دوم به اولی وابسته نباشد.** layoutها و pageها به‌طور پیش‌فرض موازی رندر می‌شوند، اما درون یک کامپوننت، ترتیب `await`ها زمان‌بندی را تعیین می‌کند.

## مشکل

```tsx
// app/artist/[username]/page.tsx
import { getArtist, getAlbums } from "@/app/lib/data";

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    const artist = await getArtist(username);
    const albums = await getAlbums(username); // starts only after getArtist resolves

    return <div>{artist.name}</div>;
}
```

مستندات صریحاً می‌گوید این درخواست‌ها ترتیبی‌اند و `getAlbums` تا پایان `getArtist` مسدود می‌ماند. هر دو فقط به `username` نیاز دارند، پس تأخیر کل مجموع این دو است، در حالی که می‌توانست بیشینهٔ آن‌ها باشد. این کد طبیعی به نظر می‌رسد، در review رد می‌شود و روی API سریع محلی هیچ نشانهٔ کندی ندارد.

## راه‌حل اول: اول شروع کنید، با هم await کنید

توابع را بدون `await` صدا بزنید تا هر دو درخواست فوراً شروع شوند، سپس با هم await کنید:

```tsx
export default async function Page({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;

    // Initiate requests
    const artistData = getArtist(username);
    const albumsData = getAlbums(username);

    const [artist, albums] = await Promise.all([artistData, albumsData]);

    return (
        <>
            <h1>{artist.name}</h1>
            <Albums list={albums} />
        </>
    );
}
```

یک `fetch` از لحظهٔ فراخوانی شروع می‌شود، نه از لحظهٔ await؛ کل ترفند همین است. یک مبادله طبق مستندات: اگر یکی از درخواست‌ها reject شود، `Promise.all` کل عملیات را شکست می‌دهد. اگر صفحهٔ ناقص قابل قبول است، از `Promise.allSettled` استفاده کنید و آنچه رسیده را رندر کنید.

## راه‌حل دوم: قبل از کار مسدودکننده preload کنید

گاهی نمی‌توانید درخواست‌ها را دسته کنید، چون میان‌شان یک مرحلهٔ واقعاً مسدودکننده مثل بررسی در دسترس بودن وجود دارد. باز هم می‌توان درخواست داده برای فرزند را زودتر شروع کرد. مستندات الگوی `preload` را توصیف می‌کند: تابع داده را قبل از کار مسدودکننده بدون `await` صدا بزنید و بعد همان تابع را در کامپوننت مصرف‌کننده فراخوانی کنید.

```tsx
// app/item/[id]/item.tsx
async function getItem(id: string) {
    const res = await fetch(`https://api.example.com/items/${id}`);
    return res.json();
}

export const preload = (id: string) => {
    void getItem(id);
};

export default async function Item({ id }: { id: string }) {
    const item = await getItem(id);
    return <div>{item.name}</div>;
}
```

```tsx
// app/item/[id]/page.tsx
import Item, { preload } from "./item";
import { checkIsAvailable } from "@/app/lib/data";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    preload(id);
    const isAvailable = await checkIsAvailable(id);

    return isAvailable ? <Item id={id} /> : null;
}
```

درخواست item هم‌زمان با اجرای `checkIsAvailable()` در جریان است. اگر `<Item>` رندر شود، فراخوانی یکسانش از همان درخواستی که `preload()` شروع کرده استفاده می‌کند. اگر رندر نشود، یک درخواست حدسی هزینه شده است. این هزینهٔ واقعی preload است، پس وقتی مسیر موفق رایج‌تر است از آن استفاده کنید.

مستندات توصیه می‌کند `preload` را کنار کامپوننتی نگه دارید که داده را مصرف می‌کند تا هنگام جابه‌جایی یا حذف کامپوننت، وابستگی آشکار باشد.

## شرط یکی‌سازی (dedupe)

preload فقط وقتی کار می‌کند که فراخوانی دوم همان کار در حال انجام را برگرداند. مستندات سه راه برای تضمین آن می‌دهد:

- **`fetch`**: درخواست‌های یکسان در درخت کامپوننت [به‌طور خودکار memoize می‌شوند](https://nextjs.org/docs/app/api-reference/functions/fetch#memoization).
- **ORM یا کلاینت دیتابیس**: تابع را در `React.cache` بپیچید. این کش به یک درخواست محدود است و میان درخواست‌ها به اشتراک گذاشته نمی‌شود.
- **Cache Components**: به تابع `'use cache'` اضافه کنید. اگر APIهای درخواست مثل `cookies()` یا `headers()` را می‌خواند، مستندات به `'use cache: private'` ارجاع می‌دهد؛ در production فراخوانی‌های یکسان می‌توانند نتیجه را درون یک درخواست استفاده مجدد کنند، بدون ذخیره‌اش میان درخواست‌ها.

```ts
// app/lib/user.ts
import { cache } from "react";
import { db, eq, users } from "@/lib/db";

export const getUser = cache(async (id: string) => {
    return db.query.users.findFirst({ where: eq(users.id, id) });
});
```

بدون یکی از این‌ها، `preload(id)` و بعد `getItem(id)` فقط دو درخواست جداست و وضع را بدتر کرده‌اید.

## استریم نیمهٔ دیگر ماجراست

واکشی موازی مسیر بحرانی را کوتاه می‌کند اما حذفش نمی‌کند. مستندات صریح می‌گوید یک درخواست کند، رندر مسیر را تا پایانش مسدود می‌کند و توصیه می‌کند `<Suspense>` را نزدیک به دسترسی به داده‌های runtime یا بدون کش بگذارید، نه فقط به `loading.js` تکیه کنید. layoutی که داده‌های بدون کش یا runtime می‌خواند به `loading.js` همان segment برنمی‌گردد و ناوبری را تا پایان رندر خودش مسدود می‌کند. Cache Components این را با خطای زمان build نشان می‌دهد.

اگر داده فقط در کلاینت لازم است، مستندات الگوی دیگری نشان می‌دهد: promise را در Server Component شروع کنید، await نکنید و به یک Client Component بدهید که آن را با `use` ری‌اکت درون یک مرز `<Suspense>` می‌خواند.

```tsx
export default function Page() {
    // Don't await the data fetching function
    const posts = getPosts();

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Posts posts={posts} />
        </Suspense>
    );
}
```

## چه زمانی نسخهٔ ترتیبی درست است

واکشی ترتیبی وقتی درست است که یک درخواست واقعاً به خروجی دیگری نیاز دارد. مثال مستندات `getArtistPlaylists(artist.id)` است. در این حالت موازی‌سازی را جعل نکنید؛ درخواست اول را سریع یا قابل کش کنید و بخش وابسته را پشت `<Suspense>` خودش بگذارید تا صفحه artist را پیش از رسیدن playlistها نشان دهد. مستندات یادآوری می‌کند که صفحه همچنان قبل از نمایش هر چیز منتظر درخواست اول می‌ماند، مگر کل صفحه زیر یک مرز مثل `loading.js` باشد.

## چک‌لیست review

- دو `await` یا بیشتر پشت‌سرهم در یک کامپوننت: آیا فقط ورودی مشترک دارند؟ هر دو را شروع کنید و `Promise.all` بزنید.
- مرحلهٔ مسدودکننده پیش از واکشی فرزند: `preload()` اضافه کنید.
- دسترسی به داده‌ای غیر از `fetch` در مسیر preload: آن را در `React.cache` (یا `'use cache'`) بپیچید، وگرنه دو بار هزینه می‌دهید.
- تحمل خطا: `Promise.all` یا `Promise.allSettled` را آگاهانه انتخاب کنید.

## منابع

- [Next.js docs: Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Next.js releases on GitHub](https://github.com/vercel/next.js/releases)
- [Vite releases on GitHub](https://github.com/vitejs/vite/releases)
