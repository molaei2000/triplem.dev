<script setup lang="ts">
/** One role on the timeline: node, dates, summary, screenshots, stack and an expandable write-up. */
import type { ExperienceEntry as Entry } from "~/data/experience";

const props = defineProps<{ entry: Entry; chapter: number; current?: boolean }>();
const { t, te } = useI18n();

/** i18n key for this entry (`experience.items.<id>.<key>`). */
const k = (key: string) => `experience.items.${props.entry.id}.${key}`;
const [main, overlap] = props.entry.shots;
const highlights = computed(() =>
    Array.from({ length: props.entry.highlights }, (_, i) => t(k(`highlights.${i}`))),
);
</script>

<template>
    <span
        aria-hidden="true"
        class="absolute start-0 top-2 size-[9px] md:start-[120px]"
        :class="current ? 'bg-gold' : 'border border-hairline-strong bg-background'"
    />
    <span
        class="eyebrow shrink-0 pb-2.5 md:w-[100px] md:pt-2.5 md:pb-0 md:text-end"
        :class="current ? 'text-gold' : 'text-subtle'"
    >
        {{ t(k("years")) }}
    </span>

    <div class="flex min-w-0 max-w-[720px] flex-1 flex-col gap-3 md:ms-[72px]">
        <span class="eyebrow text-faint"
            >{{ t("experience.chapter") }} 0{{ chapter }} · {{ t(k("product")) }}</span
        >
        <h3
            class="font-display text-[1.625rem] leading-[1.05] font-medium tracking-[-0.025em] md:text-[2.5rem]"
        >
            {{ t(k("role")) }}
        </h3>
        <p class="text-[15px] md:text-[19px]">
            {{ t(k("company"))
            }}<span v-if="te(k('where'))" class="text-subtle"> — {{ t(k("where")) }}</span>
        </p>
        <p class="text-[15px] leading-relaxed text-subtle md:text-[17px]">{{ t(k("summary")) }}</p>

        <SiteReveal
            v-if="main"
            class="relative mt-4 md:mt-6"
            :class="overlap && 'pb-[16%] md:pb-[12%]'"
        >
            <ExperienceFrame
                :shot="main"
                :host="entry.host"
                :alt="t(k('alt.0'))"
                sizes="sm:100vw md:720px"
            />
            <ExperienceFrame
                v-if="overlap"
                compact
                class="absolute -end-2 bottom-0 w-[46%] md:end-0 md:w-[40%] xl:-end-12"
                :shot="overlap"
                :host="entry.host"
                :alt="t(k('alt.1'))"
                sizes="sm:50vw md:300px"
            />
        </SiteReveal>

        <div v-if="entry.stack.length || entry.link" class="mt-3 flex flex-wrap items-center gap-2">
            <UiBadge v-for="s in entry.stack" :key="s" variant="mono">{{ s }}</UiBadge>
            <UiButton v-if="entry.link" as-child variant="link" size="inline" class="ms-auto">
                <NuxtLink :to="entry.link" target="_blank"
                    >{{ entry.host }} <SiteArrow direction="external"
                /></NuxtLink>
            </UiButton>
        </div>

        <ExperienceDetails
            :summary-label="t(k('company'))"
            :body="t(k('body'))"
            :highlights="highlights"
        />
    </div>
</template>
