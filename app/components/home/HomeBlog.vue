<script setup lang="ts">
const { t } = useI18n();
const { data: posts } = await useBlogPosts(4);
</script>

<template>
    <SiteSection id="blog" :label="t('blog.label')" :caption="t('blog.caption')" coord="y · 7400">
        <template #default="{ titleId }">
            <div class="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
                <SiteOutlineTitle :id="titleId">{{ t("blog.title") }}</SiteOutlineTitle>
                <div class="flex max-w-[360px] flex-col gap-4 md:mb-3">
                    <p class="text-[17px] leading-relaxed text-subtle">{{ t("blog.intro") }}</p>
                    <UiButton as-child variant="link" size="inline" class="self-start">
                        <NuxtLinkLocale to="/blog">{{ t("blog.seeAll") }} <SiteArrow /></NuxtLinkLocale>
                    </UiButton>
                </div>
            </div>

            <BlogList v-if="posts.length" :posts="posts" class="mt-10 md:mt-18" />
            <BlogEmpty v-else class="mt-10 md:mt-18">{{ t("blog.none") }}</BlogEmpty>
        </template>
    </SiteSection>
</template>
