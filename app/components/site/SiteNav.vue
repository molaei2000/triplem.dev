<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const { y } = useWindowScroll();
const scrolled = computed(() => y.value > 24);
const open = ref(false);

// Experience and About are home sections; Blog is its own page.
const links = [
    { key: "experience", to: { path: "/", hash: "#experience" } },
    { key: "blog", to: "/blog" },
    { key: "about", to: { path: "/", hash: "#about" } },
] as const;
const inBlog = computed(() => route.path.startsWith(localePath("/blog")));
const current = (key: string) => (key === "blog" && inBlog.value ? "page" : undefined);

watch(() => route.fullPath, () => (open.value = false));
onKeyStroke("Escape", () => (open.value = false));
</script>

<template>
    <header
        class="fixed inset-x-0 z-50 transition-[top] duration-500 ease-out-expo"
        :class="scrolled ? 'top-3' : 'top-3 md:top-6'"
    >
        <div class="shell">
            <div
                class="flex items-center justify-between rounded-xl border ps-4 pe-2 backdrop-blur-[18px] transition-all duration-500 ease-out-expo md:ps-5 md:pe-3"
                :class="scrolled
                    ? 'h-13 border-hairline-strong bg-surface/85 md:mx-10'
                    : 'h-14 border-hairline bg-glass md:h-16'"
            >
                <NuxtLinkLocale to="/" class="flex items-center gap-3 no-underline" :aria-label="t('nav.homeLabel')">
                    <SiteMark :size="24" />
                    <span class="font-display text-[17px] font-semibold tracking-[-0.01em]">triplem<span class="text-gold">.</span>dev</span>
                </NuxtLinkLocale>

                <nav :aria-label="t('nav.primary')" class="hidden gap-1 md:flex">
                    <NuxtLinkLocale
                        v-for="l in links"
                        :key="l.key"
                        :to="l.to"
                        :aria-current="current(l.key)"
                        class="rounded-lg px-3.5 py-2.5 text-sm text-subtle no-underline transition-colors hover:text-foreground aria-[current=page]:text-foreground"
                    >
                        {{ t(`nav.${l.key}`) }}
                    </NuxtLinkLocale>
                </nav>

                <div class="flex items-center gap-2">
                    <SiteLocaleSwitch class="hidden md:flex" />
                    <SiteThemeToggle />
                    <NuxtLinkLocale
                        :to="{ path: '/', hash: '#contact' }"
                        class="hidden h-10 items-center rounded-[9px] bg-foreground px-4 text-sm font-medium text-background no-underline transition-opacity hover:opacity-90 md:inline-flex"
                    >
                        {{ t("nav.contact") }}
                    </NuxtLinkLocale>
                    <button
                        type="button"
                        class="grid size-11 place-items-center md:hidden"
                        :aria-label="open ? t('nav.menuClose') : t('nav.menuOpen')"
                        :aria-expanded="open"
                        aria-controls="mobile-menu"
                        @click="open = !open"
                    >
                        <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true" class="rtl:-scale-x-100">
                            <path :d="open ? 'M3 0L17 10M3 10L17 0' : 'M0 1H20M6 9H20'" stroke="currentColor" stroke-width="1.4" />
                        </svg>
                    </button>
                </div>
            </div>

            <Transition
                enter-active-class="transition duration-300 ease-out-expo"
                enter-from-class="opacity-0 -translate-y-2"
                leave-active-class="transition duration-200"
                leave-to-class="opacity-0 -translate-y-2"
            >
                <nav
                    v-show="open"
                    id="mobile-menu"
                    :aria-label="t('nav.primary')"
                    class="mt-2 rounded-xl border border-hairline-strong bg-elevated px-5 pt-2 pb-5 shadow-(--shadow-lift) md:hidden"
                >
                    <NuxtLinkLocale
                        v-for="(l, i) in links"
                        :key="l.key"
                        :to="l.to"
                        :aria-current="current(l.key)"
                        class="flex items-baseline justify-between border-b border-hairline py-4 font-display text-[34px] font-medium tracking-[-0.03em] no-underline"
                    >
                        {{ t(`nav.${l.key}`) }}
                        <span class="eyebrow text-faint">0{{ i + 1 }}</span>
                    </NuxtLinkLocale>
                    <NuxtLinkLocale
                        :to="{ path: '/', hash: '#contact' }"
                        class="flex items-baseline justify-between py-4 font-display text-[34px] font-medium tracking-[-0.03em] no-underline"
                    >
                        {{ t("nav.contact") }}<span class="text-gold rtl:-scale-x-100">→</span>
                    </NuxtLinkLocale>
                    <SiteLocaleSwitch class="mt-2 w-fit" />
                </nav>
            </Transition>
        </div>
    </header>
</template>
