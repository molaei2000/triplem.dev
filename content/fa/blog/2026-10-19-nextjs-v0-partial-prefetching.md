---
title: "تنظیم Partial Prefetching: آنچه v0 از بازسازی ناوبری با کمک یک ایجنت آموخت"
description: "مطالعه موردی v0 با Next.js 16.4: تست instant()، پری‌فچ مبتنی بر قصد کاربر و navigation() در عمل، به‌همراه اعداد هزینه و نکات احتیاطی."
date: 2026-10-19
cover: /images/blog/2026-10-19-nextjs-v0-partial-prefetching.svg
tags: [next.js, caching, ai-assisted-development]
draft: false
---

تیم Next.js روز ۱۶ اکتبر [یک مطالعه موردی درباره v0](https://nextjs.org/blog/improving-navigation-experience-in-v0-with-nextjs-16-4) منتشر کرد؛ v0 سازنده اپ مبتنی بر هوش مصنوعی ورسل است. یک ایجنت کدنویسی با Skill جدید `next-partial-prefetching-optimizer` ناوبری را در سراسر اپ بازسازی کرد. [پست انتشار 16.4](https://nextjs.org/blog/next-16-4) می‌گوید API ها چه هستند؛ این مطالعه موردی تصمیم‌های اطراف آن‌ها را نشان می‌دهد، از جمله یک پری‌فچ بیش‌ازحد که اندازه‌گیری و اصلاح شد. برای کسی که قصد مهاجرت مشابهی دارد، همین بخش مفیدتر است. خود انتشار را [در پستی قبلی](/fa/blog/2026-10-08-nextjs-16-4-cache-components) بررسی کرده‌ام؛ این پست درباره به‌کارگیری آن است.

## مدل در یک پاراگراف

طبق مطالعه موردی، پیش از Partial Prefetching مقدار `prefetch={true}` کل مقصد را همراه محتوای پویا واکشی می‌کرد. این می‌توانست صفحاتی را بیاورد که کسی باز نمی‌کند، و کلیک پیش از پایان پری‌فچ همچنان ناوبری کند بود. خاموش کردن پری‌فچ هم همه کار را به بعد از کلیک می‌برد. با Partial Prefetching، Next.js بخش‌های قابل‌استفاده‌مجدد مسیر را پری‌فچ می‌کند و بقیه هنگام ناوبری بارگذاری می‌شود. محتوای کش‌شده، از جمله محتوای شخصی‌سازی‌شده که در مرورگر نگه داشته می‌شود، در بازدیدهای بعدی دوباره استفاده می‌شود. در 16.4، `create-next-app` به‌صورت پیش‌فرض `cacheComponents` و `partialPrefetching` را فعال می‌کند:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    partialPrefetching: true,
};

export default nextConfig;
```

هر مسیر را هم می‌توان با `export const prefetch = 'partial'` جداگانه عضو کرد؛ v0 پیش از فعال‌سازی سراسری، در `/chat` همین کار را کرد.

## ابتدا «فوری بودن» را به یک تست شکست‌خورده تبدیل کنید

ایده قابل‌انتقال‌تر یک API در Next.js نیست؛ خود تست است. ابزار `instant()` از `@next/playwright` هنگام کلیک، محتوایی را که فقط در جریان ناوبری می‌رسد نگه می‌دارد، تا بتوانید بدون انتظار برای آن، آنچه کاربر می‌بیند را بررسی کنید:

```ts
import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

test("prefetches the primary template UI", async ({ page }) => {
    await page.goto("/templates");
    const card = page.getByTestId("template-card-link").first();

    await instant(page, async () => {
        await card.click();
        await page.waitForURL("**/templates/*");
        await expect(page.getByTestId("template-detail-skeleton")).toHaveCount(0);
        await expect(page.getByTestId("template-detail-header")).toBeVisible();
    });
});
```

حلقه Skill این است: یک ناوبری و رابطی که باید آماده باشد را انتخاب کن، برای وضعیت فعلی یک تست `instant()` سبز بنویس، ادعاهای هدف را اضافه کن و شکستشان را تأیید کن، با کش و پری‌فچ بازسازی کن، دوباره بیلد و تست را اجرا کن تا سبز شود، سپس بررسی رگرسیون را تأیید و تست را نگه دار. این در اصل توسعه تست‌محور با یک معیار رفتار رندر است، و برای همین هم به ایجنت می‌خورد: «تمام شد» یک سیگنال قبول/رد است، نه قضاوت. تست در مخزن می‌ماند و در CI اجرا می‌شود. v0 در نتیجه تعداد تست‌های `instant()` خود را دو برابر کرد.

## داده مشترک را از داده شخصی جدا کنید

برای `/templates/[id]`، ایجنت داده عمومی قالب را از وضعیت مختص بیننده جدا کرد. بخش عمومی با `'use cache: remote'` به‌همراه عمر و تگ کش شد:

```tsx
import { cacheLife, cacheTag } from "next/cache";

