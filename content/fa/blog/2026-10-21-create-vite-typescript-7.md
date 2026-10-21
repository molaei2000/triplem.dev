---
title: "create-vite یک روز به TypeScript 7 رفت: بازگشت آن دربارهٔ toolchain شما چه می‌گوید"
description: "create-vite 9.3.0 قالب‌ها را به TypeScript 7 برد و 9.3.1 یک روز بعد دوباره نسخهٔ 6 را پین کرد. ببینید چه چیزی مانع TS 7 می‌شود و چطور هر دو نسخه را کنار هم اجرا کنید."
date: 2026-10-21
cover: /images/blog/2026-10-21-create-vite-typescript-7.svg
tags: [typescript, vite, tooling]
draft: false
---

دو نسخهٔ scaffolder ویت در دو روز پشت‌سرهم منتشر شد و با هم تصویر خوبی از جایگاه واقعی TypeScript 7 می‌دهند. [create-vite 9.3.0](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.0) (۱۹ اکتبر) قالب‌ها را «تا جای ممکن» به TypeScript 7 برد. [create-vite 9.3.1](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.1) (۲۰ اکتبر) TypeScript را «فعلاً» دوباره روی v6 پین کرد.

هیچ‌کدام نحوهٔ build شدن اپ شما با Vite را عوض نمی‌کنند. نکتهٔ جالب این است که کدام قالب‌ها توانستند بروند، کدام نتوانستند و چرا. این فهرست برای مهاجرت خودتان هم چک‌لیست خوبی است.

## چه اتفاقی افتاد

