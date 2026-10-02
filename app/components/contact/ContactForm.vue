<script setup lang="ts">
/**
 * Contact form → POST /api/contact. Validation uses the same zod schema as
 * the server, but messages are per field and translated here. The honeypot
 * and fill time are the two anti-spam signals the server checks first.
 */
import type { ContactField, ContactRequest, ContactTopic } from "#shared/contact";
import { CONTACT_LIMITS, CONTACT_TOPICS, contactSchema } from "#shared/contact";
import meta from "~/app.meta";

interface ContactApiError {
    statusCode?: number;
    data?: { data?: { fields?: string[] } };
}

const { t, locale } = useI18n();
const route = useRoute();

/** `?topic=collaboration` (e.g. from /team) preselects a topic. */
const initialTopic = (): ContactTopic => {
    const q = route.query.topic;
    return typeof q === "string" && (CONTACT_TOPICS as readonly string[]).includes(q)
        ? (q as ContactTopic)
        : "project";
};
const blank = () => ({ name: "", email: "", topic: initialTopic(), message: "" });
const form = reactive(blank());
const website = shallowRef(""); // honeypot
const errors = ref<Partial<Record<ContactField, string>>>({});
const status = shallowRef<"idle" | "sending" | "sent" | "failed" | "limited">("idle");
const sentTo = shallowRef("");
const sending = computed(() => status.value === "sending");

let renderedAt = 0;
onMounted(() => (renderedAt = Date.now()));

// Pressing the active topic again would deselect it; keep the current one instead.
const topic = computed({
    get: () => form.topic,
    set: (v: unknown) => {
        if (typeof v === "string" && (CONTACT_TOPICS as readonly string[]).includes(v))
            form.topic = v as ContactTopic;
    },
});

const ids = { name: "cf-name", email: "cf-email", message: "cf-message" } as const;
const errorId = (f: keyof typeof ids) => `${ids[f]}-error`;

function toErrors(fields: string[]) {
    const out: Partial<Record<ContactField, string>> = {};
    for (const f of fields) {
        if (f === "name" || f === "email" || f === "topic" || f === "message")
            out[f] = t(`contactPage.form.errors.${f}`);
    }
    return out;
}

// An edit clears that field's error; the next submit re-checks everything.
for (const f of ["name", "email", "message"] as const) {
    watch(
        () => form[f],
        () => {
            if (errors.value[f]) errors.value = { ...errors.value, [f]: undefined };
        },
    );
}

const formEl = useTemplateRef<HTMLFormElement>("formEl");
const doneEl = useTemplateRef<HTMLElement>("doneEl");

function focusFirstError() {
    const first = (["name", "email", "message"] as const).find((f) => errors.value[f]);
    if (first) formEl.value?.querySelector<HTMLElement>(`#${ids[first]}`)?.focus();
}

async function submit() {
    if (sending.value) return;
    const check = contactSchema.safeParse({ ...form, locale: locale.value });
    if (!check.success) {
        errors.value = toErrors(check.error.issues.map((i) => String(i.path[0])));
        await nextTick();
        focusFirstError();
        return;
    }

    status.value = "sending";
    try {
        await $fetch("/api/contact", {
            method: "POST",
            body: {
                ...form,
                locale: locale.value,
                website: website.value,
                elapsed: Date.now() - renderedAt,
            } satisfies ContactRequest,
        });
        sentTo.value = form.email.trim();
        status.value = "sent";
        await nextTick();
        doneEl.value?.focus();
    } catch (e) {
        const err = e as ContactApiError;
        if (err.statusCode === 422) {
            errors.value = toErrors(err.data?.data?.fields ?? []);
            status.value = "idle";
            await nextTick();
            focusFirstError();
        } else {
            status.value = err.statusCode === 429 ? "limited" : "failed";
        }
    }
}

function reset() {
    Object.assign(form, blank());
    errors.value = {};
    status.value = "idle";
    renderedAt = Date.now();
}
</script>

