---
title: "Vue 3.6.0-rc.13: کار Transition در Vapor پلی به TransitionGroup می‌گیرد و باندل interop کوچک‌تر می‌شود"
description: "Vue 3.6.0-rc.13 در ۲۳ اکتبر با ردیف‌های Vapor داخل TransitionGroup در vdom، زنجیره تخت v-else-if، tree-shaking کد interop و ۳۴ اصلاح منتشر شد."
date: 2026-10-24
cover: /images/blog/2026-10-24-vue-3-6-rc-13-transition-interop.svg
tags: [vue, vapor]
draft: false
---

نسخه [3.6.0-rc.13](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.13) در ۲۳ اکتبر، یک هفته پس از rc.12، منتشر شد. این هنوز یک پیش‌انتشار است و [صفحه releases](https://github.com/vuejs/core/releases) نسخه 3.5.44 را آخرین نسخه پایدار نشان می‌دهد. خود صفحه انتشار یادداشتی ندارد و به changelog ارجاع می‌دهد، بنابراین هر چه در ادامه می‌آید از [changelog نسخه 3.6](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md) است. [پست rc.11](/fa/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings) نخستین قابلیت interop برای Transition را پوشش داد. rc.13 نیمه دوم آن را اضافه می‌کند و نشان می‌دهد باگ‌های باقی‌مانده کجا هستند.

## تنها قابلیت: ردیف‌های Vapor در TransitionGroup مربوط به vdom

تنها مورد بخش Features شماره #15963 است: ردیف‌های یک slot در Vapor اکنون می‌توانند به‌عنوان فرزندان یک `TransitionGroup` در vdom انیمیت شوند. در rc.11 معادل آن، slot در Vapor داخل `Transition` در vdom بود. این دو با هم دو wrapper انیمیشنی را پوشش می‌دهند که هنگام تبدیل تدریجی از کامپوننت‌های برگ سراغشان می‌روید.

شکلی که این قابلیت برایش ساخته شده، در اپلیکیشنی ترکیبی که پوسته لیست هنوز vdom است:

```vue
<!-- List.vue: vdom component -->
<template>
    <TransitionGroup name="row" tag="ul">
        <slot />
    </TransitionGroup>
</template>
```

```vue
<!-- Page.vue: slot content from a Vapor component -->
<template>
    <List>
        <Row v-for="item in items" :key="item.id" :item="item" />
    </List>
</template>
```

این دقیقاً همین دو فایل را اجرا نکرده‌ام؛ آن را نمونه‌ای برای نشان دادن مرز دو رندرر بدانید، نه دستورالعملی تأییدشده. خط changelog فقط می‌گوید ردیف‌های slot در Vapor به‌عنوان فرزندان `TransitionGroup` در vdom کار می‌کنند.

rc.12 پیش‌تر لبه‌های مرتبط را اصلاح کرده بود: گروه‌های transition تودرتو اکنون حرکت اجداد را در نظر می‌گیرند (#15865) و حذف fragment در interop تا پایان leave به تعویق می‌افتد (#15866).

## Transition و KeepAlive: دنباله بلند اصلاحات

بیشتر ۳۴ اصلاح باگ حول transitionها هستند. به‌جای یک علت ریشه‌ای، فهرستی از حالت‌های لبه زمان‌بندی به نظر می‌رسند:

- **حالت `out-in`:** رندر مجدد transitionی که وسط leave حذف شده نادیده گرفته می‌شود (#15919)، `out-in` منتظر شاخه‌ای که به «هیچ» رفته نمی‌ماند (#15913)، leave در حالت `out-in` با unmount شدن transition ادامه می‌یابد (#15923)، خطاهای شاخه `out-in` که در حین leave رندر شده به error handler گزارش می‌شوند (#15941) و outlet دربرگیرنده پس از ادامه یافتن شاخه `out-in` تثبیت می‌شود (#15942).
- **حالت `in-out`:** leaveای که enter در انتظارِ fallback یک slot نگه داشته حفظ می‌شود (#15949).
- **KeepAlive:** فرزند vdom که kept-alive است زیر hookهای switch وارد می‌شود (#15954).
- **Slotها و `v-show`:** ریشه مخفی با `v-show` در طول leave ساختاری مخفی می‌ماند (#15951) و ریشه‌های `v-if` هم‌سطح در محتوای slot به‌عنوان یک فرزند transition جابه‌جا می‌شوند (#15945).
- **تشخیص تک‌ریشه:** فرزند یک `Transition` یا `KeepAlive` غیرریشه‌ای اکنون در کامپایلر به‌عنوان تک‌ریشه علامت‌گذاری می‌شود (#15988).

اگر کامپوننت‌هایی دارید که `mode="out-in"` را با async setup یا `v-show` ترکیب می‌کنند، این موارد را بخوانید. چند مورد به transitionی مربوط‌اند که وسط اجرا برچیده می‌شود؛ وضعیتی که در ترافیک واقعی به شکل المان گیرکرده یا enter گمشده دیده می‌شود، نه در دموی مسیر ایده‌آل.

## کامپوننت‌های async و تأخیر ۲۰۰ میلی‌ثانیه

دو مورد به transition ربطی ندارند. #15950 تأخیر پیش‌فرض ۲۰۰ میلی‌ثانیه کامپوننت‌های loading در async componentها را در `runtime-core` بازمی‌گرداند. changelog نمی‌گوید این رفتار چگونه و در کدام RC خراب شده بود، پس نمی‌توانم بگویم شما تحت تأثیر بوده‌اید یا نه. اگر `defineAsyncComponent` را با کامپوننت loading استفاده می‌کنید و در RCهای قبلی چشمک حالت loading را دیده‌اید، این احتمالاً همان اصلاح است.

در سمت Vapor، به‌روزرسانی کامپوننتی که ریشه‌اش در انتظار async setup است نگه داشته می‌شود (#15925)، و همین برای زنجیره ریشه hydrate‌شده روی async setup معلق صدق می‌کند (#15927). hookهای transition هم به ریشه فرزندی که پس از async setup رندر می‌شود اعمال می‌شوند (#15907، به‌علاوه نسخه relay برای hookهای vdom در #15908).

## کامپایلر: زنجیره‌های تخت‌تر v-else-if

سه تغییر مهم در کامپایلر:

- زنجیره‌های بلند `v-else-if` به یک `createIfChain` تخت کامپایل می‌شوند (#15965). نمی‌دانم خروجی قبلی چگونه بود و changelog عدد اندازه یا سرعت نمی‌دهد، پس ادعای بهبود نمی‌کنم.
- `v-once` روی زنجیره‌های `v-else-if` با vdom هم‌راستا شد (#15966).
- سه مورد بدون شماره PR به نکات پارسر HTML می‌پردازند: المان‌هایی که از foreign content خارج می‌شوند، متن داخل بخش‌های جدول و فرزندانی که باعث می‌شوند پارسر یک جد را ببندد. اگر قالب‌هایتان به قواعد بازیابی شبیه مرورگر تکیه دارند، این موارد مهم‌اند.

## باندل کوچک‌تر وقتی از interop استفاده نمی‌کنید

دو مورد کارایی که بیشتر ارزش بررسی باندل دارند:

- `runtime-core` وقتی `vaporInteropPlugin` استفاده نشود کد interop مربوط به Vapor را tree-shake می‌کند (#15990).
- `runtime-vapor` وقتی کامپوننت‌های `Transition`، `KeepAlive` و `Suspense` استفاده نشوند کد interop آن‌ها را tree-shake می‌کند (#15994).

rc.12 هم قبلاً tree-shaking جست‌وجوهای hydration برای helperهای DOM node را در باندل‌های کلاینت اضافه کرده بود (#15875). الگو یکسان است: لایه interop دارد «هرچه استفاده کنی همان را بپردازی» می‌شود. اندازه‌ای اعلام نشده؛ با bundle analyzer خودتان روی یک مسیر نماینده اندازه بگیرید.

## موارد کوچک‌تر

- `runtime-vapor` هشدار می‌دهد که یک کامپوننت reactive شده است (شماره PR ندارد).
- ورودی‌های number هنگام change قالب‌بندی می‌شوند (#15974).
- شکست خط‌ها هنگام hydrate کردن متن نرمال می‌شوند (#15906).
- ساخت کامپوننت custom element همراه با mount آن flush می‌شود (#15991).
- موارد اضافه `cloneVNode` به ریشه محتوای slot در Vapor منتقل می‌شوند (#15989).
- از rc.12: cleanupهای watcher تا اجرای مجدد callback حفظ می‌شوند (#15766) و `hasOwnProperty` روی props، attrs و slot props کار می‌کند (#15841).

اصلاح reactivity در rc.12 تنها موردی است که بیرون از پکیج‌های Vapor و کامپایلر قرار دارد. این تغییر ترتیب cleanup است، پس هر watcher که `onCleanup` ثبت می‌کند ارزش یک اجرای تست را دارد.

## چه باید کرد

- **اپلیکیشن‌های production:** روی 3.5.x بمانید. نسخه‌ای که هنوز برچیده شدن `out-in` و ترتیب async setup را اصلاح می‌کند برای انتشار مناسب نیست.
- **تیم‌هایی که Vapor را می‌آزمایند:** یک branch را ارتقا دهید و هر لیست انیمیت‌شده و transition مسیر را دستی امتحان کنید، از جمله قطع سریع transition در حال اجرا. بیشتر اصلاحات این نسخه همان‌جا قرار دارند.
- **نویسندگان کتابخانه:** کامپوننت‌ها را با `Transition`، `TransitionGroup`، `KeepAlive` و slotها زیر هر دو رندرر تست کنید، چون مرز دو رندرر ناحیه فعال باگ است.
- **کاربران Nuxt:** یکپارچگی Nuxt با Vapor یا پیش‌انتشارهای 3.6 را بررسی نکرده‌ام، پس آن را آزمون‌نشده بدانید.

## مصالحه‌ها

Interop همان چیزی است که مهاجرت تدریجی را ممکن می‌کند، و همان چیزی است که Vapor را بزرگ و ظریف می‌کند: هر کامپوننت wrapper باید مسیری برای هر دو رندرر داشته باشد. rc.13 این هزینه را از دو راه کم می‌کند: بستن حفره‌های زمان‌بندی بیشتر و اجازه دادن به باندلر برای حذف کد interopای که import نمی‌کنید. اما هزینه را از بین نمی‌برد. changelog بخش breaking change ندارد، ولی این‌همه اصلاح transition و async setup در یک RC نشانه معقولی است که UI انیمیت‌شده نخستین جایی است که باید تست کنید.

## منابع

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core release v3.6.0-rc.13](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.13)
- [vuejs/core CHANGELOG (minor branch)](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md)
