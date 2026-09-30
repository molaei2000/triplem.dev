/** Adds a schema.org JSON-LD block to the page head. */
export function useJsonLd(data: MaybeRefOrGetter<Record<string, unknown>>) {
    useHead(() => ({
        script: [
            {
                type: "application/ld+json",
                innerHTML: JSON.stringify({ "@context": "https://schema.org", ...toValue(data) }),
            },
        ],
    }));
}
