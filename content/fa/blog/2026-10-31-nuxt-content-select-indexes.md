---
title: "نکتهٔ حرفه‌ای Nuxt: صفحه‌های فهرست در Nuxt Content باید فیلدهایشان را با select() مشخص کنند و ستون‌های فیلترشده را ایندکس کنند"
description: "صفحه‌های فهرست Nuxt Content که کل سند را می‌خوانند بیش از نیاز کار می‌کنند. با select()، where() و ایندکس‌های کالکشن، کوئری‌ها را باریک نگه دارید."
date: 2026-10-31
cover: /images/blog/2026-10-31-nuxt-content-select-indexes.svg
tags: [nuxt, pro-tip, nuxt-content, performance]
draft: false
---

در ۷۲ ساعت گذشته چیزی آن‌قدر مهم منتشر نشد که پایهٔ یک پست شود: تنها انتشارهای تازه release candidate بودند (Vue 3.6.0-rc.14 در ۳۰ اکتبر و RC نسخهٔ Nitro v3 در ۲۹ اکتبر) و این وبلاگ دربارهٔ RCها نمی‌نویسد. نکتهٔ حرفه‌ایِ قبلی دربارهٔ Next.js بود، پس امروز نوبت Nuxt است و موضوع الگویی است که سایت‌های محتوایی بیش از همه در آن اشتباه می‌کنند: صفحهٔ فهرست.

