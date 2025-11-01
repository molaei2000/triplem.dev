<script lang="ts" setup>
const { data: articles } = await useAsyncData('articles-home', () => queryCollection('articles').all())
const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('articles'))
const { data: files } = useLazyAsyncData('search', () => queryCollectionSearchSections('articles'), {
  server: false
})
const query = ref('')
</script>

<template>
  <UContainer>
    <u-page>
      <u-page-body>
        <u-field-group class="">
          <u-content-search-button variant="outline">
            <div class="flex items-center gap-4">
              Search
              <div class="flex gap-1 items-center">
                <u-kbd variant="soft">
                  CTRL
                </u-kbd>
                <u-kbd variant="soft">
                  K
                </u-kbd>
              </div>
            </div>
          </u-content-search-button>
        </u-field-group>
        <ClientOnly>
          <u-content-search
            v-model:search-term="query"
            shortcut="meta_k"
            :files="files"
            :navigation="navigation"
            :fuse="{ resultLimit: 42 }"
          />
        </ClientOnly>
        <u-empty
          v-if="(articles?.length ?? 0) <= 0"
          title="No interesting material yet"
          description="Give me some time to create some boring stuff."
          variant="naked"
          :actions="[{ label: 'Go back home', to: '/' }]"
        />
        <u-blog-posts v-else>
          <u-blog-post
            v-for="article in articles"
            :title="article.title"
            :description="article.description"
            :image="article.thumbnail"
            :authors="[{ name: article.author, avatar: { src: article.author_avatar }, description: article.author_description }]"
            :badge="Math.abs(new Date().getTime() - new Date(article?.date).getTime()) < 8.64e7 * 7 ? { label: 'New', color: 'primary' } : undefined"
            :date="article.date"
            :to="article.path"
            variant="naked"
          />
        </u-blog-posts>
      </u-page-body>
    </u-page>
  </UContainer>
</template>

<style lang="css" scoped>
@reference "~/assets/css/main.css";
</style>
