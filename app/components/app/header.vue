<script setup lang="ts">
// import logo from '~~/public/mmm.png'

const links = [{ key: 'home', title: 'Home', url: '/' }, { key: 'about-me', title: 'About me', url: '/about-me' }, { key: 'articles', title: 'Articles', url: '/articles' }] as const
</script>

<template>
  <header>
    <nav class="flex justify-between backdrop-blur xl:backdrop-blur-none">
      <NuxtLink to="/" class="cta py-px ml-4">
        <BrandSignature class="text-lg" />
      </NuxtLink>
      <ul class="xl:w-[calc(40%+2rem)] flex items-center pl-8 pr-4 xl:backdrop-blur">
        <li
          v-for="link in links"
          :key="link.key"
          class="hidden xl:block"
        >
          <NuxtLink :to="link.url" class="cta">
            {{ link.title }}
          </NuxtLink>
        </li>
        <li class="ml-auto">
          <ColorModeButton />
        </li>
      </ul>
    </nav>
  </header>
</template>

<style scoped>
@reference "~/assets/css/main.css";

a {
  @apply transition-opacity duration-300 ease-in-out;
}

header:has(a:hover) a:not(:hover) {
  @apply opacity-25;
}
</style>
