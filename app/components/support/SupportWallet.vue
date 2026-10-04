<script setup lang="ts">
/** One USDT address: QR, the address with copy, and which network to send on. */
import type { Wallet } from "~/data/support";

const props = defineProps<{ wallet: Wallet }>();
const { t } = useI18n();

const network = computed(() => `${props.wallet.chain} (${props.wallet.network})`);
// The first and last characters are what people compare after pasting (address-poisoning
// attacks swap in look-alikes that only match a few characters), so they stand out.
const parts = computed(() => {
    const a = props.wallet.address;
    return { head: a.slice(0, 6), middle: a.slice(6, -6), tail: a.slice(-6) };
});
</script>

<template>
    <article
        class="grid grid-cols-1 gap-6 rounded-lg border border-hairline bg-surface p-5 sm:grid-cols-[156px_1fr] md:p-6"
    >
        <SupportQr
            :value="wallet.address"
            :label="t('supportPage.crypto.qr', { network })"
            class="w-[156px]"
        />
        <div class="flex min-w-0 flex-col gap-4">
            <div class="flex items-center gap-3">
                <span
                    class="grid size-11 shrink-0 place-items-center rounded-full border border-hairline-strong text-foreground"
                >
                    <Icon name="tm:tether" class="size-5" />
                </span>
                <div class="flex min-w-0 flex-col gap-1">
                    <span class="font-display text-xl leading-none font-semibold">{{
                        t("supportPage.crypto.token")
                    }}</span>
                    <span
                        dir="ltr"
                        class="eyebrow latin inline-flex items-center gap-1.5 self-start text-subtle"
                    >
                        <Icon :name="wallet.icon" class="size-3.5" />
                        {{ wallet.chain }} · {{ wallet.network }}
                    </span>
                </div>
            </div>

            <p
                dir="ltr"
                class="latin font-mono text-[15px] leading-relaxed [overflow-wrap:anywhere] text-subtle select-all"
            >
                <span class="text-gold">{{ parts.head }}</span
                >{{ parts.middle }}<span class="text-gold">{{ parts.tail }}</span>
            </p>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <SiteCopyButton
                    :value="wallet.address"
                    :label="t('supportPage.crypto.copy')"
                    :copied-label="t('supportPage.crypto.copied')"
                    variant="outline"
                    size="label"
                    class="h-9"
                />
                <span class="text-[13px] leading-snug text-subtle">{{
                    t("supportPage.crypto.verify")
                }}</span>
            </div>

            <p
                class="flex items-start gap-2 border-t border-hairline pt-4 text-[13px] leading-snug text-subtle"
            >
                <Icon name="tm:alert" class="mt-px size-4 shrink-0 text-gold" />
                <!-- The network name stays an LTR Latin island, or Persian digits creep into "BEP20". -->
                <i18n-t keypath="supportPage.crypto.warning" tag="span" scope="global">
                    <template #network>
                        <span dir="ltr" class="latin">{{ network }}</span>
                    </template>
                </i18n-t>
            </p>
        </div>
    </article>
</template>
