<script setup lang="ts">
import meta from "~/app.meta";

const route = useRoute();
const { t, locale } = useI18n();
const fmt = useBlogFormat();
const collection = useBlogCollection();

const { data: post } = await useAsyncData(
    () => `blog-post:${route.path}`,
    () => queryCollection(collection.value).path(route.path).first(),
);
if (!post.value || (post.value.draft && !showDrafts)) {
    throw createError({ statusCode: 404, statusMessage: "Post not found", fatal: true });
}

// Neighbours in the same (date-descending) order as the index: [newer, older].
const { data: around } = await useAsyncData(
    () => `blog-around:${route.path}`,
    () => {
        const query = queryCollectionItemSurroundings(collection.value, route.path, { fields: ["title", "description"] })
            .order("date", "DESC");
        if (!showDrafts) query.where("draft", "=", false);
        return query;
    },
);
const newer = computed(() => around.value?.[0] ?? null);
const older = computed(() => around.value?.[1] ?? null);

const url = computed(() => `${meta.siteUrl}${route.path}`);
const published = computed(() => new Date(post.value!.date).toISOString());

useSeoMeta({
    title: () => post.value!.title,
    description: () => post.value!.description,
    ogTitle: () => post.value!.title,
    ogDescription: () => post.value!.description,
    ogType: "article",
    ogUrl: () => url.value,
    articlePublishedTime: () => published.value,
    articleAuthor: [meta.author.name],
    articleTag: () => post.value!.tags,
});
useHead(() => ({
    script: [{
        type: "application/ld+json",
        innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.value!.title,
            "description": post.value!.description,
            "datePublished": published.value,
            "inLanguage": locale.value === "fa" ? "fa-IR" : "en-US",
            "keywords": post.value!.tags.join(", "),
            "mainEntityOfPage": url.value,
            "author": { "@type": "Person", "name": meta.author.name, "url": meta.siteUrl },
        }),
    }],
}));

// "On this page": h2s with their h3s, flattened.
const toc = computed(() => (post.value?.body?.toc?.links ?? []).flatMap(l => [
    { id: l.id, text: l.text, sub: false },
    ...(l.children ?? []).map(c => ({ id: c.id, text: c.text, sub: true })),
]));

// Reading progress + the heading currently in view.
const article = ref<HTMLElement>();
const { top, height } = useElementBounding(article);
const { height: vh } = useWindowSize();
const progress = computed(() => {
    if (!height.value) return 0;
    const p = (vh.value * 0.4 - top.value) / height.value;
    return Math.round(Math.min(1, Math.max(0, p)) * 100);
});

// Active = the last heading that has scrolled past the top 30% of the viewport.
const headings = shallowRef<HTMLElement[]>([]);
onMounted(() => {
    headings.value = [...(article.value?.querySelectorAll<HTMLElement>("h2[id], h3[id]") ?? [])];
});
const { y } = useWindowScroll();
const active = computed(() => {
    void y.value;
    let id = headings.value[0]?.id;
    for (const h of headings.value) {
        if (h.getBoundingClientRect().top > vh.value * 0.3) break;
        id = h.id;
    }
    return id;
});

