export type ThemeName = "dark" | "light";

/**
 * Site theme, persisted in a cookie so the server renders the right
 * `html.dark` class on first paint (no flash). Dark is the default.
 */
export function useTheme() {
    const theme = useCookie<ThemeName>("tm-theme", {
        default: () => "dark",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
    });

    const isDark = computed(() => theme.value !== "light");

    function toggle() {
        theme.value = isDark.value ? "light" : "dark";
    }

    return { theme, isDark, toggle };
}
