export interface NavLink {
    key: "experience" | "blog" | "about";
    to: string | { path: string; hash: string };
    /** `aria-current` value for this link on the current route. */
    current?: "page";
}

/** Primary navigation. Experience is a home section; Blog and About are pages. */
export function useNavLinks() {
    const route = useRoute();
    const localePath = useLocalePath();
    const at = (path: string) =>
        route.path === localePath(path) || route.path.startsWith(`${localePath(path)}/`)
            ? "page"
            : undefined;

    return computed<NavLink[]>(() => [
        { key: "experience", to: { path: "/", hash: "#experience" } },
        { key: "blog", to: "/blog", current: at("/blog") },
        { key: "about", to: "/about", current: at("/about") },
    ]);
}
