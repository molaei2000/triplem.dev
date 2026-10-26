---
title: "نکته‌ی Next.js: هر فراخوانی next/font یک نمونه است؛ هر فونت را یک بار تعریف کنید و حساب‌شده scope بدهید"
description: "هر فراخوانی next/font یک نمونه‌ی میزبانی‌شده می‌سازد و جایی که آن را صدا می‌زنید تعیین می‌کند کدام مسیرها آن را preload کنند. فونت‌ها را یک‌بار تعریف کنید."
date: 2026-10-26
cover: /images/blog/2026-10-26-nextjs-font-scoping.svg
tags: [next.js, pro-tip, performance]
draft: false
---

`next/font` آن‌قدر ساده است که بیشتر تیم‌ها بعد از اولین مثال خواندن مستندات را رها می‌کنند. نتیجه یک انحراف رایج است: همان `Inter()` در سه کامپوننت کپی می‌شود، فونت monospace برای یک صفحه‌ی نمایش کد در root layout بارگذاری می‌شود، و `preload` برای فونت‌هایی که بالای صفحه دیده نمی‌شوند روی مقدار پیش‌فرض می‌ماند. هیچ‌کدام چیزی را خراب نمی‌کند، اما همه‌شان بایت و درخواست زودهنگام اضافه خرج می‌کنند.

مستندات دو قاعده دارند که بیشتر این موارد را توضیح می‌دهند و به‌راحتی از چشم می‌افتند.

## دو قاعده

