<script setup lang="ts">
type Group = "language" | "framework" | "craft";
interface Node { id: string; label: string; x: number; y: number; g: Group; primary?: boolean }

const { t, localeProperties } = useI18n();
const rtl = computed(() => localeProperties.value.dir === "rtl");

// Positions in a 628 × 520 design box; three bands = three layers.
const W = 628;
const H = 520;
const NODES: Node[] = [
    { id: "ts", label: "TypeScript", x: 314, y: 64, g: "language" },
    { id: "js", label: "JavaScript", x: 170, y: 146, g: "language" },
    { id: "html", label: "HTML & CSS", x: 470, y: 146, g: "language" },
    { id: "vue", label: "Vue", x: 80, y: 292, g: "framework" },
    { id: "nuxt", label: "Nuxt", x: 240, y: 292, g: "framework", primary: true },
    { id: "react", label: "React", x: 392, y: 292, g: "framework" },
    { id: "next", label: "Next.js", x: 548, y: 292, g: "framework" },
    { id: "tw", label: "Tailwind", x: 200, y: 452, g: "craft" },
    { id: "arch", label: "Architecture", x: 440, y: 452, g: "craft" },
];
const EDGES: [string, string][] = [
    ["ts", "js"], ["ts", "html"], ["ts", "nuxt"], ["ts", "next"], ["js", "vue"], ["js", "react"], ["vue", "nuxt"],
    ["react", "next"], ["nuxt", "tw"], ["next", "tw"], ["nuxt", "arch"], ["next", "arch"], ["html", "tw"], ["ts", "arch"],
];
const byId = Object.fromEntries(NODES.map(n => [n.id, n])) as Record<string, Node>;
const GROUPS: Group[] = ["language", "framework", "craft"];

const sel = ref("nuxt");
const related = computed(() => {
    const r = new Set<string>();
    for (const [a, b] of EDGES) {
        if (a === sel.value) r.add(b);
        if (b === sel.value) r.add(a);
    }
    return r;
});
const current = computed(() => byId[sel.value]!);
const relatedLabels = computed(() => NODES.filter(n => related.value.has(n.id)).map(n => n.label).join(" · "));
const px = (x: number) => (rtl.value ? W - x : x);

function nodeClass(id: string) {
    if (id === sel.value) return "border-gold bg-gold text-on-gold";
    if (related.value.has(id)) return "border-gold-line text-foreground";
    return "border-hairline-strong text-subtle hover:text-foreground";
}
function dotClass(id: string) {
    if (id === sel.value) return "bg-on-gold";
    if (related.value.has(id)) return "bg-gold";
    return "bg-faint";
}
</script>

<template>
    <section id="stack" class="shell scroll-mt-24 pb-32 md:pb-40" aria-labelledby="stack-title">
        <SiteSectionHeader :label="t('stack.label')" :caption="t('stack.caption')" coord="y · 2340" />

        <div class="mt-12 grid-12 items-start gap-y-10 md:mt-18">
            <div class="col-span-4 flex flex-col gap-5 md:col-span-3">
                <h2 id="stack-title" class="font-display text-[2.25rem] leading-[1.02] font-medium tracking-[-0.03em] md:text-[2.75rem]">
                    {{ t("stack.title") }}
                </h2>
                <p class="text-[17px] leading-relaxed text-subtle">{{ t("stack.intro") }}</p>
            </div>

            <!-- desktop: connected graph -->
            <div role="group" :aria-label="t('stack.title')" class="relative col-span-6 col-start-4 hidden aspect-[628/520] md:block">
                <div class="absolute inset-x-0 top-[39.4%] border-t border-dashed border-hairline" />
                <div class="absolute inset-x-0 top-[72.1%] border-t border-dashed border-hairline" />
                <span class="eyebrow absolute start-0 top-0 text-faint">{{ t("stack.groups.language") }}</span>
                <span class="eyebrow absolute start-0 top-[41.7%] text-faint">{{ t("stack.groups.framework") }}</span>
                <span class="eyebrow absolute start-0 top-[74.4%] text-faint">{{ t("stack.groups.craft") }}</span>
                <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="absolute inset-0 size-full" aria-hidden="true">
                    <line
                        v-for="([a, b], i) in EDGES"
                        :key="i"
                        :x1="px(byId[a]!.x)" :y1="byId[a]!.y" :x2="px(byId[b]!.x)" :y2="byId[b]!.y"
                        vector-effect="non-scaling-stroke"
                        :stroke="a === sel || b === sel ? 'var(--gold-line)' : 'var(--hairline-strong)'"
                        class="transition-[stroke] duration-300"
                    />
                </svg>
                <button
                    v-for="n in NODES"
                    :key="n.id"
                    type="button"
                    class="absolute inline-flex h-10 -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-md border bg-background px-4 text-[15px] whitespace-nowrap transition-colors duration-300"
                    :class="nodeClass(n.id)"
                    :style="{ left: `${(px(n.x) / W) * 100}%`, top: `${(n.y / H) * 100}%` }"
                    :aria-pressed="n.id === sel"
                    @click="sel = n.id"
                    @mouseenter="sel = n.id"
                    @focus="sel = n.id"
                >
                    <span class="size-1.5 rounded-full" :class="dotClass(n.id)" />{{ n.label }}
                </button>
            </div>

            <!-- mobile: three bands of chips -->
            <div class="col-span-4 flex flex-col gap-5 md:hidden">
                <div v-for="g in GROUPS" :key="g" class="flex flex-col gap-2.5">
                    <span class="eyebrow text-faint">{{ t(`stack.groups.${g}`) }}</span>
                    <div class="flex flex-wrap gap-2">
                        <button
                            v-for="n in NODES.filter(x => x.g === g)"
                            :key="n.id"
                            type="button"
                            class="inline-flex h-11 items-center gap-2 rounded-md border px-3.5 text-[15px] transition-colors"
                            :class="nodeClass(n.id)"
                            :aria-pressed="n.id === sel"
                            @click="sel = n.id"
                        >
                            <span class="size-1.5 rounded-full" :class="dotClass(n.id)" />{{ n.label }}
                        </button>
                    </div>
                </div>
            </div>

            <aside aria-live="polite" class="col-span-4 flex flex-col gap-4.5 rounded-lg border border-hairline-strong bg-surface p-6 md:col-span-3 md:col-start-10 md:p-7">
                <span class="eyebrow text-gold">{{ current.primary ? t("stack.groups.primary") : t(`stack.groups.${current.g}`) }}</span>
                <h3 class="font-display text-[2.5rem] leading-none font-medium tracking-[-0.03em]">{{ current.label }}</h3>
                <p class="leading-relaxed text-subtle">{{ t(`stack.d.${current.id}`) }}</p>
                <div class="flex flex-col gap-2 border-t border-hairline pt-4">
                    <span class="eyebrow text-faint">{{ t("stack.connects") }}</span>
                    <span class="text-[15px]">{{ relatedLabels }}</span>
                </div>
                <div class="flex flex-col gap-2 border-t border-hairline pt-4">
                    <span class="eyebrow text-faint">{{ t("stack.shipped") }}</span>
                    <span class="text-[15px] text-subtle">{{ t("stack.shippedV") }}</span>
                </div>
            </aside>
        </div>
    </section>
</template>
