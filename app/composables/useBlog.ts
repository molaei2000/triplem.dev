import type { Collections } from "@nuxt/content";

export type BlogCollection = "blog_en" | "blog_fa";
export type BlogPostItem = Pick<Collections["blog_en"], "path" | "title" | "description" | "date" | "tags" | "minutes" | "draft">;

/** Drafts show while writing (`nuxt dev`) and never ship in a build. */
export const showDrafts = import.meta.dev;

/** The blog collection for the active locale. */
export function useBlogCollection() {
    const { locale } = useI18n();
    return computed<BlogCollection>(() => (locale.value === "fa" ? "blog_fa" : "blog_en"));
}

/** Posts for the active locale, newest first. */
export function useBlogPosts(limit?: number) {
    const collection = useBlogCollection();
    return useAsyncData<BlogPostItem[]>(
        () => `blog-list:${collection.value}:${limit ?? "all"}`,
        () => {
            const query = queryCollection(collection.value)
                .select("path", "title", "description", "date", "tags", "minutes", "draft")
                .order("date", "DESC");
            if (!showDrafts) query.where("draft", "=", false);
            if (limit) query.limit(limit);
            return query.all();
        },
        { default: () => [] },
    );
}

/** Locale-aware formatting for post metadata (Persian calendar and digits on /fa). */
export function useBlogFormat() {
    const { t, locale } = useI18n();
    const tag = computed(() => (locale.value === "fa" ? "fa-IR" : "en-GB"));

    function date(value: string | Date, long = false) {
        return new Intl.DateTimeFormat(tag.value, {
            timeZone: "UTC",
            month: "long",
            year: "numeric",
            ...(long ? { day: "numeric" } : {}),
        }).format(new Date(value));
    }
    function num(n: number) {
        return new Intl.NumberFormat(tag.value).format(n);
    }
    function read(minutes?: number) {
        return t("blog.read", { n: num(minutes ?? 1) });
    }
    return { date, num, read };
}
