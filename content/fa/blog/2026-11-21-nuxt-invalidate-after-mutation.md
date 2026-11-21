---
title: "نکته‌ی Nuxt: بعد از هر تغییر روی سرور، داده‌ی mount‌شده را با refreshNuxtData تازه کنید و بقیه را با clearNuxtData پاک کنید"
description: "بعد از یک POST، کش کهنه‌ی useAsyncData در صفحه‌های دیگر می‌ماند. تقسیم کار refreshNuxtData، clearNuxtData و useNuxtData و نکته‌ی KeepAlive."
date: 2026-11-21
cover: /images/blog/2026-11-21-nuxt-invalidate-after-mutation.svg
tags: [nuxt, pro-tip, data-fetching]
draft: false
---

در ۷۲ ساعت گذشته خبر پایدار و مهمی منتشر نشد: Vue روی 3.6.0-rc.16 است و آخرین نسخه‌ی پایدارش 3.5.46 است، Vite یک بتای 8.4 و چند وصله دارد و Next.js روی canaryهای 16.5 است. پس امروز یک نکته‌ی Nuxt داریم، درباره‌ی نیمه‌ای از کشینگ که کمتر از کلیدها دیده می‌شود: ابطال داده بعد از نوشتن.

## اشتباه رایج

یک فرم آیتم جدید را POST می‌کند و نویسنده روی لیستِ همان صفحه `refresh()` صدا می‌زند. این کار می‌کند. بعد کاربر به داشبورد می‌رود که همان داده را از یک کامپوننت دیگر می‌خواند و اعداد قدیمی را می‌بیند. یا نویسنده برای «اجبار» به داده‌ی تازه سراغ `window.location.reload()` یا `navigateTo(..., { replace: true })` می‌رود که برای درست کردن یک لیست، همه‌ی کش‌ها و کل state کلاینت را دور می‌ریزد.

```ts
// app/components/AddTodo.vue
async function add(title: string) {
    await $fetch("/api/todos", { method: "POST", body: { title } });
    // Only the list on THIS page updates. Everything else keeps its stale cache.
    await refreshTodosOnThisPage();
}
```

مشکل این است که یک mutation داده را باطل می‌کند و داده با کلید شناخته می‌شود، نه با صفحه. کلید واحد ابطال است، همان قراردادی که در [پست قبلی درباره‌ی کلیدهای مشترک](/fa/blog/2026-10-04-nuxt-async-data-shared-keys) آمده بود.

## سه ابزار، سه کار