async function loadCachedPublicTemplatePageData(templateId: string) {
    "use cache: remote";
    cacheTag(`template:${templateId}`);
    cacheLife("hours");

    return loadPublicTemplatePageData(templateId);
}
```

با انتشار قالب، `revalidateTag()` فراخوانی می‌شود. نکته مهم مقاله این است که روی ورسل این داده در Runtime Cache می‌نشیند و بین کاربران و نمونه‌های تابع مشترک است، اما در `next start` خودمیزبان، `'use cache: remote'` از حافظه استفاده می‌کند مگر `cacheHandlers.remote` را پیکربندی کنید. `'use cache'` ساده هم پیش‌فرض در حافظه است. اگر خودمیزبان و چندنمونه‌ای هستید، این یک مرحله راه‌اندازی است، نه جزئیات.

برای صفحات تنظیمات شخصی زیر `/settings/[scope]`، ایجنت از `'use cache: private'` استفاده کرد تا محتوا در مرورگر بماند، `scope` را به تابع کش‌شده داد تا جزو کلید کش شود، و برای صفحه Advanced از `cacheLife({ stale: 300 })` بهره برد. نوشتن با خواندن جفت شد: Server Action ذخیره دستورالعمل‌های سفارشی `updateTag()` را صدا می‌زند که ورودی کش را فوراً منقضی می‌کند، تا کاربر مقدار جدید را در همان رفت‌وبرگشت ببیند.

## عرضه‌ای که بیش‌ازحد پری‌فچ کرد

این بخش را با دقت بخوانید. پس از افزودن `prefetch={true}` به لینک تمام کارت‌های شبکه قالب‌ها، معیارهای production افزایش **۲٫۹ برابری** درخواست‌های پری‌فچ به `/templates/[id]` را نشان داد. هر کارت قابل‌مشاهده با ورود به viewport پری‌فچ غنی‌تر خود را اجرا می‌کرد. راه‌حل، منتظر ماندن برای قصد کاربر بود:

```tsx
const [intent, setIntent] = useState(false);

<Link
    href={href}
    prefetch={intent ? true : "auto"}
    onMouseEnter={() => setIntent(true)}
    onFocus={() => setIntent(true)}
    onTouchStart={() => setIntent(true)}
/>;
```

v0 این را در یک wrapper موجود برای Link گذاشت، برای دیگر لیست‌ها و شبکه‌های بزرگ هم به‌کار برد، و برای گروه‌های کوچک و ثابت مانند تب‌های تنظیمات پری‌فچ مبتنی بر دیده‌شدن را نگه داشت. قاعده سرانگشتی که از این بیرون می‌آید (برداشت خودم): تعداد لینک‌ها محرک پری‌فچ را تعیین می‌کند. چند لینک می‌تواند مشتاقانه پری‌فچ شود؛ یک شبکه نه.

## `navigation()` برای بخشی که پیش از کلیک لازم نیست

در صفحه پروژه، عنوان و production deployment باید هنگام کلیک آماده می‌بودند، اما «Recent Chats» فقط باید برای بازدیدهای بعدی کش می‌شد. `await navigation()` درون آن کامپوننت، کار کش‌شده‌اش را تا باز شدن واقعی صفحه به تعویق می‌اندازد و پس از آن برای بازگشت در دسترس می‌ماند:

```tsx
import { navigation } from "next/cache";

async function RecentChats({ projectId }: { projectId: string }) {
    await navigation();

    const chats = await loadProjectChats(projectId);
    return <ChatList chats={chats} />;
}
```

کامپوننت را در `Suspense` بپیچید تا پوسته بتواند فقط برای همان ناحیه اسکلت نشان دهد. پست 16.4 همچنین `prefetch()` را معرفی می‌کند، قرینه آن، برای به تعویق انداختن محتوا تا پری‌فچ صریح.

## اعداد و میزان اعتماد به آن‌ها

تیم پس از هر PR چهار چیز را دنبال کرد: هزینه Runtime Cache، حجم درخواست‌ها شامل پری‌فچ‌ها، Active CPU، و انتقال داده پری‌فچ‌ها. در سطح کل اپ، هزینه روزانه نهایتاً **۲٫۹٪ کمتر** شد، در حالی که هزینه Shared Runtime Cache به **۴٫۳ برابر** قبل رسید (حدود ۳٫۴۴ دلار بیشتر در روز) و با درخواست‌ها و محاسبه و انتقال کمتر جبران شد. هزینه‌های سرویس‌دهی درخواست که ردیابی کردند **۱۴٫۴٪** کاهش یافت.

نویسندگان خودشان می‌گویند ترافیک و استقرارهای نامرتبط در همان بازه تغییر کرده‌اند و این را تأییدی بر گران‌تر نشدن v0 می‌دانند، نه صرفه‌جویی ناشی از این کار. من هم همین‌طور می‌خوانمش: یک اپ، بدون مقایسه کنترل‌شده، و ۴٫۳ برابر شدن صورت‌حساب کش یک بده‌بستان واقعی است که اگر فقط تأخیر را ببینید از چشم می‌افتد.

## جمع‌بندی

- **حجم پری‌فچ را اندازه بگیرید، نه فقط تجربه کاربری.** جهش ۲٫۹ برابری در دمو دیده نمی‌شد و در شمار درخواست‌ها آشکار بود.
- **کلید کش حامل حریم خصوصی است.** `scope`، شناسه کاربر یا tenant را به آرگومان هر تابع `'use cache: private'` بدهید.
- **هر خواندن کش‌شده را با باطل‌سازی‌اش جفت کنید.** `revalidateTag()` برای داده مشترک، `updateTag()` وقتی نویسنده باید نتیجه را فوراً ببیند.
- **میزبانی خود را بررسی کنید.** کش‌های مبتنی بر حافظه با بیش از یک نمونه رفتار متفاوتی از Runtime Cache دارند.
- **Skill است، نه جادو.** Skill فرض می‌کند Cache Components و Partial Prefetching از قبل پذیرفته شده‌اند. پست می‌گوید از یک هدف کلی هم می‌تواند تلاش خود را بکند، اما تیم v0 دستورهای دقیقی نوشت که چه چیزی باید پیش از کلیک آماده باشد و چه چیزی می‌تواند منتظر بماند. تغییرات را مثل هر diff دیگری بازبینی کنید.

## منابع

- [Improving navigation experience in v0 with Next.js 16.4](https://nextjs.org/blog/improving-navigation-experience-in-v0-with-nextjs-16-4)
- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- [Next.js blog index](https://nextjs.org/blog)