<template>
    <div class="rounded-lg border border-hairline-strong bg-surface p-6 md:p-10">
        <form
            v-if="status !== 'sent'"
            ref="formEl"
            novalidate
            class="relative"
            @submit.prevent="submit"
        >
            <div class="mb-8 flex items-baseline justify-between gap-4">
                <h2
                    class="font-display text-[1.75rem] leading-none font-medium tracking-[-0.02em] md:text-[2rem]"
                >
                    {{ t("contactPage.form.title") }}
                </h2>
                <span aria-hidden="true" class="eyebrow text-faint">/// form</span>
            </div>

            <UiFieldGroup>
                <UiField :data-invalid="errors.name ? true : undefined">
                    <UiFieldLabel :for="ids.name">{{ t("contactPage.form.name") }}</UiFieldLabel>
                    <UiInput
                        :id="ids.name"
                        v-model="form.name"
                        autocomplete="name"
                        required
                        :maxlength="CONTACT_LIMITS.name"
                        :placeholder="t('contactPage.form.namePh')"
                        :aria-invalid="errors.name ? true : undefined"
                        :aria-describedby="errors.name ? errorId('name') : undefined"
                        class="h-12 text-[15px] md:text-[15px]"
                    />
                    <UiFieldError
                        :id="errorId('name')"
                        :errors="errors.name ? [errors.name] : undefined"
                    />
                </UiField>

                <UiField :data-invalid="errors.email ? true : undefined">
                    <UiFieldLabel :for="ids.email">{{ t("contactPage.form.email") }}</UiFieldLabel>
                    <UiInput
                        :id="ids.email"
                        v-model="form.email"
                        type="email"
                        dir="ltr"
                        autocomplete="email"
                        inputmode="email"
                        required
                        :maxlength="CONTACT_LIMITS.email"
                        :placeholder="t('contactPage.form.emailPh')"
                        :aria-invalid="errors.email ? true : undefined"
                        :aria-describedby="errors.email ? errorId('email') : undefined"
                        class="latin h-12 text-[15px] md:text-[15px] rtl:text-end"
                    />
                    <UiFieldError
                        :id="errorId('email')"
                        :errors="errors.email ? [errors.email] : undefined"
                    />
                </UiField>

                <UiFieldSet>
                    <UiFieldLegend variant="label">{{ t("contactPage.form.topic") }}</UiFieldLegend>
                    <UiToggleGroup
                        v-model="topic"
                        type="single"
                        variant="chip"
                        size="chip"
                        :spacing="2"
                        class="w-auto flex-wrap"
                    >
                        <UiToggleGroupItem v-for="x in CONTACT_TOPICS" :key="x" :value="x">{{
                            t(`contactPage.topics.${x}`)
                        }}</UiToggleGroupItem>
                    </UiToggleGroup>
                </UiFieldSet>

                <UiField :data-invalid="errors.message ? true : undefined">
                    <UiFieldLabel :for="ids.message">{{
                        t("contactPage.form.message")
                    }}</UiFieldLabel>
                    <UiTextarea
                        :id="ids.message"
                        v-model="form.message"
                        required
                        rows="6"
                        dir="auto"
                        :maxlength="CONTACT_LIMITS.message.max"
                        :placeholder="t('contactPage.form.messagePh')"
                        :aria-invalid="errors.message ? true : undefined"
                        :aria-describedby="errors.message ? errorId('message') : undefined"
                        class="min-h-40 text-[15px] md:text-[15px]"
                    />
                    <UiFieldError
                        :id="errorId('message')"
                        :errors="errors.message ? [errors.message] : undefined"
                    />
                </UiField>

                <!-- Honeypot: off-screen and out of the tab order, so only bots fill it. -->
                <div
                    aria-hidden="true"
                    class="absolute -start-[9999px] top-0 size-px overflow-hidden"
                >
                    <label for="cf-website">Website</label>
                    <input
                        id="cf-website"
                        v-model="website"
                        type="text"
                        name="website"
                        tabindex="-1"
                        autocomplete="off"
                    />
                </div>

                <UiAlert
                    v-if="status === 'failed' || status === 'limited'"
                    variant="destructive"
                    class="bg-transparent"
                >
                    <UiAlertTitle>{{ t("contactPage.form.failTitle") }}</UiAlertTitle>
                    <UiAlertDescription>
                        <i18n-t
                            :keypath="
                                status === 'limited'
                                    ? 'contactPage.form.limited'
                                    : 'contactPage.form.fail'
                            "
                            tag="p"
                            scope="global"
                        >
                            <template #email>
                                <NuxtLink
                                    :to="`mailto:${meta.contactEmail}`"
                                    dir="ltr"
                                    class="latin underline underline-offset-4"
                                    >{{ meta.contactEmail }}</NuxtLink
                                >
                            </template>
                        </i18n-t>
                    </UiAlertDescription>
                </UiAlert>

                <div
                    class="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                    <span class="text-sm text-faint">{{ t("contactPage.form.required") }}</span>
                    <UiButton type="submit" variant="gold" size="lg" :disabled="sending">
                        <UiSpinner
                            v-if="sending"
                            data-icon="inline-start"
                            :aria-label="t('contactPage.form.sending')"
                        />
                        {{ sending ? t("contactPage.form.sending") : t("contactPage.form.send") }}
                        <SiteArrow v-if="!sending" data-icon="inline-end" />
                    </UiButton>
                </div>
            </UiFieldGroup>
        </form>

        <div v-else class="flex flex-col items-start gap-5 py-6 md:py-10">
            <SiteMark :size="56" :stroke="3.4" />
            <h2
                ref="doneEl"
                tabindex="-1"
                class="font-display text-[2.5rem] leading-none font-medium tracking-[-0.03em] outline-none md:text-[3.25rem]"
            >
                {{ t("contactPage.sent.title") }}<span class="text-gold">.</span>
            </h2>
            <p role="status" class="max-w-[420px] text-[17px] leading-relaxed text-subtle">
                <i18n-t keypath="contactPage.sent.body" scope="global">
                    <template #email>
                        <span dir="ltr" class="latin text-foreground">{{ sentTo }}</span>
                    </template>
                </i18n-t>
            </p>
            <UiButton variant="outline" size="label" @click="reset">{{
                t("contactPage.sent.again")
            }}</UiButton>
        </div>
    </div>
</template>
