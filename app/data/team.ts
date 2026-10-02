/**
 * The Team page. Names, roles and the optional per-person `surname`/`bio`
 * live in i18n under `teamPage.people.<id>` and `teamPage.roles.<role>`;
 * this file holds what doesn't translate. Optional fields render only when set.
 */
export type TeamRole = "frontend" | "backend" | "fullstack" | "design" | "ai";

/** Display order of disciplines, e.g. in the "work with the team" block. */
export const TEAM_ROLES: TeamRole[] = ["frontend", "backend", "fullstack", "design", "ai"];

export interface TeamPhoto {
    src: string;
    width: number;
    height: number;
}

export interface TeamMember {
    id: string;
    role: TeamRole;
    photo?: TeamPhoto;
    /** Public profiles (GitHub, LinkedIn, …), shown as links when present. */
    links?: { label: string; href: string }[];
    /** An internal page about this person. */
    page?: string;
}

/**
 * Triple M: one person per slash of the /// mark, left to right, so index N
 * is slash N in the 3D scene. The gold middle slash is the site's owner. Like
 * the logo, this order doesn't mirror in RTL.
 */
export const CORE_TEAM: TeamMember[] = [
    {
        id: "mehran",
        role: "backend",
        photo: { src: "/images/team/mehran.webp", width: 364, height: 485 },
        page: "https://m1evo.com/",
    },
    {
        id: "mohammadMahdi",
        role: "frontend",
        photo: { src: "/images/about/portrait.webp", width: 1200, height: 1500 },
        page: "/about",
    },
    {
        id: "mohammadReza",
        role: "fullstack",
        photo: { src: "/images/team/mohammad-reza.webp", width: 303, height: 404 },
    },
];

/** Developers and designers outside the core, in display order. */
export const COLLABORATORS: TeamMember[] = [
    { id: "arman", role: "backend" },
    { id: "hesam", role: "design" },
    { id: "amir", role: "ai" },
    { id: "mehrzad", role: "frontend" },
];
