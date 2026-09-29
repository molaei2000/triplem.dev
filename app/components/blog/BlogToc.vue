<script setup lang="ts">
/** "On this page": h2s with their h3s indented, the heading in view, and reading progress. The parent sets display (`hidden md:flex`). */
import type { TocItem } from "~/composables/useArticleScroll";

defineProps<{ items: TocItem[]; active?: string; progress: number }>();
const { t } = useI18n();
const fmt = useBlogFormat();
</script>

<template>
    <nav :aria-label="t('blog.toc')" class="flex-col">
        <span class="eyebrow mb-2.5 text-faint">{{ t("blog.toc") }}</span>
        <a
            v-for="h in items"
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
</template>
