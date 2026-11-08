<script setup lang="ts">
/**
 * Page links under the blog index. Every page is a real `<a href="?page=N">` (reka-ui's
 * parts render `as-child`), so crawlers and middle-clicks reach older posts; the route is
 * the source of truth for the current page. Below `sm` the numbers collapse into a
 * "Page 2 of 4" readout between the arrows.
 *
 * vue-router ignores the query when it matches links, so it marks every page link as the
 * current page; the arrows clear that `aria-current` (reka-ui sets it right on the numbers).
 */
import type { RouteLocationRaw } from "vue-router";

const props = defineProps<{
    page: number;
    total: number;
    perPage: number;
    pageRoute: (n: number) => RouteLocationRaw;
}>();
/** `turn`: the visitor followed a page link (not a modified click that opens a new tab). */
const emit = defineEmits<{ turn: [] }>();
const { t } = useI18n();
const fmt = useBlogFormat();
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)));

function onClick(event: MouseEvent) {
    const link = (event.target as Element).closest("a[href]");
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (link && !modified && event.button === 0) emit("turn");
}
</script>

<template>
    <UiPagination
        :page="page"
        :total="total"
        :items-per-page="perPage"
        :sibling-count="1"
        show-edges
        :aria-label="t('blog.pagination.label')"
        @click="onClick"
    >
        <UiPaginationContent v-slot="{ items }" class="w-full justify-between gap-4">
            <UiPaginationPrevious
                v-if="page > 1"
                as="a"
                as-child
                size="label"
                :aria-label="t('blog.pagination.newerPosts')"
            >
                <NuxtLink :to="pageRoute(page - 1)" rel="prev" :aria-current="undefined">
                    <SiteArrow direction="back" />
                    <span class="hidden sm:inline">{{ t("blog.pagination.newer") }}</span>
                </NuxtLink>
            </UiPaginationPrevious>
            <UiPaginationPrevious v-else size="label" :aria-label="t('blog.pagination.newerPosts')">
                <SiteArrow direction="back" />
                <span class="hidden sm:inline">{{ t("blog.pagination.newer") }}</span>
            </UiPaginationPrevious>

            <div class="hidden items-center gap-1 sm:flex">
                <template v-for="(item, i) in items" :key="i">
                    <UiPaginationItem
                        v-if="item.type === 'page'"
                        :value="item.value"
                        :is-active="item.value === page"
                        as="a"
                        as-child
                        :aria-label="t('blog.pagination.page', { n: fmt.num(item.value) })"
                    >
                        <NuxtLink :to="pageRoute(item.value)">{{ fmt.num(item.value) }}</NuxtLink>
                    </UiPaginationItem>
                    <UiPaginationEllipsis v-else :index="i">
                        <span aria-hidden="true">…</span>
                        <span class="sr-only">{{ t("blog.pagination.more") }}</span>
                    </UiPaginationEllipsis>
                </template>
            </div>
            <span class="eyebrow text-subtle sm:hidden">{{
                t("blog.pagination.status", { n: fmt.num(page), total: fmt.num(pages) })
            }}</span>

            <UiPaginationNext
                v-if="page < pages"
                as="a"
                as-child
                size="label"
                :aria-label="t('blog.pagination.olderPosts')"
            >
                <NuxtLink :to="pageRoute(page + 1)" rel="next" :aria-current="undefined">
                    <span class="hidden sm:inline">{{ t("blog.pagination.older") }}</span>
                    <SiteArrow />
                </NuxtLink>
            </UiPaginationNext>
            <UiPaginationNext v-else size="label" :aria-label="t('blog.pagination.olderPosts')">
                <span class="hidden sm:inline">{{ t("blog.pagination.older") }}</span>
                <SiteArrow />
            </UiPaginationNext>
        </UiPaginationContent>
    </UiPagination>
</template>