همهٔ مطالب زیر با [مرجع `queryCollection`](https://content.nuxt.com/docs/utils/query-collection) و [مرجع `defineCollection`](https://content.nuxt.com/docs/collections/define) تطبیق داده شده است.

## اشتباه رایج

صفحهٔ اصلی وبلاگ برای هر پست فقط عنوان، تاریخ و مسیر لازم دارد. کوئریِ سهل‌انگارانه کل سند را می‌خواهد:

```ts
// pages/blog/index.vue
const { data: posts } = await useAsyncData("blog-list", () =>
    queryCollection("blog").order("date", "DESC").all(),
);
```

هیچ چیز در این کوئری فیلدها را محدود نمی‌کند، پس هر مورد به‌صورت یک رکورد کامل برمی‌گردد. و هرچه از `useAsyncData` برگردانید همان چیزی است که در پیلودِ SSR سریالایز می‌شود ([نکتهٔ کوچک‌کردن پیلود](/fa/blog/2026-10-28-nuxt-payload-pick-transform) این سمتِ ماجرا را پوشش می‌دهد). کوئری نمی‌داند قالب شما فقط سه فیلد را می‌خواند؛ باید خودتان بگویید.

## همان‌جا در کوئری گزینش کنید، نه در کامپوننت

`select()` فیلدهای برگشتی را محدود می‌کند. فهرستی از نام فیلدها می‌گیرد و فقط همان‌ها را برمی‌گرداند:

```ts
const { data: posts } = await useAsyncData("blog-list", () =>
    queryCollection("blog")
        .where("draft", "=", false)
        .select("title", "path", "date", "description")
        .order("date", "DESC")
        .all(),
);
```

در مقایسه با هرس‌کردن بعدی با `pick` یا `transform`، این کار باریک‌سازی را به خود منبع می‌برد. کوئری کمتر برمی‌گرداند، پس چیز کمتری برای سریالایز هست و هر آیتم فهرست فقط فیلدهایی را دارد که خواسته‌اید. یک تذکر از مستندات: مرجع چیزی دربارهٔ اینکه `select` اندازهٔ body یا پیلود را چقدر کم می‌کند نمی‌گوید؛ پاسخ‌های خودتان را اندازه بگیرید و عددی فرض نکنید.

`select()` را روی هر کوئریِ فهرست، ناوبری و «پست‌های مرتبط» بگذارید. واکشی سند کامل را برای همان یک فراخوانیِ `path(route.path).first()` در صفحهٔ خودِ پست نگه دارید، جایی که body را رندر می‌کنید.

## فیلتر را در کوئری انجام دهید

builder شرط‌ها را به‌صورت پیش‌فرض با AND ترکیب می‌کند و `andWhere` / `orWhere` برای شرط‌های گروه‌بندی‌شده callback می‌گیرند:

```ts
const { data: recent } = await useAsyncData(
    () => `blog-tag-${tag.value}`,
    () =>
        queryCollection("blog")
            .where("draft", "=", false)
            .andWhere((q) => q.where("date", ">", "2026-01-01").where("tags", "LIKE", `%${tag.value}%`))
            .select("title", "path", "date")
            .order("date", "DESC")
            .limit(10)
            .all(),
    { watch: [tag] },
);
```

عملگرهای مستندشده عبارت‌اند از `=`، `>`، `<`، `<>`، `IN`، `BETWEEN`، `NOT BETWEEN`، `IS NULL`، `IS NOT NULL`، `LIKE` و `NOT LIKE`. برای صفحه‌بندی از `limit()` و `skip()` استفاده کنید، نه واکشی همهٔ ردیف‌ها و بریدن آن‌ها در یک computed. وقتی فقط مجموع را می‌خواهید، `count()` شرط‌های `where` قبلی را رعایت می‌کند و مستقیم عدد را برمی‌گرداند، پس لازم نیست ردیف‌ها را بخوانید تا `.length` بگیرید.

به کلید دقت کنید: تابعی است که تگ را در خود دارد. کلید ثابتِ مشترک بین کوئری‌هایی با فیلترهای متفاوت همان تلهٔ برخورد کش است که در [پست کلیدهای مشترک](/fa/blog/2026-10-04-nuxt-async-data-shared-keys) آمد.

## ستون‌هایی را که فیلتر و مرتب می‌کنید ایندکس کنید

`defineCollection` آرایهٔ `indexes` را می‌پذیرد. هر ایندکس `columns` لازم دارد، می‌تواند `unique` باشد (پیش‌فرض `false`) و می‌تواند `name` داشته باشد؛ بدون نام، به‌صورت `idx_{collection}_{column1}_{column2}` نام‌گذاری می‌شود. طبق مستندات ایندکس‌ها هنگام تولید schema پایگاه‌داده خودکار ساخته می‌شوند و روی SQLite، Cloudflare D1، PostgreSQL، LibSQL و PGlite پشتیبانی می‌شوند.

```ts
// content.config.ts
import { defineCollection, defineContentConfig } from "@nuxt/content";
import { z } from "zod";

export default defineContentConfig({
    collections: {
        blog: defineCollection({
            type: "page",
            source: "blog/**/*.md",
            schema: z.object({
                date: z.date(),
                draft: z.boolean().default(false),
                tags: z.array(z.string()).default([]),
            }),
            indexes: [{ columns: ["draft", "date"] }],
        }),
    },
});
```

مستندات توصیه می‌کنند ستون‌های به‌کاررفته در `where()` و مرتب‌سازی را ایندکس کنید و برای کوئری‌های چندستونه از ایندکس ترکیبی استفاده کنید. جفت `draft` + `date` در بالا با کوئری فهرست می‌خواند: روی یکی فیلتر، بر اساس دیگری مرتب‌سازی.

## بده‌بستان‌ها

- **سایت‌های کوچک تفاوتی حس نمی‌کنند.** برای چند ده پست روی SQLite محلی، ایندکس‌ها بیمهٔ ارزان‌اند، نه یک برد اندازه‌گیری‌شده. مستندات بنچمارکی نمی‌دهند، پس عددی ادعا نکنید. فایدهٔ مشخصِ مستندشده روی Cloudflare D1 است: `WHERE` ایندکس‌شده با یک نتیجه یک ردیف‌خوانی حساب می‌شود، اما بدون ایندکس هر ردیفِ اسکن‌شده حساب می‌شود، که روی صورتحساب اثر دارد.
- **`select()` یک قرارداد است.** اگر کامپوننتی بعداً `description` بخواهد، باید به کوئری اضافه شود؛ فراموش‌کردنش یعنی آن فیلد اصلاً نیست. فهرست فیلدها را کنار کامپوننتی نگه دارید که رندرش می‌کند یا در یک composable کوچک بگذارید.
- **`LIKE` روی ستون آرایه‌ای ابزاری کُند است.** برای تطبیق ساده تگ کار می‌کند ولی جست‌وجوی مناسب ایندکس نیست. اگر فیلتر تگ برایتان محوری است، ساختاری اختصاصی را بسنجید و پیش از تکیه‌کردن، رفتار را روی پایگاه‌دادهٔ خودتان بررسی کنید.
- **کالکشن‌ها هم‌پوشانی نداشته باشند.** مستندات هشدار می‌دهند فایلی که به چند کالکشن تعلق دارد ممکن است live reload را خراب کند؛ از الگوهای `exclude` استفاده کنید.

## کجا الگوی اولیه درست است

واکشی سند کامل در خودِ صفحهٔ پست درست است، و در سایت داخلیِ کوچک که فهرست از قبل چند ردیف است. اشتباه این است که این پیش‌فرض را روی همهٔ کوئری‌ها اعمال کنید، حتی آن‌هایی که در هر رندر فهرست، تگ و ناوبری اجرا می‌شوند.

## منابع

- [queryCollection | Nuxt Content](https://content.nuxt.com/docs/utils/query-collection)
- [defineCollection | Nuxt Content](https://content.nuxt.com/docs/collections/define)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [nitrojs/nitro releases](https://github.com/nitrojs/nitro/releases)
