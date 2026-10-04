---
title: "نکتهٔ حرفه‌ای Nuxt: کلیدهای useAsyncData را قرارداد کش مشترک بدانید"
description: "کلید یکسان در Nuxt یعنی ref های مشترک data، error و status. بدانید کدام گزینه‌ها باید یکسان باشند، کدام می‌توانند فرق کنند و dedupe و کلیدهای واکنشی چه رفتاری دارند."
date: 2026-10-04
cover: /images/blog/2026-10-04-nuxt-async-data-shared-keys.svg
tags: [nuxt, pro-tip, data-fetching]
draft: true
---

در ۷۲ ساعت گذشته چیز مهمی منتشر نشد که قبلاً پوشش نداده باشیم، پس امروز یک نکتهٔ حرفه‌ای داریم. موضوعش چیزی است که در واکشی داده در Nuxt معمولاً وقتی اپلیکیشن بزرگ شد گریبان تیم‌ها را می‌گیرد: **کلید برچسب نیست، هویت است**. هر فراخوانی با همان کلید، همان تکه از state است.

همهٔ مطالب زیر با مستندات فعلی Nuxt 4 دربارهٔ [`useAsyncData`](https://nuxt.com/docs/4.x/api/composables/use-async-data) و [data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching) تطبیق داده شده است.

## اشتباه رایج

الگوی معمول: یک کلید مشترک `'users'` در چند کامپوننت استفاده می‌شود و هر نویسنده گزینه‌ها را کمی متفاوت و مطابق نیاز خودش تنظیم کرده است.

```ts
// components/UserTable.vue
const { data } = await useAsyncData(
  "users",
  () => $fetch("/api/users"),
  { deep: false },
);

// components/UserPicker.vue, written months later
const { data } = await useAsyncData(
  "users",
  () => $fetch("/api/users"),
  { deep: true, transform: (list) => list.map((u) => u.name) },
);
```

بی‌ضرر به نظر می‌رسد، اما نیست: طبق مستندات، چند فراخوانی با کلید یکسان [ref های `data`، `error`، `status` و `pending` را به اشتراک می‌گذارند](https://nuxt.com/docs/4.x/api/composables/use-async-data). فقط یک state وجود دارد و دو کامپوننت دربارهٔ شکل و میزان واکنش‌پذیری آن اختلاف دارند.

## چه چیزی باید یکسان باشد و چه چیزی می‌تواند فرق کند

مستندات گزینه‌ها را برای فراخوانی‌هایی که کلید مشترک دارند به دو گروه تقسیم می‌کند.

باید در همهٔ فراخوانی‌ها یکسان بمانند (ناهماهنگی یک هشدار در حالت توسعه ایجاد می‌کند):

- `handler`
- `deep`
- `transform`
- `pick`
- `getCachedData`
- `default`

مجاز به تفاوت:

- `server`
- `lazy`
- `immediate`
- `dedupe`
- `watch`

قاعدهٔ سرانگشتی که از این تقسیم‌بندی بیرون می‌آید: **گزینه‌هایی که تعیین می‌کنند داده چیست باید یکسان باشند؛ گزینه‌هایی که تعیین می‌کنند داده کِی واکشی شود می‌توانند فرق کنند.** پس گروه دوم جای امنی برای تنظیم اختصاصی هر کامپوننت است، مثلاً یک کامپوننت فوراً واکشی کند و دیگری به تعویق بیندازد:

```ts
// Allowed: different timing, same data contract
const { data } = await useAsyncData("users", fetchUsers, { immediate: true });
const { data: sameData, execute } = await useAsyncData("users", fetchUsers, {
  immediate: false,
});
```

## الگوی بهتر: یک composable به ازای هر کلید

چون گروه اول باید یکسان باشد، تمیزترین راه این است که کلید و قرارداد دادهٔ آن فقط یک بار تعریف شود و کامپوننت‌ها فقط گزینه‌های زمان‌بندی را تغییر دهند.

```ts
// app/composables/useUsers.ts
export function useUsers(
  options: { lazy?: boolean; immediate?: boolean } = {},
) {
  return useAsyncData("users", () => $fetch("/api/users"), {
    deep: false,
    ...options,
  });
}
```

```ts
// any component
const { data: users, status } = await useUsers();
const { data: users2 } = await useUsers({ lazy: true });
```

کامپوننتی که شکل مشتق‌شده می‌خواهد باید آن را با `computed` از `data` بسازد، نه با `transform` اختصاصی در هر فراخوانی:

```ts
const { data: users } = await useUsers();
const names = computed(() => users.value?.map((u) => u.name) ?? []);
```

به این ترتیب `transform` کلاً از قرارداد مشترک بیرون می‌ماند و مصرف‌کنندهٔ جدید نمی‌تواند ناهماهنگی ایجاد کند.

## کلیدهای خودکار و `useFetch`

همیشه کلید را خودتان انتخاب نمی‌کنید. راهنمای data fetching می‌گوید `useFetch` کلید را از URL، گزینه‌های fetch و محل فراخوانی می‌سازد، پس [دو فراخوانی کاملاً یکسان `useFetch` در کامپوننت‌های مختلف کلید متفاوت می‌گیرند](https://nuxt.com/docs/4.x/getting-started/data-fetching) و مستقل اجرا می‌شوند. همچنین وقتی اولین آرگومان `useAsyncData` خودِ handler باشد، کلید از محل فراخوانی در کد منبع ساخته می‌شود.

دو نتیجه:

- اگر *می‌خواهید* اشتراک‌گذاری باشد (یک درخواست، یک state)، در هر دو فراخوانی کلید صریح بدهید.
- اگر برای یک endpoint به ظاهر یکسان درخواست تکراری می‌بینید، پیش از رفتن سراغ لایه‌های کش بررسی کنید کلیدها واقعاً برابرند یا نه.

مستندات `useFetch(url)` را تقریباً معادل `useAsyncData(url, () => event.$fetch(url))` توصیف می‌کنند که برای اشکال‌زدایی تداخل کلیدها مدل ذهنی مفیدی است.

## کلیدهای واکنشی بهتر از watcher دستی‌اند

کلید می‌تواند ref، computed یا getter باشد و با تغییر کلید، داده دوباره واکشی می‌شود. این معمولاً از آرایهٔ `watch` تمیزتر است، چون کلید نام ورودی کش را هم تعیین می‌کند:

```ts
const userId = ref("123");

const { data: user } = await useAsyncData(
  computed(() => `user-${userId.value}`),
  () => fetchUser(userId.value),
);

userId.value = "456"; // triggers a refetch under the new key
```

گزینهٔ `watch` یک نکتهٔ مهم دارد که راهنما صریحاً می‌گوید: دیدن (watch) یک مقدار واکنشی [URL واکشی‌شده را عوض نمی‌کند](https://nuxt.com/docs/4.x/getting-started/data-fetching). اگر URL به state وابسته است، خود URL را واکنشی کنید (computed یا getter) و فقط به افزودن ref به `watch` اکتفا نکنید. با `watch: false` هم می‌توانید watch خودکار گزینه‌های واکنشی fetch را غیرفعال کنید.

## Dedupe و لغو درخواست

طبق [مرجع `useAsyncData`](https://nuxt.com/docs/4.x/api/composables/use-async-data)، گزینهٔ `dedupe` مقدار `'cancel'` یا `'defer'` می‌پذیرد و پیش‌فرضش `'cancel'` است. این گزینه تعیین می‌کند وقتی اجرای جدیدی در حین اجرای قبلی شروع می‌شود چه اتفاقی بیفتد. handler پارامترهای `(nuxtApp, { signal })` را دریافت می‌کند، پس می‌توانید signal لغو را عبور دهید تا لغو واقعاً انجام شود و فقط نتیجهٔ کهنه نادیده گرفته نشود:

```ts
const { data, refresh } = await useAsyncData(
  "search",
  (_nuxtApp, { signal }) => $fetch("/api/search", { query: { q: q.value }, signal }),
  { dedupe: "defer" },
);
```

`'cancel'` را برای جست‌وجوی حین تایپ انتخاب کنید که فقط آخرین نتیجه مهم است. `'defer'` را وقتی انتخاب کنید که فراخوانی دوم باید از درخواست در حال اجرا استفاده کند، مثلاً چند کامپوننت که برای یک کلید `refresh` صدا می‌زنند.

## موازنه‌ها و نکات احتیاطی

- **کلید مشترک کامپوننت‌ها را به هم گره می‌زند.** همین هدف است، اما یعنی تغییر در handler یا `transform` روی همهٔ مصرف‌کننده‌ها اثر می‌گذارد. متمرکز کردن در یک composable این وابستگی را صریح و قابل بازبینی می‌کند.
- **هشدارها فقط در حالت توسعه‌اند.** بررسی‌های سازگاری به صورت هشدار توسعه نمایش داده می‌شوند. نسخهٔ production به شما نمی‌گوید دو کامپوننت با هم اختلاف دارند.
- **handler ها را بدون اثر جانبی نگه دارید.** مرجع هشدار می‌دهد handler باید بدون اثر جانبی باشد تا SSR و hydration قابل پیش‌بینی بمانند و برای اثرهای جانبی `callOnce` را معرفی می‌کند. همچنین می‌گوید handler باید مقدار truthy برگرداند تا از تکرار در سمت کلاینت جلوگیری شود.
- **کش پیش‌فرض محدود است.** `getCachedData` پیش‌فرض هنگام hydration از payload و در غیر این صورت از دادهٔ static می‌خواند؛ طبق مرجع، این فقط وقتی کار می‌کند که `experimental.payloadExtraction` فعال باشد. کش کلاینت عمومی فرض نکنید. اگر آن را override کردید، یادتان باشد `getCachedData` در گروه «باید یکسان باشد» است.
- **پیش‌فرض shallow است.** `deep` به طور پیش‌فرض `false` است که طبق مستندات برای کارایی بهتر است. تغییر یک مصرف‌کننده به `deep: true` دقیقاً همان ناهماهنگی بالا است.
- **بازنشانی state.** `clear()` مقدار data و error را `undefined`، status را `idle` می‌کند و فراخوانی‌های در انتظار را لغو می‌کند، بی‌آنکه کلید را بدانید.

## چه زمانی الگوی اولیه مشکلی ندارد

کلیدهای یکتا و تک‌کاربره به هیچ‌یک از این‌ها نیاز ندارند. یک `useFetch` در سطح صفحه با کلید خودکار و بدون مصرف‌کنندهٔ دوم چیزی برای هماهنگی ندارد. این توصیه از لحظه‌ای مهم می‌شود که کلید از مرز یک کامپوننت عبور کند: از آن لحظه کلید state مشترک است و گزینه‌هایش یک API.

## منابع

- [useAsyncData reference, Nuxt 4 docs](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [Data fetching guide, Nuxt 4 docs](https://nuxt.com/docs/4.x/getting-started/data-fetching)
