<script setup lang="ts">
import meta from "~/app.meta";
import { REYMIT_URL, WALLETS } from "~/data/support";

const { t, locale } = useI18n();
const localePath = useLocalePath();

useSeoMeta({
    title: () => t("supportPage.metaTitle"),
    description: () => t("supportPage.metaDescription"),
    ogTitle: () => t("supportPage.metaTitle"),
    ogDescription: () => t("supportPage.metaDescription"),
    ogType: "website",
});

useJsonLd(() => ({
    "@type": "WebPage",
    name: t("supportPage.metaTitle"),
    url: `${meta.siteUrl}${localePath("/support")}`,
    inLanguage: locale.value === "fa" ? "fa-IR" : "en-US",
    potentialAction: {
        "@type": "DonateAction",
        target: REYMIT_URL,
        recipient: { "@type": "Person", name: meta.author.name, url: meta.siteUrl },
    },
}));

const uses = [0, 1, 2];
</script>

<template>
    <section class="shell pt-20 pb-20 md:pt-28 md:pb-40" aria-labelledby="support-page-title">
        <SiteSectionHeader
            :label="t('supportPage.label')"
            :caption="t('supportPage.caption')"
            coord="p · 05"
        />

        <div class="mt-10 grid-12 items-start gap-y-16 md:mt-20">
            <div class="col-span-4 flex flex-col gap-8 md:sticky md:top-32 md:col-span-5 md:gap-10">
                <h1
                    id="support-page-title"
                    class="font-display text-[4.5rem] leading-[0.88] font-semibold tracking-[-0.05em] md:text-[7rem] md:leading-[0.86] lg:text-[8.5rem] rtl:leading-[1.15]"
                >
                    {{ t("supportPage.title") }}<span class="text-gold">.</span>
                </h1>
                <p class="max-w-[440px] text-[17px] leading-relaxed text-subtle md:text-[19px]">
                    {{ t("supportPage.lead") }}
                </p>
                <div class="flex max-w-[440px] flex-col">
                    <span class="eyebrow border-b border-hairline pb-3 text-gold">{{
                        t("supportPage.usesLabel")
                    }}</span>
                    <ol>
                        <li
                            v-for="i in uses"
                            :key="i"
                            class="grid grid-cols-[32px_1fr] gap-2 border-b border-hairline py-3.5 text-[15px] leading-snug"
                        >
                            <span class="eyebrow pt-0.5 text-faint">0{{ i + 1 }}</span>
                            <span>{{ t(`supportPage.uses.${i}`) }}</span>
                        </li>
                    </ol>
                </div>
                <p class="max-w-[440px] text-[15px] leading-relaxed text-subtle">
                    {{ t("supportPage.free") }}
                </p>
            </div>

            <div class="col-span-4 flex flex-col gap-14 md:col-span-6 md:col-start-7">
                <section aria-labelledby="support-reymit" class="flex flex-col gap-6">
                    <div
                        class="flex items-baseline justify-between gap-4 border-b border-hairline pb-3"
                    >
                        <h2 id="support-reymit" class="eyebrow text-foreground">
                            01 · {{ t("supportPage.reymit.label") }}
                        </h2>
                        <span class="eyebrow text-faint">{{ t("supportPage.reymit.where") }}</span>
                    </div>
                    <SupportReymit />
                </section>

                <section aria-labelledby="support-crypto" class="flex flex-col gap-6">
                    <div
                        class="flex items-baseline justify-between gap-4 border-b border-hairline pb-3"
                    >
                        <h2 id="support-crypto" class="eyebrow text-foreground">
                            02 · {{ t("supportPage.crypto.label") }}
                        </h2>
                        <span class="eyebrow text-faint">{{ t("supportPage.crypto.where") }}</span>
                    </div>
                    <p class="max-w-[520px] text-[15px] leading-relaxed text-subtle md:text-[17px]">
                        {{ t("supportPage.crypto.intro") }}
                    </p>
                    <SupportWallet v-for="w in WALLETS" :key="w.id" :wallet="w" />
                </section>
            </div>
        </div>
    </section>
</template>
