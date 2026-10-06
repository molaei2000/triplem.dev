import type { StackId } from "./stack";
/**
 * Structure for the Experience timeline (most recent first). Everything a
 * reader sees as prose lives in i18n under `experience.items.<id>`; this file
 * holds what doesn't translate: screenshots, links, stack.
 */
export interface ExperienceShot {
    src: string;
    width: number;
    height: number;
}

export interface ExperienceEntry {
    id: string;
    /** Label shown in the frame's address bar. */
    host: string;
    link?: string;
    stack: StackId[];
    /** Number of `highlights.N` messages for this entry. */
    highlights: number;
    /** First shot is the main frame; a second one overlaps it. `alt.N` in i18n. */
    shots: ExperienceShot[];
}

export const experience: ExperienceEntry[] = [
    {
        id: "tarazoo",
        host: "etarazoo.com",
        link: "https://etarazoo.com/",
        stack: [
            "ts",
            "js",
            "next",
            "react",
            "ts",
            "tanstack",
            "redux",
            "nextauth",
            "tw",
            "radix",
            "reacthookform",
            "zod",
            "docker",
            "sentry",
            "html",
            "arch",
        ],
        highlights: 3,
        shots: [{ src: "/images/work/tarazoo-home.webp", width: 1511, height: 913 }],
    },
    {
        id: "ika",
        host: "IKA",
        stack: ["nuxt", "vue", "vuetify", "ts", "html", "tw", "js", "arch"],
        highlights: 3,
        shots: [
            {
                src: "/images/work/ika-dashboard.webp",
                width: 1600,
                height: 742,
            },
            { src: "/images/work/ika-login.webp", width: 1600, height: 808 },
        ],
    },
    {
        id: "nctevo",
        host: "NCTEVO",
        link: "https://nctevo.com/",
        stack: ["nuxt", "vue", "vuetify", "ts", "html", "tw", "arch"],
        highlights: 3,
        shots: [
            {
                src: "/images/work/nctevo-landing.webp",
                width: 1600,
                height: 742,
            },
            { src: "/images/work/nctevo-service.webp", width: 1600, height: 808 },
        ],
    },
    {
        id: "smartsino",
        host: "Smart-Sino UK",
        stack: ["nuxt", "vue", "vuetify", "ts", "js", "html", "arch"],
        highlights: 2,
        shots: [{ src: "/images/work/smartsino-lms.webp", width: 821, height: 381 }],
    },
];
