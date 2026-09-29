---
title: وضعیت سرور، وضعیت کلاینت نیست
description: چرا یک اپلیکیشن پر از داده ساده‌تر می‌شود وقتی TanStack Query مالک دانسته‌های سرور باشد و Redux Toolkit فقط مالک تصمیم‌های مرورگر.
date: 2026-09-12
tags: [معماری, React]
draft: true
---

بیشتر باگ‌های state که رفع کرده‌ام، باگ منطقی نبودند؛ باگ مالکیت بودند. دو جای مختلف فکر می‌کردند مالک یک داده‌اند و با هم اختلاف داشتند.

## دو نوع state

وضعیت سرور جای دیگری زندگی می‌کند. شما یک نسخه از آن را قرض می‌گیرید، کهنه می‌شود، کس دیگری می‌تواند تغییرش دهد و برای درست نگه داشتنش به کش، حذف درخواست‌های تکراری و به‌روزرسانی در پس‌زمینه نیاز دارید.

وضعیت کلاینت برعکس است. منبع حقیقت خود مرورگر است: یک پنجره باز، فرمی که نیمه‌کاره مانده، یا مرحله‌ای که در فرایند رزرو در آن هستید. نگه داشتن هر دو در یک store سراسری یعنی ساختن دستی یک کش؛ و معمولاً بد.

## برای هر کدام یک مالک

در یک پلتفرم مشاوره حقوقی که روی آن کار کردم، TanStack Query مالک هر چیزی بود که از API می‌آمد و Redux Toolkit فقط چیزهایی را نگه می‌داشت که خود رابط کاربری درباره‌شان تصمیم می‌گرفت.

```ts [booking.ts]
// Server state: cached, deduplicated, refetched in the background.
export function useLawyer(id: string) {
  return useQuery({
    queryKey: ["lawyer", id],
    queryFn: () => api.lawyers.get(id),
    staleTime: 60_000,
  });
}

// Client state: only what the browser decides.
const booking = createSlice({
  name: "booking",
  initialState: { step: "time" as Step, slotId: null as string | null },
  reducers: {
    pickSlot(state, action: PayloadAction<string>) {
      state.slotId = action.payload;
      state.step = "payment";
    },
  },
});
```

این slice هیچ‌وقت وکیل، قیمت یا فهرست زمان‌های خالی را ذخیره نمی‌کند. فقط یک شناسه و یک مرحله نگه می‌دارد؛ بقیه هر وقت لازم شد از کش query خوانده می‌شود.

## یک آزمون ساده

برای هر تکه از state یک سؤال بپرسید: *به‌جز ما، چه کسی می‌تواند این را تغییر دهد؟* اگر جواب «سرور» است، جایش در store نیست.

> storeها تصمیم‌ها را نگه می‌دارند. queryها واقعیت‌ها را.
