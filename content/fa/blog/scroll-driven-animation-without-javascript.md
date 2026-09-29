---
title: انیمیشن وابسته به اسکرول، بدون جاوااسکریپت
description: خط طلایی بخش تجربه در این سایت چطور با animation-timeline خودش را رسم می‌کند و در مرورگرهایی که پشتیبانی نمی‌کنند چه اتفاقی می‌افتد.
date: 2026-07-18
tags: [CSS, حرکت]
draft: true
---

خط طلایی کنار فصل‌های تجربه، با اسکرول شما رسم می‌شود. پشت آن نه شنونده اسکرولی هست و نه کتابخانه انیمیشنی؛ فقط CSS.

## کل افکت

```css [timeline.css]
@supports (animation-timeline: view()) {
  .draw {
    animation: draw linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 60%;
  }

  @keyframes draw {
    from { transform: scaleY(0); }
    to { transform: scaleY(1); }
  }
}

@media (prefers-reduced-motion: reduce) {
  .draw { animation: none; transform: none; }
}
```

`animation-timeline: view()` به‌جای زمان، موقعیت عنصر در viewport را مبنا قرار می‌دهد. `animation-range` تعیین می‌کند انیمیشن کی شروع و کی تمام شود: از لحظه‌ای که ۱۰٪ خط وارد دید شده تا وقتی ۶۰٪ آن را پوشانده است.

## چرا خوب عقب‌نشینی می‌کند

مرورگرهایی که scroll timeline ندارند بلوک `@supports` را نادیده می‌گیرند و خط را کامل نشان می‌دهند. هیچ‌کس حالت خراب نمی‌بیند و هیچ‌کس کدی برای افکتی که نمی‌بیند دانلود نمی‌کند.

چون انیمیشن فقط `transform` را تغییر می‌دهد، می‌تواند خارج از thread اصلی اجرا شود و صفحه شلوغ آن را کند نمی‌کند.

## به خواننده احترام بگذار

کوئری reduced-motion افکت را کاملاً خاموش می‌کند. حرکت باید ساختار را توضیح دهد؛ وقتی خواننده حرکت کمتری خواسته، ساختار بدون آن هم سر جایش است.
