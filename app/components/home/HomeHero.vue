<script setup lang="ts">
const { t } = useI18n();
const isDesktop = useMediaQuery("(min-width: 768px)");

const stage = useTemplateRef<{ reset: () => void }>("stage");
const hover = shallowRef(-1);
const selected = shallowRef(-1);
const split = shallowRef(false);

const active = computed(() => (selected.value >= 0 ? selected.value : hover.value));
const readout = computed(() => {
    if (active.value >= 0) return `s${active.value}`;
    if (split.value) return "split";
    return isDesktop.value ? "idle" : "idleTouch";
});

const lines = [
    { key: "l1", delay: 300, muted: true },
    { key: "l2", delay: 380 },
    { key: "l3", delay: 460 },
    { key: "l4", delay: 540, stop: true },
];

// Click/tap on a slash: first selects it, a second press on the active slash decomposes.
function onTap(i: number) {
    if (i < 0) {
        selected.value = -1;
        return;
    }
    if (i === active.value) split.value = !split.value;
    else selected.value = i;
}
function reset() {
    split.value = false;
    selected.value = -1;
    stage.value?.reset();
}
</script>

<template>
    <!-- Desktop: one viewport tall (bounded), so the headline, stage and controls sit above the fold -->
    <section
        class="relative pt-24 md:h-svh md:max-h-250 md:min-h-160 md:pt-0"
        aria-labelledby="hero-title"
    >
        <div
            aria-hidden="true"
            class="pointer-events-none absolute -top-32 end-0 size-[1000px] max-w-full rounded-full bg-[radial-gradient(circle,var(--glow)_0%,transparent_62%)]"
        />
        <div
            class="shell relative md:flex md:h-full md:flex-col md:pt-[clamp(6rem,14svh,8.5rem)] md:pb-[clamp(1.5rem,4svh,3rem)]"
        >
            <div aria-hidden="true" class="eyebrow hidden justify-between text-faint md:flex">
                <span>{{ t("hero.index") }}</span>
                <span>x 0080 · y 0000</span>
            </div>

            <div class="relative z-10 flex flex-col gap-2 pt-4 md:mt-5 md:pt-0">
                <p class="font-display text-[19px] font-medium tracking-[-0.015em] md:text-[26px]">
                    {{ t("hero.name") }}
                </p>
                <p class="text-sm text-subtle md:text-base">{{ t("hero.role") }}</p>
            </div>

            <!-- Desktop size also tracks viewport height, so all four lines and the controls fit on short laptop screens -->
            <h1
                id="hero-title"
                class="tracking-display relative z-10 mt-9 font-display text-[clamp(3.9rem,15vw,8rem)] leading-[0.9] font-semibold tracking-[-0.045em] md:mt-[clamp(0.75rem,2.5svh,2rem)] md:-ms-2 md:text-[clamp(3.5rem,min(15vw,20svh_-_3.5rem),8rem)] rtl:leading-[1.12] md:rtl:text-[clamp(3.5rem,min(15vw,16svh_-_3rem),8rem)]"
            >
                <span v-for="l in lines" :key="l.key" class="line">
                    <span :style="{ '--d': `${l.delay}ms` }" :class="l.muted && 'text-subtle'"
                        >{{ t(`hero.${l.key}`)
                        }}<span v-if="l.stop" class="text-gold">.</span></span
                    >
                </span>
            </h1>
            <p class="sr-only">{{ t("hero.srSummary") }}</p>

            <!-- 3D stage: full-bleed on mobile, right half on desktop -->
            <div
                aria-hidden="true"
                class="stage-in relative -mx-4 mt-6 h-[400px] z-50 md:absolute md:end-0 md:top-22 md:bottom-32 md:mx-0 md:mt-0 md:h-auto md:w-[min(700px,52%)]"
            >
                <ClientOnly>
                    <HeroStage
                        ref="stage"
                        :split="split"
                        :selected="selected"
                        :distance="isDesktop ? 9 : 10"
                        @hover="hover = $event"
                        @tap="onTap"
                    />
                    <template #fallback>
                        <div class="grid size-full place-items-center">
                            <SiteMark :size="isDesktop ? 280 : 200" />
                        </div>
                    </template>
                </ClientOnly>
                <span
                    class="eyebrow pointer-events-none absolute start-4 top-3 text-faint md:start-8 md:top-12"
                >
                    {{ isDesktop ? t("hero.fig") : t("hero.figTouch") }}
                </span>
            </div>

            <!-- bottom row: CTA · live readout · controls -->
            <div class="relative z-10 mt-2 grid-12 items-end gap-y-6 md:mt-auto md:pt-6">
                <HeroReadout
                    :state="readout"
                    class="col-span-4 min-h-23 md:order-2 md:col-span-4 md:col-start-7 md:min-h-0"
                />
                <HeroControls
                    v-model:split="split"
                    class="col-span-4 md:order-3 md:col-span-2 md:justify-self-end"
                    @reset="reset"
                />
                <UiButton
                    as-child
                    variant="link"
                    size="inline"
                    class="col-span-4 justify-self-start py-2 md:order-1 md:col-span-3"
                >
                    <NuxtLinkLocale :to="{ path: '/', hash: '#experience' }">
                        {{ t("hero.cta") }}
                        <SiteArrow direction="down" />
                    </NuxtLinkLocale>
                </UiButton>
            </div>
        </div>
    </section>
</template>

<style scoped>
.line {
    display: block;
    overflow: hidden;
    padding-bottom: 0.06em;
}

.line > span {
    display: inline-block;
    animation: rise 900ms var(--ease-out-expo) var(--d) both;
}

@keyframes rise {
    from {
        transform: translateY(105%);
    }

    to {
        transform: none;
    }
}

.stage-in {
    animation: stage-in 1200ms var(--ease-out-expo) 250ms both;
}

@keyframes stage-in {
    from {
        opacity: 0;
        filter: blur(6px);
    }

    to {
        opacity: 1;
        filter: none;
    }
}
</style>
