<script setup lang="ts">
/** Reymit: rial payments with an Iranian bank card. */
import { REYMIT_URL } from "~/data/support";

const { t } = useI18n();
const display = REYMIT_URL.replace(/^https?:\/\//, "");
</script>

<template>
    <article
        class="flex flex-col gap-6 rounded-lg border border-gold-line bg-surface p-5 md:gap-8 md:p-8"
    >
        <div class="flex items-start justify-between gap-6">
            <div class="flex flex-col gap-3">
                <span
                    class="font-display text-[2rem] leading-none font-semibold tracking-[-0.03em]"
                >
                    {{ t("supportPage.reymit.name") }}
                </span>
                <p class="max-w-[440px] text-[15px] leading-relaxed text-subtle md:text-[17px]">
                    {{ t("supportPage.reymit.body") }}
                </p>
            </div>
            <span
                class="grid size-12 shrink-0 place-items-center rounded-full border border-gold-line text-gold"
            >
                <Icon name="tm:heart-handshake" class="size-6" />
            </span>
        </div>
        <div
            class="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5"
        >
            <span dir="ltr" class="latin font-mono text-[14px] text-subtle">{{ display }}</span>
            <UiButton as-child variant="gold">
                <NuxtLink :to="REYMIT_URL" target="_blank">
                    {{ t("supportPage.reymit.cta") }}
                    <SiteArrow direction="external" />
                </NuxtLink>
            </UiButton>
        </div>
    </article>
</template>
