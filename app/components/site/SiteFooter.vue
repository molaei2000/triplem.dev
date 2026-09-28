<script setup lang="ts">
import meta from "~/app.meta";

const { t } = useI18n();
const links = [
    { label: "GitHub", href: meta.social.github },
    { label: "LinkedIn", href: meta.social.linkedin },
    { label: "Telegram", href: meta.social.telegram },
    { label: "Email", href: `mailto:${meta.contactEmail}` },
];
</script>

<template>
    <footer class="border-t border-hairline py-12 text-sm">
        <div class="shell grid-12 items-start gap-y-8">
            <div class="col-span-4 flex items-center gap-2.5 md:col-span-3">
                <SiteMark :size="18" muted />
                <span class="font-display text-base font-semibold">triplem.dev</span>
            </div>
            <div class="col-span-4 flex flex-col gap-1 md:col-span-4">
                <span>{{ meta.author.name }}</span>
                <span class="text-subtle">{{ t("footer.role") }}</span>
            </div>
            <nav :aria-label="t('footer.elsewhere')" class="col-span-4 flex flex-wrap gap-x-6 gap-y-1.5 md:col-span-3 md:flex-col">
                <a
                    v-for="l in links"
                    :key="l.label"
                    :href="l.href"
                    class="py-1.5 text-subtle no-underline transition-colors hover:text-foreground md:py-0"
                    :target="l.href.startsWith('http') ? '_blank' : undefined"
                    :rel="l.href.startsWith('http') ? 'noopener' : undefined"
                >{{ l.label }}</a>
            </nav>
            <div class="col-span-4 flex items-end justify-between gap-1.5 md:col-span-2 md:flex-col">
                <a href="#top" class="text-subtle no-underline hover:text-foreground">{{ t("footer.top") }} ↑</a>
                <span class="eyebrow text-faint">© {{ new Date().getFullYear() }}</span>
            </div>
        </div>
    </footer>
</template>