تغییر 9.3.0 همان [PR شمارهٔ 23794](https://github.com/vitejs/vite/pull/23794) است. طبق توضیح آن، این قالب‌ها به TypeScript 7 رفتند: lit-ts، preact-ts، qwik-ts، solid-ts و vanilla-ts. react-ts به‌طور پیش‌فرض TS 7 داشت اما با گزینهٔ ESLint به TS 6 برمی‌گشت. svelte-ts و vue-ts روی TS 6 ماندند.

روز بعد، [PR شمارهٔ 23841](https://github.com/vitejs/vite/pull/23841) آن را برگرداند. توضیحش آن را بازگشت موقت #23794 «به‌خاطر storybook» می‌نامد و می‌گوید چند روز دیگر دوباره امتحان شود. برچسب مسدودکنندهٔ downstream دارد و صفحه نمی‌گوید دقیقاً چه چیزی در Storybook خراب شد. من هم حدس نمی‌زنم.

پس پیام این نیست که «TS 7 خراب است». پیام این است که scaffolder مصرف‌کننده‌ای با شعاع اثر بالاست: هر پروژهٔ جدید انتخاب آن را به ارث می‌برد و خرابی یک ابزار downstream برای عقب‌نشینی کافی است.

## چرا بعضی قالب‌ها نتوانستند بروند

[PR قبلی و بسته‌شدهٔ 23764](https://github.com/vitejs/vite/issues/23764) موانع هر قالب را ثبت کرده است:

- **React با ESLint** به‌خاطر الزامات سازگاری typescript-eslint روی TS 6 می‌ماند. React با Oxlint مشکلی نداشت.
- **Vue**: پیکربندی فعلی vue-tsc به کار سازگاری بیشتری نیاز دارد.
- **Svelte**: جریان کاری TS 7 آن فعلاً لازم دارد TS 6 هم کنارش نصب بماند.
- **Qwik**: یک تعارض وابستگی موجود با Vite 8 نصب را مسدود می‌کند (طبق توضیح #23794 در نهایت همان‌جا تغییر کرد).

این الگو با [اعلام TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) می‌خواند. TS 7 پورت native کامپایلر است و 7.0 بدون API برنامه‌نویسی عرضه می‌شود؛ پست انتظار دارد 7.1 یک API جدید و متفاوت بیاورد و می‌گوید ابزارهایی که به دسترسی برنامه‌نویسی نیاز دارند تا آن زمان از 6.0 استفاده کنند. typescript-eslint پکیج `typescript` را از راه peer dependency import می‌کند و پست می‌گوید Vue، MDX، Astro، Svelte و ابزارهای مشابه که برای پشتیبانی ویرایشگر TypeScript را داخل خود دارند، فعلاً به TS 6.0 نیاز دارند.

هر چیزی که API کامپایلر را صدا بزند، نه اینکه فقط `tsc` را اجرا کند، در سمت اشتباه این خط است.

## اجرای هر دو: تنظیمی که از این نتیجه می‌شود

اعلام رسمی روش alias را توضیح می‌دهد تا `tsc` نسخهٔ 7.0 باشد و هر چیزی که `typescript` را import می‌کند همچنان 6.0 بگیرد:

```json
{
    "devDependencies": {
        "typescript": "npm:@typescript/typescript6@^6.0.2",
        "@typescript/native": "npm:typescript@^7.0.2"
    }
}
```

با این کار `npx tsc` نسخهٔ 7.0 را اجرا می‌کند و طبق پست، `@typescript/typescript6` یک executable به نام `tsc6` هم دارد و API نسخهٔ 6.0 را دوباره export می‌کند. اگر فقط می‌خواهید روی 6.0 بمانید، پست این را می‌دهد: `npm install -D typescript@npm:@typescript/typescript6`.

یک تقسیم عملی برای اپ Vite:

```json
{
    "scripts": {
        "typecheck": "tsc --noEmit",
        "typecheck:vue": "vue-tsc --noEmit",
        "lint": "eslint ."
    }
}
```

اینکه کدام یک می‌تواند از باینری native استفاده کند به ابزار بستگی دارد. `tsc` می‌تواند. اینکه `vue-tsc` هم می‌تواند یا نه، دقیقاً همان چیزی است که قالب Vue در create-vite نتوانست روشن کند؛ پس تا اعلام نگه‌دارندگانش روی 6.0 بمانید. اعلام رسمی `vue-tsc` را نام نمی‌برد؛ از وابستگی Vue و Volar به 6.0 برای پشتیبانی ویرایشگر نام می‌برد.

## تغییرات پیکربندی در 7.0

حتی جایی که ابزارها کار می‌کنند، اعلام رسمی پیش‌فرض‌های جدید و گزینه‌های حذف‌شده را فهرست می‌کند. کدی که روی 6.0 تمیز کامپایل می‌شود (با `stableTypeOrdering` روشن و بدون `ignoreDeprecations`) باید روی 7.0 همان رفتار را داشته باشد؛ یعنی ترتیب مهاجرت روشن است: اول روی 6.0 سبز شوید.

پیش‌فرض‌های مهم: `strict` برابر true، `module` برابر `esnext`، `rootDir` برابر `./`، `types` برابر `[]` و `noUncheckedSideEffectImports` برابر true است. deprecationهای قبلی حالا خطای قطعی‌اند، از جمله `target: es5`، `downlevelIteration`، `baseUrl`، `moduleResolution` برابر `node`/`node10`/`classic` و `module` برابر `amd`/`umd`/`systemjs`/`none`.

دو موردی که بیشتر پروژه‌های Vite را می‌گیرد:

```jsonc
{
    "compilerOptions": {
        // 7.0: baseUrl is an error. Use paths relative to the tsconfig.
        "paths": { "@/*": ["./src/*"] },
        // 7.0: types defaults to [], so list ambient types explicitly.
        "types": ["vite/client"]
    }
}
```

همچنین توجه کنید که `tsc file.ts` وقتی در پوشهٔ جاری `tsconfig.json` هست شکست می‌خورد، مگر اینکه `--ignoreConfig` بدهید. این می‌تواند اسکریپت‌های موردی و بعضی دستورهای تک‌خطی CI را بشکند.

## مصالحه‌ها

رفتن `tsc` به 7.0 سرعتی را می‌دهد که اعلام رسمی تبلیغ می‌کند (پست‌های پیش‌انتشار آن را تقریباً ده برابر سریع‌تر از 6.0 توصیف می‌کنند). هزینه‌اش toolchain دوپاره است: دو نسخهٔ TypeScript در `node_modules`، قراردادی با alias که هم‌تیمی‌ها باید بفهمند و خطر اختلاف بین چیزی که CI چک می‌کند و چیزی که ویرایشگر نشان می‌دهد.

اگر به قوانین type-aware در typescript-eslint، vue-tsc یا بررسی Svelte تکیه دارید، ماندن کامل روی 6.0 ساده‌تر است. طبق پست 6.0 در فهرست devblog، 6.0 آخرین انتشار روی کدبیس جاوااسکریپتی است؛ پس این یک موقعیت نگه‌داشتن است، نه مقصد.

## این هفته چه کنید

1. پروژه را روی 6.0 بدون `ignoreDeprecations` تمیز کنید.
2. `baseUrl`، `moduleResolution` قدیمی و مشابه‌ها را همین حالا حذف کنید؛ روی 6.0 بی‌خطر است.
3. تنظیم alias را در یک branch امتحان کنید و `tsc` را فقط با باینری 7.0 اجرا کنید.
4. ابزارهای وابسته به API را روی 6.0 بگذارید و بعد از انتشار API در 7.1 دوباره بررسی کنید.
5. قالب‌های create-vite را زیر نظر بگیرید: وقتی «چند روز» PR شمارهٔ 23841 بگذرد و دوباره برگردند، یک تست یکپارچگی رایگان از تیم Vite است.

## منابع

- [create-vite 9.3.0 release](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.0)
- [create-vite 9.3.1 release](https://github.com/vitejs/vite/releases/tag/create-vite%409.3.1)
- [Vite releases](https://github.com/vitejs/vite/releases)
- [create-vite changelog](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/CHANGELOG.md)
- [PR #23794: use typescript v7 where possible](https://github.com/vitejs/vite/pull/23794)
- [PR #23841: use typescript v6 for now](https://github.com/vitejs/vite/pull/23841)
- [PR #23764: extract react eslint configs](https://github.com/vitejs/vite/issues/23764)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript devblog index](https://devblogs.microsoft.com/typescript/)
