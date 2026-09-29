<script setup lang="ts">
const { t, locale, locales } = useI18n();
const short: Record<string, string> = { en: "EN", fa: "فا" };
</script>

<template>
    <nav :aria-label="t('nav.language')" class="flex gap-0.5 rounded-[10px] border border-hairline p-1">
        <SwitchLocalePathLink
            v-for="entry in locales"
            :key="entry.code"
            :locale="entry.code"
            :lang="entry.code"
            :aria-current="entry.code === locale ? 'true' : undefined"
            class="grid h-8 min-w-9 place-items-center rounded-[7px] px-2 font-mono text-[11px] tracking-[0.08em] no-underline transition-colors"
            :class="entry.code === locale ? 'bg-gold-soft text-foreground' : 'text-subtle hover:text-foreground'"
        >
            {{ short[entry.code] ?? entry.code }}
        </SwitchLocalePathLink>
    </nav>
</template>
