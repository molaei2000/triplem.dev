---
title: "نکته‌ی Next.js: متادیتا به‌صورت سطحی merge می‌شود و openGraph تو‌در‌توی صفحه، فیلدهای ارث‌رسیده را بی‌صدا حذف می‌کند"
description: "Next.js شیءهای متادیتا را سطحی merge می‌کند: اگر در صفحه openGraph بدهید، هرچه در layout بود از بین می‌رود. راه اشتراک امن فیلدها و جلوگیری از گم‌شدن تگ‌های og."
date: 2026-10-30
cover: /images/blog/2026-10-30-nextjs-metadata-shallow-merge.svg
tags: [next.js, pro-tip, seo]
draft: false
---

یک پسرفت رایج SEO در پروژه‌های App Router این شکلی است: root layout یک بلوک مرتب `openGraph` با نام سایت، locale و تصویر پیش‌فرض دارد. بعد یک صفحه فقط `openGraph.title` خودش را تنظیم می‌کند. عنوان صفحه درست است، اما پیش‌نمایش اشتراک‌گذاری همان مسیر تصویر، نام سایت و locale را از دست داده است. هیچ خطایی نمی‌دهد و type checker هم راضی است.

علت یک قاعده‌ی مستند است که به‌راحتی از آن رد می‌شوند: متادیتا **سطحی (shallow)** merge می‌شود.

## قاعده

[مرجع `generateMetadata`](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) می‌گوید متادیتا از segment ریشه تا segment نزدیک به `page.js` نهایی به‌ترتیب ارزیابی می‌شود. شیءهای export‌شده در این مسیر سطحی با هم merge می‌شوند و کلیدهای تکراری بر اساس همان ترتیب جایگزین می‌شوند. نکته‌ی اصلی کلمه‌ی «سطحی» است. کلیدهای سطح بالا مثل `title`، `openGraph` و `robots` واحد جایگزینی هستند. اگر segment بعدی `openGraph` را تعریف کند، کل شیء segment قبلی دور ریخته می‌شود، نه اینکه فیلد‌به‌فیلد ترکیب شود.

مستندات این را با یک مثال کوچک نشان می‌دهند. layout یک `openGraph` با title و description دارد و `app/blog/page.js` فقط یک `openGraph` با title. خروجی عنوان بلاگ را دارد و `openGraph.description` ندارد. عکسش هم برقرار است: اگر صفحه اصلاً `openGraph` تنظیم نکند، همه‌ی فیلدهای layout به ارث می‌رسند.

پس خطا در override جزئی است. به‌محض اینکه به یک شیء تو‌در‌تو دست بزنید، کل آن شیء با شماست.

## الگوی مشکل‌دار

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
    metadataBase: new URL("https://acme.com"),
    title: { template: "%s | Acme", default: "Acme" },
    openGraph: {
        siteName: "Acme",
        locale: "en_US",
        type: "website",
        images: ["/og-default.png"],
    },
};
```

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    return {
        title: post.title,
        openGraph: {
            title: post.title, // looks harmless
        },
    };
}
```

`<title>` درست است، چون `title` جایگزین می‌شود و قالب layout همچنان روی آن اعمال می‌شود. اما `openGraph` به‌طور کامل جایگزین شده است: `og:site_name`، `og:locale`، `og:type` و `og:image` پیش‌فرض layout در خروجی نیستند. خزنده‌ی شبکه‌های اجتماعی فقط یک `og:title` خالی می‌بیند.

`title.template` قواعد خودش را دارد که مستندات صریح گفته‌اند: فقط روی segmentهای فرزند اعمال می‌شود، نه segmentی که آن را تعریف کرده، و کنارش `title.default` الزامی است. این را با رفتار shallow merge اشتباه نگیرید؛ دو سازوکار جدا هستند.

## راه‌حل اول: شیء مشترک را صریح به اشتراک بگذارید

