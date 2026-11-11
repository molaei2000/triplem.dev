const meta = {
    id: "triplem",
    name: "triplem.dev",
    description:
        "Mohammad Mahdi Molaei — senior front-end engineer building scalable digital experiences with Vue, Nuxt, React and Next.js.",
    siteUrl: "https://triplem.dev",
    author: {
        name: "Mohammad Mahdi Molaei",
        url: "https://triplem.dev",
        image: "https://avatars.githubusercontent.com/u/56272245?v=4",
        email: "mahdi.molaei2000@gmail.com",
        description:
            "Senior front-end engineer. I build interfaces that scale from pixels to products.",
        jobTitle: "Senior Front-End Developer",
    },
    social: {
        github: "https://github.com/molaei2000",
        linkedin: "https://www.linkedin.com/in/mohammad-mahdi-molaei/",
        telegram: "https://t.me/Triplem2000",
        telegramHandle: "@Triplem2000",
    },
    url: "https://github.com/molaei2000",
    icon: "/favicon.png",
    contactEmail: "mahdi.molaei2000@gmail.com",
    /**
     * A CV in public/ (e.g. "/cv.pdf"). When set, the header, the mobile menu and /about show a
     * download button.
     */
    cv: "/MohammadMahdiMolaei.pdf" as string,
};

export default meta;

/** Public profiles, in display order. Also feeds `sameAs` in the Person JSON-LD. */
export const socialLinks = [
    { label: "GitHub", href: meta.social.github, icon: "tm:github" },
    { label: "LinkedIn", href: meta.social.linkedin, icon: "tm:linkedin" },
    { label: "Telegram", href: meta.social.telegram, icon: "tm:telegram" },
] as const;

/**
 * Reference to the site owner's Person node, the `schemaOrg.identity` in nuxt.config.ts. Pages
 * point at it from their JSON-LD instead of repeating the person.
 */
export const personRef = { "@id": `${meta.siteUrl}/#identity` } as const;
