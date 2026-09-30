<script setup lang="ts">
/** Direct channels: email (with copy) and the public profiles from app.meta. */
import meta, { socialLinks } from "~/app.meta";

const { t } = useI18n();

/** "https://www.linkedin.com/in/x/" → "linkedin.com/in/x" */
const display = (href: string) => href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const profiles = computed(() =>
    socialLinks.map((l) => ({
        label: l.label,
        href: l.href,
        text: l.href === meta.social.telegram ? meta.social.telegramHandle : display(l.href),
    })),
);
</script>

<template>
    <ul :aria-label="t('contactPage.channels')" class="border-b border-hairline">
        <li
            class="grid grid-cols-[88px_1fr_auto] items-center gap-4 border-t border-hairline-strong py-4 md:grid-cols-[112px_1fr_auto]"
        >
            <span class="eyebrow text-subtle">{{ t("contact.email") }}</span>
            <NuxtLink
                :to="`mailto:${meta.contactEmail}`"
                dir="ltr"
                class="latin min-w-0 text-start text-[15px] [overflow-wrap:anywhere] no-underline hover:text-gold md:text-[17px] rtl:text-end"
            >
                {{ meta.contactEmail }}
            </NuxtLink>
            <SiteCopyButton
                :value="meta.contactEmail"
                :label="t('contact.copy')"
                :copied-label="t('contact.copied')"
                variant="outline"
                size="label"
                class="h-9 md:h-9"
            />
        </li>
        <li
            v-for="p in profiles"
            :key="p.label"
            class="grid grid-cols-[88px_1fr_auto] items-center gap-4 border-t border-hairline py-4 md:grid-cols-[112px_1fr_auto]"
        >
            <span class="eyebrow text-subtle">{{ p.label }}</span>
            <NuxtLink
                :to="p.href"
                target="_blank"
                dir="ltr"
                class="latin min-w-0 text-start text-[15px] [overflow-wrap:anywhere] no-underline hover:text-gold md:text-[17px] rtl:text-end"
            >
                {{ p.text }}
            </NuxtLink>
            <SiteArrow direction="external" class="text-gold" />
        </li>
    </ul>
</template>
