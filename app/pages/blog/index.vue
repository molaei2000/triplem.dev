<script setup lang="ts">
const { t } = useI18n();
const fmt = useBlogFormat();
const { data: posts } = await useBlogPosts();
const { query, tag, tags, results, clear } = useBlogFilter(posts);
const featured = computed(() => posts.value[0]);

useSeoMeta({
    title: () => t("blog.title"),
    description: () => t("blog.metaDescription"),
    ogTitle: () => t("blog.title"),
    ogDescription: () => t("blog.metaDescription"),
    ogType: "website",
});
</script>

<template>
    <div>
        <section class="shell pt-32 md:pt-44">
            <SiteSectionHeader :label="t('blog.indexLabel')" :caption="t('blog.caption')" coord="p · 02" />
            <div class="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
                <SiteOutlineTitle as="h1">{{ t("blog.title") }}</SiteOutlineTitle>
                <p class="max-w-[380px] text-[17px] leading-relaxed text-subtle md:mb-3 md:text-lg">{{ t("blog.pageIntro") }}</p>
            </div>
        </section>

        <section v-if="featured" class="shell pt-16 md:pt-24">
            <SiteReveal>
                <BlogFeatured :post="featured" />
            </SiteReveal>
        </section>

        <section class="shell pt-24 pb-32 md:pt-32 md:pb-40" aria-labelledby="all-posts">
            <SiteSectionHeader
                :label="t('blog.all')"
                :caption="t('blog.allHint')"
                :coord="t('blog.count', { n: fmt.num(results.length), total: fmt.num(posts.length) })"
            />
            <h2 id="all-posts" class="sr-only">{{ t("blog.all") }}</h2>

            <BlogFilters v-if="posts.length" v-model:query="query" v-model:tag="tag" :tags="tags" class="mt-8" />

            <BlogList v-if="results.length" :posts="results" full class="mt-10" aria-live="polite" />
            <div v-else-if="posts.length" class="flex flex-col items-start gap-4 py-16">
                <span class="font-display text-[2rem] font-medium">{{ t("blog.empty") }}</span>
                <UiButton variant="link" size="inline" @click="clear">{{ t("blog.clear") }}</UiButton>
            </div>
            <BlogEmpty v-else class="mt-10">{{ t("blog.none") }}</BlogEmpty>
        </section>
    </div>
</template>
