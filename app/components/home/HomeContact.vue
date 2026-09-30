<script setup lang="ts">
import meta, { socialLinks } from "~/app.meta";

const { t } = useI18n();
</script>

<template>
    <section id="contact" class="relative scroll-mt-24 overflow-hidden pt-8 pb-28 md:h-[1040px] md:pt-36 md:pb-0"
        aria-labelledby="contact-title">
        <ArtConverge class="mx-auto mb-8 block h-[220px] w-full max-w-[390px] md:hidden" />
        <ArtConverge variant="edge" class="absolute inset-0 hidden size-full md:block rtl:-scale-x-100" />

        <div class="shell relative">
            <SiteSectionHeader :label="t('contact.label')" :caption="t('contact.caption')" />

            <h2 id="contact-title"
                class="mt-8 -ms-1 font-display text-[3.5rem] leading-[0.92] font-semibold tracking-[-0.045em] md:mt-20 md:-ms-2 md:text-[8.5rem] md:leading-[0.9] md:tracking-[-0.05em] rtl:leading-[1.2]">
                {{ t("contact.t1") }}<br>{{ t("contact.t2") }}<span class="text-gold">.</span>
            </h2>
            <p class="mt-6 max-w-[520px] text-[17px] leading-normal text-subtle md:mt-16 md:text-[22px]">
                {{ t("contact.lead") }} <NuxtLink to="/contact">
                    <span class="text-foreground">{{ t("contact.talk")
                        }}
                    </span>
                </NuxtLink>
            </p>

            <div class="mt-7 flex flex-col gap-4 md:mt-12 md:flex-row md:items-center md:gap-7">
                <NuxtLink :to="`mailto:${meta.contactEmail}`"
                    class="flex items-baseline justify-between gap-4 rounded-[10px] bg-foreground px-5 py-5 font-display text-lg font-medium text-background no-underline md:rounded-none md:border-b md:border-gold md:bg-transparent md:px-0 md:pt-0 md:pb-2.5 md:text-[3.75rem] md:leading-none md:tracking-[-0.04em] md:text-foreground">
                    <span dir="ltr" class="latin-display">{{ meta.contactEmail }}</span>
                    <SiteArrow direction="external" class="text-[1.2em] md:text-[0.72em] md:text-gold" />
                </NuxtLink>
                <SiteCopyButton :value="meta.contactEmail" :label="t('contact.copy')"
                    :copied-label="t('contact.copied')" variant="outline" size="label"
                    class="self-start md:self-auto md:h-11" />
            </div>

            <UiButton as-child variant="link" size="inline" class="mt-8 md:mt-10 md:text-[17px]">
                <NuxtLinkLocale to="/contact">{{ t("contact.form") }}
                    <SiteArrow />
                </NuxtLinkLocale>
            </UiButton>

            <div class="mt-6 flex flex-wrap gap-x-8 md:mt-8">
                <UiButton v-for="l in socialLinks" :key="l.label" as-child variant="ghost" size="inline"
                    class="py-3 text-base">
                    <NuxtLink :to="l.href" target="_blank">{{ l.label }}
                        <SiteArrow direction="external" />
                    </NuxtLink>
                </UiButton>
            </div>
        </div>
        <span aria-hidden="true" class="eyebrow absolute end-[140px] top-[752px] hidden text-subtle md:block">{{
            t("contact.converge") }}</span>
    </section>
</template>
