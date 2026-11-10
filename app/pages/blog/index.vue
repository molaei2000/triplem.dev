<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const fmt = useBlogFormat();
const { data: posts } = await useBlogPosts();
const { query, tag, tags, results, clear } = useBlogFilter(posts);
const { page, pages, start, items, size, pageRoute } = useBlogPagination(results);
const featured = computed(() => posts.value[0]);

const count = computed(() =>
    pages.value > 1
        ? t("blog.countRange", {
              from: fmt.num(start.value + 1),
              to: fmt.num(start.value + items.value.length),
              total: fmt.num(results.value.length),
          })
        : t("blog.count", { n: fmt.num(results.value.length), total: fmt.num(posts.value.length) }),
);

// A new search or topic starts again from the first page.
watch([query, tag], () => {
    if (route.query.page) navigateTo(pageRoute(1), { replace: true });
});

// Turning the page from the links under the list brings the new page into view and moves
// focus to the list heading, so keyboard and screen-reader users start at its first post.
const section = useTemplateRef("section");
const heading = useTemplateRef("heading");
const motion = usePreferredReducedMotion();
let turning = false;
function onTurn() {
    turning = true;
}
watch(
    page,
    () => {
        if (!turning) return;
        turning = false;
        if (section.value && section.value.getBoundingClientRect().top < 0) {
            section.value.scrollIntoView({
                behavior: motion.value === "reduce" ? "instant" : "smooth",
            });
        }
        heading.value?.focus({ preventScroll: true });
    },
    { flush: "post" },
);

const title = computed(() =>
    page.value > 1
        ? t("blog.pagination.title", { title: t("blog.title"), n: fmt.num(page.value) })
        : t("blog.title"),
);

useSeoMeta({
    title: () => title.value,
    description: () => t("blog.metaDescription"),
    ogTitle: () => title.value,
    ogDescription: () => t("blog.metaDescription"),
    ogType: "website",
});
useSchemaOrg([defineWebPage({ "@type": "CollectionPage" })]);
</script>

<template>
    <div>
        <section class="shell pt-20 md:pt-28">
            <SiteSectionHeader
                :label="t('blog.indexLabel')"
                :caption="t('blog.caption')"
                coord="p · 02"
            />
            <div
                class="mt-4 flex flex-col gap-6 md:mt-0 md:flex-row md:items-end md:justify-between"
            >
                <SiteOutlineTitle as="h1">{{ t("blog.title") }}</SiteOutlineTitle>
                <p class="max-w-[380px] text-[17px] leading-relaxed text-subtle md:mb-3 md:text-lg">
                    {{ t("blog.pageIntro") }}
                </p>
            </div>
        </section>

        <section v-if="featured" class="shell pt-16 md:pt-20">
            <!-- On screen at load and the largest thing on it: enters without waiting for JS. -->
            <SiteReveal immediate>
                <BlogFeatured :post="featured" />
            </SiteReveal>
        </section>

        <section
            ref="section"
            class="shell pt-24 pb-32 md:pt-32 md:pb-40"
            aria-labelledby="all-posts"
        >
            <SiteSectionHeader :label="t('blog.all')" :caption="t('blog.allHint')" :coord="count" />
            <h2 id="all-posts" ref="heading" tabindex="-1" class="sr-only">{{ t("blog.all") }}</h2>

            <BlogFilters
                v-if="posts.length"
                v-model:query="query"
                v-model:tag="tag"
                :tags="tags"
                class="mt-8"
            />

            <template v-if="results.length">
                <BlogList :posts="items" :start="start" full class="mt-10" aria-live="polite" />
                <BlogPagination
                    v-if="pages > 1"
                    :page="page"
                    :total="results.length"
                    :per-page="size"
                    :page-route="pageRoute"
                    class="mt-8"
                    @turn="onTurn"
                />
            </template>
            <div v-else-if="posts.length" class="flex flex-col items-start gap-4 py-16">
                <span class="font-display text-[2rem] font-medium">{{ t("blog.empty") }}</span>
                <UiButton variant="link" size="inline" @click="clear">{{
                    t("blog.clear")
                }}</UiButton>
            </div>
            <BlogEmpty v-else class="mt-10">{{ t("blog.none") }}</BlogEmpty>
        </section>
    </div>
</template>
