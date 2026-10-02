<script setup lang="ts">
/**
 * Team header: the 3D /// mark, where each slash is one of the three Ms.
 * `active` (a slash index, -1 for none) drives the readout; `selected` lights
 * a slash in the scene (the parent sets it while a core card is hovered or a
 * slash was tapped). The scene is decorative: the readout and the cards below
 * carry the content.
 */
import { CORE_TEAM } from "~/data/team";

const props = defineProps<{ active: number; selected: number }>();
const emit = defineEmits<{ hover: [index: number]; tap: [index: number] }>();

const { t } = useI18n();
const isDesktop = useMediaQuery("(min-width: 768px)");

const readout = computed(() => {
    const member = CORE_TEAM[props.active];
    if (!member) {
        const state = isDesktop.value ? "idle" : "idleTouch";
        return {
            num: t(`teamPage.readout.${state}.num`),
            name: t(`teamPage.readout.${state}.name`),
            desc: t(`teamPage.readout.${state}.desc`),
        };
    }
    return {
        num: t(`teamPage.slash.${props.active}`),
        name: t(`teamPage.people.${member.id}.name`),
        desc: t(`teamPage.roles.${member.role}`),
    };
});
</script>

<template>
    <section class="shell pt-20 pb-24 md:pt-28 md:pb-32" aria-labelledby="team-page-title">
        <SiteSectionHeader
            :label="t('teamPage.label')"
            :caption="t('teamPage.caption')"
            coord="p · 05"
        />

        <div class="mt-10 grid-12 gap-y-8 md:mt-8">
            <div class="col-span-4 flex flex-col gap-6 md:col-span-5 md:row-start-1 md:pt-16">
                <h1
                    id="team-page-title"
                    class="font-display text-[4.5rem] leading-[0.88] font-semibold md:text-[7rem] xl:text-[8.5rem]"
                >
                    <!-- Tracking on the span: the RTL rule resets letter-spacing on headings, but this is a Latin wordmark -->
                    <span dir="ltr" class="latin-display tracking-[-0.05em] whitespace-nowrap"
                        >{{ t("teamPage.title") }}<span class="text-gold">.</span></span
                    >
                </h1>
                <p class="max-w-[480px] text-[17px] leading-relaxed text-subtle md:text-[19px]">
                    {{ t("teamPage.lead") }}
                </p>
            </div>

            <div
                aria-hidden="true"
                class="relative col-span-4 -mx-4 h-[340px] md:col-span-7 md:col-start-6 md:row-span-2 md:row-start-1 md:mx-0 md:h-[560px]"
            >
                <ClientOnly>
                    <HeroStage
                        :split="false"
                        :selected="selected"
                        :distance="isDesktop ? 9 : 10"
                        @hover="emit('hover', $event)"
                        @tap="emit('tap', $event)"
                    />
                    <template #fallback>
                        <div class="grid size-full place-items-center">
                            <SiteMark :size="isDesktop ? 260 : 180" />
                        </div>
                    </template>
                </ClientOnly>
                <span
                    class="eyebrow pointer-events-none absolute start-4 top-3 text-faint md:start-8 md:top-6"
                    >{{ t("teamPage.fig") }}</span
                >
            </div>

            <div
                aria-live="polite"
                class="col-span-4 flex min-h-23 flex-col gap-1.5 md:col-span-5 md:row-start-2 md:self-end"
            >
                <span class="eyebrow text-gold">{{ readout.num }}</span>
                <span class="font-display text-xl font-medium tracking-[-0.01em]">{{
                    readout.name
                }}</span>
                <span class="text-sm leading-snug text-subtle">{{ readout.desc }}</span>
            </div>
        </div>
    </section>
</template>
