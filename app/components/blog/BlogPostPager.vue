<script setup lang="ts">
/** Links to the neighbouring posts (in index order). */
interface Neighbour {
    path: string;
    title: string;
}

defineProps<{ older?: Neighbour | null; newer?: Neighbour | null }>();
const { t } = useI18n();
</script>

<template>
    <footer class="shell grid-12 gap-y-4 border-t border-hairline pt-10 pb-32 md:pb-40">
        <NuxtLink
            v-if="older"
            :to="older.path"
            class="group col-span-4 flex flex-col gap-3 no-underline md:col-span-6"
        >
            <span class="eyebrow text-faint">{{ t("blog.older") }}</span>
            <span
                class="flex items-baseline gap-4 font-display text-2xl leading-tight font-medium tracking-[-0.02em] md:text-[2.5rem]"
            >
                {{ older.title }}
                <SiteArrow
                    class="shrink-0 text-gold transition-transform duration-500 ease-out-expo group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5"
                />
            </span>
        </NuxtLink>
        <NuxtLink
            v-if="newer"
            :to="newer.path"
            class="group col-span-4 flex flex-col gap-3 no-underline md:col-span-5 md:col-start-8 md:items-end md:text-end"
        >
            <span class="eyebrow text-faint">{{ t("blog.newer") }}</span>
            <span
                class="font-display text-xl leading-tight font-medium tracking-[-0.02em] text-subtle transition-colors group-hover:text-foreground md:text-[1.75rem]"
                >{{ newer.title }}</span
            >
        </NuxtLink>
    </footer>
</template>