اول، **هر فراخوانی تابع فونت یک نمونه (instance) است.** [مرجع Font Module](https://nextjs.org/docs/app/api-reference/components/font) می‌گوید هر بار `localFont` یا یک تابع Google font را صدا بزنید، آن فونت به‌صورت یک نمونه در برنامه‌ی شما میزبانی می‌شود. اگر یک فونت در چند جا لازم است، آن را یک‌بار بارگذاری کنید و شیء حاصل را import کنید.

دوم، **فایلی که در آن فونت را صدا می‌زنید دامنه‌ی preload را تعیین می‌کند.** طبق همان صفحه، فونت به‌صورت سراسری preload نمی‌شود. فراخوانی در یک page یکتا فقط روی مسیر همان page، فراخوانی در layout روی همه‌ی مسیرهای زیر آن layout، و فراخوانی در root layout روی همه‌ی مسیرها preload می‌شود. [راهنمای شروع](https://nextjs.org/docs/app/getting-started/fonts) هم اضافه می‌کند که فونت‌ها به کامپوننتی که در آن استفاده می‌شوند scope دارند و برای اعمال روی کل برنامه باید آن را به root layout اضافه کنید.

## الگوی مشکل‌دار

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Only /docs/** shows code, but this runs for every route.
const mono = Roboto_Mono({ subsets: ["latin"], variable: "--font-mono" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${mono.variable}`}>
            <body>{children}</body>
        </html>
    );
}
```

```tsx
// app/docs/code-block.tsx
import { Inter } from "next/font/google";

// A second Inter() call: a second instance of the same font.
const inter = Inter({ subsets: ["latin"] });
```

دو مشکل وجود دارد. فونت monospace در root layout صدا زده شده، پس طبق قاعده‌ی بالا روی همه‌ی مسیرها preload می‌شود، حتی صفحه‌های بازاریابی که هرگز آن را نشان نمی‌دهند. و فراخوانی تکراری `Inter()` در کامپوننت به‌جای استفاده‌ی مجدد از نمونه‌ی موجود، نمونه‌ی دیگری می‌سازد.

## الگوی بهتر

همه‌ی تعریف‌ها را در یک ماژول بگذارید و شیء را هر جا لازم است import کنید. مستندات این را font definitions file می‌نامند.

```ts
// app/fonts.ts
import { Inter, Roboto_Mono } from "next/font/google";

export const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const mono = Roboto_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});
```

```tsx
// app/layout.tsx: only the body font is global
import { inter } from "./fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <body>{children}</body>
        </html>
    );
}
```

```tsx
// app/docs/layout.tsx: mono is applied here, so it is preloaded for this subtree
import { mono } from "../fonts";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return <div className={mono.variable}>{children}</div>;
}
```

مستندات دقیقاً همین رویکرد را برای چند فونت توصیف می‌کنند: فونت را از یک ماژول کمکی export کنید و `className` آن را هر جا لازم است اعمال کنید؛ این کار تضمین می‌کند فونت فقط وقتی رندر می‌شود preload شود. ماژول فقط یک تعریف است و دامنه‌ی preload به محل اعمال شیء در درخت وابسته است.

یک تذکر درباره‌ی برداشت من: مستندات قاعده‌ی دامنه را برای هر نوع فایل (page، layout، root layout) و رفتار «فقط هنگام رندر preload می‌شود» را برای رویکرد ماژول مشترک بیان می‌کنند، اما درباره‌ی حالتی که ماژولِ import‌شده در root layout فونت‌هایی تعریف کند که root layout استفاده نمی‌کند، صریح نیستند. تعریف‌های بلااستفاده را از گراف ماژولی که از root import می‌کنید دور نگه دارید، یا تگ‌های preload را در خروجی build خودتان بررسی کنید.

## اتصال به Tailwind

اگر از Tailwind CSS استفاده می‌کنید، رویکرد متغیر خوب ترکیب می‌شود. مستندات نگاشت متغیرهای CSS در یک تم inline را نشان می‌دهند:

```css
@import "tailwindcss";

@theme inline {
    --font-sans: var(--font-inter);
    --font-mono: var(--font-mono);
}
```

به نام‌گذاری دقت کنید: در مثال مستندات متغیرهای next/font برابر `--font-inter` و `--font-roboto-mono` و توکن‌های تم برابر `--font-sans` و `--font-mono` هستند. اگر متغیر next/font را همنام توکن تمی بگذارید که به آن نگاشت می‌شود، یک ارجاع به خود می‌سازید. دو فضای نام را جدا نگه دارید، مثلاً `--font-mono-face` برای loader و `--font-mono` برای توکن.

## گزینه‌هایی که باید آگاهانه تنظیم شوند

همه از [مرجع Font Module](https://nextjs.org/docs/app/api-reference/components/font) می‌آیند:

- **`preload`** به‌طور پیش‌فرض `true` است و روی همه‌ی فایل‌هایی که یک فراخوانی بارگذاری می‌کند اعمال می‌شود، چون آن‌ها یک گروه واحد از قواعد `@font-face` با یک `font-family` هستند. برای فونت تزئینی یا پایین صفحه، `preload: false` درخواست زودهنگام را حذف می‌کند.
- **`subsets`** مشخص می‌کند کدام زیرمجموعه‌ها preload شوند. اگر `preload` فعال باشد و subset تعیین نشود، هشدار می‌گیرید.
- **`display`** پیش‌فرض `'swap'` است. مقدار `'optional'` هم پذیرفته می‌شود.
- **`adjustFontFallback`** برای فونت‌های Google پیش‌فرض `true` و برای فونت‌های محلی `'Arial'` است. هدفش کاهش CLS است؛ بدون دلیل خاموشش نکنید.
- **`weight`** برای فونت‌های غیرمتغیر الزامی است. مستندات فونت‌های متغیر را برای بهترین کارایی و انعطاف توصیه می‌کنند و می‌گویند فونت متغیر Google به weight نیاز ندارد.
- **فونت کمتر.** مستندات توصیه می‌کنند از چند فونت محتاطانه استفاده کنید، چون هر فونت منبع دیگری برای دانلود است.

## بده‌بستان‌ها

scope دادن یک فونت به یک زیردرخت یعنی صفحه‌های بیرون از آن به `fallback` یا فونت جایگزین خودکار برمی‌گردند. هدف همین است، اما بررسی کنید کامپوننت مشترکی (مثل footer یا toast) بی‌سروصدا به فونتِ scope‌شده وابسته نباشد.

scope در سطح layout همچنین preload را به ساختار مسیرها گره می‌زند. اگر یک page را از layout مربوط به `docs` بیرون ببرید، preload آن بی‌صدا از بین می‌رود. یک کامنت کنار تعریف، بیمه‌ی ارزانی است.

## چه زمانی الگوی اول مناسب است

یک خانواده‌ی فونت برای کل سایت که یک‌بار در root layout صدا زده شود، همان شکل مورد نظر است و به چیز بیشتری نیاز ندارد. همین‌طور اگر طراحی شما واقعاً در همه‌ی مسیرها هر دو فونت متن و mono را بالای صفحه نشان می‌دهد، preload در سطح root درست است. این نکته زمانی کاربرد دارد که فونتی فقط به بخشی از سایت خدمت می‌کند یا یک فراخوانی در بیش از یک فایل تکرار می‌شود.

## منابع

- [Next.js Font Module reference](https://nextjs.org/docs/app/api-reference/components/font)
- [Next.js Font Optimization guide](https://nextjs.org/docs/app/getting-started/fonts)
