import type { MaybeElementRef } from "@vueuse/core";

/** How far the reader is through `target`, 0–100, measured at 40% of the viewport. */
export function useReadingProgress(target: MaybeElementRef) {
    const { top, height } = useElementBounding(target);
    const { height: vh } = useWindowSize();
    return computed(() => {
        if (!height.value) return 0;
        const p = (vh.value * 0.4 - top.value) / height.value;
        return Math.round(Math.min(1, Math.max(0, p)) * 100);
    });
}

/**
 * The id of the last `h2[id]`/`h3[id]` inside `root` that has scrolled past
 * `line` (a fraction of the viewport height). Drives the "On this page" highlight.
 */
export function useActiveHeading(root: Readonly<Ref<HTMLElement | null | undefined>>, line = 0.3) {
    const active = shallowRef<string>();
    let headings: HTMLElement[] = [];

    function update() {
        const limit = window.innerHeight * line;
        let id = headings[0]?.id;
        for (const h of headings) {
            if (h.getBoundingClientRect().top > limit) break;
            id = h.id;
        }
        active.value = id;
    }

    onMounted(() => {
        headings = [...(root.value?.querySelectorAll<HTMLElement>("h2[id], h3[id]") ?? [])];
        update();
    });
    useEventListener("scroll", update, { passive: true });

    return active;
}

export interface TocItem {
    id: string;
    text: string;
    sub: boolean;
}

interface TocLink {
    id: string;
    text: string;
    children?: TocLink[];
}

/** Flattens Nuxt Content's toc (h2s with nested h3s) into one list. */
export function flattenToc(links: TocLink[] = []): TocItem[] {
    return links.flatMap((l) => [
        { id: l.id, text: l.text, sub: false },
        ...(l.children ?? []).map((c) => ({ id: c.id, text: c.text, sub: true })),
    ]);
}
