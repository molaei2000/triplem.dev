---
title: "نکته‌ی حرفه‌ای Next.js: «use client» چیزهایی را که import می‌کنید با خودش می‌برد، نه چیزهایی را که به‌عنوان children می‌دهید"
description: "Client Component موارد import‌شده را باندل می‌کند، اما Server Componentهایی که به‌صورت children یا prop می‌رسند نه. مرز را کجا بگذاریم و از تله‌ی compound componentها چطور بپرهیزیم."
date: 2026-11-12
cover: /images/blog/2026-11-12-nextjs-client-boundary-children.svg
tags: [next.js, pro-tip, performance]
draft: false
---

شایع‌ترین دلیل بزرگ‌بودن بیش از حد باندل App Router در Next.js یک کتابخانه‌ی سنگین نیست؛ یک دستور `'use client'` است که یک فایل بالاتر از جای درستش نشسته. یک wrapper به Client Component تبدیل می‌شود و هر چیزی که import می‌کند بی‌سروصدا همراهش به مرورگر می‌رسد.

مطالب این نوشته با صفحه‌ی فعلی [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) و راهنمای [Server and Client Boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary) تطبیق داده شده است (هر دو آخرین به‌روزرسانی: 2026-10-05).

## دو قاعده‌ی مرز

راهنمای مرز، این دستور را به دو قاعده خلاصه می‌کند:

- **کد** از طریق importها عبور می‌کند. هر چیزی که یک Client Component import کند به client bundle کشیده می‌شود.
- **داده** از طریق propها عبور می‌کند و باید serializable باشد. توابعی مثل event handlerها نمی‌توانند عبور کنند. یک Server Function که با `'use server'` علامت خورده باشد به‌صورت reference عبور می‌کند.

قاعده‌ی اول است که آسیب می‌زند. وقتی فایلی `'use client'` دارد، importها و کامپوننت‌هایی که مستقیم رندر می‌کند بخشی از گراف ماژول کلاینت می‌شوند. لازم نیست دستور را روی تک‌تک فایل‌های زیرش بگذارید.

قاعده‌ی دوم راه فرار است. یک React element رندرشده داده‌ی serializable است و می‌تواند عبور کند. مستندات می‌گویند Server Componentهایی که به‌عنوان `children` یا propهای دیگر پاس داده می‌شوند به گراف ماژول Client Component import نمی‌شوند: روی سرور رندر می‌شوند و به‌صورت خروجی می‌رسند.

## اشتباه: مرز در بالاترین نقطه

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

تنها بخش تعاملی اینجا یک boolean است. اما `Sidebar` و `Footer` از داخل یک Client Component import شده‌اند؛ پس کدشان و هر چیزی که آن‌ها import می‌کنند به مرورگر می‌رسد و هنگام hydration دوباره اجرا می‌شود. مستندات عکس این را توصیه می‌کنند: `'use client'` را روی فایل‌هایی بگذارید که کامپوننت تعاملی را تعریف می‌کنند، نه روی بخش‌های بزرگی از UI.

## راه‌حل ۱: بخش کلاینتی را به قسمت تعاملی کوچک کنید

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

`Sidebar` را layout که یک Server Component است import می‌کند، پس روی سرور رندر می‌شود. `MenuToggle` خروجی آن را به‌عنوان `children` می‌گیرد و فقط تصمیم می‌گیرد نشانش بدهد یا نه. راهنما همین تقسیم را با دو نقش owner و parent توضیح می‌دهد: کامپوننتی که JSX در سورس آن نوشته شده (owner) تعیین می‌کند کجا رندر شود، و کامپوننتی که فقط در درخت آن را در بر می‌گیرد (parent) صرفاً جایش را مشخص می‌کند.

یک نکته: slot حتی وقتی state کلاینت آن را پنهان کرده باز هم روی سرور رندر می‌شود. خروجی `Sidebar` چه `open` درست باشد چه نه در RSC payload هست. کمی payload می‌دهید و در عوض هیچ کد کلاینتی نمی‌فرستید.

## راه‌حل ۲: providerها تا جای ممکن عمیق‌تر

همین منطق برای context providerها هم صدق می‌کند. مستندات یک `ThemeProvider` با `'use client'` نشان می‌دهند که `children` می‌گیرد و در layout ریشه رندر می‌شود، و توصیه‌ای اضافه می‌کنند: providerها را تا جای ممکن عمیق در درخت رندر کنید و به‌جای کل سند `<html>` فقط دور `{children}` بپیچید، چون این کار بهینه‌سازی بخش‌های ایستای Server Componentها را برای Next.js آسان‌تر می‌کند.

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

