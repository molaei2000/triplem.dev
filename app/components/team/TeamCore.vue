<script setup lang="ts">
/**
 * The three Ms. Card N sits under slash N: hovering or focusing it reports N,
 * which lights that slash in the header's 3D mark.
 */
import { CORE_TEAM } from "~/data/team";

defineProps<{ active: number }>();
const emit = defineEmits<{ hover: [index: number] }>();
const { localeProperties } = useI18n();
const dir = computed(() => localeProperties.value.dir ?? "ltr");
</script>

<template>
    <!-- Forced LTR like the logo, so card N stays under slash N in every language. -->
    <ul dir="ltr" class="grid grid-cols-1 gap-y-14 sm:grid-cols-3 sm:gap-x-4 md:gap-x-6">
        <li
            v-for="(m, i) in CORE_TEAM"
            :key="m.id"
            :dir="dir"
            @mouseenter="emit('hover', i)"
            @mouseleave="emit('hover', -1)"
            @focusin="emit('hover', i)"
            @focusout="emit('hover', -1)"
        >
            <SiteReveal :delay="i * 0.08" class="h-full">
                <TeamCard :member="m" :index="i" :active="active === i" />
            </SiteReveal>
        </li>
    </ul>
</template>
