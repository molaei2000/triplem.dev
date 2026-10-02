<script setup lang="ts">
/** Developers and designers outside the core: avatar (initial until a photo is set), name, discipline. */
import { COLLABORATORS } from "~/data/team";

const { t, te } = useI18n();
const key = (id: string, k: string) => `teamPage.people.${id}.${k}`;
</script>

<template>
    <ul class="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        <li v-for="(m, i) in COLLABORATORS" :key="m.id">
            <SiteReveal
                :delay="i * 0.06"
                class="flex h-full flex-col gap-5 border-t border-hairline-strong pt-5"
            >
                <UiAvatar class="size-16 md:size-20">
                    <UiAvatarImage v-if="m.photo" :src="m.photo.src" alt="" />
                    <UiAvatarFallback>
                        <span
                            aria-hidden="true"
                            class="font-display text-2xl text-gold md:text-[1.75rem]"
                            >{{ t(key(m.id, "name")).charAt(0) }}</span
                        >
                    </UiAvatarFallback>
                </UiAvatar>
                <div class="flex flex-col gap-2">
                    <h3
                        class="font-display text-2xl leading-none font-medium tracking-[-0.02em] md:text-[2rem]"
                    >
                        {{ t(key(m.id, "name"))
                        }}<template v-if="te(key(m.id, 'surname'))">
                            {{ t(key(m.id, "surname")) }}</template
                        >
                    </h3>
                    <p class="eyebrow text-subtle">{{ t(`teamPage.roles.${m.role}`) }}</p>
                    <p v-if="te(key(m.id, 'bio'))" class="text-[15px] leading-relaxed text-subtle">
                        {{ t(key(m.id, "bio")) }}
                    </p>
                </div>
                <div v-if="m.links?.length" class="mt-auto flex flex-wrap gap-x-4 gap-y-1">
                    <UiButton
                        v-for="l in m.links"
                        :key="l.href"
                        as-child
                        variant="ghost"
                        size="inline"
                    >
                        <NuxtLink :to="l.href" target="_blank"
                            >{{ l.label }} <SiteArrow direction="external"
                        /></NuxtLink>
                    </UiButton>
                </div>
            </SiteReveal>
        </li>
    </ul>
</template>
