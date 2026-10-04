<script setup lang="ts">
/**
 * A post's cover art (rules in .github/blog-cover.md). Covers are drawn in the dark palette and
 * `scripts/blog-cover.mjs` derives a light twin, so this shows the file for the current theme.
 * The theme comes from a cookie, so the server already renders the right one. Crop marks frame
 * the art like the Open Graph PNG; `mark` adds the /// mark as well. A post without a cover gets
 * a quiet grid instead.
 */
const props = defineProps<{ src?: string; eager?: boolean; mark?: boolean }>();
const { isDark } = useTheme();
const file = computed(() => {
    if (!props.src) return undefined;
    return isDark.value ? props.src : blogCover(props.src).light;
});

const corners = [
    "top-[5.7%] left-[3%] border-t border-l",
    "top-[5.7%] right-[3%] border-t border-r",
    "bottom-[5.7%] left-[3%] border-b border-l",
    "bottom-[5.7%] right-[3%] border-b border-r",
];
</script>

<template>
    <div
        class="relative aspect-[1200/630] overflow-hidden rounded-md border border-hairline bg-surface"
    >
        <img
            v-if="file"
            :src="file"
            alt=""
            width="1200"
            height="630"
            :loading="eager ? 'eager' : 'lazy'"
            :fetchpriority="eager ? 'high' : 'auto'"
            decoding="async"
            class="size-full transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
        />
        <div v-else class="tech-grid absolute inset-0 grid place-items-center">
            <SiteMark :size="48" tone="ghost" />
        </div>
        <span aria-hidden="true">
            <span
                v-for="c in corners"
                :key="c"
                class="pointer-events-none absolute size-[1.5%] min-h-2 min-w-2 border-faint"
                :class="c"
            />
        </span>
        <SiteMark
            v-if="mark && file"
            :size="20"
            class="pointer-events-none absolute right-[6%] bottom-[10%]"
        />
    </div>
</template>
