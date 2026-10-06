/**
 * The Stack graph. Positions live in a 628 × 520 design box; the three bands
 * (language / framework / craft) are the three layers. Descriptions are in
 * i18n under `stack.d.<id>`.
 */
export type StackGroup = "language" | "framework" | "craft";
export type StackId =
    | "ts"
    | "js"
    | "html"
    | "vue"
    | "nuxt"
    | "react"
    | "next"
    | "tw"
    | "arch"
    | "vuetify"
    | "redux"
    | "tanstack"
    | "nextauth"
    | "radix"
    | "reacthookform"
    | "zod"
    | "docker"
    | "arch"
    | "sentry";

export interface StackNode {
    id: StackId;
    label: string;
    x: number;
    y: number;
    group: StackGroup;
    primary?: boolean;
}

export const STACK_BOX = { width: 628, height: 520 } as const;

export const STACK_GROUPS: StackGroup[] = ["language", "framework", "craft"];

export const STACK_NODES: StackNode[] = [
    { id: "ts", label: "TypeScript", x: 314, y: 64, group: "language" },
    { id: "js", label: "JavaScript", x: 170, y: 146, group: "language" },
    { id: "html", label: "HTML & CSS", x: 470, y: 146, group: "language" },
    { id: "vue", label: "Vue", x: 80, y: 292, group: "framework" },
    {
        id: "nuxt",
        label: "Nuxt.js",
        x: 240,
        y: 292,
        group: "framework",
        primary: true,
    },
    { id: "react", label: "React", x: 392, y: 292, group: "framework" },
    { id: "next", label: "Next.js", x: 548, y: 292, group: "framework" },
    { id: "tw", label: "Tailwind", x: 150, y: 452, group: "craft" },
    { id: "arch", label: "Architecture", x: 460, y: 452, group: "craft" },
    { id: "vuetify", label: "Vuetify", x: 300, y: 452, group: "craft" },
];

export const STACK_EDGES: [StackId, StackId][] = [
    ["ts", "js"],
    ["ts", "html"],
    ["ts", "nuxt"],
    ["ts", "next"],
    ["js", "vue"],
    ["js", "react"],
    ["vue", "nuxt"],
    ["react", "next"],
    ["nuxt", "tw"],
    ["next", "tw"],
    ["nuxt", "arch"],
    ["next", "arch"],
    ["html", "tw"],
    ["ts", "arch"],
    ["vuetify", "vue"],
    ["vuetify", "nuxt"],
];

export const STACK_BY_ID = Object.fromEntries(STACK_NODES.map((n) => [n.id, n])) as Record<
    StackId,
    StackNode
>;

/** Ids directly connected to `id`. */
export function stackNeighbours(id: StackId) {
    const out = new Set<StackId>();
    for (const [a, b] of STACK_EDGES) {
        if (a === id) out.add(b);
        if (b === id) out.add(a);
    }
    return out;
}
