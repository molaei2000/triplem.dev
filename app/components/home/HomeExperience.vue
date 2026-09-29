<script setup lang="ts">
import { experience } from "~/data/experience";

const { t, te } = useI18n();
const k = (id: string, key: string) => `experience.items.${id}.${key}`;
</script>

<template>
    <section id="experience" class="shell scroll-mt-24 pb-32 md:pb-40" aria-labelledby="exp-title">
        <SiteSectionHeader :label="t('experience.label')" :caption="t('experience.caption')" coord="y · 3250" />

        <div class="mt-12 grid-12 gap-y-10 md:mt-18">
            <div class="col-span-4 flex flex-col gap-3.5 md:sticky md:top-32 md:col-span-3 md:self-start">
                <h2 id="exp-title" class="font-display text-5xl leading-none font-medium tracking-[-0.035em] md:text-[4rem]">{{ t("experience.title") }}</h2>
                <span class="eyebrow text-subtle">{{ t("experience.sub") }}</span>
            </div>

            <ol class="relative col-span-4 md:col-span-9">
                <!-- rail + scroll-drawn gold line -->
                <li aria-hidden="true" class="absolute start-1 top-3 bottom-0 w-px bg-hairline-strong md:start-[124px]" />
                <li aria-hidden="true" class="draw absolute start-1 top-3 bottom-0 w-px origin-top bg-gold md:start-[124px]" />

                <li
                    v-for="(x, i) in experience"
                    :key="x.id"
                    class="relative flex flex-col ps-8 pb-20 last:pb-4 md:flex-row md:ps-0 md:pb-28"
                >
                    <span
                        aria-hidden="true"
                        class="absolute start-0 top-2 size-[9px] md:start-[120px]"
                        :class="i === 0 ? 'bg-gold' : 'border border-hairline-strong bg-background'"
                    />
                    <span class="eyebrow shrink-0 pb-2.5 md:w-[100px] md:pt-2.5 md:pb-0 md:text-end" :class="i === 0 ? 'text-gold' : 'text-subtle'">
                        {{ t(k(x.id, "years")) }}
                    </span>

                    <div class="flex min-w-0 max-w-[720px] flex-1 flex-col gap-3 md:ms-[72px]">
                        <span class="eyebrow text-faint">{{ t("experience.chapter") }} 0{{ experience.length - i }} · {{ t(k(x.id, "product")) }}</span>
                        <h3 class="font-display text-[1.625rem] leading-[1.05] font-medium tracking-[-0.025em] md:text-[2.5rem]">{{ t(k(x.id, "role")) }}</h3>
                        <p class="text-[15px] md:text-[19px]">
                            {{ t(k(x.id, "company")) }}<span v-if="te(k(x.id, 'where'))" class="text-subtle"> — {{ t(k(x.id, "where")) }}</span>
                        </p>
                        <p class="text-[15px] leading-relaxed text-subtle md:text-[17px]">{{ t(k(x.id, "summary")) }}</p>

                        <SiteReveal class="relative mt-4 md:mt-6" :class="x.shots.length > 1 && 'pb-[16%] md:pb-[12%]'">
                            <ExperienceFrame :shot="x.shots[0]!" :host="x.host" :alt="t(k(x.id, 'alt.0'))" sizes="sm:100vw md:720px" />
                            <ExperienceFrame
                                v-if="x.shots[1]"
                                compact
                                class="absolute -end-2 bottom-0 w-[46%] md:end-0 md:w-[40%] xl:-end-12"
                                :shot="x.shots[1]"
                                :host="x.host"
                                :alt="t(k(x.id, 'alt.1'))"
                                sizes="sm:50vw md:300px"
                            />
                        </SiteReveal>

                        <div v-if="x.stack.length || x.link" class="mt-3 flex flex-wrap items-center gap-2">
                            <span
                                v-for="s in x.stack"
                                :key="s"
                                class="rounded border border-hairline px-2.5 py-1.5 font-mono text-[11px] tracking-[0.06em] text-subtle"
                            >{{ s }}</span>
                            <a
                                v-if="x.link"
                                :href="x.link"
                                target="_blank"
                                rel="noopener"
                                class="gold-link ms-auto text-[15px]"
                            >{{ x.host }} <span aria-hidden="true" class="inline-block rtl:-scale-x-100">↗</span></a>
                        </div>

                        <details class="xp group/d mt-2 border-y border-hairline">
                            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 py-4">
                                <span class="eyebrow text-subtle transition-colors group-hover/d:text-foreground">
                                    <span class="group-open/d:hidden">{{ t("experience.more") }}</span>
                                    <span class="hidden group-open/d:inline">{{ t("experience.less") }}</span>
                                    <span class="sr-only"> — {{ t(k(x.id, "company")) }}</span>
                                </span>
                                <span
                                    aria-hidden="true"
                                    class="grid size-8 place-items-center rounded-full border border-hairline-strong text-gold transition-transform duration-500 ease-out-expo group-open/d:rotate-45"
                                >
                                    <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0v10M0 5h10" stroke="currentColor" stroke-width="1.3" /></svg>
                                </span>
                            </summary>
                            <div class="flex flex-col gap-6 pb-7">
                                <p class="text-[15px] leading-relaxed md:text-[17px]">{{ t(k(x.id, "body")) }}</p>
                                <div>
                                    <span class="eyebrow text-faint">{{ t("experience.highlights") }}</span>
                                    <ul class="mt-3 flex flex-col gap-3">
                                        <li
                                            v-for="h in x.highlights"
                                            :key="h"
                                            class="flex gap-3 text-[15px] leading-relaxed text-subtle md:text-base"
                                        >
                                            <span aria-hidden="true" class="mt-[0.8em] h-px w-3 shrink-0 bg-gold" />
                                            <span>{{ t(k(x.id, `highlights.${h - 1}`)) }}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </details>
                    </div>
                </li>
            </ol>
        </div>
    </section>
</template>

<style scoped>
/* The gold line draws as the section scrolls through the viewport.
   Progressive enhancement: browsers without scroll timelines show it full. */
@supports (animation-timeline: view()) {
    .draw {
        animation: draw linear both;
        animation-timeline: view();
        animation-range: entry 10% cover 60%;
    }
    @keyframes draw {
        from { transform: scaleY(0); }
        to { transform: scaleY(1); }
    }
}

.xp summary::-webkit-details-marker { display: none; }

/* Animate the disclosure where the platform can size to `auto`. */
@supports (interpolate-size: allow-keywords) {
    .xp { interpolate-size: allow-keywords; }
    .xp::details-content {
        height: 0;
        overflow: clip;
        transition: height 0.5s var(--ease-out-expo), content-visibility 0.5s allow-discrete;
    }
    .xp[open]::details-content { height: auto; }
}

@media (prefers-reduced-motion: reduce) {
    .draw { animation: none; transform: none; }
    .xp::details-content { transition: none; }
}
</style>
