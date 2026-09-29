<script setup lang="ts">
const { t } = useI18n();
const { data: posts } = await useBlogPosts(4);
</script>

<template>
    <section id="blog" class="shell scroll-mt-24 pb-32 md:pb-40" aria-labelledby="blog-title">
        <SiteSectionHeader :label="t('blog.label')" :caption="t('blog.caption')" coord="y · 7400" />

        <div class="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
            <h2
                id="blog-title"
                class="text-outline -ms-2 font-display text-[9.5rem] leading-[0.8] font-semibold tracking-[-0.06em] md:-ms-[112px] md:text-[20rem]"
            >{{ t("blog.title") }}</h2>
            <div class="flex max-w-[360px] flex-col gap-4 md:mb-3">
                <p class="text-[17px] leading-relaxed text-subtle">{{ t("blog.intro") }}</p>
                <NuxtLinkLocale to="/blog" class="gold-link self-start text-[15px]">
                    {{ t("blog.seeAll") }} <span aria-hidden="true" class="inline-block rtl:-scale-x-100">→</span>
                </NuxtLinkLocale>
            </div>
        </div>

        <ol v-if="posts.length" class="mt-10 border-b border-hairline md:mt-18">
            <li v-for="(p, i) in posts" :key="p.path">
                <BlogRow :post="p" :index="i" />
            </li>
        </ol>
        <p v-else class="mt-10 border-y border-hairline py-10 font-display text-2xl text-subtle md:mt-18">{{ t("blog.none") }}</p>
    </section>
</template>