const share = computed(() => {
    const u = encodeURIComponent(url.value);
    const title = encodeURIComponent(post.value!.title);
    return [
        { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
        { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${title}` },
        { label: "X", href: `https://x.com/intent/post?url=${u}&text=${title}` },
    ];
});
const { copy, copied } = useClipboard({ legacy: true, copiedDuring: 1600 });
</script>

<template>
    <div v-if="post">
        <header class="shell grid-12 pt-32 md:pt-[200px]">
            <div class="col-span-4 flex items-center gap-4 md:col-span-9 md:col-start-4">
                <NuxtLinkLocale to="/blog" class="eyebrow text-subtle no-underline hover:text-gold">
                    <span aria-hidden="true" class="inline-block rtl:-scale-x-100">←</span> {{ t("blog.back") }}
                </NuxtLinkLocale>
                <span aria-hidden="true" class="eyebrow text-faint">/</span>
                <span class="eyebrow text-gold">{{ post.tags[0] }}</span>
                <span v-if="post.draft" class="eyebrow rounded border border-gold-line px-2 py-1 text-gold">{{ t("blog.draft") }}</span>
            </div>
            <h1 class="col-span-4 mt-8 font-display text-[2.75rem] leading-[0.95] font-semibold tracking-[-0.045em] text-balance md:col-span-8 md:col-start-4 md:mt-10 md:text-[5.5rem] md:leading-[0.92] md:tracking-[-0.05em]">
                {{ post.title }}
            </h1>
            <div class="col-span-4 mt-8 flex flex-wrap items-center gap-x-10 gap-y-3 border-y border-hairline py-4.5 text-[15px] text-subtle md:col-span-9 md:col-start-4 md:mt-12">
                <time :datetime="published">{{ fmt.date(post.date, true) }}</time>
                <span>{{ fmt.read(post.minutes) }}</span>
                <span class="flex flex-wrap gap-2">
                    <span v-for="x in post.tags" :key="x" class="eyebrow rounded border border-hairline-strong px-2.5 py-1.5">{{ x }}</span>
                </span>
            </div>
        </header>

        <div class="shell grid-12 items-start gap-y-14 pt-14 pb-24 md:pt-20 md:pb-32">
            <nav v-if="toc.length" :aria-label="t('blog.toc')" class="sticky top-28 hidden flex-col md:col-span-2 md:flex">
                <span class="eyebrow mb-2.5 text-faint">{{ t("blog.toc") }}</span>
                <a
                    v-for="h in toc"
                    :key="h.id"
                    :href="`#${h.id}`"
                    class="flex gap-2.5 py-[7px] text-sm leading-snug no-underline transition-colors hover:text-foreground"
                    :class="[active === h.id ? 'text-foreground' : 'text-subtle', h.sub && 'ps-4']"
                    :aria-current="active === h.id ? 'location' : undefined"
                >
                    <span v-if="active === h.id" aria-hidden="true" class="mt-[0.65em] h-px w-3 shrink-0 bg-gold" />
                    {{ h.text }}
                </a>
                <div aria-hidden="true" class="mt-5 h-0.5 bg-hairline">
                    <div class="h-0.5 origin-left bg-gold transition-transform duration-200 rtl:origin-right" :style="{ transform: `scaleX(${progress / 100})` }" />
                </div>
                <span class="eyebrow mt-2.5 text-faint">{{ t("blog.progress", { n: fmt.num(progress) }) }}</span>
            </nav>

            <article ref="article" class="col-span-4 min-w-0 md:col-span-6 md:col-start-4">
                <ContentRenderer :value="post" class="prose-tm" />
            </article>

            <aside class="col-span-4 flex flex-col gap-8 border-t border-hairline pt-8 md:sticky md:top-28 md:col-span-2 md:col-start-11 md:border-0 md:pt-0">
                <div class="flex flex-col gap-3">
                    <span class="eyebrow text-faint">{{ t("blog.writtenBy") }}</span>
                    <span class="flex items-center gap-2.5 text-[15px]">
                        <SiteMark :size="16" />{{ t("hero.name") }}
                    </span>
                </div>
                <div class="flex flex-col items-start gap-2">
                    <span class="eyebrow mb-1 text-faint">{{ t("blog.share") }}</span>
                    <a
                        v-for="s in share"
                        :key="s.label"
                        :href="s.href"
                        target="_blank"
                        rel="noopener"
                        class="text-[15px] text-subtle no-underline hover:text-gold"
                    >{{ s.label }} <span aria-hidden="true">↗</span></a>
                    <button type="button" class="text-[15px] text-subtle hover:text-gold" @click="copy(url)">
                        {{ copied ? t("blog.copied") : t("blog.copyLink") }}
                    </button>
                </div>
            </aside>
        </div>

        <footer v-if="newer || older" class="shell grid-12 gap-y-4 border-t border-hairline pt-10 pb-32 md:pb-40">
            <NuxtLink
                v-if="older"
                :to="older.path"
                class="group col-span-4 flex flex-col gap-3 no-underline md:col-span-6"
            >
                <span class="eyebrow text-faint">{{ t("blog.older") }}</span>
                <span class="flex items-baseline gap-4 font-display text-2xl leading-tight font-medium tracking-[-0.02em] md:text-[2.5rem]">
                    {{ older.title }}
                    <span aria-hidden="true" class="text-gold transition-transform duration-500 ease-out-expo group-hover:translate-x-1.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-1.5">→</span>
                </span>
            </NuxtLink>
            <NuxtLink
                v-if="newer"
                :to="newer.path"
                class="group col-span-4 flex flex-col gap-3 no-underline md:col-span-5 md:col-start-8 md:items-end md:text-end"
            >
                <span class="eyebrow text-faint">{{ t("blog.newer") }}</span>
                <span class="font-display text-xl leading-tight font-medium tracking-[-0.02em] text-subtle transition-colors group-hover:text-foreground md:text-[1.75rem]">{{ newer.title }}</span>
            </NuxtLink>
        </footer>
    </div>
</template>
