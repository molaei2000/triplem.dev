<script setup lang="ts">
definePageMeta({
  layout: 'blank'
})
</script>

<template>
  <div>
    <AppHeader class="fixed top-0 left-0 right-0 z-10" />
    <main>
      <SlideIn
        v-bind="getSceneAttributes({
          position: 'center'
        })"
        class="bounded rich-text flex flex-col items-center justify-center h-screen"
      >
        <h1 class="text-8xl font-bold tracking-tight">
          M<sup class="text-5xl">3</sup>
        </h1>
        <p class="mt-4 text-xl text-center">
          Triple M
        </p>
        <UButton class="mt-8">
          Get Started
        </UButton>
      </SlideIn>
      <div
        v-bind="getSceneAttributes({
          position: 'left'
        })"
        class="bounded rich-text flex flex-col justify-center h-screen"
      >
        <span>projects</span>
      </div>
      <!-- <div
        v-bind="getSceneAttributes({
          position: 'top',
          model: '800'
        })"
        class="bounded rich-text flex flex-col justify-center h-screen"
      />
      <div
        v-bind="getSceneAttributes({
          position: 'center',
          model: '200'
        })"
        class="bounded rich-text flex flex-col justify-center h-screen"
      />
      <div
        v-bind="getSceneAttributes({
          position: 'top',
          model: '200'
        })"
        class="bounded rich-text flex flex-col justify-center h-screen"
      />
      <div
        v-bind="getSceneAttributes({
          position: 'center',
          model: '400'
        })"
        class="bounded rich-text flex flex-col justify-center h-screen"
      /> -->
    </main>
    <AppFooter />
    <!-- <PageIndexTCanvas class="fixed top-0 left-0 right-0 h-lvh -z-1">
      <PageIndexTScene />
    </PageIndexTCanvas> -->
  </div>
</template>
