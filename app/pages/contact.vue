<script setup lang="ts">
import meta, { socialLinks } from "~/app.meta";

const { t } = useI18n();
const localePath = useLocalePath();

useSeoMeta({
    title: () => t("contactPage.metaTitle"),
    description: () => t("contactPage.metaDescription"),
    ogTitle: () => t("contactPage.metaTitle"),
    ogDescription: () => t("contactPage.metaDescription"),
    ogType: "website",
});

useJsonLd(() => ({
    "@type": "ContactPage",
    name: t("contactPage.metaTitle"),
    url: `${meta.siteUrl}${localePath("/contact")}`,
    mainEntity: {
        "@type": "Person",
        name: meta.author.name,
        email: `mailto:${meta.contactEmail}`,
        sameAs: socialLinks.map((l) => l.href),
    },
}));
</script>

<template>
    <section class="shell pt-20 pb-20 md:pt-28 md:pb-40" aria-labelledby="contact-page-title">
        <SiteSectionHeader
            :label="t('contactPage.label')"
            :caption="t('contact.caption')"
            coord="p · 04"
        />

        <div class="mt-10 grid-12 items-start gap-y-16 md:mt-20">
            <div class="col-span-4 flex flex-col gap-8 md:col-span-5 md:gap-10">
                <h1
                    id="contact-page-title"
                    class="font-display text-[4.5rem] leading-[0.88] font-semibold tracking-[-0.05em] md:text-[8.5rem] md:leading-[0.86] rtl:leading-[1.15]"
                >
                    {{ t("contactPage.title") }}<span class="text-gold">.</span>
                </h1>
                <p class="max-w-[440px] text-[17px] leading-relaxed text-subtle md:text-[19px]">
                    {{ t("contactPage.lead") }}
                </p>
                <ContactChannels />
            </div>

            <!-- No scroll reveal here: the form is the page's main action and must never start hidden. -->
            <ContactForm class="col-span-4 md:col-span-6 md:col-start-7" />
        </div>
    </section>
</template>
