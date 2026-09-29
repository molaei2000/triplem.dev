/**
 * Copy-to-clipboard with a short "copied" flash. `legacy` falls back to
 * execCommand, so copy buttons render the same on server and client (no
 * hydration mismatch from `isSupported`).
 */
export function useCopy(source?: MaybeRefOrGetter<string>) {
    return useClipboard({ source, legacy: true, copiedDuring: 1600 });
}
