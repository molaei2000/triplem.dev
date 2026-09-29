export type ThemeName = "dark" | "light";

/**
 * Site theme. The cookie lets the server render the right `html.dark` class on
 * first paint (no flash); `useState` gives every caller the same reactive
 * value, so the toggle, <html> and the 3D scene switch in the same tick.
 */
export function useTheme() {
    const cookie = useCookie<ThemeName>("tm-theme", {
        default: () => "dark",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
    });
    const theme = useState<ThemeName>("tm-theme", () => (cookie.value === "light" ? "light" : "dark"));

    const isDark = computed(() => theme.value !== "light");

    function toggle() {
        theme.value = isDark.value ? "light" : "dark";
        cookie.value = theme.value;
    }

    return { theme: readonly(theme), isDark, toggle };
}
