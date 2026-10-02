<script setup lang="ts">
/**
 * One of the three Ms: portrait, slash label, name and role. `index` is the
 * person's slash (0 = left); `active` mirrors the 3D mark's highlight.
 */
import type { TeamMember } from "~/data/team";

const props = defineProps<{ member: TeamMember; index: number; active?: boolean }>();
const { t, te } = useI18n();

const key = (k: string) => `teamPage.people.${props.member.id}.${k}`;
const name = computed(() => t(key("name")));
// The M in gold, where the name is Latin; splitting a Persian word would break its letter joining.
const initial = computed(() => (/^[A-Za-z]/.test(name.value) ? name.value.charAt(0) : ""));
const rest = computed(() => (initial.value ? name.value.slice(1) : name.value));
const accent = computed(() => props.index as 0 | 1 | 2);

const corners = [
    "start-0 top-0 border-s border-t",
    "end-0 top-0 border-e border-t",
    "start-0 bottom-0 border-s border-b",
    "end-0 bottom-0 border-e border-b",
];
</script>

<template>
    <article :aria-labelledby="`team-${member.id}`" class="flex h-full flex-col gap-5">
        <div v-if="member.photo" class="relative p-3">
            <span
                v-for="c in corners"
                :key="c"
                aria-hidden="true"
                class="absolute size-5 transition-colors duration-500"
                :class="[c, active ? 'border-gold' : 'border-gold-line']"
            />
            <NuxtImg
                :src="member.photo.src"
                :width="member.photo.width"
                :height="member.photo.height"
                sizes="sm:100vw md:440px"
                format="webp"
                :alt="t('teamPage.portraitAlt', { name })"
                loading="lazy"
                class="block aspect-[3/4] h-auto w-full rounded-md bg-surface object-cover grayscale transition-[filter] duration-700 ease-out-expo"
                :class="active ? 'contrast-110' : 'contrast-100'"
            />
        </div>

        <div
            class="flex items-start justify-between gap-4 border-t pt-4 transition-colors duration-500"
            :class="active ? 'border-gold' : 'border-hairline-strong'"
        >
            <div class="flex flex-col gap-1.5">
                <span
                    class="eyebrow transition-colors duration-500"
                    :class="active ? 'text-gold' : 'text-subtle'"
                    >{{ t(`teamPage.slash.${index}`) }}</span
                >
                <h3
                    :id="`team-${member.id}`"
                    class="font-display text-[2rem] leading-none font-medium tracking-[-0.025em] md:text-[2.25rem]"
                >
                    <span v-if="initial" class="text-gold">{{ initial }}</span
                    >{{ rest
                    }}<template v-if="te(key('surname'))"> {{ t(key("surname")) }}</template>
                </h3>
                <p class="text-[15px] text-subtle md:text-[17px]">
                    {{ t(`teamPage.roles.${member.role}`) }}
                </p>
                <p v-if="te(key('bio'))" class="mt-1 text-[15px] leading-relaxed text-subtle">
                    {{ t(key("bio")) }}
                </p>
                <div
                    v-if="member.page || member.links?.length"
                    class="mt-2 flex flex-wrap gap-x-5 gap-y-2"
                >
                    <UiButton v-if="member.page" as-child variant="link" size="inline">
                        <NuxtLinkLocale :to="member.page"
                            >{{ t("teamPage.aboutMe") }} <SiteArrow
                        /></NuxtLinkLocale>
                    </UiButton>
                    <UiButton
                        v-for="l in member.links"
                        :key="l.href"
                        as-child
                        variant="ghost"
                        size="inline"
                    >
                        <NuxtLink :to="l.href" target="_blank"
                            >{{ l.label }} <SiteArrow direction="external"
                        /></NuxtLink>
                    </UiButton>
                </div>
            </div>
            <SiteMark
                :size="40"
                :stroke="3.2"
                :accent="accent"
                :tone="active ? 'default' : 'ghost'"
            />
        </div>
    </article>
</template>
