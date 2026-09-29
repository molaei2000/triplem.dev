<script setup lang="ts">
import meta from "~/app.meta";

const { t } = useI18n();
const { copy, copied, isSupported } = useClipboard({ source: meta.contactEmail, copiedDuring: 1600 });
</script>

<template>
    <section id="contact" class="relative scroll-mt-24 overflow-hidden pt-8 pb-28 md:h-[1040px] md:pt-36 md:pb-0" aria-labelledby="contact-title">
        <!-- three paths converge into one point (vertical on mobile, into the page edge on desktop) -->
        <svg aria-hidden="true" viewBox="0 0 390 220" class="mx-auto mb-8 block h-[220px] w-full max-w-[390px] md:hidden">
            <path d="M120 0C120 110 195 120 195 190" fill="none" stroke="var(--hairline-strong)" />
            <path d="M195 0V190" fill="none" stroke="var(--gold-line)" />
            <path d="M270 0C270 110 195 120 195 190" fill="none" stroke="var(--hairline-strong)" />
            <path d="M195 190V220" fill="none" stroke="var(--gold)" />
            <circle cx="195" cy="190" r="12" fill="none" stroke="var(--gold-line)" class="pulse" />
            <circle cx="195" cy="190" r="4" fill="var(--gold)" />
        </svg>
        <svg aria-hidden="true" viewBox="0 0 1440 1040" preserveAspectRatio="xMaxYMin slice" class="absolute inset-0 hidden size-full md:block rtl:-scale-x-100">
            <path d="M1200 0C1200 360 1300 420 1300 760" fill="none" stroke="var(--hairline-strong)" />
            <path d="M1300 0V760" fill="none" stroke="var(--gold-line)" />
            <path d="M1400 0C1400 360 1300 420 1300 760" fill="none" stroke="var(--hairline-strong)" />
            <path d="M1300 760V1040" fill="none" stroke="var(--gold)" />
            <circle cx="1300" cy="760" r="20" fill="none" stroke="var(--gold-line)" class="pulse" />
            <circle cx="1300" cy="760" r="5" fill="var(--gold)" />
        </svg>

        <div class="shell relative">
            <div class="grid-12 border-b border-hairline pb-4">
                <span class="eyebrow col-span-2 text-gold md:col-span-3">{{ t("contact.label") }}</span>
                <span class="eyebrow col-span-2 hidden text-subtle sm:block md:col-span-6">{{ t("contact.caption") }}</span>
            </div>

            <h2 id="contact-title" class="mt-8 -ms-1 font-display text-[3.5rem] leading-[0.92] font-semibold tracking-[-0.045em] md:mt-20 md:-ms-2 md:text-[8.5rem] md:leading-[0.9] md:tracking-[-0.05em] rtl:leading-[1.2]">
                {{ t("contact.t1") }}<br>{{ t("contact.t2") }}<span class="text-gold">.</span>
            </h2>
            <p class="mt-6 max-w-[520px] text-[17px] leading-normal text-subtle md:mt-16 md:text-[22px]">
                {{ t("contact.lead") }} <span class="text-foreground">{{ t("contact.talk") }}</span>
            </p>

            <div class="mt-7 flex flex-col gap-4 md:mt-12 md:flex-row md:items-center md:gap-7">
                <a
                    :href="`mailto:${meta.contactEmail}`"
                    class="group flex items-baseline justify-between gap-4 rounded-[10px] bg-foreground px-5 py-5 font-display text-lg font-medium text-background no-underline md:rounded-none md:border-b md:border-gold md:bg-transparent md:px-0 md:pt-0 md:pb-2.5 md:text-[3.75rem] md:leading-none md:tracking-[-0.04em] md:text-foreground"
                >
                    <span dir="ltr">{{ meta.contactEmail }}</span>
                    <span class="text-[1.2em] md:text-[0.72em] md:text-gold rtl:-scale-x-100">↗</span>
                </a>
                <button
                    v-if="isSupported"
                    type="button"
                    class="eyebrow h-11 self-start rounded-lg border border-hairline-strong px-4 text-subtle transition-colors hover:border-gold-line hover:text-foreground md:self-auto"
                    @click="copy()"
                >
                    <span aria-live="polite">{{ copied ? t("contact.copied") : t("contact.copy") }}</span>
                </button>
            </div>

            <div class="mt-6 flex flex-wrap gap-x-8 text-base md:mt-10">
                <a :href="meta.social.github" target="_blank" rel="noopener" class="py-3 text-subtle no-underline hover:text-foreground">GitHub ↗</a>
                <a :href="meta.social.linkedin" target="_blank" rel="noopener" class="py-3 text-subtle no-underline hover:text-foreground">LinkedIn ↗</a>
                <a :href="meta.social.telegram" target="_blank" rel="noopener" class="py-3 text-subtle no-underline hover:text-foreground">Telegram ↗</a>
            </div>
        </div>
        <span aria-hidden="true" class="eyebrow absolute end-[140px] top-[752px] hidden text-subtle md:block">{{ t("contact.converge") }}</span>
    </section>
</template>

<style scoped>
.pulse {
    animation: pulse 3.2s ease-in-out infinite;
}
@keyframes pulse {
    0%, 100% { opacity: 0.25; }
    50% { opacity: 0.9; }
}
</style>