provider یک Client Component است، ولی چون `children` از بیرون پاس داده می‌شود، صفحه‌های داخل آن Server Component می‌مانند.

## راه‌حل ۳: کامپوننت مشترک را wrap کنید، نه علامت‌گذاری

اگر کامپوننت مشترکی از `useState` استفاده می‌کند ولی نمی‌خواهید ماژولش همه‌جا به client entry تبدیل شود، راهنمای مرز یک wrapper نازک از نوع Client Component پیشنهاد می‌کند که آن را import کند و دستور را داشته باشد. ماژول مشترک دست‌نخورده می‌ماند و مرز به کد اپلیکیشن نزدیک‌تر می‌شود. همین رویکرد برای کامپوننت‌های شخص ثالثی که از قابلیت‌های فقط‌کلاینت استفاده می‌کنند ولی `'use client'` ندارند هم جواب می‌دهد: آن‌ها را از فایلی که دستور را دارد دوباره export کنید، مثل نمونه‌ی `Carousel` در مستندات.

## تله: compound componentها در عبور از مرز

عضوهای static مثل `Menu.Item` یا `Tabs.Panel` داخل یک گراف کار می‌کنند. راهنما هشدار می‌دهد وقتی یک عضو static از مرز رد شود می‌شکنند: Server Component که یک Client Component را import می‌کند به‌جای تابع یک client reference می‌گیرد، پس `Menu.Item` برابر `undefined` است و React خطای «Element type is invalid.» می‌دهد.

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

راه‌حل مستندات این است که وقتی Server Componentها به قطعات نیاز دارند، آن‌ها را به‌صورت named export عرضه کنید. سبک static property را فقط برای استفاده میان Client Componentها نگه دارید.

## تله: فقط propهای serializable

پاس‌دادن `onClick` از Server Component به Client Component خطا می‌دهد. راهنما می‌گوید پلاگین TypeScript propهای تابعی با نام `action` یا پایان‌یافته به `Action` را مجاز می‌داند، چون Server Function از روی type از تابع معمولی قابل تشخیص نیست، و بقیه‌ی propهای تابعی را علامت می‌زند. propهایی را که از مرز رد می‌شوند «داده» بدانید: آن‌ها در payload هم serialize می‌شوند و به مرورگر می‌روند، پس وقتی کامپوننت فقط به یک فیلد نیاز دارد کل ردیف دیتابیس را پاس ندهید.

## از سمت دیگر هم با server-only محافظت کنید

کد می‌تواند در جهت مخالف هم نشت کند. `server-only` را در ماژول‌هایی که secret می‌خوانند import کنید تا import آن‌ها از یک Client Component در زمان build خطا شود. در Next.js نصب این بسته اختیاری است، ولی اگر قوانین lint شما وابستگی اضافه را علامت می‌زنند می‌توانید نصبش کنید؛ Next.js خودش این importها را مدیریت می‌کند و type declaration خودش را دارد. متغیرهای محیطی بدون پیشوند در کد کلاینت با رشته‌ی خالی جایگزین می‌شوند، پس import اشتباه بدون این محافظ فقط در زمان اجرا و بی‌صدا خراب می‌شود.

## بده‌بستان‌ها و جایی که الگوی اولیه هم درست است

- slot هزینه‌اش payload است، نه bundle. اگر slot پنهان بزرگ است، آن را به‌صورت شرطی در یک Server Component رندر کنید یا پشت Suspense استریم کنید.
- یک برگ کوچک که تقریباً همه‌اش تعاملی است می‌تواند همان‌طور Client Component با importهایش باشد. شکستن یک کامپوننت ۴۰ خطی به سه فایل بدون هیچ صرفه‌جویی فقط جابه‌جایی بی‌فایده است.
- همان‌طور که راهنما توضیح می‌دهد، Client Componentها برای HTML اولیه روی سرور هم رندر می‌شوند؛ پس خارج‌کردن کد از گراف کلاینت جاوااسکریپت ارسالی و hydrate‌شده را کم می‌کند، نه کار رندر اول سرور را.
- قبل و بعد را با bundle analyzer بسنجید. ادعا ساختاری است؛ کوچک‌شدن مسیرهای خودتان را تأیید کنید.

## منابع

- [Server and Client Components, Next.js docs](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [The Server and Client Boundary, Next.js docs](https://nextjs.org/docs/app/guides/server-and-client-boundary)
