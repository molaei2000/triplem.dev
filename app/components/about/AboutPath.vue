<script setup lang="ts">
/** A one-line-per-job summary of the Experience timeline, most recent first. */
import { experience } from "~/data/experience";

const { t } = useI18n();
const k = (id: string, key: string) => `experience.items.${id}.${key}`;
</script>

<template>
    <div class="flex flex-col gap-8">
        <ol>
            <li
                v-for="(x, i) in experience"
                :key="x.id"
                class="grid-12 items-baseline gap-y-2 border-b border-hairline py-6 md:py-8"
            >
                <span
                    class="eyebrow col-span-4 md:col-span-2"
                    :class="i === 0 ? 'text-gold' : 'text-subtle'"
                    >{{ t(k(x.id, "years")) }}</span
                >
                <span
                    class="col-span-4 font-display text-2xl leading-tight font-medium tracking-[-0.02em] md:col-span-5 md:text-[2rem]"
                >
                    {{ t(k(x.id, "company")) }}
                </span>
                <span class="col-span-4 text-[15px] text-subtle md:col-span-5 md:text-[17px]">
                    {{ t(k(x.id, "role")) }} · {{ t(k(x.id, "product")) }}
                </span>
            </li>
        </ol>
        <UiButton as-child variant="link" size="inline" class="self-start">
            <NuxtLinkLocale :to="{ path: '/', hash: '#experience' }"
                >{{ t("aboutPage.pathLink") }} <SiteArrow
            /></NuxtLinkLocale>
        </UiButton>
    </div>
</template>
