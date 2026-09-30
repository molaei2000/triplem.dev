<script setup lang="ts">
/** Author line and share links for a post. */
const props = defineProps<{ url: string; title: string }>();
const { t } = useI18n();

const share = computed(() => {
    const u = encodeURIComponent(props.url);
    const title = encodeURIComponent(props.title);
    return [
        { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
        { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${title}` },
        { label: "X", href: `https://x.com/intent/post?url=${u}&text=${title}` },
    ];
});
</script>

<template>
    <aside class="flex flex-col gap-8">
        <div class="flex flex-col gap-3">
            <span class="eyebrow text-faint">{{ t("blog.writtenBy") }}</span>
            <span class="flex items-center gap-2.5 text-[15px]">
                <SiteMark :size="16" />{{ t("hero.name") }}
            </span>
        </div>
        <div class="flex flex-col items-start gap-2">
            <span class="eyebrow mb-1 text-faint">{{ t("blog.share") }}</span>
            <UiButton v-for="s in share" :key="s.label" as-child variant="quiet" size="inline">
                <NuxtLink :to="s.href" target="_blank"
                    >{{ s.label }} <SiteArrow direction="external"
                /></NuxtLink>
            </UiButton>
            <SiteCopyButton
                :value="url"
                :label="t('blog.copyLink')"
                :copied-label="t('blog.copied')"
                variant="quiet"
                size="inline"
            />
        </div>
    </aside>
</template>
