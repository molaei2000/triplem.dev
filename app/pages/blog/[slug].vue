<script setup lang="ts">
import meta from "~/app.meta";

const route = useRoute();
const { locale } = useI18n();
const collection = useBlogCollection();

const { data: post } = await useAsyncData(
    () => `blog-post:${route.path}`,
    () => queryCollection(collection.value).path(route.path).first(),
);
if (!post.value || (post.value.draft && !showDrafts)) {
    throw createError({ statusCode: 404, statusMessage: "Post not found", fatal: true });
}

// Neighbours in the same (date-descending) order as the index: [newer, older].
const { data: around } = await useAsyncData(
    () => `blog-around:${route.path}`,
    () => {
        const query = queryCollectionItemSurroundings(collection.value, route.path, {
            fields: ["title", "description"],
        }).order("date", "DESC");
        if (!showDrafts) query.where("draft", "=", false);
        return query;
    },
);

const url = computed(() => `${meta.siteUrl}${route.path}`);
const published = computed(() => new Date(post.value!.date).toISOString());
// Social cards need a raster image: the PNG rendered from the cover.
const image = computed(() =>
    post.value?.cover ? `${meta.siteUrl}${blogCover(post.value.cover).png}` : undefined,
);

useSeoMeta({
    title: () => post.value!.title,
    description: () => post.value!.description,
    ogTitle: () => post.value!.title,
    ogDescription: () => post.value!.description,
    ogType: "article",
    ogUrl: () => url.value,
    articlePublishedTime: () => published.value,
    articleAuthor: [meta.author.name],
    articleTag: () => post.value!.tags,
    ogImage: () =>
        image.value
            ? {
                  url: image.value,
                  width: 1200,
                  height: 630,
                  type: "image/png",
                  alt: post.value!.title,
              }
            : undefined,
    twitterCard: () => (image.value ? "summary_large_image" : "summary"),
});
useJsonLd(() => ({
    "@type": "BlogPosting",
    headline: post.value!.title,
    description: post.value!.description,
    datePublished: published.value,
    inLanguage: locale.value === "fa" ? "fa-IR" : "en-US",
    keywords: post.value!.tags.join(", "),
    image: image.value,
    mainEntityOfPage: url.value,
    author: { "@type": "Person", name: meta.author.name, url: meta.siteUrl },
}));

const toc = computed(() => flattenToc(post.value?.body?.toc?.links));
const article = useTemplateRef<HTMLElement>("article");
const progress = useReadingProgress(article);
const active = useActiveHeading(article);
</script>

<template>
    <div v-if="post">
        <BlogPostHeader
            :title="post.title"
            :date="post.date"
            :tags="post.tags"
            :minutes="post.minutes"
            :draft="post.draft"
            :cover="post.cover"
        />

        <div class="shell grid-12 items-start gap-y-14 pt-14 pb-24 md:pt-20 md:pb-32">
            <BlogToc
                v-if="toc.length"
                :items="toc"
                :active="active"
                :progress="progress"
                class="sticky top-28 hidden md:col-span-2 md:flex"
            />

            <article ref="article" class="col-span-4 min-w-0 md:col-span-6 md:col-start-4">
                <ContentRenderer :value="post" class="prose-tm" />
            </article>

            <BlogPostAside
                :url="url"
                :title="post.title"
                class="col-span-4 border-t border-hairline pt-8 md:sticky md:top-28 md:col-span-2 md:col-start-11 md:border-0 md:pt-0"
            />
        </div>

        <BlogPostPager
            v-if="around?.[0] || around?.[1]"
            :newer="around?.[0]"
            :older="around?.[1]"
        />
    </div>
</template>