توصیه‌ی خود مستندات این است که فیلدهای مشترک را در یک متغیر بیرون بکشید و هر جا override می‌کنید spread کنید:

```ts
// app/shared-metadata.ts
export const baseOpenGraph = {
    siteName: "Acme",
    locale: "en_US",
    type: "website",
    images: ["/og-default.png"],
} as const;
```

```tsx
// app/layout.tsx
import { baseOpenGraph } from "./shared-metadata";

export const metadata: Metadata = {
    metadataBase: new URL("https://acme.com"),
    openGraph: baseOpenGraph,
};
```

```tsx
// app/blog/[slug]/page.tsx
return {
    title: post.title,
    openGraph: {
        ...baseOpenGraph,
        title: post.title,
        type: "article",
        publishedTime: post.date.toISOString(),
    },
};
```

این روش صریح است، با grep پیدا می‌شود و در refactor سالم می‌ماند. هزینه‌اش این است که هر صفحه‌ای که `openGraph` را override می‌کند باید spread را یادش باشد. یک helper کوچک فراموش‌کردن را سخت‌تر می‌کند:

```ts
import type { Metadata } from "next";

export function withOpenGraph(og: NonNullable<Metadata["openGraph"]>): Metadata["openGraph"] {
    return { ...baseOpenGraph, ...og };
}
```

یک نکته: خود spread هم سطحی است. اگر `images` را override کنید، کل آرایه جایگزین می‌شود. برای تصویر مخصوص یک صفحه معمولاً همین را می‌خواهید.

## راه‌حل دوم: با `parent` از والد گسترش بدهید

وقتی مقداری که می‌خواهید گسترش دهید از layout می‌آید و داخل `generateMetadata` هستید، آرگومان دوم یک promise از متادیتای resolve‌شده‌ی والد است. مستندات از آن برای افزودن به تصاویر، به‌جای جایگزینی، استفاده می‌کنند:

```tsx
import type { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: post.title,
        openGraph: {
            images: [post.cover, ...previousImages],
        },
    };
}
```

این کار تصاویر والد را نگه می‌دارد، ولی توجه کنید که `openGraph` برگردانده‌شده همچنان جایگزین بقیه‌ی چیزهایی است که والد داشت. `parent` مشکل «اضافه‌کردن به یک آرایه» را حل می‌کند و merge را عمیق نمی‌کند. اگر فیلدهای دیگر را هم می‌خواهید، `openGraph` والد را خودتان spread کنید:

```tsx
const parentOg = (await parent).openGraph ?? {};
return {
    openGraph: { ...parentOg, title: post.title, images: [post.cover, ...(parentOg.images ?? [])] },
};
```

await کردن `parent` متادیتای شما را به resolve شدن والد وابسته هم می‌کند، پس فقط وقتی سراغش بروید که واقعاً مقدار والد را لازم دارید. برای پیش‌فرض‌های ثابت سراسری، یک ثابت مشترک ساده‌تر است و وابستگی ترتیبی ندارد.

## رفتارهای مرتبط متادیتا که باید بدانید

