---
title: "Node.js 26.11: گزینه‌ی --process-timeout، اعتبارسنج‌های هدر بدون استثنا و process.ref پایدار"
description: "Node.js 26.11.0 گزینه‌ی --process-timeout و http.isValidHeaderName و isValidHeaderValue را اضافه کرد و process.ref/unref را پایدار کرد. اثرش بر سرور SSR، CI و کانتینر."
date: 2026-10-10
cover: /images/blog/2026-10-10-node-26-11-process-timeout.svg
tags: [node, tooling, ci]
draft: false
---

Node.js 26.11.0 در ۷ اکتبر روی خط Current منتشر شد. این یک انتشار minor است و قابلیت شاخص واحدی ندارد، اما سه تغییرش به چیزهایی مربوط است که تیم‌های فرانت‌اند هر روز اجرا می‌کنند: یک محدودیت زمانی سخت برای کل پروسه، اعتبارسنج‌های هدر که به‌جای پرتاب خطا مقدار boolean برمی‌گردانند، و `process.ref()`/`process.unref()` پایدار. نسخه‌ی 26.11.1 هم همان روز آمد. طبق فهرست commitهایش فقط یک تغییر بیلد مربوط به بازطراحی مستندات و دو commit ابزاری را برمی‌گرداند، پس خود runtime مثل 26.11.0 است ([یادداشت 26.11.1](https://nodejs.org/en/blog/release/v26.11.1)).

این خط Current است، نه LTS. فهرست بلاگ، 22.23.3 را آخرین LTS از خط 22 نشان می‌دهد و در سرصفحه‌اش v24.21.0 را آخرین LTS می‌نامد ([بلاگ Node.js](https://nodejs.org/en/blog)). هرچه در ادامه می‌آید را اول در CI و ابزارهای محلی امتحان کنید.

## `--process-timeout`: مهلت برای کل پروسه

این گزینه از v26.11.0 اضافه شده و در مستندات با پایداری 1.1 (توسعه‌ی فعال) آمده است ([مستندات CLI](https://nodejs.org/api/cli.html)). یک عدد صحیح مثبت با واحد (`ms`، `s`، `m` یا `h`) می‌گیرد:

```bash
node --process-timeout=5m scripts/prerender.mjs
```

اگر پروسه تا پایان مهلت هنوز زنده باشد، Node با کد `124` خارج می‌شود، همان کدی که `timeout(1)` استفاده می‌کند. ساعت از شروع پروسه می‌افتد، نه از لحظه‌ای که event loop بیکار می‌شود.

چیزی که این گزینه را از پوشاندن با `timeout` در شل مفیدتر می‌کند، اطلاعات تشخیصی است. هنگام انقضا Node در stderr یا منابعی را که event loop را زنده نگه داشته‌اند چاپ می‌کند (نمونه‌ی مستندات یک سرور TCP در حال listen و چند timer معلق را نشان می‌دهد) یا، اگر نخ اصلی مشغول باشد، stack جاوااسکریپتی را که در آن گیر کرده. خروجی `NODE_V8_COVERAGE` و `--cpu-prof` همچنان نوشته می‌شوند. اگر نخ اصلی تا دو ثانیه پاسخ ندهد، مثلاً چون در `child_process.execSync()` بلاک شده، Node فوراً خارج می‌شود و هیچ‌کدام از این دو را چاپ نمی‌کند.

نکاتی که پیش از تکیه بر آن باید بدانید:

- هندلرهای `'beforeExit'` و `'exit'` اجرا نمی‌شوند. دلیل مستندات این است که شاید خودِ کد جاوااسکریپت شما پروسه را زنده نگه داشته باشد. روی هوک‌های پاک‌سازی حساب نکنید.
- `--report-on-process-timeout` یک گزارش تشخیصی اضافه می‌کند و به `--process-timeout` نیاز دارد.
- در `NODE_OPTIONS` مجاز نیست و با پرچم‌های inspector، `node inspect`، `--run` و `--build-snapshot` ترکیب نمی‌شود. تا وقتی فعال است، `inspector.open()` خطا می‌دهد و درخواست‌های inspector از طریق `SIGUSR1` نادیده گرفته می‌شوند.
- پروسه‌های فرزندی که `process.execArgv` را به ارث می‌برند (مثلاً با `child_process.fork()`) تایمر خودشان را از زمان شروع خودشان دارند.
- با `--watch` مهلت برای هر اجرای برنامه اعمال می‌شود، نه برای watcher. با test runner، خودِ runner آن را روی کل اجرا اعمال می‌کند و هر فایل تستی که در پروسه‌ی جدا اجرا شود هم مهلت خودش را دارد.

### جایگاهش در پایپ‌لاین فرانت‌اند

هدف‌های روشن، اسکریپت‌هایی هستند که ممکن است روی یک handle باز گیر کنند: اسکریپت‌های prerender یا sitemap، ایندکس محتوا، اجراگرهای تست بصری و اسکریپت‌های مهاجرت یک‌باره در CI. در غیر این صورت کار گیرکرده تا مهلت خودِ runner در CI ادامه می‌یابد و چیزی به شما نمی‌گوید. با این پرچم شکست سریع می‌گیرید و فهرست handleهایی را که پروسه را زنده نگه داشته‌اند.

```jsonc
// package.json
{
    "scripts": {
        "prerender": "node --process-timeout=10m scripts/prerender.mjs"
    }
}
```

محدودیت `NODE_OPTIONS` یک مبادله‌ی واقعی است: نمی‌توانید یک پیش‌فرض سراسری برای همه‌ی پروسه‌های Node در یک job بگذارید. باید روی هر دستور بیاید، یعنی به ابزارهایی که خودشان Node را اجرا می‌کنند نمی‌رسد، مگر `execArgv` را عبور دهند.

آن را روی سرور طولانی‌مدت production نگذارید. مهلت برای کل پروسه است و مسیر خاموشی ملایم ندارد، پس ابزاری برای jobهای محدود است، نه برای چرخش workerها.

## `http.isValidHeaderName` و `http.isValidHeaderValue`

هر دو تابع از v26.11.0 اضافه شده‌اند ([مستندات HTTP](https://nodejs.org/api/http.html)). `http.validateHeaderName()` و `http.validateHeaderValue()` از v14.3.0 وجود دارند و روی ورودی بد `TypeError` پرتاب می‌کنند. جفت جدید همان بررسی را انجام می‌دهد اما boolean برمی‌گرداند که مستندات آن را مناسب مسیرهای پرتکرار می‌داند که ورودی نامعتبر در آن‌ها انتظار می‌رود.

```ts
import { isValidHeaderName, isValidHeaderValue } from "node:http";

function copyForwardedHeaders(input: Record<string, unknown>, out: Headers) {
    for (const [name, value] of Object.entries(input)) {
        if (!isValidHeaderName(name) || !isValidHeaderValue(value)) continue;
        out.set(name, String(value));
    }
}
```

رفتارهایی از مستندات که در چنین کدی مهم‌اند:

- `isValidHeaderName` فقط رشته‌ی غیرخالی را که یک token در HTTP باشد می‌پذیرد. `''`، `'bad header'` و `42` همگی `false` هستند. چون متدهای HTTP هم token‌اند، می‌توان با آن آن‌ها را هم اعتبارسنجی کرد.
- `isValidHeaderValue` برای `undefined`، symbolها و رشته‌های حاوی CR/LF یا نویسه‌های کنترلی مثل `\x01` مقدار `false` برمی‌گرداند. مقدارهای غیررشته‌ای ابتدا مثل `setHeader()` به رشته تبدیل می‌شوند، پس `123` معتبر است.
- گزینه‌ی `httpValidation` را می‌گیرد: `'strict'` (پیش‌فرض) یا `'relaxed'`، با همان معنای `http.createServer()` و `http.request()`. در نمونه‌ی مستندات، `'a\x01b'` در حالت strict نامعتبر و در relaxed معتبر است. آرگومان `options` نامعتبر خطا پرتاب می‌کند.

کاربرد عملی در مرزهایی است که هدر را از داده‌ی خارج از کنترل خود می‌سازید: مسیرهای proxy و BFF که هدرهای upstream را عبور می‌دهند، هندلرهایی که یک query parameter را در `Location` یا `Set-Cookie` بازتاب می‌دهند، یا کدی که روی شیء پاسخِ غیر Node هدر می‌گذارد. آنجا try/catch برای هر هدر شلوغ است و CR/LF اعتبارسنجی‌نشده یک باگ response-splitting است. مستندات می‌گویند پیش از `setHeader()` روی اشیای خودِ ماژول `http` لازم نیست اعتبارسنجی کنید چون آن‌ها خودکار بررسی می‌کنند، پس توابع جدید برای بقیه‌ی جاهاست.

## `process.ref()` و `process.unref()` دیگر تجربی نیستند

این دو از v23.6.0 و v22.14.0 وجود دارند؛ از v26.11.0 مستندات می‌گویند دیگر تجربی نیستند ([مستندات process](https://nodejs.org/api/process.html)). آن‌ها با پروتکل «refable» کار می‌کنند: شیء متدهایی با کلیدهای `Symbol.for('nodejs.ref')` و `Symbol.for('nodejs.unref')` پیاده می‌کند و `process.ref(obj)` / `process.unref(obj)` آن‌ها را صدا می‌زنند.

```ts
import { ref, unref } from "node:process";

const handle = {
    [Symbol.for("nodejs.ref")]() {
        /* keep the event loop alive */
    },
    [Symbol.for("nodejs.unref")]() {
        /* let the process exit */
    },
};

unref(handle);
```

مستندات دلیلش را می‌گویند: صدا زدن مستقیم `.ref()` و `.unref()` روی اشیا به نفع این پروتکل در مسیر منسوخ‌شدن است، چون نوع‌های Web Platform API نمی‌توانند این متدها را بگیرند. برای کد اپلیکیشن امروز تفاوت چندانی نمی‌کند. برای نویسندگان کتابخانه و runtime اهمیت دارد، آن‌ها که timer یا socket پس‌زمینه نگه می‌دارند، مثل flush کننده‌های telemetry یا پاک‌کننده‌های کش، و یک راه واحد می‌خواهند تا بگویند «برای این پروسه را زنده نگه ندار»، راهی که با اشیای استاندارد وب هم کار کند. نمونه‌ی کد بالا توضیحی است و از مستندات نیست.

## موارد کوچک‌تر

از فهرست تغییرات مهم این انتشار ([یادداشت 26.11.0](https://nodejs.org/en/blog/release/v26.11.0)):

- `Buffer.stringLength()` و `buffer.isLatin1` اضافه شدند.
- گزینه‌ی `connectionWindowSize` برای `http2` اضافه شد.
- `perf_hooks` اصلاح مربوط به کوتاه‌شدن رزولوشن `monitorEventLoopDelay()` و نیز `histogram.diff()` و `histogram.snapshot()` را گرفت. اگر تأخیر event loop را در سرور SSR پایش می‌کنید، سراغ این‌ها بروید.
- Alpine Linux به پشتیبانی tier 2 ارتقا یافت، که اگر Nuxt یا Next.js را در کانتینر Alpine می‌فرستید به کارتان می‌آید.
- طبق فهرست commitها OpenSSL به 3.5.9 رفت، که صفحه آن را اصلاح امنیتی معرفی نمی‌کند.

## باید ارتقا داد؟

فقط به خاطر این انتشار روی production نه: خط Current است و چیزی در آن اصلاحی نیست که منتظرش باشید. کاری که الان ارزش دارد، امتحان `--process-timeout` روی مراحل بیلد و اسکریپتی است که قبلاً گیر کرده‌اند. ارزان است، سریع شکست می‌خورد و خروجی‌اش می‌گوید چه چیزی پروسه را باز نگه داشته. چون پایداری 1.1 دارد، نسخه‌ی Node را در CI پین کنید و هنگام ارتقا مستندات CLI را دوباره بخوانید.

## منابع

- [Node.js blog index](https://nodejs.org/en/blog)
- [Node.js 26.11.0 release notes](https://nodejs.org/en/blog/release/v26.11.0)
- [Node.js 26.11.1 release notes](https://nodejs.org/en/blog/release/v26.11.1)
- [Node.js HTTP API docs](https://nodejs.org/api/http.html)
- [Node.js CLI docs](https://nodejs.org/api/cli.html)
- [Node.js process API docs](https://nodejs.org/api/process.html)
