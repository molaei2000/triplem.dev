<script setup lang="ts">
const { t } = useI18n();
const fmt = useBlogFormat();
const { data: posts } = await useBlogPosts();

useSeoMeta({
    title: () => t("blog.title"),
    description: () => t("blog.metaDescription"),
    ogTitle: () => t("blog.title"),
    ogDescription: () => t("blog.metaDescription"),
    ogType: "website",
});

const featured = computed(() => posts.value[0]);

// Client-side search + topic filter over the (small) list.
const q = ref("");
const tag = ref<string | null>(null);
const tags = computed(() => [...new Set(posts.value.flatMap(p => p.tags ?? []))]);
const needle = computed(() => q.value.trim().toLocaleLowerCase());
const list = computed(() => posts.value.filter(p =>
    (!tag.value || p.tags?.includes(tag.value))
    && (!needle.value || `${p.title} ${p.description ?? ""} ${(p.tags ?? []).join(" ")}`.toLocaleLowerCase().includes(needle.value)),
));
function clear() {
    q.value = "";
    tag.value = null;
}
</script>

<template>
    <div>
        <section class="shell pt-32 md:pt-44">
            <SiteSectionHeader :label="t('blog.indexLabel')" :caption="t('blog.caption')" coord="p · 02" />
            <div class="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
                <h1 class="text-outline -ms-2 font-display text-[9.5rem] leading-[0.8] font-semibold tracking-[-0.06em] md:-ms-[112px] md:text-[20rem]">
                    {{ t("blog.title") }}
                </h1>
                <p class="max-w-[380px] text-[17px] leading-relaxed text-subtle md:mb-3 md:text-lg">{{ t("blog.pageIntro") }}</p>
            </div>
        </section>

        <section v-if="featured" class="shell pt-16 md:pt-24">
            <SiteReveal>
                <NuxtLink
                    :to="featured.path"
                    class="group grid-12 gap-y-6 rounded-lg border border-gold-line bg-surface p-6 no-underline transition-colors hover:bg-elevated md:p-12"
                >
                    <div class="col-span-4 flex flex-col gap-5 md:col-span-7">
                        <span class="eyebrow text-gold">{{ t("blog.latest") }} · {{ fmt.date(featured.date) }}</span>
                        <span class="font-display text-[2.5rem] leading-[0.95] font-semibold tracking-[-0.045em] text-balance md:text-[4rem]">{{ featured.title }}</span>
                    </div>
                    <div class="col-span-4 flex flex-col justify-between gap-6 md:col-span-4 md:col-start-9">
                        <p v-if="featured.description" class="text-[17px] leading-relaxed text-subtle md:text-lg">{{ featured.description }}</p>
                        <span class="flex items-center justify-between gap-4">
                            <span class="eyebrow text-subtle">{{ [...(featured.tags ?? []), fmt.read(featured.minutes)].join(" · ") }}</span>
                            <span class="shrink-0 text-[15px] text-gold">
                                {{ t("blog.readPost") }}
                                <span aria-hidden="true" class="inline-block transition-transform duration-500 ease-out-expo group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">→</span>
                            </span>
                        </span>
                    </div>
                </NuxtLink>
            </SiteReveal>
        </section>

        <section class="shell pt-24 pb-32 md:pt-32 md:pb-40" aria-labelledby="all-posts">
            <SiteSectionHeader :label="t('blog.all')" :caption="t('blog.allHint')" :coord="t('blog.count', { n: fmt.num(list.length), total: fmt.num(posts.length) })" />
            <h2 id="all-posts" class="sr-only">{{ t("blog.all") }}</h2>

            <div v-if="posts.length" class="mt-8 grid-12 items-center gap-y-4">
                <div class="relative col-span-4 md:col-span-4">
                    <label for="blog-search" class="sr-only">{{ t("blog.search") }}</label>
                    <input
                        id="blog-search"
                        v-model="q"
                        type="search"
                        :placeholder="t('blog.searchPlaceholder')"
                        class="h-12 w-full rounded-lg border border-hairline-strong bg-transparent ps-11 pe-4 text-[15px] transition-colors placeholder:text-faint focus:border-gold-line focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                    >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" class="pointer-events-none absolute start-4 top-[15px] text-subtle">
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4" />
                        <path d="M12.5 12.5L16 16" stroke="currentColor" stroke-width="1.4" />
                    </svg>
                </div>
                <div v-if="tags.length > 1" role="group" :aria-label="t('blog.filter')" class="col-span-4 flex flex-wrap gap-2 md:col-span-8 md:justify-end">
                    <button
                        v-for="x in [null, ...tags]"
                        :key="x ?? '*'"
                        type="button"
                        :aria-pressed="tag === x"
                        class="eyebrow rounded-full border border-hairline-strong px-3.5 py-2 text-subtle transition-colors hover:text-foreground aria-pressed:border-gold-line aria-pressed:bg-gold-soft aria-pressed:text-gold"
                        @click="tag = x"
                    >
                        {{ x ?? t("blog.allTags") }}
                    </button>
                </div>
            </div>

            <ol v-if="list.length" class="mt-10 border-b border-hairline" aria-live="polite">
                <li v-for="(p, i) in list" :key="p.path">
                    <BlogRow :post="p" :index="i" full />
                </li>
            </ol>
            <div v-else-if="posts.length" class="flex flex-col items-start gap-4 py-16">
                <span class="font-display text-[2rem] font-medium">{{ t("blog.empty") }}</span>
                <button type="button" class="gold-link text-[15px]" @click="clear">{{ t("blog.clear") }}</button>
            </div>
            <p v-else class="mt-10 border-y border-hairline py-10 font-display text-2xl text-subtle">{{ t("blog.none") }}</p>
        </section>
    </div>
</template>
