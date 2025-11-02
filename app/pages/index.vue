<script setup lang="ts">
definePageMeta({
  layout: 'blank'
})
</script>

<template>
  <div>
    <AppHeader class="fixed top-0 left-0 right-0 z-10" />
    <main class="h-screen">
      <SlideIn
        v-bind="getSceneAttributes({
          position: 'center'
        })"
        class="bounded rich-text flex flex-col justify-center"
      >
        <h1 class="">
          Welcome to Our Website
        </h1>
        <p class="mt-4">
          Discover amazing content and connect with our community.
        </p>
      </SlideIn>
    </main>
    <AppFooter />
    <PageIndexTCanvas class="fixed top-0 left-0 right-0 h-lvh -z-1">
      <PageIndexTScene />
    </PageIndexTCanvas>
  </div>
</template>
