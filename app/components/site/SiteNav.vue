<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const links = useNavLinks();
const { y } = useWindowScroll();
const scrolled = computed(() => y.value > 24);
const open = shallowRef(false);

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
                    <UiButton
                        v-for="l in links"
                        :key="l.key"
                        as-child
                        variant="ghost"
                        class="px-3.5 font-normal aria-[current=page]:text-foreground"
                    >
                        <NuxtLinkLocale :to="l.to" :aria-current="l.current">{{ t(`nav.${l.key}`) }}</NuxtLinkLocale>
                    </UiButton>
                </nav>

                <div class="flex items-center gap-2">
                    <SiteLocaleSwitch class="hidden md:flex" />
                    <SiteThemeToggle />
                    <UiButton as-child variant="ink" class="hidden md:inline-flex">
                        <NuxtLinkLocale to="/contact">{{ t("nav.contact") }}</NuxtLinkLocale>
                    </UiButton>
                    <UiButton
                        variant="ghost"
                        size="icon-lg"
                        class="text-foreground md:hidden [&_.iconify]:size-5"
                        :aria-label="open ? t('nav.menuClose') : t('nav.menuOpen')"
                        :aria-expanded="open"
                        aria-controls="mobile-menu"
                        @click="open = !open"
                    >
                        <Icon :name="open ? 'tm:close' : 'tm:menu'" class="rtl:-scale-x-100" />
                    </UiButton>
                </div>
            </div>

            <Transition
                enter-active-class="transition duration-300 ease-out-expo"
                enter-from-class="opacity-0 -translate-y-2"
                leave-active-class="transition duration-200"
                leave-to-class="opacity-0 -translate-y-2"
            >
                <SiteMobileMenu v-show="open" id="mobile-menu" :links="links" />
            </Transition>
        </div>
    </header>
</template>
