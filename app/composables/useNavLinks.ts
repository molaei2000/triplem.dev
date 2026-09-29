export interface NavLink {
    key: "experience" | "blog" | "about";
    to: string | { path: string; hash: string };
    /** `aria-current` value for this link on the current route. */
    current?: "page";
}

/** Primary navigation. Experience and About are home sections; Blog is its own page. */
export function useNavLinks() {
    const route = useRoute();
    const localePath = useLocalePath();
    const inBlog = computed(() => route.path.startsWith(localePath("/blog")));

    return computed<NavLink[]>(() => [
        { key: "experience", to: { path: "/", hash: "#experience" } },
        { key: "blog", to: "/blog", current: inBlog.value ? "page" : undefined },
        { key: "about", to: { path: "/", hash: "#about" } },
    ]);
}
