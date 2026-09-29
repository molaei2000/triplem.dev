<script setup lang="ts">
const { t } = useI18n();
const isDesktop = useMediaQuery("(min-width: 768px)");

const stage = ref<{ reset: () => void }>();
const hover = ref(-1);
const selected = ref(-1);
const split = ref(false);

const active = computed(() => (selected.value >= 0 ? selected.value : hover.value));
const readoutKey = computed(() => {
    if (active.value >= 0) return `s${active.value}`;
    if (split.value) return "split";
    return isDesktop.value ? "idle" : "idleTouch";
});

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
    <section class="relative pt-24 md:min-h-[940px] md:pt-0" aria-labelledby="hero-title">
        <div
            aria-hidden="true"
            class="pointer-events-none absolute -top-32 end-0 size-[1000px] max-w-full rounded-full bg-[radial-gradient(circle,var(--glow)_0%,transparent_62%)]"
        />
        <div class="shell relative md:h-[940px]">
            <span aria-hidden="true" class="eyebrow absolute top-34 hidden text-faint md:block">{{ t("hero.index") }}</span>
            <span aria-hidden="true" class="eyebrow absolute end-4 top-34 hidden text-faint md:end-10 md:block xl:end-20">x 0080 · y 0000</span>

            <div class="relative z-10 flex flex-col gap-2 pt-4 md:absolute md:top-49">
                <p class="font-display text-[19px] font-medium tracking-[-0.015em] md:text-[26px]">{{ t("hero.name") }}</p>
                <p class="text-sm text-subtle md:text-base">{{ t("hero.role") }}</p>
            </div>

            <h1
                id="hero-title"
                class="tracking-display relative z-10 mt-9 font-display text-[clamp(3.9rem,15vw,8rem)] leading-[0.9] font-semibold tracking-[-0.045em] md:absolute md:top-93 md:mt-0 md:-ms-2 rtl:leading-[1.12]"
            >
                <span class="line"><span style="--d: 300ms" class="text-subtle">{{ t("hero.l1") }}</span></span>
                <span class="line"><span style="--d: 380ms">{{ t("hero.l2") }}</span></span>
                <span class="line"><span style="--d: 460ms">{{ t("hero.l3") }}</span></span>
                <span class="line"><span style="--d: 540ms">{{ t("hero.l4") }}<span class="text-gold">.</span></span></span>
            </h1>
            <p class="sr-only">{{ t("hero.srSummary") }}</p>

            <!-- 3D stage: full-bleed on mobile, right half on desktop -->
            <div
                aria-hidden="true"
                class="stage-in relative -mx-4 mt-6 h-[400px] md:absolute md:end-0 md:top-22 md:mx-0 md:mt-0 md:h-[760px] md:w-[min(700px,52%)]"
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
                        <div class="grid size-full place-items-center"><SiteMark :size="isDesktop ? 280 : 200" /></div>
                    </template>
                </ClientOnly>
                <span class="eyebrow pointer-events-none absolute start-4 top-3 text-faint md:start-8 md:top-12">
                    {{ isDesktop ? t("hero.fig") : t("hero.figTouch") }}
                </span>
            </div>

            <!-- bottom row: CTA · live readout · controls -->
            <div class="relative z-10 mt-2 grid-12 items-end gap-y-6 md:absolute md:inset-x-10 md:top-[862px] md:mt-0 xl:inset-x-20">
                <div aria-live="polite" class="col-span-4 flex min-h-23 flex-col gap-1.5 md:order-2 md:col-span-4 md:col-start-7 md:min-h-0">
                    <span class="eyebrow text-gold">{{ t(`hero.readout.${readoutKey}.num`) }}</span>
                    <span class="font-display text-xl font-medium tracking-[-0.01em]">{{ t(`hero.readout.${readoutKey}.name`) }}</span>
                    <span class="text-sm leading-snug text-subtle">{{ t(`hero.readout.${readoutKey}.desc`) }}</span>
                </div>
                <div class="col-span-4 flex gap-2 md:order-3 md:col-span-2 md:justify-self-end">
                    <button
                        type="button"
                        class="eyebrow h-11 grow rounded-lg border px-4 transition-colors md:h-10 md:grow-0"
                        :class="split ? 'border-gold bg-gold text-on-gold' : 'border-hairline-strong text-subtle hover:border-gold-line hover:text-foreground'"
                        :aria-pressed="split"
                        @click="split = !split"
                    >
                        {{ split ? t("hero.assemble") : t("hero.decompose") }}
                    </button>
                    <button
                        type="button"
                        class="eyebrow h-11 rounded-lg border border-hairline-strong px-4 text-subtle transition-colors hover:border-gold-line hover:text-foreground md:h-10"
                        @click="reset"
                    >
                        {{ t("hero.reset") }}
                    </button>
                </div>
                <NuxtLinkLocale
                    :to="{ path: '/', hash: '#work' }"
                    class="gold-link col-span-4 justify-self-start py-2 text-[15px] md:order-1 md:col-span-3"
                >
                    {{ t("hero.cta") }} ↓
                </NuxtLinkLocale>
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
    from { transform: translateY(105%); }
    to { transform: none; }
}
.stage-in {
    animation: stage-in 1200ms var(--ease-out-expo) 250ms both;
}
@keyframes stage-in {
    from { opacity: 0; filter: blur(6px); }
    to { opacity: 1; filter: none; }
}
</style>