- **ایستا در برابر پویا.** مستندات می‌گویند متادیتایی که به اطلاعات درخواست وابسته نیست باید با شیء ایستای `metadata` تعریف شود، نه `generateMetadata`. همچنین نمی‌توان هر دو را از یک segment export کرد.
- **متادیتای مبتنی بر فایل برنده است.** فایل‌هایی مثل `opengraph-image` اولویت بالاتری از شیء `metadata` و `generateMetadata` دارند. اگر تصویر `openGraph` نادیده گرفته می‌شود، اول دنبال یک file convention در همان segment بگردید.
- **URLهای نسبی به `metadataBase` نیاز دارند.** مسیر نسبی در فیلد مبتنی بر URL بدون `metadataBase` خطای build می‌دهد. URL مطلق در فیلد، `metadataBase` را برای همان فیلد بی‌اثر می‌کند. وقتی `metadataBase` در ریشه تنظیم شده باشد، فیلدهایی مثل `openGraph.images` مسیر نسبی می‌پذیرند.
- **Memoization.** فراخوانی‌های `fetch` داخل `generateMetadata` بین `generateMetadata`، `generateStaticParams`، layoutها، pageها و Server Componentها memoize می‌شوند و React `cache` جایی را می‌پوشاند که `fetch` در دسترس نیست. اگر loader داده را هم در page و هم در `generateMetadata` صدا بزنید و از یکی از این مسیرها بگذرد، درخواست دوبرابر نمی‌شود.
- **Cache Components.** وقتی Cache Components فعال است، متادیتایی که `cookies()`، `headers()`، `params` یا `searchParams` را می‌خواند یا fetch کش‌نشده انجام می‌دهد به زمان درخواست موکول می‌شود. اگر بقیه‌ی صفحه کاملاً prerender‌شدنی باشد، Next.js خطا می‌دهد و می‌خواهد یا داده را با `'use cache'` کش کنید یا یک dynamic marker صریح اضافه کنید. همچنین `generateMetadata` با `'use cache'` باید مقادیر serializable برگرداند، پس نمونه‌ی `URL` مثل `metadataBase` باید به‌صورت رشته برگردد.
- **Streaming.** از v15.2.0 متادیتای پویا می‌تواند بعد از UI اولیه stream شود. رباتهای HTML-limited مثل `facebookexternalhit` همچنان متادیتای blocking در `<head>` می‌گیرند، پس پیش‌نمایش اشتراک‌گذاری تحت‌تأثیر streaming نیست. `htmlLimitedBots` می‌تواند فهرست تشخیص را override کند؛ مستندات هشدار می‌دهند که اعمال آن روی همه‌ی agentها ممکن است زمان پاسخ را بیشتر کند.

## چطور آن را بگیریم

باگ shallow merge در UI دیده نمی‌شود. خروجی را بررسی کنید. یک اسکریپت سریع روی برنامه‌ی build‌شده یا در حال اجرا:

```bash
curl -s -A "facebookexternalhit/1.1" https://acme.com/blog/some-post \
  | grep -oE '<meta property="(og|article):[^"]+"[^>]*>'
```

استفاده از user agent ربات HTML-limited مهم است، چون در آن پاسخ تگ‌ها قطعاً در `<head>` هستند و بعداً اضافه نمی‌شوند. در یک تست end-to-end برای یک مسیر از هر قالب، وجود `og:site_name`، `og:image` و `og:locale` را assert کنید تا پسرفت دیگر بی‌صدا نماند.

## چه زمانی الگوی اولیه درست است

اگر صفحه‌ای واقعاً صفحه‌ی سفید می‌خواهد، مثلاً یک landing page با کارت اشتراک کاملاً متفاوت، جایگزین‌کردن `openGraph` دقیقاً درست است. و برای صفحاتی که فقط `title` و `description` می‌دهند، ارث‌بری کامل رایگان است و کاری لازم نیست. دام در حالت میانی است: override یک فیلد تو‌در‌تو با انتظار اینکه بقیه بمانند.

## جمع‌بندی

- هر شیء متادیتای تو‌در‌تو (`openGraph`، `twitter`، `robots`، `alternates`) را متعلق به آخرین segmentی بدانید که آن را تنظیم می‌کند.
- فیلدهای مشترک را در یک ثابت export‌شده بگذارید و هر جا override می‌کنید spread کنید.
- از `parent` برای افزودن به آرایه‌های ارث‌رسیده استفاده کنید و وقتی فیلدهای دیگرش را می‌خواهید شیء والد را spread کنید.
- با درخواستی که خودش را ربات HTML-limited معرفی می‌کند راستی‌آزمایی کنید، نه با نگاه‌کردن به صفحه.

## منابع

- [generateMetadata (Next.js docs)](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [generateMetadata: streaming metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata)
