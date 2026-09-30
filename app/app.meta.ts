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
    icon: "/favicon.ico",
    contactEmail: "mahdi.molaei2000@gmail.com",
    /** A CV in public/ (e.g. "/cv.pdf"). /about shows a download button when this is set. */
    cv: "" as string,
};

export default meta;

/** Public profiles, in display order. Also feeds `sameAs` in the Person JSON-LD. */
export const socialLinks = [
    { label: "GitHub", href: meta.social.github },
    { label: "LinkedIn", href: meta.social.linkedin },
    { label: "Telegram", href: meta.social.telegram },
] as const;
