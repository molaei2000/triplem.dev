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
    stack: string[];
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
            "Next.js",
            "React",
            "TypeScript",
            "TanStack Query",
            "Redux Toolkit",
            "NextAuth",
            "Tailwind",
            "Radix UI",
            "React Hook Form",
            "Zod",
            "Docker",
            "Sentry",
            "HTML & CSS",
            "Architecture",
        ],
        highlights: 3,
        shots: [
            { src: "/images/work/tarazoo-home.webp", width: 1511, height: 913 },
        ],
    },
    {
        id: "nct",
        host: "IKA",
        stack: [
            "Nuxt.js",
            "Vue",
            "Vuetify",
            "Nuxt Layers",
            "TypeScript",
            "HTML & CSS",
            "Tailwind",
            "Architecture",
        ],
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
        id: "smartsino",
        host: "Smart-Sino UK",
        stack: [
            "Nuxt.js",
            "Vue",
            "Vuetify",
            "TypeScript",
            "HTML & CSS",
            "Architecture",
        ],
        highlights: 2,
        shots: [
            { src: "/images/work/smartsino-lms.webp", width: 821, height: 381 },
        ],
    },
];
