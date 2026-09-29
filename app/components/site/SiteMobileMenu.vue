<script setup lang="ts">
/** The phone-sized navigation panel under the header bar. Visibility is owned by SiteNav. */
import type { NavLink } from "~/composables/useNavLinks";

defineProps<{ links: NavLink[] }>();
const { t } = useI18n();

const linkClass = "flex items-baseline justify-between py-4 font-display text-[34px] font-medium tracking-[-0.03em] no-underline";
</script>

<template>
    <nav
        :aria-label="t('nav.primary')"
        class="mt-2 rounded-xl border border-hairline-strong bg-elevated px-5 pt-2 pb-5 shadow-(--shadow-lift) md:hidden"
    >
        <NuxtLinkLocale
            v-for="(l, i) in links"
            :key="l.key"
            :to="l.to"
            :aria-current="l.current"
            :class="[linkClass, 'border-b border-hairline']"
        >
            {{ t(`nav.${l.key}`) }}
            <span class="eyebrow text-faint">0{{ i + 1 }}</span>
        </NuxtLinkLocale>
        <NuxtLinkLocale to="/contact" :class="linkClass">
            {{ t("nav.contact") }}<SiteArrow class="text-[0.8em] text-gold" />
        </NuxtLinkLocale>
        <SiteLocaleSwitch class="mt-2 w-fit" />
    </nav>
</template>