طبق [مستندات refreshNuxtData](https://nuxt.com/docs/4.x/api/utils/refresh-nuxt-data)، تابع `refreshNuxtData(keys?)` نمونه‌های `useAsyncData`، `useLazyAsyncData`، `useFetch` و `useLazyFetch` را که با یک کلید یا آرایه‌ای از کلیدها بخوانند دوباره می‌گیرد. بدون آرگومان، همه را دوباره می‌گیرد. یک promise برمی‌گرداند که پس از پایان کار نمونه‌های هدف resolve می‌شود.

[مستندات clearNuxtData](https://nuxt.com/docs/4.x/api/utils/clear-nuxt-data) عملیات دیگری را شرح می‌دهند: داده‌ی کش‌شده، وضعیت خطا و promiseهای در جریان را پاک می‌کند و صفحه آن را برای ابطال دریافت داده‌ی «صفحه‌ای دیگر» مفید می‌داند. امضایش `clearNuxtData(keys?: string | string[] | ((key: string) => boolean))` است. شکل predicate در امضا هست اما صفحه توضیحی درباره‌اش نمی‌دهد، پس برای کاربردهای ظریف سراغ سورس بروید.

قطعه‌ی سوم [useNuxtData](https://nuxt.com/docs/4.x/api/composables/use-nuxt-data) است که یک ref واکنشی به مقدار کش‌شده‌ی یک fetch کلیددار می‌دهد. فقط وقتی کار می‌کند که فراخوانی اصلی کلید صریح داشته باشد و کلید دقیقاً یکی باشد، و ref می‌تواند `undefined` باشد.

تقسیم کار نتیجه‌شده:

| موقعیت | ابزار |
| --- | --- |
| نمونه‌ی `asyncData` دست شماست | `refresh()` / `execute()` خودش |
| کامپوننت mount‌شده‌ی دیگری صاحب داده است | `refreshNuxtData(key)` |
| داده مال صفحه‌ای است که کاربر در آن نیست | `clearNuxtData(key)` |
| می‌خواهید UI پیش از پاسخ سرور جابه‌جا شود | `useNuxtData(key)` به‌علاوه‌ی بازگردانی |

خود صفحه‌ی refreshNuxtData می‌گوید اگر به یک نمونه‌ی مشخص دسترسی دارید، `refresh` یا `execute` آن روش ترجیحی است. به تابع سراسری فقط وقتی سراغ بروید که دسترسی ندارید.

## الگوی بهتر

به هر لیست یک کلید پایدار و صریح بدهید، بعد از نوشتن با کلید باطل کنید:

```ts
// app/composables/useTodos.ts
export function useTodos() {
    return useFetch("/api/todos", { key: "todos" });
}
```

```ts
// app/composables/useAddTodo.ts
export function useAddTodo() {
    return async (title: string) => {
        await $fetch("/api/todos", { method: "POST", body: { title } });

        // Mounted consumers (the list beside the form) refetch now.
        await refreshNuxtData("todos");

        // Data the user is NOT looking at: drop it so no page renders a stale copy.
        clearNuxtData("todo-stats");
    };
}
```

`refreshNuxtData` با `await` صدا زده می‌شود تا دکمه‌ی ارسال تا هماهنگ شدن دوباره‌ی لیست غیرفعال بماند. مثال خود مستندات هم برای همین کار، فراخوانی را با یک پرچم `refreshing` و `try`/`finally` می‌پیچد.

`clearNuxtData` همگام است و `void` برمی‌گرداند. چیزی نمی‌گیرد؛ مقدار کش‌شده، خطا و promise در جریان را حذف می‌کند تا صفحه‌ی صاحب آن کلید چیز کهنه‌ای برای نمایش نداشته باشد. اینکه آن صفحه بعد از آن حالت بارگذاری نشان بدهد یا خالی، به نحوه‌ی نوشتن fetchش بستگی دارد؛ پس برای چنین کلیدهایی یک `default` معقول بگذارید.

## به‌روزرسانی خوش‌بینانه، روش مستند

وقتی کاربر باید تغییر را فوراً ببیند، صفحه‌ی `useNuxtData` یک روند پنج‌مرحله‌ای شرح می‌دهد: خواندن کش، نگه‌داشتن یک کپی، نوشتن آیتم جدید در لیست کش‌شده، بازگرداندن کپی اگر درخواست شکست خورد، و صدا زدن `refreshNuxtData` در صورت موفقیت برای هماهنگ شدن با سرور.

```ts
const { data: todos } = useNuxtData<Todo[]>("todos");

async function add(title: string) {
    const previous = todos.value ? [...todos.value] : undefined;
    todos.value = [...(todos.value ?? []), { id: -1, title }];

    try {
        await $fetch("/api/todos", { method: "POST", body: { title } });
        await refreshNuxtData("todos");
    } catch (error) {
        todos.value = previous;
        throw error;
    }
}
```

به محافظ توجه کنید: وقتی زیر آن کلید چیزی کش نشده باشد ref برابر `undefined` است، پس spread باید این را تحمل کند. `id: -1` موقت از خودم است و در مستندات نیست؛ هر چیزی که لیستتان با آن کلید می‌خورد بگذارید و مطمئن شوید با ردیف واقعی برخورد نمی‌کند.

## بده‌بستان‌ها و نکته‌ها

- **ابطال با رشته یک قرارداد است، نه یک نوع.** غلط املایی در `"todos"` بی‌صدا شکست می‌خورد: چیزی match نمی‌شود و چیزی دوباره گرفته نمی‌شود. کلیدها را مثل هر قرارداد کش مشترک، به‌صورت ثابت از یک ماژول export کنید.
- **`refreshNuxtData()` بدون آرگومان ابزاری کُند است.** همه‌ی کلیدهای `useAsyncData` و `useFetch` را دوباره می‌گیرد. بعد از ورود به سیستم یا تعویض tenant قابل قبول است و بعد از افزودن یک todo اتلاف.
- **`<KeepAlive>` تصویر را عوض می‌کند.** مستندات یادآوری می‌کنند کامپوننت‌هایی که با `<KeepAlive>` کش شده و غیرفعال‌اند، تا زمانی که unmount نشوند با `refreshNuxtData` داده‌شان را دوباره می‌گیرند. پس یک تب پنهان می‌تواند برای هر refresh سراسری یک درخواست خرج کند.
- **تازه‌سازی لغو کردن نیست.** طبق [مستندات useAsyncData](https://nuxt.com/docs/4.x/api/composables/use-async-data)، `refresh` به‌طور پیش‌فرض تا پایان اجرای جاری دوباره شروع نمی‌شود و گزینه‌ی `dedupe` آن پیش‌فرض `'cancel'` است. دو mutation پشت‌سرهم می‌توانند refetch در جریان اولی را لغو کنند که معمولاً همان چیزی است که می‌خواهید، به شرط اینکه handler شما `signal` را به `$fetch` بدهد.
- **منبع حقیقت هنوز سرور است.** state خوش‌بینانه یک حدس است. مثل روند بالا همیشه با یک refetch تمامش کنید تا قانون سمت سرور که آیتم را تغییر داده برنده شود.

## وقتی الگوی اول هم خوب است

اگر یک mutation دقیقاً یک لیست را تحت تأثیر می‌گذارد و آن لیست همان کامپوننتی است که کاربر می‌بیند، صدا زدن `refresh()` خودش ساده‌تر است و به انضباط کلید نیاز ندارد. وقتی دو یا چند مصرف‌کننده همان داده را می‌خوانند، یعنی عملاً از لحظه‌ای که یک داشبورد، شمارنده‌ی هدر یا صفحه‌ی جزئیات منبعی را با یک لیست شریک می‌شود، به ابطال مبتنی بر کلید بروید.

## منابع

- [refreshNuxtData, Nuxt docs](https://nuxt.com/docs/4.x/api/utils/refresh-nuxt-data)
- [clearNuxtData, Nuxt docs](https://nuxt.com/docs/4.x/api/utils/clear-nuxt-data)
- [useNuxtData, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-nuxt-data)
- [useAsyncData, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
- [Next.js releases](https://github.com/vercel/next.js/releases)
- [Nuxt releases](https://github.com/nuxt/nuxt/releases)
- [Node.js blog](https://nodejs.org/en/blog)
