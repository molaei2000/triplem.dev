---
title: وقتی بک‌اند صفحه را می‌چیند
description: یک رجیستری کوچک و تایپ‌شده از بلوک‌ها که صفحه‌ها را از داده‌های بک‌اند رندر می‌کند، بدون اینکه فرانت‌اند به یک موتور قالب تبدیل شود.
date: 2026-08-24
tags: [معماری, Next.js]
draft: true
---

صفحه‌های معرفی هر هفته عوض می‌شوند؛ دیپلوی نباید هر هفته لازم باشد. یک صفحه‌ساز به بک‌اند اجازه می‌دهد تصمیم بگیرد صفحه *چه* بلوک‌هایی و با چه ترتیبی داشته باشد، در حالی که فرانت‌اند همچنان تصمیم می‌گیرد هر بلوک *چطور* دیده شود و رفتار کند.

## بلوک‌ها داده‌اند

هر بلوک یک شیء ساده است با یک `type` و فیلدهایی که لازم دارد. یک discriminated union همه آن‌ها را توصیف می‌کند و اعتبارسنجی فقط یک بار، در لبه ورود داده، انجام می‌شود.

```tsx [blocks.tsx]
const Block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hero"), title: z.string(), cta: z.string().optional() }),
  z.object({ type: z.literal("faq"), items: z.array(z.object({ q: z.string(), a: z.string() })) }),
]);
type Block = z.infer<typeof Block>;

const registry: { [K in Block["type"]]: ComponentType<Extract<Block, { type: K }>> } = {
  hero: HeroBlock,
  faq: FaqBlock,
};

export function Blocks({ blocks }: { blocks: unknown[] }) {
  return blocks.map((raw, i) => {
    const block = Block.safeParse(raw);
    if (!block.success) return null; // unknown or broken: skip it, log it, keep rendering
    const Component = registry[block.data.type] as ComponentType<Block>;
    return <Component key={i} {...block.data} />;
  });
}
```

## بی‌صدا شکست نخور، با صدا گزارش بده

نوع بلوک جدیدی که بک‌اند زودتر از فرانت‌اند منتشر کند نباید کل صفحه را از کار بیندازد. بلوک ناشناخته چیزی رندر نمی‌کند و خودش را گزارش می‌دهد؛ صفحه فقط یک بخش کم دارد، نه اینکه به صفحه خطا برسد.

## رجیستری را ساده نگه دار

رجیستری یک نگاشت است، نه یک فریم‌ورک. اضافه کردن بلوک سه قدم دارد: یک اسکیما، یک کامپوننت و یک خط در نگاشت. اگر از این بیشتر شد، طراحی دارد یک نوع صفحه جدید می‌خواهد، نه یک صفحه‌ساز باهوش‌تر.
